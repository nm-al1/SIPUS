const express = require('express');
const path = require('node:path');
const cors = require('cors');
const { pool } = require('./config/db');
const { router, wrap } = require('./routes/library');
const reminders = require('./reminders');
const { successResponse, errorResponse } = require('./utils/response');
const app = express();
app.use(cors({ origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ }));
app.use(express.json({ limit: '64kb' }));
app.get(
  '/api/health',
  wrap(async (req, res) => {
    await pool.query('SELECT 1 FROM sessions LIMIT 1');
    return successResponse(res, 'MySQL terhubung', {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }),
);
reminders.routes(router);
app.use('/api', router);
app.use('/api', (req, res) => errorResponse(res, 'Rute tidak ditemukan.', 404));
const dist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((error, req, res, next) => {
  if (error.code === 'ER_DUP_ENTRY')
    return errorResponse(res, 'Kode sudah dipakai. Periksa kembali data.', 409);
  if (!error.status) console.error(error.code || error.name);
  return errorResponse(
    res,
    error.status ? error.message : 'Layanan belum siap. Periksa koneksi MySQL.',
    error.status || 500,
  );
});
if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, '127.0.0.1', () =>
    console.log('SIPUS berjalan di http://127.0.0.1:' + port),
  );
  let busy = false;
  async function run() {
    if (busy) return;
    busy = true;
    try {
      await reminders.tick();
    } catch (e) {
      console.error('Pengingat:', e.code || e.name);
    } finally {
      busy = false;
    }
  }
  run();
  setInterval(run, 60000).unref();
}
module.exports = app;
