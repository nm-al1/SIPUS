# Menguji WhatsApp SIPUS melalui Fonnte

Siapkan HP WhatsApp pengirim milik tim, HP penerima milik penguji yang setuju, laptop dengan SIPUS berjalan, dan internet. Lakukan latihan sebelum presentasi agar koneksi perangkat dan kuota bisa diperiksa.

## Hubungkan perangkat pengirim

1. Masuk ke dashboard Fonnte, buka **Device**, pilih **Add Device**, lalu isi data perangkat pengirim. Periksa status perangkat dan sisa kuota di daftar perangkat. [Panduan perangkat Fonnte](https://docs.fonnte.com/device/)
2. Pilih **Connect**. Di HP pengirim buka **WhatsApp → Perangkat tertaut → Tautkan perangkat** dan pindai QR di layar laptop. Tunggu perangkat terhubung. [Panduan koneksi](https://docs.fonnte.com/how-to-connect/)
3. Pada baris perangkat yang sama, pilih **Token**. Buka `backend/.env` di editor dan tambahkan satu baris berikut. Ganti teks contoh dengan token perangkat asli. Simpan token hanya di backend dan tutup editor sebelum berbagi layar. [Token perangkat](https://docs.fonnte.com/token-api-key/)

```dotenv
FONNTE_TOKEN=isi_token_perangkat_di_sini
```

4. Di SIPUS, masuk sebagai petugas dan buka **WhatsApp → Muat ulang**. Label **Token terpasang** berarti konfigurasi terbaca. Periksa koneksi WhatsApp dan kuota di dashboard Fonnte.

## Kirim ke HP penguji

1. Buka **Data siswa**, cari NIS **240103** (Aulia Rahma, data contoh), pilih **Ubah**. Isi nomor WhatsApp HP penerima, misalnya dalam format 08… atau 628…, lalu pilih pemilik nomor. Setelah mendapat izin, centang persetujuan dan simpan. Perubahan tujuan mengharuskan petugas mencatat persetujuan kembali.
2. Dari folder `backend`, jalankan pemeriksaan kesiapan. Perintah ini membaca persetujuan penerima, status perangkat, dan kuota melalui API profil Fonnte. [API profil perangkat Fonnte](https://docs.fonnte.com/api-device-profile/)

```powershell
npm.cmd run demo:wa -- --check
```

3. Pada hari sekolah, jalankan perintah berikut untuk **mengirim pesan nyata** ke kontak yang tersimpan pada NIS 240103. Perintah menyiapkan satu pinjaman contoh per tanggal uji dan menjalankan pemeriksaan H-1 khusus pinjaman itu dengan waktu acuan pukul 09.00 WITA. Jam Windows tetap mengikuti waktu sebenarnya. Pinjaman dan log pengiriman tersimpan di MySQL.

```powershell
npm.cmd run demo:wa
```

4. Kembali ke **WhatsApp → Muat ulang**. Pada log pinjaman, periksa nomor, judul, tanggal jatuh tempo, dan isi pesan. Status **Diproses** berarti pesan masuk antrean gateway. [API pengiriman Fonnte](https://docs.fonnte.com/api-send-message/)
5. Tunjukkan pesan masuk pada **HP penerima**, cocokkan judul dan tanggalnya dengan log, lalu pilih **Konfirmasi dari HP**. SIPUS mencatat status **Diterima** beserta petugas yang memeriksa. Pengesahan ini manual. Ambil tangkapan layar dengan izin penguji jika dosen membutuhkan bukti.
6. Jalankan kembali perintah pada tanggal yang sama. Baris dan pesan yang sama hanya diproses satu kali. Untuk demo setelah latihan pada hari yang sama, tunjukkan pesan dan log yang sudah ada. Pada hari sekolah berikutnya perintah menyiapkan transaksi contoh untuk tanggal tersebut.

## Jika pesan belum terlihat

- **Token belum terpasang**. Pastikan token tersimpan di `backend/.env` pada laptop yang menjalankan server. Periksa ejaan `FONNTE_TOKEN`, simpan, lalu muat ulang riwayat.
- **Koneksi ditolak (EACCES)**. Buka PowerShell dari menu Start Windows dan jalankan `npm.cmd run demo:wa -- --check` dari folder `backend`. Tes dari terminal Codex dapat memakai aturan jaringan yang berbeda dari terminal Windows biasa.
- **Gagal**. Baca alasan gateway, periksa perangkat, kuota, dan nomor penerima. Setelah diperbaiki, pilih **Coba ulang** selama pinjaman masih memenuhi syarat.
- **Belum tahu**. Cocokkan waktu, nomor tujuan, dan isi pesan di riwayat Fonnte dan HP penerima. Jika pesan sudah terlihat di HP, gunakan **Konfirmasi dari HP**. Status ini tidak tersedia untuk kirim ulang otomatis.
- **Tidak ada pengiriman**. Periksa persetujuan dan status aktif siswa, serta apakah transaksi sudah dikembalikan. Penjadwal reguler berjalan setiap menit selama backend hidup dan mulai mengirim pada H-1 hari sekolah pukul 09.00 WITA. Jika jatuh tempo Senin, jadwal biasanya Jumat sebelumnya. Jadwal yang terlewat dan sudah mencapai tanggal jatuh tempo dicatat sebagai **Dilewati**.

Jika percobaan hari ini berstatus **Belum tahu** dan belum memiliki ID Fonnte, ganti nomor WhatsApp NIS 240103 dengan nomor penerima lain yang setuju. Simpan persetujuan untuk nomor baru, lalu jalankan `npm.cmd run demo:wa -- --check` dari PowerShell Windows. Setelah berhasil, jalankan `npm.cmd run demo:wa -- --penerima-baru` untuk mengirim satu uji baru ke nomor tersebut. SIPUS menyimpan log sebelumnya dan memakai satu pinjaman uji baru untuk hari itu.

Setelah demo, cabut persetujuan pada data siswa jika penguji selesai berpartisipasi. Untuk menghentikan pengiriman otomatis, kosongkan `FONNTE_TOKEN` pada file konfigurasi.
