import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  UserRound,
} from 'lucide-react';
import api from '../services/api';
import {
  date,
  rupiah,
  Dialog,
  Field,
  Table,
  SearchBox,
  LoanStatus,
  Status,
  matches,
} from '../components/Common';
export function Borrow({ members, books, loans, calendar, reload }) {
  const [nis, setNis] = useState(''),
    [verified, verify] = useState(''),
    [bookId, setBook] = useState(''),
    [bookSearch, setBookSearch] = useState(''),
    [quantity, setQty] = useState('1'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const student = members.find((m) => m.member_code === verified && verified),
    book = books.find((b) => String(b.id) === bookId);
  const debt =
    student &&
    loans.find(
      (l) =>
        l.member_id === student.id &&
        ['Terlambat', 'Menunggu pelunasan'].includes(l.state),
    );
  const eligible = student?.status === 'active' && !debt;
  const availableBooks = books.filter((b) => !b.archived && b.stock > 0);
  const bookOptions = availableBooks.filter(
    (b) =>
      String(b.id) === bookId ||
      matches(bookSearch, b.title, b.author, b.isbn, b.shelf),
  );
  const validQuantity =
    book &&
    Number.isInteger(+quantity) &&
    quantity >= 1 &&
    quantity <= book.stock;
  async function save() {
    setBusy(true);
    setError('');
    try {
      const v = await api.post('/loans', {
        member_id: student.id,
        book_id: book.id,
        quantity: Number(quantity),
      });
      reload(
        'Pinjaman ' +
          v.borrow_code +
          ' tersimpan. Jatuh tempo ' +
          date(v.due_date) +
          '.',
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="split circulation-layout">
      <section className="panel circulation-form">
        <h2 className="panel-title">
          <UserRound size={21} aria-hidden="true" /> Verifikasi siswa
        </h2>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            verify(nis.trim());
          }}
        >
          <Field label="Nomor induk siswa (NIS)">
            <input
              required
              inputMode="numeric"
              placeholder="Masukkan NIS"
              value={nis}
              onChange={(e) => {
                setNis(e.target.value);
                verify('');
              }}
            />
          </Field>
          <button type="submit" disabled={!nis.trim()}>
            Cek NIS <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
        {verified &&
          (student ? (
            <div className="student-verification">
              <h3>{student.name}</h3>
              <p>
                NIS {student.member_code} · {student.class_name}
              </p>
              <Status error={!eligible}>
                {student.status !== 'active'
                  ? 'Status siswa nonaktif.'
                  : debt
                    ? 'Peminjaman diblokir sampai tunggakan diselesaikan.'
                    : 'Siswa aktif dan layak meminjam.'}
              </Status>
              {debt && (
                <Link
                  className="collection-link"
                  to={
                    '/sirkulasi/kembali?q=' +
                    encodeURIComponent(debt.borrow_code)
                  }
                >
                  Lihat pinjaman terkait{' '}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          ) : (
            <Status error>NIS tidak ditemukan.</Status>
          ))}
        <hr />
        <h2 className="panel-title">
          <BookOpen size={21} aria-hidden="true" /> Pilih koleksi
        </h2>
        {!eligible && (
          <p>Verifikasi NIS siswa yang layak meminjam untuk memilih buku.</p>
        )}
        <fieldset disabled={!eligible || busy} className="book-selection">
          <SearchBox
            value={bookSearch}
            onChange={setBookSearch}
            placeholder="Saring judul, penulis, ISBN, atau rak"
          />
          <div className="loan-fields">
            <Field label="Buku">
              <select value={bookId} onChange={(e) => setBook(e.target.value)}>
                <option value="">Pilih judul buku</option>
                {bookOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} · {b.stock} tersedia
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jumlah eksemplar">
              <input
                type="number"
                min="1"
                max={book?.stock}
                value={quantity}
                onChange={(e) => setQty(e.target.value)}
              />
            </Field>
          </div>
          {eligible && !bookOptions.length && (
            <p role="status">Tidak ada buku tersedia yang cocok.</p>
          )}
          {book && (
            <p className={!validQuantity ? 'field-error' : undefined}>
              {!validQuantity && 'Periksa jumlah yang dipilih. '}
              Tersedia {book.stock} eksemplar
              {book.shelf ? ' di rak ' + book.shelf : ''}.
            </p>
          )}
        </fieldset>
      </section>
      <section className="panel summary">
        <h2 className="panel-title">
          <ClipboardList size={21} aria-hidden="true" /> Ringkasan pinjaman
        </h2>
        <dl>
          <dt>Peminjam</dt>
          <dd>{student?.name || 'Belum dipilih'}</dd>
          <dt>Koleksi</dt>
          <dd>{book?.title || 'Belum dipilih'}</dd>
          <dt>Tanggal pinjam</dt>
          <dd>{date(calendar.today)}</dd>
          <div className="due-preview">
            <dt>
              <CalendarDays size={15} aria-hidden="true" /> Jatuh tempo
            </dt>
            <dd>{date(calendar.due)}</dd>
          </div>
          <dt>Jumlah</dt>
          <dd>{quantity || 0} eksemplar</dd>
        </dl>
        <Status error>{error}</Status>
        <button disabled={busy || !eligible || !validQuantity} onClick={save}>
          <Check size={17} aria-hidden="true" />{' '}
          {busy ? 'Menyimpan…' : 'Konfirmasi peminjaman'}
        </button>
      </section>
    </div>
  );
}
export function Returns({ loans, reload }) {
  const [params] = useSearchParams(),
    [q, setQ] = useState(params.get('q') || ''),
    [filter, setFilter] = useState('Aktif'),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const payment = selected?.state === 'Menunggu pelunasan';
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const result = await api.post(
        '/loans/' + selected.id + '/' + (payment ? 'pay' : 'receive'),
        { amount: selected.fine },
      );
      setSelected(null);
      reload(selected.borrow_code + ' · ' + result.state + '.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="toolbar list-toolbar">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Cari kode pinjam, NIS, siswa, atau judul"
        />
        <select
          aria-label="Status pinjaman"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>Aktif</option>
          <option>Selesai</option>
          <option>Semua</option>
        </select>
      </div>
      <section className="panel flush">
        <Table
          label="Daftar pengembalian"
          empty="Tidak ada pinjaman untuk pencarian dan status ini."
          headers={[
            'Peminjam',
            'Buku',
            'Jatuh tempo',
            'Denda',
            'Status',
            'Tindakan',
          ]}
          rows={loans
            .filter(
              (l) =>
                (filter === 'Semua' ||
                  (filter === 'Selesai') === (l.state === 'Selesai')) &&
                matches(
                  q,
                  l.member_name,
                  l.member_code,
                  l.title,
                  l.borrow_code,
                ),
            )
            .map((l) => ({
              id: l.id,
              cells: [
                <>
                  <b>{l.member_name}</b>
                  <small>
                    {l.member_code} · {l.borrow_code}
                  </small>
                </>,
                l.title + ' × ' + l.quantity,
                date(l.due_date),
                rupiah(l.fine),
                <LoanStatus state={l.state} />,
                <button
                  className="linkbtn"
                  onClick={() => {
                    setSelected(l);
                    setError('');
                  }}
                >
                  Rincian
                </button>,
              ],
            }))}
        />
      </section>
      {selected && (
        <Dialog
          title="Rincian pengembalian"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="record-heading">
            <code>{selected.borrow_code}</code>
            <LoanStatus state={selected.state} />
          </div>
          <h3>
            {selected.title} × {selected.quantity}
          </h3>
          <p>
            {selected.member_name} · NIS {selected.member_code}
          </p>
          <div className={'fine-preview' + (selected.fine ? ' has-fine' : '')}>
            <span>Denda keterlambatan</span>
            <strong>{rupiah(selected.fine)}</strong>
            <small>
              {selected.late_days} hari sekolah × {selected.quantity} buku ×
              Rp2.000
            </small>
          </div>
          <dl className="record-grid">
            <div>
              <dt>Tanggal pinjam</dt>
              <dd>{date(selected.borrow_date)}</dd>
            </div>
            <div>
              <dt>Jatuh tempo</dt>
              <dd>{date(selected.due_date)}</dd>
            </div>
            <div>
              <dt>Diterima fisik</dt>
              <dd>
                {date(selected.received_date)}
                {selected.received_by_name && (
                  <small>{selected.received_by_name}</small>
                )}
              </dd>
            </div>
            <div>
              <dt>Dilunasi</dt>
              <dd>
                {date(selected.paid_date)}
                {selected.paid_by_name && (
                  <small>{selected.paid_by_name}</small>
                )}
              </dd>
            </div>
          </dl>
          {payment && (
            <Status>Stok kembali tersedia setelah denda dilunasi.</Status>
          )}
          <Status error>{error}</Status>
          {selected.state !== 'Selesai' && (
            <button disabled={busy} onClick={submit}>
              {busy
                ? 'Menyimpan…'
                : payment
                  ? 'Konfirmasi pembayaran tunai ' + rupiah(selected.fine)
                  : 'Catat buku diterima fisik'}
            </button>
          )}
        </Dialog>
      )}
    </>
  );
}
