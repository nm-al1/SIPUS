import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';
import { Dialog, Field, Status } from './Common';
import SearchPicker from './SearchPicker';

export default function ClassDirectory({ classes, total, unassigned, selected, onSelect, reload }) {
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = classes.find((item) => String(item.id) === selected);
  const options = [
    { id: '', name: 'Semua Kelas', student_count: total },
    ...classes,
    ...(unassigned || selected === 'tanpa-kelas'
      ? [{ id: 'tanpa-kelas', name: 'Belum Ada Kelas', student_count: unassigned }]
      : []),
  ];

  function begin(item = { name: '' }) {
    setError('');
    setEdit(item);
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (edit.id) {
        await api.put('/classes/' + edit.id, { name: edit.name });
        reload('Nama kelas diperbarui.');
      } else {
        const created = await api.post('/classes', { name: edit.name });
        onSelect(String(created.id));
        reload('Kelas ditambahkan.');
      }
      setEdit(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel class-directory" aria-labelledby="class-heading">
      <div className="sectionhead class-directory-heading">
        <h2 id="class-heading">Daftar Kelas</h2>
        <div className="inline-actions">
          {current && (
            <button type="button" className="secondary" onClick={() => begin(current)}>
              Ubah Nama Kelas
            </button>
          )}
          <button type="button" className="secondary" onClick={() => begin()}>
            <Plus size={17} aria-hidden="true" /> Tambah Kelas
          </button>
        </div>
      </div>
      <SearchPicker
        label="Cari dan pilih kelas"
        placeholder="Ketik nama kelas"
        listLabel="Pilihan kelas"
        empty="Tidak ada kelas yang cocok."
        items={options.map((item) => ({
          id: String(item.id),
          label: item.name,
          description: item.student_count + ' siswa',
        }))}
        selectedLabel={options.find((item) => String(item.id) === selected)?.name}
        onPick={(item) => onSelect(item.id)}
      />
      {edit && (
        <Dialog title={edit.id ? 'Ubah Nama Kelas' : 'Tambah Kelas'} onClose={() => !busy && setEdit(null)}>
          <form onSubmit={save}>
            <Field label="Nama kelas">
              <input
                required
                maxLength={60}
                value={edit.name}
                onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                disabled={busy}
              />
            </Field>
            <Status error>{error}</Status>
            <div className="actions">
              <button type="button" className="secondary" disabled={busy} onClick={() => setEdit(null)}>Batal</button>
              <button type="submit" disabled={busy || !edit.name.trim()}>
                {busy ? 'Menyimpan…' : 'Simpan Kelas'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
