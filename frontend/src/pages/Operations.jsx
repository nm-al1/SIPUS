import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  LibraryBig,
  Clock3,
  Printer,
  RefreshCw,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  Table,
  Tag,
  Field,
  Status,
  SearchBox,
  matches,
  date,
  rupiah,
  useData,
} from '../components/Common';
import api from '../services/api';
import emblem from '../assets/logo/lambang.png';
const schoolName = 'Perpustakaan SMK Mutiara Ilmu Makassar';
const letterhead = (
  <div className="letterhead">
    <img src={emblem} alt="" width={40} height={40} />
    <strong>{schoolName}</strong>
  </div>
);
export function Dashboard({ dashboard }) {
  const { needs, titles, students, copies, fine } = dashboard;
  return (
    <>
      <div className="metrics">
        {[
          ['Judul koleksi', titles, BookOpen, '/buku'],
          ['Siswa aktif', students, UsersRound, '/siswa'],
          ['Eksemplar dipinjam', copies, LibraryBig, '/sirkulasi/kembali'],
          ['Tunggakan denda', rupiah(fine), Wallet, '/sirkulasi/kembali'],
        ].map(([name, n, Icon, href]) => (
          <Link to={href} className="panel metric-card" key={name}>
            <Icon size={20} aria-hidden="true" />
            <span>{name}</span>
            <strong>{n}</strong>
          </Link>
        ))}
      </div>
      <section className="panel flush">
        <div className="sectionhead inset">
          <h2>Tindak lanjut pinjaman</h2>
          <Link className="collection-link" to="/sirkulasi/kembali">
            Semua pinjaman <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <Table
          pageSize={10}
          label="Tindak lanjut pinjaman"
          headers={['Siswa', 'Judul buku', 'Jatuh tempo', 'Status', 'Tindakan']}
          rows={needs.map((l) => ({
            id: l.id,
            cells: [
              <b>{l.member_name}</b>,
              l.title,
              date(l.due_date),
              <Tag tone="warn">
                {l.state === 'Dipinjam' ? 'Segera jatuh tempo' : l.state}
              </Tag>,
              <Link
                to={'/sirkulasi/kembali?q=' + encodeURIComponent(l.borrow_code)}
              >
                Periksa
              </Link>,
            ],
          }))}
          empty="Belum ada pinjaman yang perlu ditindaklanjuti."
        />
      </section>
    </>
  );
}
export function WhatsApp({ info, reload }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(''),
    [state, setState] = useState('');
  const filtered = info.logs.filter(
    (r) =>
      (!state || r.state === state) &&
      matches(query, r.borrow_code, r.target, r.state, r.provider_id),
  );
  async function action(r, path) {
    if (
      path === 'confirm' &&
      !window.confirm(
        'Pesan dengan judul dan tanggal ini sudah terlihat di HP penerima?',
      )
    )
      return;
    setBusy(true);
    try {
      await api.post('/reminders/' + r.id + '/' + path);
      reload('Log pengingat diperbarui.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel reminder-overview">
        <div className="sectionhead">
          <h2 className="panel-title">
            <Clock3 size={21} aria-hidden="true" /> Jadwal pengingat
          </h2>
          <Tag tone={info.configured ? '' : 'warn'}>
            {info.configured ? 'Token terpasang' : 'Token belum terpasang'}
          </Tag>
        </div>
        <p>
          SIPUS memeriksa pinjaman setiap menit. Pengiriman dimulai pukul 09.00
          WITA pada hari sekolah sebelum jatuh tempo, ke nomor siswa atau wali
          yang aktif untuk pengingat.
        </p>
      </section>
      <div className="sectionhead">
        <h2>Riwayat pengiriman</h2>
        <button className="secondary" onClick={() => reload('')}>
          <RefreshCw size={16} />
          Muat ulang
        </button>
      </div>
      <Status error>{error}</Status>
      <div className="toolbar list-toolbar">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Cari kode pinjaman, nomor, atau ID Fonnte"
        />
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          aria-label="Status pengiriman"
        >
          <option value="">Semua status</option>
          {[...new Set(info.logs.map((r) => r.state))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <section className="panel flush">
        <Table
          pageSize={10}
          filterKey={JSON.stringify([query, state])}
          label="Riwayat pengiriman WhatsApp"
          headers={[
            'Pinjaman',
            'Penerima',
            'Jadwal',
            'Pesan',
            'Status',
            'Tindakan',
          ]}
          rows={filtered.map((r) => ({
            id: r.id,
            cells: [
              <b>{r.borrow_code}</b>,
              r.target,
              date(r.scheduled),
              <details>
                <summary>Lihat isi</summary>
                {r.message}
                <small>
                  {r.updated_at} · ID {r.provider_id || '—'}
                </small>
                {r.attempts.map((a, i) => (
                  <small key={i}>
                    Percobaan {i + 1} · {a.attempted_at} · {a.state}
                  </small>
                ))}
              </details>,
              <>
                <Tag
                  tone={
                    r.state === 'Diterima'
                      ? ''
                      : r.state === 'Gagal' || r.state === 'Belum tahu'
                        ? 'warn'
                        : 'neutral'
                  }
                >
                  {r.state}
                </Tag>
                <small>{r.reason}</small>
              </>,
              r.state === 'Gagal' ? (
                <button
                  className="linkbtn"
                  disabled={busy}
                  onClick={() => action(r, 'retry')}
                >
                  Coba ulang
                </button>
              ) : ['Diproses', 'Belum tahu'].includes(r.state) ? (
                <button
                  className="linkbtn"
                  disabled={busy}
                  onClick={() => action(r, 'confirm')}
                >
                  Konfirmasi dari HP
                </button>
              ) : (
                '—'
              ),
            ],
          }))}
          empty={
            query || state
              ? 'Tidak ada pengingat yang cocok dengan pencarian.'
              : 'Belum ada percobaan pengiriman.'
          }
        />
      </section>
    </>
  );
}
export function Reports() {
  const [kind, setKind] = useState('Sirkulasi'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const circulation = kind === 'Sirkulasi',
    invalid = circulation && from && to && from > to;
  const params = new URLSearchParams({ type: circulation ? 'loans' : 'books' });
  if (circulation && from) params.set('from', from);
  if (circulation && to) params.set('to', to);
  const { data, error, loading } = useData(['/reports?' + params.toString()]);
  const found = data?.[0] || [];
  const rows = circulation
    ? found.map((l) => ({
        id: l.id,
        cells: [
          l.borrow_code,
          l.member_name,
          l.title,
          l.quantity,
          date(l.borrow_date),
          l.state,
          rupiah(l.fine),
        ],
      }))
    : found.map((b) => ({
        id: b.id,
        cells: [b.title, b.shelf || '—', b.total, b.borrowed, b.lost, b.stock],
      }));
  const reportHeading = (
    <>
      <h2>Laporan {kind.toLowerCase()}</h2>
      <p>
        {circulation
          ? 'Periode pinjam ' + (from ? date(from) : 'awal pencatatan') + ' – ' + (to ? date(to) : 'sekarang')
          : 'Posisi stok saat laporan dibuka'}
      </p>
      <small>Dicetak {new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA · {rows.length} data</small>
    </>
  );
  const signatures = (
    <div className="signatures">
      <span>Kepala sekolah</span>
      <span>Petugas perpustakaan</span>
    </div>
  );
  return (
    <>
      <div className="panel toolbar filters">
        <Field label="Jenis laporan">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option>Sirkulasi</option>
            <option>Inventaris</option>
          </select>
        </Field>
        {circulation && (
          <>
            <Field label="Pinjam sejak">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="Sampai">
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </>
        )}
        <button
          disabled={Boolean(invalid || loading || error)}
          onClick={() => window.print()}
        >
          <Printer size={17} />
          Cetak A4
        </button>
      </div>
      {invalid ? (
        <Status error>Tanggal akhir mendahului tanggal awal.</Status>
      ) : error ? (
        <Status error>{error}</Status>
      ) : loading ? (
        <p role="status">Memuat laporan…</p>
      ) : (
        <article className="paper">
          <div className="screen-only">{letterhead}</div>
          {['screen-only', 'print-only'].map((mode) => (
            <div className={mode} key={mode}>
              {mode === 'screen-only' && reportHeading}
              <Table
                label={mode === 'screen-only' ? 'Data laporan' : undefined}
                pageSize={mode === 'screen-only' ? 10 : undefined}
                filterKey={JSON.stringify([kind, from, to])}
                printHeader={mode === 'print-only' ? <>{letterhead}{reportHeading}</> : undefined}
                printFooter={mode === 'print-only' ? signatures : undefined}
                headers={circulation
                  ? ['Kode', 'Siswa', 'Buku', 'Jml', 'Pinjam', 'Status', 'Denda']
                  : ['Judul', 'Rak', 'Total', 'Dipinjam', 'Hilang', 'Tersedia']}
                rows={rows}
                empty="Tidak ada data untuk periode ini."
              />
            </div>
          ))}
          <div className="screen-only">{signatures}</div>
        </article>
      )}
    </>
  );
}
