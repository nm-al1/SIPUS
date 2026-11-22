const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dbName = 'sipus_test_' + crypto.randomBytes(8).toString('hex');
process.env.DB_NAME = dbName;
delete process.env.FONNTE_TOKEN;
const { config, pool } = require('../src/config/db');
const setup = require('../scripts/setup');
const app = require('../src/server');
const {
  due,
  lateDays,
  reminderDay,
  wita,
  shift,
  school,
} = require('../src/utils/calendar');
const { tick, sendFonnte, checkDevice } = require('../src/reminders');
const { prepareLoan } = require('../scripts/demo-wa');
let server,
  base,
  admin,
  token,
  created = false;
async function call(url, method = 'GET', body, auth = token) {
  const r = await fetch(base + '/api' + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: 'Bearer ' + auth } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
before(async () => {
  admin = await mysql.createConnection({ ...config, database: undefined });
  await admin.query('CREATE DATABASE ??', [dbName]);
  created = true;
  await setup();
  await setup();
  await pool.execute('INSERT INTO users(name,email,password) VALUES(?,?,?)', [
    'Tester',
    'test@local',
    await bcrypt.hash('test-password', 4),
  ]);
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = 'http://127.0.0.1:' + server.address().port;
  token = (
    await call('/login', 'POST', {
      email: 'test@local',
      password: 'test-password',
    })
  ).data.token;
  assert.ok(token);
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await pool.end();
  if (created) await admin.query('DROP DATABASE ??', [dbName]);
  if (admin) await admin.end();
});
test('kalender Makassar mencakup akhir pekan, libur, tahun baru dan H-1', () => {
  assert.equal(due('2026-11-16'), '2026-11-20');
  assert.equal(due('2026-12-24'), '2026-12-31');
  assert.equal(due('2026-12-31'), '2027-01-08');
  assert.equal(reminderDay('2026-11-23'), '2026-11-20');
  assert.equal(lateDays('2026-12-24', '2026-12-28'), 1);
  assert.equal(
    wita(new Date('2026-11-19T16:01:00Z')).slice(0, 10),
    '2026-11-20',
  );
});
test('katalog publik, sesi privat dan logout', async () => {
  assert.equal((await call('/catalog', 'GET', null, '')).status, 200);
  assert.equal((await call('/members', 'GET', null, '')).status, 401);
  const t = (
    await call('/login', 'POST', {
      email: 'test@local',
      password: 'test-password',
    })
  ).data.token;
  await call('/logout', 'POST', {}, t);
  assert.equal((await call('/me', 'GET', null, t)).status, 401);
});
test('pinjam bersamaan, blokir tunggakan, penerimaan fisik, pelunasan dan stok', async () => {
  const [cashier] = await pool.execute(
    'INSERT INTO users(name,email,password) VALUES(?,?,?)',
    ['Petugas Loket', 'loket@local', await bcrypt.hash('loket-password', 4)],
  );
  const cashierToken = (
    await call('/login', 'POST', {
      email: 'loket@local',
      password: 'loket-password',
    })
  ).data.token;
  const m = {
    member_code: '01',
    name: 'Contoh',
    class_name: 'XI',
    phone_owner: 'wali',
    status: 'active',
  };
  const member = (await call('/members', 'POST', m)).data.id;
  assert.equal((await call('/members', 'POST', m)).status, 409);
  const book = (
    await call('/books', 'POST', {
      title: 'Buku uji',
      author: 'Penulis',
      total: 2,
      lost: 0,
    })
  ).data.id;
  const payload = { member_id: member, book_id: book, quantity: 2 };
  const out = await Promise.all([
    call('/loans', 'POST', payload),
    call('/loans', 'POST', payload),
  ]);
  assert.deepEqual(out.map((r) => r.status).sort(), [201, 409]);
  const id = out.find((r) => r.status === 201).data.id;
  const day = wita().slice(0, 10),
    dueDate = shift(day, -8);
  await pool.execute(
    'UPDATE borrowings SET borrow_date=?,due_date=? WHERE id=?',
    [shift(dueDate, -7), dueDate, id],
  );
  assert.equal((await call('/loans', 'POST', payload)).status, 409);
  assert.equal(
    (await call('/loans/' + id + '/pay', 'POST', { amount: 1 })).status,
    409,
  );
  const receive = await call(
    '/loans/' + id + '/receive',
    'POST',
    {},
    cashierToken,
  );
  assert.equal(receive.data.state, 'Menunggu pelunasan');
  assert.equal(receive.data.received_by, cashier.insertId);
  const fine = lateDays(dueDate, day) * 4000;
  assert.equal(receive.data.fine, fine);
  assert.equal(
    (await call('/catalog')).data.find((b) => b.id === book).stock,
    0,
  );
  assert.equal(
    (await call('/loans/' + id + '/pay', 'POST', { amount: fine - 1 })).status,
    409,
  );
  await Promise.all([
    call('/loans/' + id + '/pay', 'POST', { amount: fine }),
    call('/loans/' + id + '/pay', 'POST', { amount: fine }),
  ]);
  assert.equal(
    (await call('/catalog')).data.find((b) => b.id === book).stock,
    2,
  );
  const fresh = await call('/loans', 'POST', payload);
  assert.equal(fresh.status, 201);
  await call('/loans/' + fresh.data.id + '/receive', 'POST', {});
  assert.equal(
    (await call('/catalog')).data.find((b) => b.id === book).stock,
    2,
  );
  await call('/books/' + book, 'DELETE');
  assert.ok(!(await call('/catalog')).data.some((b) => b.id === book));
  assert.ok(
    (await call('/loans')).data.some(
      (l) => l.id === id && l.state === 'Selesai',
    ),
  );
  const paid = (await call('/loans')).data.find((l) => l.id === id);
  assert.equal(paid.received_by_name, 'Petugas Loket');
  assert.equal(paid.paid_by_name, 'Tester');
});
test('pengingat H-1 menghormati izin, waktu, dan deduplikasi lintas pemeriksaan', async () => {
  const m = {
    member_code: 'WA',
    name: 'Uji',
    class_name: 'X',
    phone: '62000000000',
    phone_owner: 'siswa',
    status: 'active',
    consent: false,
  };
  const member = (await call('/members', 'POST', m)).data.id,
    book = (
      await call('/books', 'POST', { title: 'WA', author: 'Tim', total: 2 })
    ).data.id;
  const loan = (
    await call('/loans', 'POST', {
      member_id: member,
      book_id: book,
      quantity: 1,
    })
  ).data.id;
  await pool.execute('UPDATE borrowings SET due_date=? WHERE id=?', [
    '2026-11-23',
    loan,
  ]);
  let sends = 0;
  const send = async () => {
    sends++;
    return ['Diproses', 'Uji adapter lokal', 'test'];
  };
  const run = (t) =>
    tick(new Date('2026-11-20T' + t + '+08:00'), send, true, null, loan);
  await run('09:00:00');
  assert.equal(sends, 0);
  await call('/members/' + member, 'PUT', { ...m, consent: true });
  await run('08:59:00');
  assert.equal(sends, 0);
  await Promise.all([run('09:00:00'), run('09:00:00')]);
  assert.equal(sends, 1);
  const logs = (await call('/reminders')).data.logs;
  assert.equal(logs.length, 1);
  assert.equal(logs[0].attempts.length, 1);
  assert.equal(logs[0].state, 'Diproses');
  await call('/reminders/' + logs[0].id + '/confirm', 'POST', {});
  assert.equal((await call('/reminders')).data.logs[0].state, 'Diterima');
});

test('dashboard dan laporan menggunakan data MySQL yang sama dengan sirkulasi', async () => {
  const reports = await call('/reports?type=loans');
  assert.equal(reports.status, 200);
  assert.ok(reports.data.length >= 3);
  assert.equal(
    (await call('/reports?type=loans&from=2030-01-01')).data.length,
    0,
  );
  assert.equal((await call('/reports?type=loans&from=2026-02-30')).status, 400);
  assert.equal(
    (await call('/reports?from=2026-12-01&to=2026-01-01')).status,
    400,
  );
  assert.ok((await call('/reports?type=books')).data.some((b) => b.archived));
  const dash = (await call('/dashboard')).data;
  assert.equal(dash.titles, 1);
  assert.equal(dash.students, 2);
  assert.equal(dash.copies, 1);
});

test('kirim ulang hanya setelah penolakan pasti dan melewati pengingat kedaluwarsa', async () => {
  const member = (
    await call('/members', 'POST', {
      member_code: 'WA-RETRY',
      name: 'Uji ulang',
      class_name: 'X',
      phone: '62000000000',
      phone_owner: 'wali',
      status: 'active',
      consent: true,
    })
  ).data.id;
  const book = (
    await call('/books', 'POST', {
      title: 'Dua pinjaman',
      author: 'Tim',
      total: 2,
    })
  ).data.id;
  const payload = { member_id: member, book_id: book, quantity: 1 };
  const tryAgain = (await call('/loans', 'POST', payload)).data.id;
  const expired = (await call('/loans', 'POST', payload)).data.id;
  await pool.execute(
    'UPDATE borrowings SET borrow_date=?,due_date=? WHERE id IN (?,?)',
    ['2026-11-17', '2026-11-23', tryAgain, expired],
  );
  const time = new Date('2026-11-20T09:00:00+08:00');
  const blocked = async () => {
    throw new TypeError('fetch failed', {
      cause: { code: 'EACCES', syscall: 'connect' },
    });
  };
  const failure = await tick(time, blocked, true, null, tryAgain);
  assert.equal(failure.state, 'Gagal');
  assert.match(failure.reason, /EACCES/);
  await assert.rejects(checkDevice('test', blocked), /EACCES/);
  const { id } = (await call('/reminders')).data.logs.find(
    (l) => l.loan_id === tryAgain,
  );
  let attempts = 0;
  let pendingConfirmation;
  const timeout = async () => {
    attempts++;
    pendingConfirmation = await call(
      '/reminders/' + id + '/confirm',
      'POST',
      {},
    );
    throw new Error('timeout');
  };
  const result = await tick(time, timeout, true, id);
  assert.equal(result.state, 'Belum tahu');
  assert.equal(pendingConfirmation.status, 409);
  assert.equal(await tick(time, timeout, true, id), undefined);
  assert.equal(attempts, 1);
  const skipped = await tick(
    new Date('2026-11-23T09:00:00+08:00'),
    timeout,
    true,
    null,
    expired,
  );
  assert.equal(skipped.state, 'Dilewati');
  assert.equal(attempts, 1);
  const logs = (await call('/reminders')).data.logs;
  assert.deepEqual(
    logs.find((l) => l.id === id).attempts.map((a) => a.state),
    ['Gagal', 'Belum tahu'],
  );
  assert.deepEqual(logs.find((l) => l.loan_id === expired).attempts, []);
});

test('adapter Fonnte membedakan antrean, penolakan, dan respons tak pasti', async () => {
  const fake =
    (data, status = 200) =>
    async () =>
      Response.json(data, { status });
  const send = (data, status) =>
    sendFonnte('62000000000', 'Uji', fake(data, status));
  assert.deepEqual(await send({ status: true, id: ['42'] }), [
    'Diproses',
    'Gateway menerima permintaan.',
    '42',
  ]);
  assert.equal(
    (await send({ Status: false, reason: 'token invalid' }))[0],
    'Gagal',
  );
  assert.equal((await send({ status: false }, 503))[0], 'Belum tahu');
  assert.deepEqual(
    await checkDevice(
      'test',
      fake({ status: true, device_status: 'connect', quota: '8' }),
    ),
    { quota: '8' },
  );
  await assert.rejects(
    checkDevice('test', fake({ status: true, device_status: 'disconnect' })),
    /Hubungkan perangkat/,
  );
  await assert.rejects(
    checkDevice(
      'test',
      fake({ status: true, device_status: 'connect', quota: '0' }),
    ),
    /Kuota/,
  );
});

test('uji penerima baru mempertahankan log lama dan menyiapkan satu pinjaman', async () => {
  const day = '2026-11-19';
  const member = {
    member_code: '240103',
    name: 'Penerima uji',
    class_name: 'X',
    phone: '62000000001',
    phone_owner: 'siswa',
    status: 'active',
    consent: true,
  };
  const { id: memberId } = (await call('/members', 'POST', member)).data;
  await call('/books', 'POST', {
    isbn: 'DEMO-1',
    title: 'Buku demo',
    author: 'Tim',
    total: 3,
  });
  await pool.execute(
    "INSERT INTO users(name,email,password) VALUES('Uji','demo@sipus.local','dummy')",
  );
  const first = await prepareLoan(day, false);
  await pool.execute(
    "INSERT INTO reminders(loan_id,scheduled,target,state) VALUES(?,?,?,'Belum tahu')",
    [first, day, member.phone],
  );
  await assert.rejects(prepareLoan(day, true), /penerima lain/);
  await call('/members/' + memberId, 'PUT', {
    ...member,
    phone: '62000000002',
  });
  const [a, b] = await Promise.all([
    prepareLoan(day, true),
    prepareLoan(day, true),
  ]);
  assert.notEqual(a, first);
  assert.equal(a, b);
  assert.equal(await prepareLoan(day, false), first);
  const { logs } = (await call('/reminders')).data;
  assert.equal(logs.find((log) => log.loan_id === first).state, 'Belum tahu');
});

test('kuota tiga eksemplar berlaku lintas transaksi dan tunggakan menahan sisa kuota', async () => {
  const member = (await call('/members', 'POST', {
    member_code: 'QUOTA', name: 'Siswa kuota', class_name: 'X', phone_owner: 'siswa', status: 'active',
  })).data.id;
  const book = (await call('/books', 'POST', { title: 'Buku kuota', author: 'Tim', total: 110 })).data.id;
  const payload = { member_id: member, book_id: book, quantity: 1 };
  const first = await call('/loans', 'POST', payload);
  const second = await call('/loans', 'POST', payload);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal((await call('/loans', 'POST', { ...payload, quantity: 100 })).status, 409);
  const old = shift(wita().slice(0, 10), -7);
  await pool.execute('UPDATE borrowings SET due_date=? WHERE id=?', [old, first.data.id]);
  const blocked = await call('/loans', 'POST', payload);
  assert.match(blocked.data.message, /tunggakan/);
  const receipt = await call('/loans/' + first.data.id + '/receive', 'POST', {});
  assert.equal(receipt.data.state, 'Menunggu pelunasan');
  assert.equal((await call('/loans', 'POST', payload)).status, 409);
  await call('/loans/' + first.data.id + '/pay', 'POST', { amount: receipt.data.fine });
  const two = await call('/loans', 'POST', payload);
  assert.equal(two.status, 201);
  const concurrent = await Promise.all([call('/loans', 'POST', payload), call('/loans', 'POST', payload)]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await call('/catalog')).data.find((b) => b.id === book).stock, 107);
});

test('libur menggeser tenggat, mengubah H-1, dan mempertahankan pesan yang sudah diproses', async () => {
  const member = (await call('/members', 'POST', {
    member_code: 'LIBUR', name: 'Siswa kalender', class_name: 'X', phone_owner: 'wali',
    phone: '628123450001', consent: true, status: 'active',
  })).data.id;
  const book = (await call('/books', 'POST', { title: 'Kalender', author: 'Tim', total: 5 })).data.id;
  const payload = { member_id: member, book_id: book, quantity: 1 };
  const first = (await call('/loans', 'POST', payload)).data;
  const next = (await call('/loans', 'POST', payload)).data;
  const calendar = (await call('/calendar')).data;
  const friday = calendar.due;
  await tick(new Date(reminderDay(friday) + 'T01:00:00Z'), async () => ['Diproses', 'Uji', 'test-holiday'], true, null, first.id);
  const saved = await call('/calendar/holidays/' + friday, 'PUT', { label: 'Libur uji' });
  assert.equal(saved.status, 200);
  const fresh = (await call('/calendar')).data;
  assert.equal(fresh.due, due(calendar.today, { [friday]: 'Libur uji' }));
  assert.ok(fresh.due > friday);
  const loans = (await call('/loans')).data;
  assert.equal(loans.find((l) => l.id === first.id).due_date, fresh.due);
  assert.equal(loans.find((l) => l.id === next.id).due_date, fresh.due);
  const sent = [];
  const send = async (_, message) => {
    sent.push(message);
    return ['Diproses', 'Uji', 'test-holiday-2'];
  };
  const time = new Date(fresh.reminder + 'T01:00:00Z');
  await tick(time, send, true, null, first.id);
  await tick(time, send, true, null, next.id);
  assert.equal(sent.length, 1);
  assert.ok(sent[0].includes(fresh.due));
  const moved = shift(fresh.due, 7);
  assert.equal((await call('/calendar/holidays/' + friday, 'PUT', { new_date: moved, label: 'Libur dipindah' })).status, 200);
  assert.deepEqual((await call('/calendar')).data.holidays, [{ date: moved, label: 'Libur dipindah' }]);
  assert.equal((await call('/calendar/holidays/' + moved, 'DELETE')).status, 200);
  assert.equal((await call('/calendar')).data.due, friday);
});

test('perpanjangan per transaksi mengikuti libur, pratinjau, dan pengingat', async () => {
  const member = (await call('/members', 'POST', {
    member_code: 'EXT', name: 'Siswa perpanjangan', class_name: 'X',
    phone: '628123450002', phone_owner: 'wali', consent: true, status: 'active',
  })).data.id;
  const bookA = (await call('/books', 'POST', { title: 'Buku A perpanjangan', author: 'Tim', total: 3 })).data.id;
  const bookB = (await call('/books', 'POST', { title: 'Buku B perpanjangan', author: 'Tim', total: 3 })).data.id;
  const a = (await call('/loans', 'POST', { member_id: member, book_id: bookA, quantity: 1 })).data.id;
  const b = (await call('/loans', 'POST', { member_id: member, book_id: bookB, quantity: 1 })).data.id;
  const day = wita().slice(0, 10);
  let monday = shift(day, 1);
  while (new Date(monday + 'T00:00:00Z').getUTCDay() !== 1) monday = shift(monday, 1);
  while (due(monday) !== shift(monday, 4) ||
      due(shift(monday, 3)) !== shift(monday, 9) ||
      ![7, 8, 9, 10].every((n) => school(shift(monday, n)))) monday = shift(monday, 7);
  const wednesday = shift(monday, 2), thursday = shift(monday, 3);
  const nextMonday = shift(monday, 7), nextTuesday = shift(monday, 8), nextWednesday = shift(monday, 9);
  await pool.execute('UPDATE borrowings SET borrow_date=?,due_date=? WHERE id=?', [monday, due(monday), a]);
  await pool.execute('UPDATE borrowings SET borrow_date=?,due_date=? WHERE id=?', [thursday, due(thursday), b]);
  assert.equal((await call('/calendar/holidays/' + wednesday, 'PUT', { label: 'Rabu libur' })).status, 200);

  const active = async (id) => (await call('/loans/active')).data.find((loan) => loan.id === id);
  assert.equal((await active(a)).due_date, nextMonday);
  assert.equal((await active(a)).remaining_school_days, lateDays(day, nextMonday, { [wednesday]: 'Libur' }));
  assert.equal((await active(b)).due_date, nextWednesday);
  const url = '/loans/' + a + '/extension';
  const preview = (await call(url + '?days=1')).data;
  assert.equal(preview.due_date, nextTuesday);
  assert.equal((await call(url, 'PUT', preview)).status, 200);
  assert.equal((await active(a)).extension_days, 1);
  assert.equal((await active(b)).due_date, nextWednesday);

  const correction = (await call(url + '?days=2')).data;
  assert.equal((await call('/calendar/holidays/' + nextMonday, 'PUT', { label: 'Senin libur' })).status, 200);
  assert.equal((await active(a)).due_date, nextWednesday);
  const stale = await call(url, 'PUT', correction);
  assert.equal(stale.status, 409);
  assert.equal(stale.data.preview.current_due_date, nextWednesday);
  const messages = [];
  const send = async (_, message) => {
    messages.push(message);
    return ['Diproses', 'Simulasi', 'extended-a'];
  };
  await tick(new Date(nextMonday + 'T01:00:00Z'), send, true, null, a);
  await tick(new Date(nextTuesday + 'T01:00:00Z'), send, true, null, a);
  assert.equal(messages.length, 1);
  assert.ok(messages[0].includes(nextWednesday));
  assert.equal((await call(url, 'PUT', stale.data.preview)).status, 200);
  assert.equal((await active(a)).extension_days, 2);
  const cancel = (await call(url + '?days=0')).data;
  assert.equal(cancel.due_date, nextTuesday);
  assert.equal((await call(url, 'PUT', cancel)).status, 200);
  assert.equal((await active(a)).extension_days, 0);
  assert.equal((await active(a)).due_date, nextTuesday);
  assert.equal((await call('/reminders')).data.logs.find((r) => r.loan_id === a).attempts.length, 1);
  assert.equal((await call('/calendar/holidays/' + nextMonday, 'DELETE')).status, 200);
  assert.equal((await call('/calendar/holidays/' + wednesday, 'DELETE')).status, 200);

  await pool.execute('UPDATE borrowings SET due_date=? WHERE id=?', [day, a]);
  const onDeadline = await call(url + '?days=1');
  assert.equal(onDeadline.status, 200);
  assert.ok(onDeadline.data.due_date > day);
  await call('/loans/' + a + '/receive', 'POST', {});
  assert.equal((await call(url, 'PUT', onDeadline.data)).status, 409);
  assert.equal(await active(a), undefined);

  const past = shift(day, -7);
  await pool.execute('UPDATE borrowings SET borrow_date=?,due_date=? WHERE id=?', [shift(past, -10), past, b]);
  assert.equal((await call('/loans/' + b + '/extension?days=1')).status, 409);
  await pool.execute('UPDATE borrowings SET extension_days=7,extension_base_date=?,due_date=? WHERE id=?', [past, day, b]);
  assert.equal((await call('/loans/' + b + '/extension?days=0')).status, 409);
});

test('Excel siswa memvalidasi baris sebelum menyimpan dan ekspor dapat diimpor ulang', async () => {
  const { mime, columns, workbook, readWorkbook } = require('../src/utils/student-workbook');
  async function excel(url, bytes) {
    return fetch(base + '/api/members/' + url, {
      method: bytes ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, ...(bytes ? { 'Content-Type': mime } : {}) },
      body: bytes,
    });
  }
  const template = await excel('template.xlsx');
  assert.deepEqual((await readWorkbook(Buffer.from(await template.arrayBuffer())))[0].values, columns);
  const student = { member_code: '0007958', name: 'Siswa & Uji', class_name: 'XI', phone: '0812345678', phone_owner: 'wali', consent_at: 'valid', status: 'active' };
  const bad = await workbook([student, student, { ...student, member_code: '0007959', name: '' }]);
  const rejected = await (await excel('import/commit', bad)).json();
  assert.equal(rejected.saved, false);
  assert.deepEqual(rejected.errors.map((e) => e.row), [3, 4]);
  const found = async () => (await call('/members')).data.find((m) => m.member_code === student.member_code);
  assert.equal(await found(), undefined);
  const input = await workbook([student]);
  assert.deepEqual(await (await excel('import/preview', input)).json(), { add: 1, update: 0, errors: [], saved: false });
  assert.equal((await (await excel('import/commit', input)).json()).saved, true);
  const saved = await found();
  assert.equal(saved.phone, '62812345678');
  assert.ok(saved.consent_at);
  const output = await fetch(base + '/api/members/export.xlsx', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: [saved.id] }),
  });
  const exported = Buffer.from(await output.arrayBuffer());
  assert.deepEqual((await readWorkbook(exported)).map((r) => r.values[0]), ['NIS', '0007958']);
  assert.equal((await (await excel('import/preview', exported)).json()).update, 1);
  const changed = await workbook([{ ...student, phone: '0812345679', consent_at: null }]);
  assert.equal((await (await excel('import/commit', changed)).json()).saved, true);
  assert.equal((await found()).phone, '62812345679');
  assert.equal((await found()).consent_at, null);
});

