import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { date, Dialog, Field, matches, SearchBox, Status, Table, Tag } from '../components/Common';
import SchoolHolidays from '../components/SchoolHolidays';
import api from '../services/api';

function Extension({ loan, onClose, reload }) {
  const [days, setDays] = useState(String(loan.extension_days || 1));
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const url = '/loans/' + loan.id + '/extension';

  function change(value) {
    setDays(value);
    setPreview(null);
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!preview) {
        setPreview(await api.get(url, { params: { days } }));
      } else {
        const result = await api.put(url, preview);
        reload('Batas kembali ' + loan.borrow_code + ' diperbarui menjadi ' + date(result.due_date) + '.');
      }
    } catch (e) {
      setPreview(e.preview || null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={loan.extension_days ? 'Ubah perpanjangan' : 'Perpanjang pinjaman'} onClose={() => !busy && onClose()}>
      <strong>{loan.title}</strong>
      <p>{loan.member_name} · {loan.borrow_code}</p>
      <form onSubmit={submit}>
        <p>Batas kembali saat ini <b>{date(preview?.current_due_date || loan.due_date)}</b></p>
        <Field label="Tambahan hari sekolah">
          <input type="number" min={loan.extension_days ? 0 : 1} max={365} step="1" required
            value={days} onChange={(e) => change(e.target.value)} disabled={busy} />
        </Field>
        {loan.extension_days > 0 && (
          <p>
            <button type="button" className="linkbtn" disabled={busy} onClick={() => change('0')}>
              Batalkan perpanjangan
            </button>
          </p>
        )}
        {preview && (
          <Status>
            {preview.days ? 'Tambahan ' + preview.days + ' hari sekolah.' : 'Perpanjangan akan dibatalkan.'}
            {' Batas kembali baru ' + date(preview.due_date) + '.'}
          </Status>
        )}
        <Status error>{error}</Status>
        <div className="actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>Tutup</button>
          <button disabled={busy || days === ''}>
            {busy ? 'Memproses…' : preview ? 'Simpan perubahan' : 'Lihat batas kembali baru'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function ActiveLoans({ loans, calendar, reload }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [holidaysOpen, setHolidaysOpen] = useState(false);

  function refresh(message) {
    setSelected(null);
    setHolidaysOpen(false);
    reload(message);
  }

  if (!Array.isArray(loans) || !Array.isArray(calendar?.holidays)) {
    return <Status error>Mulai ulang backend SIPUS, lalu muat ulang halaman ini.</Status>;
  }

  const key = query.trim().toLowerCase();
  const exact = loans.filter((l) => l.borrow_code.toLowerCase() === key || l.member_code.toLowerCase() === key);
  const result = exact.length ? exact : loans.filter(
    (l) => matches(query, l.member_name, l.member_code, l.title, l.borrow_code),
  );
  result.sort((a, b) => a.member_name.localeCompare(b.member_name, 'id') ||
    a.member_code.localeCompare(b.member_code, 'id') || a.due_date.localeCompare(b.due_date) || a.id - b.id);

  return (
    <>
      <div className="toolbar list-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Cari nama, NIS, judul, atau kode pinjam" />
        <button type="button" className="secondary" onClick={() => setHolidaysOpen(true)}>
          <CalendarDays size={17} aria-hidden="true" /> Libur sekolah
        </button>
      </div>
      <section className="panel flush">
        <Table pageSize={10} filterKey={query} label="Daftar pinjaman aktif"
          headers={['Siswa', 'Buku', 'Tanggal pinjam', 'Batas kembali', 'Sisa waktu', 'Tindakan']}
          empty={query ? 'Tidak ada pinjaman yang cocok.' : 'Belum ada buku yang sedang dipegang siswa.'}
          rows={result.map((loan) => {
            const late = loan.state === 'Terlambat';
            const dueToday = !late && loan.due_date === calendar.today;
            return {
              id: loan.id,
              cells: [
                <><b>{loan.member_name}</b><small>NIS {loan.member_code}</small></>,
                <><b>{loan.title}</b><small>{loan.quantity} eksemplar · {loan.borrow_code}</small></>,
                date(loan.borrow_date),
                <><b>{date(loan.due_date)}</b>{loan.extension_days > 0 && <small>+{loan.extension_days} hari sekolah</small>}</>,
                late || dueToday
                  ? <Tag tone="warn">{late ? 'Terlambat' : 'Jatuh tempo hari ini'}</Tag>
                  : <>{loan.remaining_school_days} hari sekolah<small>setelah hari ini</small></>,
                late
                  ? <Link className="linkbtn" to={'/sirkulasi/kembali?q=' + encodeURIComponent(loan.borrow_code)}>Pengembalian</Link>
                  : <button type="button" className="linkbtn" onClick={() => setSelected(loan)}>
                      {loan.extension_days ? 'Ubah perpanjangan' : 'Perpanjang'}
                    </button>,
              ],
            };
          })}
        />
      </section>
      {selected && <Extension loan={selected} onClose={() => setSelected(null)} reload={refresh} />}
      {holidaysOpen && <SchoolHolidays calendar={calendar} reload={refresh} onClose={() => setHolidaysOpen(false)} />}
    </>
  );
}
