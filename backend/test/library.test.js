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
