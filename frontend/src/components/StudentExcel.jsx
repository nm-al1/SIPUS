import React, { useState } from 'react';
import { Dialog, Field, Status, Table } from './Common';
import api from '../services/api';
import download from '../services/download';
const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function StudentExcel({ students, reload }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  function reset(next) {
    setOpen(next);
    setFile(null);
    setPreview(null);
    setError('');
  }

  async function exportFile(template) {
    setBusy(template ? 'template' : 'export');
    setError('');
    try {
      const config = { responseType: 'blob' };
      const result = template
        ? await api.get('/members/template.xlsx', config)
        : await api.post('/members/export.xlsx', { ids: students.map((m) => m.id) }, config);
      download(result, template ? 'Template-Data-Siswa-SIPUS.xlsx' : 'Data-Siswa-SIPUS.xlsx');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function submit(event) {
    event.preventDefault();
    const commit = Boolean(preview && !preview.errors.length);
    setBusy('import');
    setError('');
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 4 * 1024 * 1024)
        throw new Error('Pilih file .xlsx berukuran maksimal 4 MB.');
      const result = await api.post('/members/import/' + (commit ? 'commit' : 'preview'), file, {
        headers: { 'Content-Type': xlsx },
      });
      if (result.saved) {
        reset(false);
        reload(result.add + ' siswa ditambahkan, ' + result.update + ' siswa diperbarui.');
      } else {
        setPreview(result);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="inline-actions excel-actions" aria-label="Excel data siswa" role="group">
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => exportFile(true)}>
          {busy === 'template' ? 'Menyiapkan template…' : 'Unduh template Excel'}
        </button>
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => reset(true)}>Impor Excel</button>
        <button type="button" className="secondary" disabled={Boolean(busy) || !students.length} onClick={() => exportFile(false)}>
          {busy === 'export' ? 'Menyiapkan ekspor…' : 'Ekspor data siswa'}
        </button>
      </div>
      {!open && <Status error>{error}</Status>}
      {open && (
        <Dialog wide title="Impor data siswa" onClose={() => !busy && reset(false)}>
          <form onSubmit={submit}>
            <Field label="File Excel (.xlsx)">
              <input type="file" required disabled={Boolean(busy)} accept=".xlsx" onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
                setError('');
              }} />
            </Field>
            <p>Gunakan nama kelas yang terdaftar. Isi nomor WhatsApp dan pilih pemiliknya, Siswa atau Wali. Kontak dari template baru akan dipakai untuk pengingat otomatis. Gunakan kontak yang sudah ditetapkan sekolah untuk pengingat.</p>
            {preview && (
              <>
                <Status error={Boolean(preview.errors.length)}>
                  {preview.add} siswa baru · {preview.update} pembaruan · {preview.errors.length} baris perlu diperbaiki.
                </Status>
                {preview.errors.length > 0 && (
                  <Table pageSize={10} label="Kesalahan impor"
                    headers={['Sheet', 'Baris Excel', 'Kesalahan']}
                    rows={preview.errors.map((e) => ({
                      id: (e.sheet || '') + ':' + e.row,
                      cells: [e.sheet || 'Siswa', e.row, e.message],
                    }))} />
                )}
              </>
            )}
            <Status error>{error}</Status>
            <div className="actions">
              <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => reset(false)}>Batal</button>
              <button disabled={!file || Boolean(busy)}>
                {busy ? 'Memproses…' : preview && !preview.errors.length ? 'Simpan hasil impor' : 'Periksa file'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
