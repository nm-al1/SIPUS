const { execSync } = require('child_process');
const fs = require('fs');

const pages = [
  '01 - Beranda',
  '02 - Katalog buku',
  '03 - Login petugas',
  '04 - Dashboard',
  '05 - Buku dan stok',
  '06 - Data siswa',
  '07 - Peminjaman',
  '08 - Pengembalian dan denda',
  '09 - WhatsApp',
  '10 - Laporan'
];

if (!fs.existsSync('design/renders/polished')) {
  fs.mkdirSync('design/renders/polished', { recursive: true });
}

pages.forEach(p => {
  const safeName = p.replace(/[^a-zA-Z0-9]/g, '_');
  const cli = '"C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe"';
  const outDir = 'design/renders/polished/' + safeName;
  const cmd = `${cli} export --page "${p}" --out "${outDir}" design/Sipus_base.figcraft`;
  console.log('Exporting page:', p);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to export', p, e.message);
  }
});

console.log('Done exporting all pages.');
