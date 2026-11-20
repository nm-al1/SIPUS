const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { pool, transaction } = require('../config/db');
const {
  due,
  lateDays,
  reminderDay,
  nextSchoolDay,
  wita,
} = require('../utils/calendar');
const router = express.Router();
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
function check(condition, msg, status = 400) {
  if (!condition) throw Object.assign(new Error(msg), { status });
}
function str(value, limit, label, required = true) {
  const text = (typeof value === 'string' ? value : '').trim();
  check((!required || text) && text.length <= limit, label + ' tidak valid.');
  return text;
}
function integer(value, min = 0) {
  const n = Number(value);
  check(
    value !== '' &&
      value != null &&
      Number.isSafeInteger(n) &&
      n >= min &&
      n <= 2147483647,
    'Jumlah atau ID tidak valid.',
  );
  return n;
}
async function rows(sql, params = [], db = pool) {
  return (await db.execute(sql, params))[0];
}
const digest = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
const today = () => wita().slice(0, 10);
const inventory = `SELECT b.id,b.isbn,b.title,b.author,b.publisher,b.year_published,b.description,b.shelf,b.stock,b.lost,b.archived,
  c.name category, COALESCE(l.borrowed,0) borrowed,b.stock+b.lost+COALESCE(l.borrowed,0) total
  FROM books b LEFT JOIN categories c ON c.id=b.category_id LEFT JOIN
  (SELECT book_id,SUM(quantity) borrowed FROM borrowings WHERE status<>'returned' GROUP BY book_id) l ON l.book_id=b.id`;
const loans = `SELECT l.*,m.name member_name,m.member_code,m.class_name,b.title,u.name operator,
  receiver.name received_by_name,payer.name paid_by_name FROM borrowings l
  JOIN members m ON m.id=l.member_id JOIN books b ON b.id=l.book_id JOIN users u ON u.id=l.user_id
  LEFT JOIN users receiver ON receiver.id=l.received_by
  LEFT JOIN users payer ON payer.id=l.paid_by`;
function summary(l, day = today()) {
  const late_days = lateDays(
    l.due_date,
    l.received_date || l.return_date || day,
  );
  const fine =
    l.received_date || l.status === 'returned'
      ? Number(l.fine_amount)
      : late_days * l.quantity * 2000;
  const state =
    l.status === 'returned'
      ? 'Selesai'
      : l.received_date
        ? 'Menunggu pelunasan'
        : day > l.due_date
          ? 'Terlambat'
          : 'Dipinjam';
  return { ...l, late_days, fine, state };
}
router.get(
  '/catalog',
  wrap(async (req, res) => {
    const found = await rows(
      inventory + ' WHERE b.archived=0 ORDER BY b.title',
    );
    res.json(found);
  }),
);
router.post(
  '/login',
  wrap(async (req, res) => {
    const [user] = await rows('SELECT * FROM users WHERE email=?', [
      str(req.body.email, 100, 'Email'),
    ]);
    check(
      user &&
        typeof req.body.password === 'string' &&
        (await bcrypt.compare(req.body.password, user.password)),
      'Email atau kata sandi salah.',
      401,
    );
    const token = crypto.randomBytes(32).toString('hex');
    await rows(
      'INSERT INTO sessions VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))',
      [digest(token), user.id],
    );
    res.json({ token, user: { name: user.name, role: user.role } });
  }),
);
router.use(
  wrap(async (req, res, next) => {
    const token = (req.headers.authorization || '').match(
      /^Bearer ([a-f0-9]{64})$/,
    )?.[1];
    check(token, 'Silakan masuk sebagai petugas.', 401);
    req.hash = digest(token);
    const [user] = await rows(
      'SELECT u.id,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()',
      [req.hash],
    );
    check(user, 'Sesi berakhir. Silakan masuk kembali.', 401);
    req.user = user;
    next();
  }),
);
router.get('/me', (req, res) => res.json(req.user));
router.post(
  '/logout',
  wrap(async (req, res) => {
    await rows('DELETE FROM sessions WHERE token_hash=?', [req.hash]);
    res.json({ ok: true });
  }),
);
router.get(
  '/books',
  wrap(async (req, res) =>
    res.json(await rows(inventory + ' ORDER BY b.archived,b.title')),
  ),
);
async function saveBook(req, res) {
  const b = req.body;
  const total = integer(b.total),
    lost = integer(b.lost ?? 0);
  const title = str(b.title, 255, 'Judul'),
    author = str(b.author, 100, 'Penulis');
  const category = str(b.category, 100, 'Kategori', false);
  const id = await transaction(async (db) => {
    let borrowed = 0,
      categoryId = null;
    if (req.params.id) {
      const [book] = await rows(
        'SELECT id FROM books WHERE id=? FOR UPDATE',
        [integer(req.params.id, 1)],
        db,
      );
      check(book, 'Buku tidak ditemukan.', 404);
      const [n] = await rows(
        "SELECT COALESCE(SUM(quantity),0) n FROM borrowings WHERE book_id=? AND status<>'returned'",
        [book.id],
        db,
      );
      borrowed = Number(n.n);
    }
    check(
      total >= lost + borrowed,
      'Stok total kurang dari jumlah dipinjam dan hilang.',
      409,
    );
    if (category) {
      await rows(
        'INSERT INTO categories(name) VALUES(?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
        [category],
        db,
      );
      categoryId = (
        await rows('SELECT id FROM categories WHERE name=?', [category], db)
      )[0].id;
    }
    const values = [
      title,
      author,
      str(b.isbn, 50, 'ISBN', false) || null,
      categoryId,
      str(b.shelf, 60, 'Rak', false),
      total - borrowed - lost,
      lost,
      str(b.description, 4000, 'Deskripsi', false),
    ];
    if (req.params.id) {
      await rows(
        'UPDATE books SET title=?,author=?,isbn=?,category_id=?,shelf=?,stock=?,lost=?,description=? WHERE id=?',
        [...values, req.params.id],
        db,
      );
      return Number(req.params.id);
    }
    return (
      await rows(
        'INSERT INTO books(title,author,isbn,category_id,shelf,stock,lost,description) VALUES(?,?,?,?,?,?,?,?)',
        values,
        db,
      )
    ).insertId;
  });
  res.json({ id });
}
router.post('/books', wrap(saveBook));
router.put('/books/:id', wrap(saveBook));
router.delete(
  '/books/:id',
  wrap(async (req, res) => {
    const r = await rows('UPDATE books SET archived=1 WHERE id=?', [
      integer(req.params.id, 1),
    ]);
    check(r.affectedRows, 'Buku tidak ditemukan.', 404);
    res.json({ ok: true });
  }),
);
router.get(
  '/members',
  wrap(async (req, res) =>
    res.json(
      await rows(
        'SELECT id,member_code,name,class_name,phone,phone_owner,consent_at,status FROM members ORDER BY name',
      ),
    ),
  ),
);
async function saveMember(req, res) {
  const m = req.body;
  const raw = str(m.phone, 25, 'Nomor WhatsApp', false).replace(/[ +()-]/g, '');
  const phone = raw.replace(/^0/, '62');
  check(!phone || /^\d{8,15}$/.test(phone), 'Nomor WhatsApp tidak valid.');
  check(!m.consent || phone, 'Isi nomor sebelum mencatat persetujuan.');
  check(['wali', 'siswa'].includes(m.phone_owner), 'Pilih pemilik nomor.');
  check(['active', 'inactive'].includes(m.status), 'Status siswa tidak valid.');
  const values = [
    str(m.member_code, 50, 'NIS'),
    str(m.name, 100, 'Nama'),
    str(m.class_name, 60, 'Kelas'),
    phone,
    m.phone_owner,
    m.status,
  ];
  if (req.params.id) {
    const r = await rows(
      `UPDATE members SET consent_at=IF(?,IF(phone=? AND phone_owner=?,COALESCE(consent_at,UTC_TIMESTAMP()),UTC_TIMESTAMP()),NULL),
      member_code=?,name=?,class_name=?,phone=?,phone_owner=?,status=? WHERE id=?`,
      [
        m.consent === true,
        phone,
        m.phone_owner,
        ...values,
        integer(req.params.id, 1),
      ],
    );
    check(r.affectedRows, 'Siswa tidak ditemukan.', 404);
    res.json({ id: Number(req.params.id) });
  } else {
    const r = await rows(
      'INSERT INTO members(member_code,name,class_name,phone,phone_owner,status,consent_at) VALUES(?,?,?,?,?,?,IF(?,UTC_TIMESTAMP(),NULL))',
      [...values, m.consent === true],
    );
    res.json({ id: r.insertId });
  }
}
router.post('/members', wrap(saveMember));
router.put('/members/:id', wrap(saveMember));
router.get(
  '/loans',
  wrap(async (req, res) =>
    res.json(
      (await rows(loans + ' ORDER BY l.id DESC')).map((l) => summary(l)),
    ),
  ),
);
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const day = today();
    const [[counts], active] = await Promise.all([
      rows(
        "SELECT (SELECT COUNT(*) FROM books WHERE archived=0) titles,(SELECT COUNT(*) FROM members WHERE status='active') students",
      ),
      rows(loans + " WHERE l.status<>'returned' ORDER BY l.due_date,l.id"),
    ]);
    const all = active.map((l) => summary(l, day));
    res.json({
      ...counts,
      copies: all.reduce((n, l) => n + l.quantity, 0),
      fine: all.reduce((n, l) => n + l.fine, 0),
      needs: all.filter(
        (l) => l.state !== 'Dipinjam' || l.due_date <= nextSchoolDay(day),
      ),
    });
  }),
);
router.get(
  '/reports',
  wrap(async (req, res) => {
    const { type = 'loans', from = '', to = '' } = req.query;
    check(['books', 'loans'].includes(type), 'Jenis laporan tidak valid.');
    if (type === 'books')
      return res.json(await rows(inventory + ' ORDER BY b.title'));
    for (const value of [from, to]) {
      if (!value) continue;
      const parsed = new Date(value + 'T00:00:00Z');
      check(
        typeof value === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(+parsed) &&
          parsed.toISOString().slice(0, 10) === value,
        'Tanggal laporan tidak valid.',
      );
    }
    check(!from || !to || from <= to, 'Tanggal akhir mendahului tanggal awal.');
    const found = await rows(
      loans +
        ' WHERE l.borrow_date BETWEEN ? AND ? ORDER BY l.borrow_date,l.id',
      [from || '1000-01-01', to || '9999-12-31'],
    );
    res.json(found.map((l) => summary(l)));
  }),
);
router.get('/calendar', (req, res) =>
  res.json({
    today: today(),
    nextSchool: nextSchoolDay(today()),
    due: due(today()),
    reminder: reminderDay(due(today())),
  }),
);
router.post(
  '/loans',
  wrap(async (req, res) => {
    const member = integer(req.body.member_id, 1),
      book = integer(req.body.book_id, 1),
      quantity = integer(req.body.quantity, 1),
      day = today();
    const result = await transaction(async (db) => {
      const [m] = await rows(
        'SELECT status FROM members WHERE id=? FOR UPDATE',
        [member],
        db,
      );
      check(
        m?.status === 'active',
        'Siswa tidak ditemukan atau nonaktif.',
        409,
      );
      const debt = await rows(
        "SELECT id FROM borrowings WHERE member_id=? AND status<>'returned' AND (due_date<? OR fine_amount>0) LIMIT 1",
        [member, day],
        db,
      );
      check(
        !debt.length,
        'Pinjaman diblokir sampai tunggakan diselesaikan.',
        409,
      );
      const r = await rows(
        'UPDATE books SET stock=stock-? WHERE id=? AND archived=0 AND stock>=?',
        [quantity, book, quantity],
        db,
      );
      check(r.affectedRows, 'Stok tersedia tidak mencukupi.', 409);
      const code = 'P-' + crypto.randomUUID().slice(0, 13).toUpperCase();
      const d = due(day);
      const loan = await rows(
        'INSERT INTO borrowings(borrow_code,member_id,book_id,user_id,borrow_date,due_date,quantity) VALUES(?,?,?,?,?,?,?)',
        [code, member, book, req.user.id, day, d, quantity],
        db,
      );
      return { id: loan.insertId, borrow_code: code, due_date: d };
    });
    res.status(201).json(result);
  }),
);
router.post(
  '/loans/:id/:action(receive|pay)',
  wrap(async (req, res) => {
    const day = today(),
      pay = req.params.action === 'pay';
    const result = await transaction(async (db) => {
      const [loan] = await rows(
        'SELECT * FROM borrowings WHERE id=? FOR UPDATE',
        [integer(req.params.id, 1)],
        db,
      );
      check(loan, 'Pinjaman tidak ditemukan.', 404);
      if (loan.status === 'returned' || (!pay && loan.received_date))
        return summary(loan);
      check(
        !pay || loan.received_date,
        'Catat penerimaan fisik terlebih dahulu.',
        409,
      );
      const fine = summary(loan, day).fine;
      if (pay)
        check(
          req.body.amount === fine,
          'Nominal pelunasan harus sesuai denda.',
          409,
        );
      const closed = pay || fine === 0;
      await rows(
        `UPDATE borrowings SET
          received_by=IF(received_date IS NULL,?,received_by),
          received_date=COALESCE(received_date,?),fine_amount=?,paid_date=?,paid_by=?,return_date=?,status=?
          WHERE id=?`,
        [
          req.user.id,
          day,
          fine,
          pay ? day : null,
          pay ? req.user.id : null,
          closed ? day : null,
          closed ? 'returned' : 'overdue',
          loan.id,
        ],
        db,
      );
      if (closed)
        await rows(
          'UPDATE books SET stock=stock+? WHERE id=?',
          [loan.quantity, loan.book_id],
          db,
        );
      return summary(
        (await rows('SELECT * FROM borrowings WHERE id=?', [loan.id], db))[0],
      );
    });
    res.json(result);
  }),
);
module.exports = { router, rows, wrap, check, integer };
