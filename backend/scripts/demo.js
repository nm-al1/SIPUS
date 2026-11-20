const { pool, transaction } = require('../src/config/db');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const {
  due,
  lateDays,
  nextSchoolDay,
  reminderDay,
  school,
  shift,
  wita,
} = require('../src/utils/calendar');
const setup = require('./setup');
const email = 'demo@sipus.local';

function loanStart(dueDate) {
  let start = dueDate;
  for (let days = 1; days < 5; ) {
    start = shift(start, -1);
    if (school(start)) days++;
  }
  return start;
}

async function seedLoan(db, userId, scenario) {
  const {
    code,
    nis,
    isbn,
    dueDate,
    quantity = 1,
    received = null,
    settled = false,
  } = scenario;
  const [[existing]] = await db.execute(
    'SELECT id FROM borrowings WHERE borrow_code=?',
    [code],
  );
  if (existing) return;

  const [[member]] = await db.execute(
    'SELECT id FROM members WHERE member_code=?',
    [nis],
  );
  const [[book]] = await db.execute(
    'SELECT id FROM books WHERE isbn=? AND archived=0',
    [isbn],
  );
  if (!book)
    throw Error('Buku untuk ' + code + ' tidak tersedia di koleksi aktif.');
  if (!settled) {
    const [stock] = await db.execute(
      'UPDATE books SET stock=stock-? WHERE id=? AND stock>=?',
      [quantity, book.id, quantity],
    );
    if (!stock.affectedRows)
      throw Error('Stok tidak cukup untuk menyiapkan ' + code + '.');
  }

  const fine = received ? lateDays(dueDate, received) * quantity * 2000 : 0;
  const paid = settled && fine ? received : null;
  await db.execute(
    `INSERT INTO borrowings(
      borrow_code,member_id,book_id,user_id,borrow_date,due_date,quantity,
      received_date,received_by,return_date,fine_amount,paid_date,paid_by,status
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      code,
      member.id,
      book.id,
      userId,
      loanStart(dueDate),
      dueDate,
      quantity,
      received,
      received ? userId : null,
      settled ? received : null,
      fine,
      paid,
      paid ? userId : null,
      settled ? 'returned' : received ? 'overdue' : 'borrowed',
    ],
  );
}

async function demo() {
  await setup();
  const credentials = path.join(__dirname, '../.env.demo.local');
  let password;
  if (fs.existsSync(credentials))
    password = fs
      .readFileSync(credentials, 'utf8')
      .match(/^PASSWORD=(.+)$/m)?.[1]
      ?.trim();
  else {
    password = crypto.randomBytes(12).toString('base64url');
    fs.writeFileSync(
      credentials,
      'EMAIL=' + email + '\nPASSWORD=' + password + '\n',
      { flag: 'wx' },
    );
  }
  await transaction(async (db) => {
    const [[existing]] = await db.execute(
      'SELECT id,password FROM users WHERE email=? FOR UPDATE',
      [email],
    );
    if (existing && !(await bcrypt.compare(password, existing.password)))
      throw Error('Akun demo sudah ada dengan kata sandi lain.');
    const userId =
      existing?.id ||
      (
        await db.execute(
          'INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',
          ['Petugas Demo', email, await bcrypt.hash(password, 10), 'petugas'],
        )
      )[0].insertId;
    const books = [
      [
        'Administrasi Infrastruktur Jaringan',
        'Rudi Hartono',
        'TJKT',
        'A-02',
        8,
      ],
      ['Praktikum Akuntansi Perusahaan', 'Sri Wahyuni', 'Akuntansi', 'B-01', 6],
      ['Modul Projek Ilmu Pengetahuan', 'Eko Prasetyo', 'Umum', 'C-03', 10],
      ['Pemeliharaan Kelistrikan Kendaraan', 'Sutrisno', 'Otomotif', 'D-01', 4],
      ['Dasar Desain Komunikasi Visual', 'Tim DKV', 'DKV', 'A-03', 5],
      ['Pemrograman Web untuk SMK', 'Tim PPLG', 'PPLG', 'A-01', 9],
    ];
    for (const [i, [title, author, cat, shelf, stock]] of books.entries()) {
      await db.execute(
        'INSERT INTO categories(name) VALUES(?) ON DUPLICATE KEY UPDATE id=id',
        [cat],
      );
      await db.execute(
        'INSERT INTO books(isbn,title,author,category_id,shelf,stock) SELECT ?,?,?,id,?,? FROM categories WHERE name=? ON DUPLICATE KEY UPDATE books.id=books.id',
        ['DEMO-' + (i + 1), title, author, shelf, stock, cat],
      );
    }
    for (const [code, name, cl, status = 'active'] of [
      ['240101', 'Nadia Putri Maharani', 'XI TJKT 1'],
      ['240102', 'Ari Nugraha', 'XI PPLG 1'],
      ['240103', 'Aulia Rahma', 'X DKV 1'],
      ['240104', 'Bagas Pratama', 'X TJKT 1', 'inactive'],
      ['240105', 'Keisha Amanda', 'XI DKV 1'],
      ['240106', 'Rizky Maulana', 'X PPLG 1'],
      ['240107', 'Intan Maharani', 'XI AKL 1'],
      ['240108', 'Fajar Ramadhan', 'XI PPLG 2'],
      ['240109', 'Dimas Saputra', 'XII TKR 1'],
      ['240110', 'Salsa Nuraini', 'X DKV 2'],
    ]) {
      await db.execute(
        'INSERT INTO members(member_code,name,class_name,status) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
        [code, name, cl, status],
      );
    }
    const today = wita().slice(0, 10);

    const [[last]] = await db.execute(
      "SELECT id,status FROM borrowings WHERE member_id=(SELECT id FROM members WHERE member_code='240102') AND (borrow_code='DEMO-DENDA' OR borrow_code LIKE 'DEMO-DENDA-%') ORDER BY id DESC LIMIT 1",
    );
    if (
      !last ||
      (process.argv.includes('--denda') && last.status === 'returned')
    ) {
      const code = last
        ? 'DEMO-DENDA-' + crypto.randomUUID().slice(0, 8)
        : 'DEMO-DENDA';
      let finish = shift(today, -4);
      while (!school(finish)) finish = shift(finish, -1);
      await seedLoan(db, userId, {
        code,
        nis: '240102',
        isbn: 'DEMO-2',
        dueDate: finish,
      });
    }

    const lastSchoolDay = reminderDay(today);
    const scenarios = [
      {
        code: 'DEMO-AKTIF',
        nis: '240105',
        isbn: 'DEMO-3',
        dueDate: due(today),
      },
      {
        code: 'DEMO-TEPAT',
        nis: '240106',
        isbn: 'DEMO-3',
        dueDate: lastSchoolDay,
        received: lastSchoolDay,
        settled: true,
      },
      {
        code: 'DEMO-TUNGGU',
        nis: '240107',
        isbn: 'DEMO-5',
        dueDate: reminderDay(lastSchoolDay),
        quantity: 2,
        received: lastSchoolDay,
      },
      {
        code: 'DEMO-LUNAS',
        nis: '240108',
        isbn: 'DEMO-6',
        dueDate: reminderDay(lastSchoolDay),
        received: lastSchoolDay,
        settled: true,
      },
      {
        code: 'DEMO-STOK',
        nis: '240109',
        isbn: 'DEMO-4',
        dueDate: due(today),
        quantity: 3,
      },
      {
        code: 'DEMO-TANPA-WA',
        nis: '240110',
        isbn: 'DEMO-6',
        dueDate: nextSchoolDay(nextSchoolDay(today)),
      },
    ];
    for (const scenario of scenarios) await seedLoan(db, userId, scenario);
  });
  console.log(
    'Data contoh siap. Akun lokal tersimpan di backend/.env.demo.local',
  );
}
if (require.main === module)
  demo()
    .catch((e) => {
      console.error(e.code || e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
