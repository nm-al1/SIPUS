const { pool, transaction } = require('../src/config/db');
const { wita, nextSchoolDay, school, shift } = require('../src/utils/calendar');
const { tick, deviceToken, checkDevice } = require('../src/reminders');

async function preflight() {
  const token = deviceToken();
  if (!token)
    throw Error('Simpan token perangkat di backend/.env terlebih dahulu.');
  const [[member]] = await pool.execute(
    "SELECT phone,consent_at,status FROM members WHERE member_code='240103'",
  );
  if (!member?.phone || !member.consent_at || member.status !== 'active')
    throw Error('Isi kontak penguji dan persetujuan pada siswa demo 240103.');
  const { quota } = await checkDevice(token);
  console.log('Perangkat Fonnte terhubung dan persetujuan penerima tercatat.');
  if (quota !== null) console.log('Sisa kuota pesan', quota);
}

async function prepareLoan(day, newRecipient) {
  const due = nextSchoolDay(day);
  if (!school(day)) throw Error('Jalankan uji H-1 pada hari sekolah.');
  const scheduledCode = 'DEMO-WA-' + day;
  const code = newRecipient ? scheduledCode + '-BARU' : scheduledCode;
  return transaction(async (db) => {
    const [[member]] = await db.execute(
      "SELECT * FROM members WHERE member_code='240103' FOR UPDATE",
    );
    if (!member?.phone || !member.consent_at || member.status !== 'active')
      throw Error('Isi kontak penguji dan persetujuan pada siswa demo 240103.');
    const [[previous]] = await db.execute(
      `SELECT l.id,r.target,r.state,r.provider_id FROM borrowings l
        LEFT JOIN reminders r ON r.loan_id=l.id
        WHERE l.member_id=? AND l.due_date=? AND l.borrow_code IN (?,'DEMO-WA')
        ORDER BY l.id DESC LIMIT 1`,
      [member.id, due, scheduledCode],
    );
    if (newRecipient) {
      if (
        previous?.state !== 'Belum tahu' ||
        previous.provider_id ||
        !previous.target
      )
        throw Error(
          'Uji penerima baru tersedia setelah percobaan hari ini berstatus Belum tahu dan belum memiliki ID Fonnte.',
        );
      if (member.phone === previous.target)
        throw Error(
          'Isi nomor WhatsApp penerima lain yang sudah memberi izin.',
        );
      const [[existing]] = await db.execute(
        'SELECT id FROM borrowings WHERE borrow_code=? AND member_id=?',
        [code, member.id],
      );
      if (existing) return existing.id;
    } else if (previous) {
      return previous.id;
    }
    const [[book]] = await db.execute(
      "SELECT id FROM books WHERE isbn='DEMO-1' AND archived=0",
    );
    const [[user]] = await db.execute(
      "SELECT id FROM users WHERE email='demo@sipus.local'",
    );
    if (!book || !user) throw Error('Jalankan npm run demo lebih dulu.');
    const [updated] = await db.execute(
      'UPDATE books SET stock=stock-1 WHERE id=? AND stock>0',
      [book.id],
    );
    if (!updated.affectedRows) throw Error('Stok buku demo habis.');
    let start = due;
    for (let n = 1; n < 5; ) {
      start = shift(start, -1);
      if (school(start)) n++;
    }
    return (
      await db.execute(
        'INSERT INTO borrowings(borrow_code,member_id,book_id,user_id,borrow_date,due_date) VALUES(?,?,?,?,?,?)',
        [code, member.id, book.id, user.id, start, due],
      )
    )[0].insertId;
  });
}

async function rehearse() {
  await preflight();
  const day = wita().slice(0, 10);
  const id = await prepareLoan(day, process.argv.includes('--penerima-baru'));
  await tick(new Date(day + 'T09:00:00+08:00'), undefined, true, null, id);
  const [[log]] = await pool.execute(
    'SELECT state,reason FROM reminders WHERE loan_id=?',
    [id],
  );
  console.log(
    'Uji H-1, waktu acuan 09.00 WITA.',
    log?.state || 'Tidak ada pengiriman.',
    log?.reason || '',
  );
  if (!log || !['Diproses', 'Diterima'].includes(log.state))
    process.exitCode = 1;
}
if (require.main === module)
  (process.argv.includes('--check') ? preflight() : rehearse())
    .catch((e) => {
      console.error(e.code || e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());

module.exports = { prepareLoan };
