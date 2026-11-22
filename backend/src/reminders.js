const { rows, wrap, check, integer } = require('./routes/library');
const { transaction } = require('./config/db');
const { nextSchoolDay, reminderDay, wita, school, loadCalendar } = require('./utils/calendar');

const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const envFile = path.resolve(__dirname, '../.env');
const blockedMessage =
  'Windows menolak koneksi ke Fonnte (EACCES). Jalankan pemeriksaan dari PowerShell biasa di luar Codex.';

function blockedBeforeConnect(error) {
  return error.cause?.code === 'EACCES' && error.cause.syscall === 'connect';
}

function deviceToken() {
  if (fs.existsSync(envFile)) {
    const file = dotenv.parse(fs.readFileSync(envFile));
    if ('FONNTE_TOKEN' in file) return file.FONNTE_TOKEN.trim();
  }
  return process.env.FONNTE_TOKEN?.trim() || '';
}
async function sendFonnte(target, message, request = fetch) {
  const response = await request('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: deviceToken() },
    body: new URLSearchParams({
      target,
      message,
      countryCode: '0',
      connectOnly: 'true',
    }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json();
  const status = data?.status ?? data?.Status;
  if (response.status < 500 && status === false)
    return [
      'Gagal',
      String(data.reason || 'Ditolak gateway').slice(0, 255),
      null,
    ];
  if (response.ok && status === true)
    return [
      'Diproses',
      'Gateway menerima permintaan.',
      String(data.id?.[0] || ''),
    ];
  return ['Belum tahu', 'Respons gateway tidak dapat dipastikan.', null];
}

async function checkDevice(token, request = fetch) {
  check(token, 'Simpan token perangkat di backend/.env terlebih dahulu.');
  let response;
  try {
    response = await request('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: token },
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    if (blockedBeforeConnect(error)) throw new Error(blockedMessage);
    throw new Error('Koneksi ke Fonnte gagal. Periksa akses internet dan coba lagi.');
  }
  if (response.status >= 500)
    throw new Error('Fonnte belum dapat dihubungi. Coba periksa lagi nanti.');
  const data = await response.json();
  check(
    response.ok && data?.status === true,
    'Periksa token perangkat Fonnte.',
  );
  check(
    data.device_status === 'connect',
    'Hubungkan perangkat di dashboard Fonnte.',
  );
  const quota = String(data.quota ?? '').trim();
  check(quota !== '0', 'Kuota pesan Fonnte habis.');
  return { quota: /^[0-9]+$/.test(quota) ? quota : null };
}

async function tick(
  now = new Date(),
  send = sendFonnte,
  enabled = Boolean(deviceToken()),
  retry = null,
  onlyLoan = null,
) {
  const time = wita(now),
    day = time.slice(0, 10);
  if (!enabled) return;
  const holidays = await loadCalendar();
  const candidates = await rows(
    `SELECT l.id,(SELECT MAX(a.id) FROM reminder_attempts a WHERE a.loan_id=l.id) attempt_id
    FROM borrowings l JOIN members m ON m.id=l.member_id LEFT JOIN reminders r ON r.loan_id=l.id
    WHERE l.status<>'returned' AND l.received_date IS NULL AND l.due_date<=? 
      AND m.status='active' AND m.consent_at IS NOT NULL AND m.phone<>''
      AND (? IS NULL OR l.id=?) AND ((? IS NULL AND r.id IS NULL) OR (r.id=? AND r.state='Gagal'))`,
    [nextSchoolDay(day, holidays), onlyLoan, onlyLoan, retry, retry],
  );
  let outcome;
  for (const { id, attempt_id } of candidates) {
    const job = await transaction(async (db) => {
      const holidays = await loadCalendar(db, 'FOR SHARE');
      const [l] = await rows(
        `SELECT l.*,m.name,m.phone,m.status member_status,m.consent_at,b.title FROM borrowings l
        JOIN members m ON m.id=l.member_id JOIN books b ON b.id=l.book_id WHERE l.id=? FOR UPDATE`,
        [id],
        db,
      );
      if (
        !l ||
        l.received_date ||
        l.status === 'returned' ||
        !l.consent_at ||
        !l.phone ||
        l.member_status !== 'active'
      )
        return;
      const scheduled = reminderDay(l.due_date, holidays);
      if (
        day < scheduled ||
        (day === scheduled && time.slice(11, 16) < '09:00')
      )
        return;
      const expired = day >= l.due_date;
      if (!expired && !school(day, holidays)) return;
      const message =
        'Perpustakaan SMK Mutiara Ilmu mengingatkan ' +
        l.name +
        ' untuk mengembalikan ' +
        l.quantity +
        ' eksemplar ' +
        l.title +
        ' pada ' +
        l.due_date +
        '. Denda Rp2.000 per buku per hari sekolah terlambat.';
      const [previous] = await rows(
        'SELECT id,state FROM reminders WHERE loan_id=?',
        [id],
        db,
      );
      if (previous && (previous.id !== retry || previous.state !== 'Gagal'))
        return;
      if (previous) {
        const [latest] = await rows(
          'SELECT MAX(id) id FROM reminder_attempts WHERE loan_id=?',
          [id],
          db,
        );
        if (latest.id !== attempt_id) return;
      }
      const state = expired ? 'Dilewati' : 'Belum tahu';
      const reason = expired
        ? 'Jadwal pengingat telah lewat.'
        : 'Menunggu hasil gateway.';
      if (previous)
        await rows(
          'UPDATE reminders SET scheduled=?,target=?,message=?,state=?,reason=?,provider_id=NULL WHERE id=?',
          [scheduled, l.phone, message, state, reason, previous.id],
          db,
        );
      else
        await rows(
          'INSERT INTO reminders(loan_id,scheduled,target,message,state,reason) VALUES(?,?,?,?,?,?)',
          [id, scheduled, l.phone, message, state, reason],
          db,
        );
      if (expired) return { skipped: reason };
      const attempt = await rows(
        'INSERT INTO reminder_attempts(loan_id,target,state,reason) VALUES(?,?,?,?)',
        [id, l.phone, state, reason],
        db,
      );
      return { target: l.phone, message, attempt: attempt.insertId };
    });
    if (job?.skipped) {
      outcome = { state: 'Dilewati', reason: job.skipped };
    } else if (job) {
      let result;
      try {
        result = await send(job.target, job.message);
      } catch (error) {
        result = blockedBeforeConnect(error)
          ? ['Gagal', blockedMessage, null]
          : [
              'Belum tahu',
              'Hasil pengiriman belum pasti. Periksa riwayat Fonnte dan HP penerima.',
              null,
            ];
      }
      await transaction(async (db) => {
        await rows(
          'UPDATE reminder_attempts SET state=?,reason=?,provider_id=? WHERE id=?',
          [...result, job.attempt],
          db,
        );
        await rows(
          'UPDATE reminders SET state=?,reason=?,provider_id=? WHERE loan_id=? AND checked_by IS NULL',
          [...result, id],
          db,
        );
      });
      outcome = { state: result[0], reason: result[1] };
    }
  }
  return outcome;
}
function routes(router) {
  router.get(
    '/reminders',
    wrap(async (req, res) => {
      const logs = await rows(
        'SELECT r.*,l.borrow_code FROM reminders r JOIN borrowings l ON l.id=r.loan_id ORDER BY r.id DESC',
      );
      const attempts = await rows(
        'SELECT loan_id,target,state,reason,attempted_at,provider_id FROM reminder_attempts ORDER BY id',
      );
      const byLoan = Map.groupBy(attempts, (a) => a.loan_id);
      res.json({
        configured: Boolean(deviceToken()),
        logs: logs.map((l) => ({
          ...l,
          attempts: byLoan.get(l.loan_id) || [],
        })),
      });
    }),
  );
  router.post(
    '/reminders/:id/confirm',
    wrap(async (req, res) => {
      const r = await rows(
        `UPDATE reminders SET state='Diterima',checked_by=?,reason='Petugas memeriksa pesan di HP penerima.'
         WHERE id=? AND (state='Diproses' OR (state='Belum tahu'
           AND (COALESCE(reason,'')<>'Menunggu hasil gateway.' OR updated_at<NOW()-INTERVAL 2 MINUTE)))`,
        [req.user.id, integer(req.params.id, 1)],
      );
      check(r.affectedRows, 'Status ini tidak dapat dikonfirmasi.', 409);
      res.json({ ok: true });
    }),
  );
  router.post(
    '/reminders/:id/retry',
    wrap(async (req, res) => {
      check(deviceToken(), 'Gateway belum terhubung.', 409);
      const outcome = await tick(
        new Date(),
        sendFonnte,
        true,
        integer(req.params.id, 1),
      );
      check(
        outcome,
        'Pengingat tidak dapat dikirim ulang. Muat ulang riwayat dan periksa pinjaman serta izin penerima.',
        409,
      );
      res.json({ ok: true, ...outcome });
    }),
  );
}
module.exports = { tick, routes, deviceToken, sendFonnte, checkDevice };
