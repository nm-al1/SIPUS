const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const path = require('node:path');
const fs = require('node:fs/promises');
const { mime, columns, workbook, writeWorkbook, readWorkbook } = require('../utils/student-workbook');
const readZip = require('../utils/zip-reader');
const { validateCover, withCoverUploads } = require('../utils/book-covers');
const { normalizeClassName, classKey } = require('../utils/class-name');
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
const inventory = `SELECT b.id,b.isbn,b.title,b.author,b.publisher,b.year_published,b.description,b.shelf,b.stock,b.lost,b.archived,b.cover_image,
  c.name category, COALESCE(l.borrowed,0) borrowed,b.stock+b.lost+COALESCE(l.borrowed,0) total
  FROM books b LEFT JOIN categories c ON c.id=b.category_id LEFT JOIN
  (SELECT book_id,SUM(quantity) borrowed FROM borrowings WHERE status<>'returned' GROUP BY book_id) l ON l.book_id=b.id`;
const loans = `SELECT l.*,m.name member_name,m.member_code,m.class_id,COALESCE(c.name,'') class_name,b.title,u.name operator,
  receiver.name received_by_name,payer.name paid_by_name FROM borrowings l
  JOIN members m ON m.id=l.member_id JOIN books b ON b.id=l.book_id JOIN users u ON u.id=l.user_id
  LEFT JOIN classes c ON c.id=m.class_id
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
function bookInput(b, isbnRequired = false) {
  check(b && typeof b === 'object', 'Data buku tidak valid.');
  return {
    title: str(b.title, 255, 'Judul'),
    author: str(b.author, 100, 'Penulis'),
    isbn: str(b.isbn, 50, 'ISBN / kode koleksi', isbnRequired) || null,
    category: str(b.category, 100, 'Kategori', false),
    shelf: str(b.shelf, 60, 'Rak', false),
    total: integer(b.total),
    lost: integer(b.lost ?? 0),
    description: str(b.description, 4000, 'Deskripsi', false),
  };
}
function availableStock(book, borrowed) {
  check(book.total >= book.lost + borrowed, 'Stok total kurang dari jumlah dipinjam dan hilang.', 409);
  return book.total - book.lost - borrowed;
}
async function borrowedCopies(id, db) {
  if (!id) return 0;
  const [result] = await rows(
    "SELECT COALESCE(SUM(quantity),0) n FROM borrowings WHERE book_id=? AND status<>'returned'",
    [id], db,
  );
  return Number(result.n);
}
async function persistBook(book, stock, id, db, cover = null) {
  let categoryId = null;
  if (book.category) {
    const category = await rows(
      'INSERT INTO categories(name) VALUES(?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
      [book.category], db,
    );
    categoryId = category.insertId;
  }
  const values = [book.title, book.author, book.isbn, categoryId, book.shelf, stock, book.lost, book.description, cover];
  if (id) {
    await rows(
      'UPDATE books SET title=?,author=?,isbn=?,category_id=?,shelf=?,stock=?,lost=?,description=?,cover_image=COALESCE(?,cover_image) WHERE id=?',
      [...values, id], db,
    );
    return id;
  }
  const result = await rows(
    'INSERT INTO books(title,author,isbn,category_id,shelf,stock,lost,description,cover_image) VALUES(?,?,?,?,?,?,?,?,?)',
    values, db,
  );
  return result.insertId;
}
const bookUpload = express.raw({ type: 'multipart/form-data', limit: '6mb', inflate: false });
async function bookForm(req) {
  if (!Buffer.isBuffer(req.body)) return { data: req.body };
  try {
    const form = await new Request('http://localhost', {
      method: 'POST', headers: { 'Content-Type': req.headers['content-type'] }, body: req.body,
    }).formData();
    const image = form.get('cover');
    return {
      data: JSON.parse(form.get('data')),
      file: image ? Buffer.from(await image.arrayBuffer()) : null,
    };
  } catch {
    check(false, 'Form buku atau sampul tidak valid.');
  }
}
async function saveBook(req, res) {
  const { data, file } = await bookForm(req);
  const book = bookInput(data);
  const extension = file ? validateCover(file) : null;
  const id = req.params.id ? integer(req.params.id, 1) : null;
  const saved = await withCoverUploads((store) => transaction(async (db) => {
    if (id) {
      const [existing] = await rows('SELECT id FROM books WHERE id=? FOR UPDATE', [id], db);
      check(existing, 'Buku tidak ditemukan.', 404);
    }
    const stock = availableStock(book, await borrowedCopies(id, db));
    const cover = file ? await store(file, extension) : null;
    return persistBook(book, stock, id, db, cover);
  }));
  res.json({ id: saved });
}
router.post('/books', bookUpload, wrap(saveBook));
router.put('/books/:id', bookUpload, wrap(saveBook));
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
const bookColumns = ['Judul Buku', 'Penulis', 'ISBN / Kode Koleksi', 'Kategori', 'Lokasi Rak', 'Stok Total', 'Eksemplar Hilang', 'Deskripsi'];
const bookRowFields = ['title', 'author', 'isbn', 'category', 'shelf', 'total', 'lost', 'description'];
const bookCode = (value) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
const bookSheet = (books) => writeWorkbook([{
  name: 'Buku',
  rows: [bookColumns, ...books.map((book) => bookRowFields.map((field) => book[field]))],
}], [3]);

async function sendBookSheet(res, filename, books) {
  res.type(mime).attachment(filename).send(await bookSheet(books));
}
router.get('/books/template.xlsx', wrap((req, res) =>
  sendBookSheet(res, 'Template-Buku-SIPUS.xlsx', [])));
router.post('/books/export.xlsx', wrap(async (req, res) => {
  check(Array.isArray(req.body.ids), 'Daftar buku tidak valid.');
  const ids = new Set(req.body.ids.map((id) => integer(id, 1)));
  const books = await rows(inventory + ' ORDER BY b.title,b.id');
  await sendBookSheet(res, 'Data-Buku-SIPUS.xlsx', books.filter((book) => ids.has(book.id)));
}));

async function findBooks(entries, db, commit) {
  const matched = new Map();
  const codes = [...new Set(entries.map((entry) => entry.isbn))].sort();
  for (const isbn of codes) {
    const [book] = await rows(
      'SELECT id,title,cover_image FROM books WHERE isbn=?' + (commit ? ' FOR UPDATE' : ''),
      [isbn], db,
    );
    matched.set(isbn, book);
  }
  return matched;
}
function bookPreview(req, entries, errors, version) {
  return {
    entries,
    errors,
    added: entries.filter((entry) => entry.action === 'Tambah buku' || entry.action === 'Pasang sampul').length,
    updated: entries.filter((entry) => entry.action === 'Perbarui buku' || entry.action === 'Ganti sampul').length,
    fingerprint: crypto.createHash('sha256').update(req.body).update(JSON.stringify(version)).digest('hex'),
    saved: false,
  };
}
function canApplyBookBatch(req, preview) {
  return req.params.action === 'commit' && !preview.errors.length &&
    req.get('X-Sipus-Preview') === preview.fingerprint;
}
function sendBookPreview(req, res, preview) {
  if (req.params.action === 'commit' && !preview.errors.length && !preview.saved) {
    return res.status(409).json({
      message: 'Data buku berubah sejak pratinjau. Periksa hasil terbaru sebelum menyimpan.',
      preview,
    });
  }
  res.json(preview);
}

async function importBooks(req, res) {
  check(Buffer.isBuffer(req.body) && req.body.length, 'Pilih file Excel .xlsx.');
  const limitMessage = 'Maksimal 5.000 buku dalam satu impor.';
  let sheets;
  try {
    sheets = await readWorkbook(req.body, { maxColumns: 8, rowLimitMessage: limitMessage });
  } catch (error) {
    check(false, error.message === limitMessage ? limitMessage : 'File Excel tidak dapat dibaca. Gunakan template buku SIPUS.');
  }
  const errors = [], input = [], seen = new Set();
  let rowCount = 0;
  for (const { name, rows: [header, ...data] } of sheets) {
    if (!header) continue;
    check(header.number === 1 && !header.hasFormula && header.values.length === bookColumns.length &&
      bookColumns.every((label, i) => header.values[i].trim().toLowerCase() === label.toLowerCase()),
    'Kolom pada sheet "' + name + '" tidak sesuai dengan template buku SIPUS.');
    for (const row of data) {
      rowCount++;
      const location = name + ' · baris ' + row.number;
      try {
        check(!row.hasFormula, 'Masukkan nilai langsung tanpa rumus atau sel error.');
        const fields = Object.fromEntries(bookRowFields.map((field, i) => [field, row.values[i]?.trim() || '']));
        const book = bookInput({ ...fields, lost: fields.lost || 0 }, true);
        const key = bookCode(book.isbn);
        check(!seen.has(key), 'ISBN / kode koleksi ganda dalam file.');
        seen.add(key);
        input.push({ ...book, location });
      } catch (error) {
        errors.push({ location, message: error.message });
      }
    }
  }
  check(rowCount, 'File belum berisi data buku.');
  const commit = req.params.action === 'commit';
  const result = await transaction(async (db) => {
    const matched = await findBooks(input, db, commit);
    const valid = [];
    for (const book of input) {
      const existing = matched.get(book.isbn);
      const borrowed = await borrowedCopies(existing?.id, db);
      try {
        const stock = availableStock(book, borrowed);
        valid.push({ book, id: existing?.id, stock });
      } catch (error) {
        errors.push({ location: book.location, message: error.message });
      }
    }
    const entries = valid.map(({ book, id }) => ({
      location: book.location, isbn: book.isbn, title: book.title, action: id ? 'Perbarui buku' : 'Tambah buku',
    }));
    const preview = bookPreview(req, entries, errors, valid.map(({ id }) => id || null));
    if (canApplyBookBatch(req, preview)) {
      for (const item of valid) await persistBook(item.book, item.stock, item.id, db);
      preview.saved = true;
    }
    return preview;
  });
  sendBookPreview(req, res, result);
}
router.post('/books/import/:action(preview|commit)', express.raw({ type: mime, limit: '4mb', inflate: false }), wrap(importBooks));

const bundledCoverFolder = path.resolve(__dirname, '../../../frontend/src/assets/sampul-buku');
const assetKey = (value) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();
async function importBookCovers(req, res) {
  check(Buffer.isBuffer(req.body) && req.body.length, 'Pilih file ZIP sampul.');
  let parts;
  try {
    parts = await readZip(req.body, {
      entryLimit: 250,
      byteLimit: 50 * 1024 * 1024,
      accept: (name) => !name.endsWith('/') && !name.startsWith('__MACOSX/') && path.posix.basename(name) !== '.DS_Store',
    });
  } catch {
    check(false, 'ZIP tidak bisa dibaca. Gunakan maksimal 250 file dengan total isi hingga 50 MB.');
  }
  check(parts.size, 'ZIP belum berisi sampul.');
  const errors = [], input = [], seen = new Set();
  for (const [location, file] of parts) {
    const filename = path.posix.basename(location);
    const suffix = path.posix.extname(filename);
    try {
      check(/\.(jpe?g|png|webp)$/i.test(suffix), 'Gunakan file JPG, PNG, atau WebP.');
      const isbn = str(filename.slice(0, -suffix.length), 50, 'ISBN / kode koleksi');
      const key = bookCode(isbn);
      check(!seen.has(key), 'Ada lebih dari satu sampul untuk kode ini.');
      seen.add(key);
      const extension = validateCover(file);
      check(suffix.toLowerCase().replace('.jpeg', '.jpg') === '.' + extension, 'Ekstensi file tidak cocok dengan format gambar.');
      input.push({ location, isbn, file, extension });
    } catch (error) {
      errors.push({ location, message: error.message });
    }
  }
  const assets = await fs.readdir(bundledCoverFolder).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const bundled = new Set(assets.filter((name) => /\.(jpe?g|png|webp|avif)$/i.test(name))
    .map((name) => assetKey(path.parse(name).name)));
  const commit = req.params.action === 'commit';
  const result = await withCoverUploads((store) => transaction(async (db) => {
    const matched = await findBooks(input, db, commit);
    const valid = [];
    for (const image of input) {
      const book = matched.get(image.isbn);
      if (book) valid.push({ image, book });
      else errors.push({ location: image.location, message: 'Kode koleksi "' + image.isbn + '" belum terdaftar.' });
    }
    const entries = valid.map(({ image, book }) => ({
      location: image.location, isbn: image.isbn, title: book.title,
      action: book.cover_image || bundled.has(assetKey(image.isbn)) ? 'Ganti sampul' : 'Pasang sampul',
    }));
    const preview = bookPreview(req, entries, errors, valid.map(({ book }) => [book.id, book.cover_image]));
    if (canApplyBookBatch(req, preview)) {
      for (const { image, book } of valid) {
        const url = await store(image.file, image.extension);
        await rows('UPDATE books SET cover_image=? WHERE id=?', [url, book.id], db);
      }
      preview.saved = true;
    }
    return preview;
  }));
  sendBookPreview(req, res, result);
}
router.post('/books/covers/:action(preview|commit)', express.raw({ type: 'application/zip', limit: '30mb', inflate: false }), wrap(importBookCovers));

router.get('/classes', wrap(async (req, res) => {
  res.json(await rows(
    'SELECT c.id,c.name,COUNT(m.id) student_count FROM classes c LEFT JOIN members m ON m.class_id=c.id GROUP BY c.id,c.name ORDER BY c.name',
  ));
}));
async function saveClass(req, res) {
  const name = str(normalizeClassName(req.body.name), 60, 'Nama kelas');
  const id = req.params.id ? integer(req.params.id, 1) : null;
  try {
    if (id) {
      const result = await rows('UPDATE classes SET name=? WHERE id=?', [name, id]);
      check(result.affectedRows, 'Kelas tidak ditemukan.', 404);
      return res.json({ id, name });
    }
    const result = await rows('INSERT INTO classes(name) VALUES(?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (error) {
    check(error.code !== 'ER_DUP_ENTRY', 'Nama kelas sudah terdaftar.', 409);
    throw error;
  }
}
router.post('/classes', wrap(saveClass));
router.put('/classes/:id', wrap(saveClass));

const students = `SELECT m.id,m.member_code,m.name,m.class_id,COALESCE(c.name,'') class_name,
  m.phone,m.phone_owner,m.consent_at,m.status FROM members m LEFT JOIN classes c ON c.id=m.class_id
  ORDER BY m.name,m.id`;
router.get(
  '/members',
  wrap(async (req, res) => res.json(await rows(students))),
);
function memberValues(m, requirePhone = false) {
  const raw = str(m.phone, 25, 'Nomor WhatsApp', false).replace(/[ +()-]/g, '');
  const phone = raw.replace(/^0/, '62');
  check(!phone || /^\d{8,15}$/.test(phone), 'Nomor WhatsApp tidak valid.');
  check(!requirePhone || phone, 'Nomor WhatsApp wajib diisi.');
  check(!m.consent || phone, 'Isi nomor sebelum mencatat persetujuan.');
  check(['wali', 'siswa'].includes(m.phone_owner), 'Pilih pemilik nomor.');
  check(['active', 'inactive'].includes(m.status), 'Status siswa tidak valid.');
  return [
    str(m.member_code, 50, 'NIS'),
    str(m.name, 100, 'Nama'),
    phone,
    m.phone_owner,
    m.status,
  ];
}
async function persistMember(values, classId, consent, id, db) {
  const phone = values[2], owner = values[3];
  if (id) {
    const r = await rows(
      `UPDATE members SET consent_at=IF(?,IF(phone=? AND phone_owner=?,COALESCE(consent_at,UTC_TIMESTAMP()),UTC_TIMESTAMP()),NULL),
      member_code=?,name=?,phone=?,phone_owner=?,status=?,class_id=? WHERE id=?`,
      [
        consent,
        phone,
        owner,
        ...values,
        classId,
        id,
      ],
      db,
    );
    check(r.affectedRows, 'Siswa tidak ditemukan.', 404);
    return id;
  } else {
    const r = await rows(
      'INSERT INTO members(member_code,name,phone,phone_owner,status,class_id,consent_at) VALUES(?,?,?,?,?,?,IF(?,UTC_TIMESTAMP(),NULL))',
      [...values, classId, consent],
      db,
    );
    return r.insertId;
  }
}
async function saveMember(req, res) {
  const values = memberValues(req.body);
  const id = await transaction(async (db) => {
    const [item] = req.body.class_id != null
      ? await rows('SELECT id FROM classes WHERE id=? FOR SHARE', [integer(req.body.class_id, 1)], db)
      : await rows('SELECT id FROM classes WHERE name=? FOR SHARE',
        [str(normalizeClassName(req.body.class_name), 60, 'Kelas')], db);
    check(item, 'Pilih kelas yang sudah terdaftar.');
    return persistMember(values, item.id, req.body.consent === true,
      req.params.id ? integer(req.params.id, 1) : null, db);
  });
  res.json({ id });
}
const sheetUpload = express.raw({ type: mime, limit: '4mb' });
async function sendWorkbook(res, name, members, options) {
  res.type(mime).attachment(name).send(await workbook(members, options));
}
router.get('/members/template.xlsx', wrap(async (req, res) =>
  sendWorkbook(res, 'Template-Data-Siswa-SIPUS.xlsx')));
router.post('/members/export.xlsx', wrap(async (req, res) => {
  check(Array.isArray(req.body.ids), 'Daftar siswa tidak valid.');
  const ids = new Set(req.body.ids.map((id) => integer(id, 1)));
  const members = await rows(students);
  await sendWorkbook(res, 'Data-Siswa-SIPUS.xlsx', members.filter((m) => ids.has(m.id)), { byClass: true });
}));

async function importMembers(req, res) {
  check(Buffer.isBuffer(req.body) && req.body.length, 'Pilih file Excel .xlsx.');
  let sheets;
  try {
    sheets = await readWorkbook(req.body);
  } catch (error) {
    check(false, error.message === 'Maksimal 5.000 siswa dalam satu impor.'
      ? error.message : 'File Excel tidak dapat dibaca. Gunakan template SIPUS.');
  }
  const legacyColumns = [...columns.slice(0, -1), 'Izin WA', columns.at(-1)];
  const data = [];
  for (const { name, rows: [header, ...records] } of sheets) {
    if (!header) continue;
    const matchesColumns = (names) => names.length === header.values.length &&
      names.every((label, i) => label.toLowerCase() === header.values[i].trim().toLowerCase());
    const legacy = matchesColumns(legacyColumns);
    check(header.number === 1 && !header.hasFormula && (legacy || matchesColumns(columns)),
      'Kolom pada sheet "' + name + '" tidak sesuai dengan template SIPUS.');
    data.push(...records.map((record) => ({ ...record, sheet: name, legacy })));
  }
  check(data.length, 'File belum berisi data siswa.');
  const errors = [], valid = [];
  const nisKey = (nis) => nis.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const seen = new Set();
  for (const { sheet, legacy, number, values, hasFormula } of data) {
    const fields = values.map((v) => v.trim());
    const [member_code, name, class_name, phone, owner] = fields;
    const status = (fields[legacy ? 6 : 5] || '').toLowerCase();
    const permission = legacy ? (fields[5] || '').toLowerCase() : 'ya';
    try {
      check(!hasFormula, 'Masukkan nilai langsung tanpa rumus atau sel error.');
      check(['', 'ya', 'tidak'].includes(permission), 'Izin WA pada template lama harus Ya, Tidak, atau kosong.');
      check(['', 'aktif', 'nonaktif'].includes(status), 'Status harus Aktif atau Nonaktif.');
      check(owner, 'Pemilik nomor wajib diisi dengan Siswa atau Wali.');
      const className = str(normalizeClassName(class_name), 60, 'Kelas');
      const consent = permission === 'ya';
      const values = memberValues({
        member_code, name, phone, consent,
        phone_owner: owner.toLowerCase(),
        status: status === 'nonaktif' ? 'inactive' : 'active',
      }, true);
      const key = nisKey(member_code);
      check(!seen.has(key), 'NIS ganda dalam file.');
      seen.add(key);
      valid.push({ sheet, row: number, key, values, consent, className });
    } catch (error) {
      errors.push({ sheet, row: number, message: error.message });
    }
  }
  const commit = req.params.action === 'commit';
  const result = await transaction(async (db) => {
    const classes = await rows('SELECT id,name FROM classes' + (commit ? ' FOR SHARE' : ''), [], db);
    const classByName = new Map(classes.map((item) => [classKey(item.name), item.id]));
    const resolved = [];
    for (const item of valid) {
      const classId = classByName.get(classKey(item.className));
      if (classId) resolved.push({ ...item, classId });
      else errors.push({ sheet: item.sheet, row: item.row, message: 'Kelas "' + item.className + '" belum terdaftar.' });
    }
    const sheetOrder = new Map(sheets.map((sheet, i) => [sheet.name, i]));
    errors.sort((a, b) => sheetOrder.get(a.sheet) - sheetOrder.get(b.sheet) || a.row - b.row);
    const existing = await rows('SELECT id,member_code FROM members ORDER BY id' +
      (commit && !errors.length ? ' FOR UPDATE' : ''), [], db);
    const byNis = new Map(existing.map((m) => [nisKey(m.member_code), m.id]));
    const update = resolved.filter((entry) => byNis.has(entry.key)).length;
    if (commit && !errors.length) {
      for (const item of resolved)
        await persistMember(item.values, item.classId, item.consent, byNis.get(item.key), db);
    }
    return { add: resolved.length - update, update, errors, saved: commit && !errors.length };
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
