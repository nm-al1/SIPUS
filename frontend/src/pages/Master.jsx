import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Field,
  Dialog,
  Table,
  Tag,
  SearchBox,
  Status,
  matches,
} from '../components/Common';
import api from '../services/api';

const bookFields = [
  ['title', 'Judul buku'],
  ['author', 'Penulis'],
  ['isbn', 'ISBN / kode koleksi'],
  ['category', 'Kategori'],
  ['shelf', 'Lokasi rak'],
  ['total', 'Stok total', 'number'],
  ['lost', 'Eksemplar hilang', 'number'],
  ['description', 'Deskripsi'],
];
const studentFields = [
  ['member_code', 'Nomor induk siswa'],
  ['name', 'Nama siswa'],
  ['class_name', 'Kelas'],
  ['phone', 'Nomor WhatsApp', 'tel'],
];
export default function Master({ students = false, data, reload }) {
  const [q, setQ] = useState(''),
    [status, setStatus] = useState(''),
    [edit, setEdit] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const resource = students ? 'members' : 'books',
    label = students ? 'siswa' : 'buku';
  const begin = (row) => {
    setError('');
    setEdit({
      ...row,
      consent: Boolean(row.consent_at),
      phone_owner: row.phone_owner || 'siswa',
      status: row.status || 'active',
      lost: row.lost || 0,
    });
  };
  const change = (name, value) =>
    setEdit((old) => ({
      ...old,
      [name]: value,
      ...(['phone', 'phone_owner'].includes(name) ? { consent: false } : {}),
    }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (edit.id) await api.put('/' + resource + '/' + edit.id, edit);
      else await api.post('/' + resource, edit);
      setEdit(null);
      reload('Data ' + label + ' tersimpan.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    if (
      !window.confirm(
        'Arsipkan buku ini dari katalog? Riwayat pinjaman tetap tersimpan.',
      )
    )
      return;
    setBusy(true);
    try {
      await api.delete('/books/' + edit.id);
      setEdit(null);
      reload('Buku diarsipkan.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = data.filter(
    (r) =>
      (!status ||
        (students
          ? r.status === status
          : status === 'archived'
            ? r.archived
            : !r.archived && r.stock > 0)) &&
      matches(
        q,
        r.name,
        r.member_code,
        r.class_name,
        r.title,
        r.author,
        r.isbn,
        r.shelf,
        r.phone,
        r.category,
      ),
  );
  return (
    <>
      <div className="toolbar list-toolbar">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder={
            students
              ? 'Cari nama, NIS, kelas, atau WhatsApp'
              : 'Cari judul, penulis, ISBN, atau rak'
          }
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={students ? 'Status siswa' : 'Status koleksi'}
        >
          <option value="">{students ? 'Semua siswa' : 'Semua koleksi'}</option>
          {students ? (
            <>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </>
          ) : (
            <>
              <option value="available">Tersedia</option>
              <option value="archived">Diarsipkan</option>
            </>
          )}
        </select>
        <button onClick={() => begin({})}>
          <Plus size={18} />
          Tambah {label}
        </button>
      </div>
      <section className="panel flush">
        <Table
          label={students ? 'Daftar siswa' : 'Daftar koleksi dan stok'}
          empty={
            q || status
              ? 'Tidak ada hasil untuk pencarian dan filter ini.'
              : 'Belum ada ' + label + ' terdaftar.'
          }
          headers={
            students
              ? [
                  'Nama siswa',
                  'NIS',
                  'Kelas',
                  'Pengingat WA',
                  'Status',
                  'Tindakan',
                ]
              : [
                  'Judul buku',
                  'Rak',
                  'Total',
                  'Dipinjam',
                  'Hilang',
                  'Tersedia',
                  'Tindakan',
                ]
          }
          rows={filtered.map((r) => ({
            id: r.id,
            cells: [
              ...(students
                ? [
                    <b>{r.name}</b>,
                    r.member_code,
                    r.class_name,
                    <Tag tone={r.consent_at ? '' : 'neutral'}>
                      {r.consent_at ? 'Disetujui' : 'Belum disetujui'}
                    </Tag>,
                    <Tag tone={r.status === 'active' ? '' : 'neutral'}>
                      {r.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </Tag>,
                  ]
                : [
                    <>
                      <b>{r.title}</b>
                      <small>
                        {r.author}
                        {r.archived ? ' · Diarsipkan' : ''}
                      </small>
                    </>,
                    r.shelf || '—',
                    r.total,
                    r.borrowed,
                    r.lost,
                    <Tag tone={r.stock ? '' : 'warn'}>{r.stock}</Tag>,
                  ]),
              <button className="linkbtn" onClick={() => begin(r)}>
                Ubah
              </button>,
            ],
          }))}
        />
      </section>
      {edit && (
        <Dialog
          wide
          title={(edit.id ? 'Ubah ' : 'Tambah ') + label}
          onClose={() => {
            if (!busy) setEdit(null);
          }}
        >
          <form onSubmit={save}>
            <div className="formgrid">
              {(students ? studentFields : bookFields).map(
                ([name, label, type = 'text']) => (
                  <Field key={name} label={label}>
                    <input
                      type={type}
                      min={type === 'number' ? 0 : undefined}
                      required={[
                        'title',
                        'author',
                        'total',
                        'lost',
                        'name',
                        'member_code',
                        'class_name',
                      ].includes(name)}
                      value={edit[name] ?? ''}
                      onChange={(e) => change(name, e.target.value)}
                    />
                  </Field>
                ),
              )}
              {students && (
                <>
                  <Field label="Pemilik nomor">
                    <select
                      value={edit.phone_owner}
                      onChange={(e) => change('phone_owner', e.target.value)}
                    >
                      <option value="siswa">Siswa</option>
                      <option value="wali">Wali</option>
                    </select>
                  </Field>
                  <Field label="Status siswa">
                    <select
                      value={edit.status}
                      onChange={(e) => change('status', e.target.value)}
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
            {students && (
              <label className="check consent-check">
                <input
                  type="checkbox"
                  checked={edit.consent}
                  onChange={(e) => change('consent', e.target.checked)}
                />{' '}
                Pemilik nomor menyetujui pengingat WhatsApp.
              </label>
            )}
            <Status error>{error}</Status>
            <div className="actions">
              {!students && edit.id && !edit.archived && (
                <button
                  type="button"
                  className="linkbtn danger"
                  disabled={busy}
                  onClick={archive}
                >
                  Arsipkan buku
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setEdit(null)}
              >
                Batal
              </button>
              <button disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan ' + label}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
