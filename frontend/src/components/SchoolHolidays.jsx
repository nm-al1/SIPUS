import React, { useState } from 'react';
import { date, Dialog, Field, Status, Table } from './Common';
import api from '../services/api';

export default function SchoolHolidays({ calendar, reload, onClose }) {
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function begin(holiday, remove = false) {
    setError('');
    setEdit({ ...holiday, originalDate: holiday.date, remove });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const url = '/calendar/holidays/' + (edit.originalDate || edit.date);
      const { changed } = edit.remove
        ? await api.delete(url)
        : await api.put(url, { label: edit.label, new_date: edit.date });
      setEdit(null);
      reload('Libur sekolah tersimpan. ' + changed + ' tenggat pinjaman diperbarui.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Libur sekolah" wide onClose={() => !edit && onClose()}>
      <div className="sectionhead">
        <h2>Libur tambahan</h2>
        <button type="button" onClick={() => begin({ date: '', label: '' })}>Tambah libur</button>
      </div>
      <section className="panel flush">
        <Table
          pageSize={10}
          label="Libur tambahan sekolah"
          headers={['Tanggal', 'Keterangan', 'Tindakan']}
          rows={calendar.holidays.map((holiday) => ({
            id: holiday.date,
            cells: [
              date(holiday.date),
              holiday.label,
              holiday.date >= calendar.today && (
                <div className="inline-actions">
                  <button className="linkbtn" onClick={() => begin(holiday)}>Ubah</button>
                  <button className="linkbtn danger" onClick={() => begin(holiday, true)}>Hapus</button>
                </div>
              ),
            ],
          }))}
          empty="Belum ada libur tambahan."
        />
      </section>
      {edit && (
        <Dialog title={edit.remove ? 'Hapus libur tambahan' : edit.originalDate ? 'Ubah libur' : 'Tambah libur'} onClose={() => !busy && setEdit(null)}>
          <form onSubmit={save}>
            {edit.remove ? (
              <p>Hapus libur {date(edit.date)}? Tenggat pinjaman aktif yang terdampak akan dihitung ulang.</p>
            ) : (
              <div className="formgrid">
                <Field label="Tanggal">
                  <input type="date" min={calendar.today} max="9998-12-31" required value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
                </Field>
                <Field label="Keterangan">
                  <input required maxLength={120} value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
                </Field>
              </div>
            )}
            <Status error>{error}</Status>
            <div className="actions">
              <button type="button" className="secondary" disabled={busy} onClick={() => setEdit(null)}>Batal</button>
              <button disabled={busy}>{busy ? 'Menyimpan…' : edit.remove ? 'Hapus libur' : 'Simpan libur'}</button>
            </div>
          </form>
        </Dialog>
      )}
    </Dialog>
  );
}
