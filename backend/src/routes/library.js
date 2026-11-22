const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { mime, columns, workbook, readWorkbook } = require('../utils/student-workbook');
const { pool, transaction } = require('../config/db');
const {
  due,
  lateDays,
  reminderDay,
  nextSchoolDay,
  addSchoolDays,
  wita,
  school,
  loadCalendar,
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
function summary(l, day, holidays) {
  const settled = l.received_date || l.status === 'returned';
  const late_days = settled
    ? Math.floor(Number(l.fine_amount) / (l.quantity * 2000))
    : lateDays(l.due_date, day, holidays);
  const fine = settled ? Number(l.fine_amount) : late_days * l.quantity * 2000;
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
function memberValues(m) {
  const raw = str(m.phone, 25, 'Nomor WhatsApp', false).replace(/[ +()-]/g, '');
  const phone = raw.replace(/^0/, '62');
  check(!phone || /^\d{8,15}$/.test(phone), 'Nomor WhatsApp tidak valid.');
  check(!m.consent || phone, 'Isi nomor sebelum mencatat persetujuan.');
  check(['wali', 'siswa'].includes(m.phone_owner), 'Pilih pemilik nomor.');
  check(['active', 'inactive'].includes(m.status), 'Status siswa tidak valid.');
  return [
    str(m.member_code, 50, 'NIS'),
    str(m.name, 100, 'Nama'),
    str(m.class_name, 60, 'Kelas'),
    phone,
    m.phone_owner,
    m.status,
  ];
}
async function persistMember(values, consent, id, db = pool) {
  const phone = values[3], owner = values[4];
  if (id) {
    const r = await rows(
      `UPDATE members SET consent_at=IF(?,IF(phone=? AND phone_owner=?,COALESCE(consent_at,UTC_TIMESTAMP()),UTC_TIMESTAMP()),NULL),
      member_code=?,name=?,class_name=?,phone=?,phone_owner=?,status=? WHERE id=?`,
      [
        consent,
        phone,
        owner,
        ...values,
        id,
      ],
      db,
    );
    check(r.affectedRows, 'Siswa tidak ditemukan.', 404);
    return id;
  } else {
    const r = await rows(
      'INSERT INTO members(member_code,name,class_name,phone,phone_owner,status,consent_at) VALUES(?,?,?,?,?,?,IF(?,UTC_TIMESTAMP(),NULL))',
      [...values, consent],
      db,
    );
    return r.insertId;
  }
}
async function saveMember(req, res) {
  const id = await persistMember(memberValues(req.body), req.body.consent === true,
    req.params.id ? integer(req.params.id, 1) : null);
  res.json({ id });
}
const sheetUpload = express.raw({ type: mime, limit: '4mb' });
async function sendWorkbook(res, name, members) {
  res.type(mime).attachment(name).send(await workbook(members));
}
router.get('/members/template.xlsx', wrap(async (req, res) =>
  sendWorkbook(res, 'Template-Data-Siswa-SIPUS.xlsx')));
router.post('/members/export.xlsx', wrap(async (req, res) => {
  check(Array.isArray(req.body.ids), 'Daftar siswa tidak valid.');
  const ids = new Set(req.body.ids.map((id) => integer(id, 1)));
  const members = await rows('SELECT member_code,name,class_name,phone,phone_owner,consent_at,status,id FROM members ORDER BY name,id');
  await sendWorkbook(res, 'Data-Siswa-SIPUS.xlsx', members.filter((m) => ids.has(m.id)));
}));

async function importMembers(req, res) {
  check(Buffer.isBuffer(req.body) && req.body.length, 'Pilih file Excel .xlsx.');
  let parsed;
  try {
    parsed = await readWorkbook(req.body);
  } catch (error) {
    check(false, error.message === 'Maksimal 5.000 siswa dalam satu impor.'
      ? error.message : 'File Excel tidak dapat dibaca. Gunakan template SIPUS.');
  }
  const [header, ...data] = parsed;
  check(header?.number === 1 && !header.hasFormula &&
    columns.every((label, i) => label.toLowerCase() === header.values[i].trim().toLowerCase()),
  'Kolom Excel tidak sesuai. Gunakan template SIPUS.');
  check(data.length, 'File belum berisi data siswa.');
  const errors = [], valid = [];
  const nisKey = (nis) => nis.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const seen = new Set();
  for (const { number, values, hasFormula } of data) {
    const [member_code, name, class_name, phone, owner, permission, status] = values.map((v) => v.trim());
    try {
      check(!hasFormula, 'Masukkan nilai langsung tanpa rumus atau sel error.');
      check(['', 'ya', 'tidak'].includes(permission.toLowerCase()), 'Izin WA harus Ya, Tidak, atau kosong.');
      check(['', 'aktif', 'nonaktif'].includes(status.toLowerCase()), 'Status harus Aktif atau Nonaktif.');
      const consent = permission.toLowerCase() === 'ya';
      check(!phone || owner, 'Isi pemilik nomor jika nomor WA diisi.');
      const values = memberValues({
        member_code, name, class_name, phone, consent,
        phone_owner: owner.toLowerCase() || 'siswa',
        status: status.toLowerCase() === 'nonaktif' ? 'inactive' : 'active',
      });
      const key = nisKey(member_code);
      check(!seen.has(key), 'NIS ganda dalam file.');
      seen.add(key);
      valid.push({ key, values, consent });
    } catch (error) {
      errors.push({ row: number, message: error.message });
    }
  }
  const commit = req.params.action === 'commit';
  const result = await transaction(async (db) => {
    const existing = await rows('SELECT id,member_code FROM members ORDER BY id' +
      (commit && !errors.length ? ' FOR UPDATE' : ''), [], db);
    const byNis = new Map(existing.map((m) => [nisKey(m.member_code), m.id]));
    const update = valid.filter((entry) => byNis.has(entry.key)).length;
    if (commit && !errors.length) {
      for (const item of valid)
        await persistMember(item.values, item.consent, byNis.get(item.key), db);
    }
    return { add: valid.length - update, update, errors, saved: commit && !errors.length };
  });
  res.json(result);
}
router.post('/members/import/:action(preview|commit)', sheetUpload, wrap(importMembers));
router.post('/members', wrap(saveMember));
router.put('/members/:id', wrap(saveMember));
router.get(
  ['/loans', '/loans/active'],
  wrap(async (req, res) => {
    const active = req.path.startsWith('/loans/active');
    const result = await transaction(async (db) => {
      const holidays = await loadCalendar(db, 'FOR SHARE');
      const day = today();
      const filter = active ? " WHERE l.status<>'returned' AND l.received_date IS NULL" : '';
      const found = await rows(loans + filter + ' ORDER BY l.id DESC', [], db);
      return found.map((l) => ({
        ...summary(l, day, holidays),
        ...(active ? { remaining_school_days: lateDays(day, l.due_date, holidays) } : {}),
      }));
    });
    res.json(result);
  }),
);
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const day = today();
    const [[counts], { active, holidays }] = await Promise.all([
      rows(
        "SELECT (SELECT COUNT(*) FROM books WHERE archived=0) titles,(SELECT COUNT(*) FROM members WHERE status='active') students",
      ),
      transaction(async (db) => ({
        holidays: await loadCalendar(db, 'FOR SHARE'),
        active: await rows(loans + " WHERE l.status<>'returned' ORDER BY l.due_date,l.id", [], db),
      })),
    ]);
    const all = active.map((l) => summary(l, day, holidays));
    res.json({
      ...counts,
      copies: all.reduce((n, l) => n + l.quantity, 0),
      fine: all.reduce((n, l) => n + l.fine, 0),
      needs: all.filter(
        (l) => l.state !== 'Dipinjam' || l.due_date <= nextSchoolDay(day, holidays),
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
    const result = await transaction(async (db) => {
      const holidays = await loadCalendar(db, 'FOR SHARE');
      const day = today();
      const found = await rows(
        loans + ' WHERE l.borrow_date BETWEEN ? AND ? ORDER BY l.borrow_date,l.id',
        [from || '1000-01-01', to || '9999-12-31'],
        db,
      );
      return found.map((l) => summary(l, day, holidays));
    });
    res.json(result);
  }),
);
router.get('/calendar', wrap(async (req, res) => {
  const holidays = await loadCalendar();
  const day = today();
  const deadline = due(day, holidays);
  res.json({
    today: day,
    nextSchool: nextSchoolDay(day, holidays),
    due: deadline,
    reminder: reminderDay(deadline, holidays),
    holidays: Object.entries(holidays).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, label]) => ({ date, label })),
  });
}));
function holidayDate(value, day) {
  const date = str(value, 10, 'Tanggal');
  const parsed = new Date(date + 'T00:00:00Z');
  check(/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(+parsed) &&
    parsed.toISOString().slice(0, 10) === date && date >= day && date <= '9998-12-31',
  'Pilih tanggal hari ini atau setelahnya.');
  return date;
}
async function rescheduleUnsent(db, loan, deadline, day, before, after) {
  const scheduled = reminderDay(deadline, after);
  if (scheduled !== reminderDay(loan.due_date, before) && scheduled >= day) {
    await rows(
      "DELETE FROM reminders WHERE loan_id=? AND state='Dilewati' AND NOT EXISTS (SELECT 1 FROM reminder_attempts WHERE loan_id=?)",
      [loan.id, loan.id], db,
    );
  }
}
function schoolDeadline(date, holidays) {
  return school(date, holidays) ? date : nextSchoolDay(date, holidays);
}
async function saveHoliday(req, res) {
  const day = today();
  const date = holidayDate(req.params.date, day);
  const remove = req.method === 'DELETE';
  const replacement = remove ? date : holidayDate(req.body.new_date ?? date, day);
  const label = remove ? '' : str(req.body.label, 120, 'Keterangan');
  const changed = await transaction(async (db) => {
    const previous = await loadCalendar(db, 'FOR UPDATE');
    const holidays = { ...previous };
    if (remove || replacement !== date) {
      check(Object.hasOwn(holidays, date), 'Libur tidak ditemukan.', 404);
      delete holidays[date];
    }
    if (replacement !== date)
      check(!Object.hasOwn(holidays, replacement), 'Tanggal baru sudah terdaftar sebagai libur tambahan.', 409);
    if (!remove) holidays[replacement] = label;
    await rows('UPDATE school_calendar SET holidays=? WHERE id=1', [JSON.stringify(holidays)], db);
    if ([date, replacement].every((d) => school(d, previous) === school(d, holidays))) return 0;
    const active = await rows(
      "SELECT id,borrow_date,due_date,extension_days,extension_base_date FROM borrowings WHERE status<>'returned' AND received_date IS NULL AND due_date>=?",
      [day],
      db,
    );
    let count = 0;
    for (const loan of active) {
      const oldDue = due(loan.borrow_date, previous);
      const base = loan.extension_base_date
        ? schoolDeadline(loan.extension_base_date, holidays)
        : loan.extension_days || loan.due_date === oldDue
          ? due(loan.borrow_date, holidays)
          : schoolDeadline(loan.due_date, holidays);
      const deadline = addSchoolDays(base, loan.extension_days, holidays);
      if (deadline !== loan.due_date) {
        await rows('UPDATE borrowings SET due_date=? WHERE id=?', [deadline, loan.id], db);
        count++;
      }
      await rescheduleUnsent(db, loan, deadline, day, previous, holidays);
    }
    return count;
  });
  res.json({ changed });
}
router.put('/calendar/holidays/:date', wrap(saveHoliday));
router.delete('/calendar/holidays/:date', wrap(saveHoliday));

async function loanExtension(req, res) {
  const id = integer(req.params.id, 1);
  const save = req.method === 'PUT';
  const value = save ? req.body.days : req.query.days;
  const days = !save && typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  check(Number.isInteger(days) && days >= 0 && days <= 365, 'Masukkan 0 sampai 365 hari sekolah.');
  const result = await transaction(async (db) => {
    const holidays = await loadCalendar(db, 'FOR SHARE');
    const [loan] = await rows('SELECT * FROM borrowings WHERE id=?' + (save ? ' FOR UPDATE' : ''), [id], db);
    check(loan, 'Pinjaman tidak ditemukan.', 404);
    const day = today();
    check(
      !loan.received_date && loan.status !== 'returned' && loan.due_date >= day,
      'Perpanjangan hanya tersedia untuk buku yang masih dipegang sampai hari jatuh tempo.',
      409,
    );
    const standard = due(loan.borrow_date, holidays);
    // Preserve legacy deadlines that were originally recorded outside the five-day rule.
    const anchor = loan.extension_base_date ||
      (!loan.extension_days && loan.due_date !== standard ? loan.due_date : null);
    const base = anchor ? schoolDeadline(anchor, holidays) : standard;
    const deadline = addSchoolDays(base, days, holidays);
    check(deadline >= day, 'Batas kembali baru harus hari ini atau setelahnya.', 409);
    const preview = {
      current_due_date: loan.due_date,
      current_days: loan.extension_days,
      due_date: deadline,
      days,
    };
    if (!save) return { preview };
    if (req.body.current_due_date !== preview.current_due_date ||
        req.body.current_days !== preview.current_days ||
        req.body.due_date !== preview.due_date) return { preview, stale: true };
    await rows(
      'UPDATE borrowings SET extension_days=?,extension_base_date=?,due_date=? WHERE id=?',
      [days, anchor, deadline, id], db,
    );
    await rescheduleUnsent(db, loan, deadline, day, holidays, holidays);
    return { preview };
  });
  if (result.stale) {
    return res.status(409).json({
      message: 'Tenggat berubah sejak pratinjau. Periksa hitungan terbaru sebelum menyimpan.',
      preview: result.preview,
    });
  }
  res.json(result.preview);
}
router.get('/loans/:id/extension', wrap(loanExtension));
router.put('/loans/:id/extension', wrap(loanExtension));

router.post(
  '/loans',
  wrap(async (req, res) => {
    const member = integer(req.body.member_id, 1),
      book = integer(req.body.book_id, 1),
      quantity = integer(req.body.quantity, 1),
      day = today();
    const result = await transaction(async (db) => {
      const holidays = await loadCalendar(db, 'FOR SHARE');
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
        "SELECT id,quantity,received_date,due_date,fine_amount FROM borrowings WHERE member_id=? AND status<>'returned'",
        [member],
        db,
      );
      check(
        !debt.some((loan) => loan.due_date < day || Number(loan.fine_amount) > 0),
        'Pinjaman diblokir sampai tunggakan diselesaikan.',
        409,
      );
      const held = debt.reduce((sum, loan) => sum + (loan.received_date ? 0 : loan.quantity), 0);
      check(held + quantity <= 3, 'Maksimal 3 eksemplar per siswa. Sisa kuota: ' + Math.max(0, 3 - held) + '.', 409);
      const r = await rows(
        'UPDATE books SET stock=stock-? WHERE id=? AND archived=0 AND stock>=?',
        [quantity, book, quantity],
        db,
      );
      check(r.affectedRows, 'Stok tersedia tidak mencukupi.', 409);
      const code = 'P-' + crypto.randomUUID().slice(0, 13).toUpperCase();
      const d = due(day, holidays);
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
      const holidays = await loadCalendar(db, 'FOR SHARE');
      const [loan] = await rows(
        'SELECT * FROM borrowings WHERE id=? FOR UPDATE',
        [integer(req.params.id, 1)],
        db,
      );
      check(loan, 'Pinjaman tidak ditemukan.', 404);
      if (loan.status === 'returned' || (!pay && loan.received_date))
        return summary(loan, day, holidays);
      check(
        !pay || loan.received_date,
        'Catat penerimaan fisik terlebih dahulu.',
        409,
      );
      const fine = summary(loan, day, holidays).fine;
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
        day,
        holidays,
      );
    });
    res.json(result);
  }),
);
module.exports = { router, rows, wrap, check, integer };
