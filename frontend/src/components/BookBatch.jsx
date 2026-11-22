import React, { useState } from 'react';
import { Dialog, Field, Status, Table } from './Common';
import api from '../services/api';
import download from '../services/download';

const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const modes = {
  excel: {
    title: 'Impor buku',
    help: 'Gunakan template dan isi ISBN atau kode koleksi pada setiap baris. SIPUS mencocokkan buku yang sudah ada berdasarkan kode tersebut.',
    path: '/books/import',
    extension: '.xlsx',
    type: xlsx,
    maxMB: 4,
    save: 'Simpan hasil impor',
  },
  zip: {
    title: 'Unggah ZIP sampul',
    help: 'Namai gambar sesuai kode koleksi, misalnya BK-001.jpg. Pratinjau menandai sampul yang akan dipasang atau diganti.',
    path: '/books/covers',
    extension: '.zip',
    type: 'application/zip',
    maxMB: 30,
    save: 'Simpan sampul',
  },
};

export default function BookBatch({ books, reload }) {
  const [mode, setMode] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const config = modes[mode];
  const canSave = Boolean(preview && !preview.errors.length && preview.entries.length);

  function reset(next) {
    setMode(next);
    setFile(null);
    setPreview(null);
    setError('');
  }

  async function exportFile(template) {
    setBusy(template ? 'template' : 'export');
    setError('');
    try {
      const blob = { responseType: 'blob' };
      const result = template
        ? await api.get('/books/template.xlsx', blob)
        : await api.post('/books/export.xlsx', { ids: books.map((book) => book.id) }, blob);
      download(result, template ? 'Template-Buku-SIPUS.xlsx' : 'Data-Buku-SIPUS.xlsx');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) return;
    setBusy('upload');
    setError('');
    try {
      if (!file.name.toLowerCase().endsWith(config.extension) || file.size > config.maxMB * 1024 * 1024) {
        throw new Error('Pilih file ' + config.extension + ' berukuran maksimal ' + config.maxMB + ' MB.');
      }
      const headers = { 'Content-Type': config.type };
      if (canSave) headers['X-Sipus-Preview'] = preview.fingerprint;
      const result = await api.post(config.path + (canSave ? '/commit' : '/preview'), file, { headers });
      if (result.saved) {
        const message = mode === 'zip'
          ? result.added + ' sampul dipasang, ' + result.updated + ' sampul diganti.'
          : result.added + ' buku ditambahkan, ' + result.updated + ' buku diperbarui.';
        reset(null);
        reload(message);
      } else {
        setPreview(result);
      }
    } catch (e) {
      if (e.preview) setPreview(e.preview);
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="inline-actions excel-actions" aria-label="Impor dan ekspor buku" role="group">
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => exportFile(true)}>
          {busy === 'template' ? 'Menyiapkan template…' : 'Unduh template Excel'}
        </button>
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => reset('excel')}>Impor buku</button>
        <button type="button" className="secondary" disabled={Boolean(busy) || !books.length} onClick={() => exportFile(false)}>
          {busy === 'export' ? 'Menyiapkan ekspor…' : 'Ekspor buku'}
        </button>
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => reset('zip')}>Unggah ZIP sampul</button>
      </div>
      {!config && <Status error>{error}</Status>}
      {config && (
        <Dialog wide title={config.title} onClose={() => !busy && reset(null)}>
          <form onSubmit={submit}>
            <Field label={'File ' + config.extension}>
              <input type="file" required disabled={Boolean(busy)} accept={config.extension} onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setPreview(null);
                setError('');
              }} />
            </Field>
            <p>{config.help}</p>
            {preview && (
              <>
                <Status error={Boolean(preview.errors.length)}>
                  {mode === 'zip'
                    ? preview.added + ' sampul baru · ' + preview.updated + ' penggantian'
                    : preview.added + ' buku baru · ' + preview.updated + ' pembaruan'}
                  {' · '}{preview.errors.length} perlu diperbaiki
                </Status>
                {preview.errors.length > 0 && (
                  <Table pageSize={6} filterKey={preview.fingerprint} label="Kesalahan file"
                    headers={['Lokasi', 'Kesalahan']}
                    rows={preview.errors.map((item, i) => ({ id: i, cells: [item.location, item.message] }))} />
                )}
                {preview.entries.length > 0 && (
                  <Table pageSize={6} filterKey={preview.fingerprint} label="Pratinjau perubahan"
                    headers={['Lokasi', 'Buku', 'Tindakan']}
                    rows={preview.entries.map((item) => ({
                      id: item.location,
                      cells: [item.location, <><b>{item.title}</b><small>{item.isbn}</small></>, item.action],
                    }))} />
                )}
              </>
            )}
            <Status error>{error}</Status>
            <div className="actions">
              <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => reset(null)}>Batal</button>
              <button type="submit" disabled={!file || Boolean(busy)}>
                {busy ? 'Memproses…' : canSave ? config.save : 'Periksa file'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
