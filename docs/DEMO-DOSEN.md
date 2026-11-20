# Demo SIPUS Digital

Di laptop proyek, klik dua kali **Mulai-Demo.cmd**. Launcher menyiapkan skema dan data contoh, lalu membuka aplikasi di **http://127.0.0.1:5000**. Biarkan jendela server berjalan selama demo. MySQL menggunakan pengaturan di `backend/.env`. Untuk laptop lain, pasang dependensi dengan `npm ci` di `backend` dan `frontend`, lalu jalankan `npm run build` di `frontend`. Gunakan Node 22 atau lebih baru serta MySQL 8.

## Urutan presentasi

1. Buka **Katalog** tanpa login. Cari “Jaringan”, buka detail buku, lalu tunjukkan rak dan stok.
2. Masuk melalui **Login petugas**. Email dan kata sandi lokal dihasilkan saat penyiapan dan tersimpan di `backend/.env.demo.local`. Buka file tersebut di editor sebelum presentasi.
3. Di **Peminjaman**, masukkan NIS **240101**, pilih **Cek NIS**, lalu pinjam satu buku. Tunjukkan tanggal jatuh tempo dan perubahan stok di **Buku dan stok**.
4. Buka **Pengembalian**, cari kode pinjam baru, pilih **Rincian → Catat buku diterima fisik**. Pinjaman tepat waktu langsung selesai. Riwayatnya tersedia melalui filter **Selesai**.
5. Coba pinjam dengan NIS **240102**. Siswa contoh memiliki transaksi terlambat **DEMO-DENDA**. Buka transaksi itu, catat penerimaan fisik, lalu perlihatkan bahwa stok masih terpinjam dan denda masih terutang. Setelah menerima uang, pilih **Konfirmasi pembayaran tunai**. Kini siswa dapat meminjam lagi dan stok kembali tersedia. Skenario ini memakai satu transaksi persisten. Jika sudah diselesaikan saat latihan, siapkan transaksi contoh baru untuk presentasi dengan `npm run demo:denda` di folder backend.
6. Buka **Laporan**, pilih sirkulasi atau inventaris, periksa hasil, lalu **Cetak A4** dan pilih printer atau simpan PDF.
7. Untuk pengingat sebelum jatuh tempo, ikuti [panduan pengiriman WhatsApp](FONNTE-DEMO.md).

## Sepuluh siswa demo

Cari berdasarkan NIS di **Data siswa** atau masukkan NIS di **Peminjaman**. Untuk membuka transaksi tertentu, pakai kode di kolom pencarian **Pengembalian**.

| NIS | Nama | Skenario | Cara menunjukkan |
| --- | --- | --- | --- |
| 240101 | Nadia Putri Maharani | Pinjam normal | Cek NIS, pilih buku yang tersedia, lalu simpan. Tunjukkan tanggal jatuh tempo dan pengurangan stok. |
| 240102 | Ari Nugraha | Terlambat dan diblokir | Cek NIS untuk melihat penolakan. Buka `DEMO-DENDA` untuk melihat denda sebelum buku diterima fisik. |
| 240103 | Aulia Rahma | WhatsApp diterima | Buka **WhatsApp** dan cari kode berakhiran `-BARU`. Tunjukkan log **Diterima** yang sudah dikonfirmasi dari HP. |
| 240104 | Bagas Pratama | Siswa nonaktif | Cek NIS di **Peminjaman**. Siswa ditemukan dan konfirmasi pinjam dinonaktifkan. |
| 240105 | Keisha Amanda | Buku aktif, kembali tepat waktu | Buka `DEMO-AKTIF` dan catat penerimaan fisik. Denda Rp0, transaksi selesai, dan stok bertambah satu. |
| 240106 | Rizky Maulana | Riwayat pengembalian tepat waktu | Pilih filter **Selesai** dan cari `DEMO-TEPAT`. Tunjukkan tanggal diterima dan denda Rp0. |
| 240107 | Intan Maharani | Buku diterima, denda belum lunas | Buka `DEMO-TUNGGU`. Dua buku sudah diterima, masih terhitung dipinjam, dan denda Rp4.000 menunggu pelunasan. |
| 240108 | Fajar Ramadhan | Denda sudah lunas | Pilih filter **Selesai** dan cari `DEMO-LUNAS`. Tunjukkan pembayaran Rp2.000 dan nama petugas yang mencatat pelunasan. |
| 240109 | Dimas Saputra | Pinjaman beberapa eksemplar dan stok terbatas | Tunjukkan tiga eksemplar di `DEMO-STOK`. Di **Peminjaman**, pilih *Pemeliharaan Kelistrikan Kendaraan* dan masukkan jumlah melebihi stok tersisa. |
| 240110 | Salsa Nuraini | Pinjaman aktif tanpa izin WhatsApp | Tunjukkan `DEMO-TANPA-WA` dan status persetujuan di **Data siswa**. Jadwal jatuh tempo tetap tercatat dan pengingat melewati siswa ini. |

Baris WhatsApp Aulia memakai bukti uji yang sudah dikonfirmasi pada database laptop ini. Data baru lainnya tidak berisi nomor WhatsApp. Menjalankan seed ulang mempertahankan transaksi yang sudah dipraktikkan. Jika ingin menunjukkan keadaan awal saat presentasi, buka rincian kasus yang ingin dipertahankan sebelum menjalankan aksi simpan atau lunas.

## Aturan yang digunakan saat demo

Masa pinjam lima hari sekolah menghitung hari pinjam sebagai hari pertama jika hari itu hari sekolah. Kalender Makassar melewati Sabtu, Minggu, dan libur nasional yang tercantum pada SKB 2026–2027. Cuti bersama dan libur khusus sekolah dapat berbeda menurut kalender mitra. Perbarui daftar di `backend/src/utils/calendar.js` untuk tahun berikutnya. [Libur nasional 2026](https://www2.kemenkopmk.go.id/pemerintah-tetapkan-17-hari-libur-nasional-dan-8-cuti-bersama-tahun-2026) · [Libur nasional 2027](https://www2.kemenkopmk.go.id/node/6441)

Denda demo Rp2.000 × jumlah buku × hari sekolah terlambat. Sebagai asumsi demo, denda berhenti bertambah saat buku diterima secara fisik. Petugas melunasi seluruh denda untuk menutup transaksi. Satu transaksi mencatat satu judul dengan satu atau beberapa eksemplar yang dikembalikan bersama. Konfirmasi kebijakan ini dengan mitra sebelum penggunaan operasional.

Semua nama, kode koleksi, dan transaksi awal adalah data contoh. Data tersimpan di MySQL setelah browser ditutup. Menjalankan ulang launcher mempertahankan perubahan dan riwayat.

## API untuk integrasi UI

Semua rute memakai awalan `/api`. Katalog publik tersedia melalui `GET /catalog`. `POST /login` menerima email dan password serta menghasilkan token sesi. UI mengirim `Authorization: Bearer <token>` untuk area petugas. Sesi berlaku delapan jam dan dicabut oleh `POST /logout`.

| Alur | Rute |
| --- | --- |
| Ringkasan dan kalender | `GET /dashboard`, `GET /calendar` |
| Buku | `GET /books`, `POST /books`, `PUT /books/:id`, `DELETE /books/:id` untuk mengarsipkan |
| Siswa dan izin pengingat | `GET /members`, `POST /members`, `PUT /members/:id` termasuk penonaktifan |
| Pinjaman dan riwayat | `GET /loans`, `POST /loans` dengan member_id, book_id, quantity |
| Pengembalian | `POST /loans/:id/receive` dan `POST /loans/:id/pay` dengan amount sesuai denda |
| Laporan | `GET /reports?type=books` atau `GET /reports?type=loans&from=YYYY-MM-DD&to=YYYY-MM-DD` |
| Pengingat | `GET /reminders`, `POST /reminders/:id/retry`, `POST /reminders/:id/confirm` setelah pemeriksaan HP |

Riwayat pinjaman mencatat ID petugas penerima buku dan petugas pelunasan melalui `received_by` dan `paid_by`. Daftar pinjaman dan laporan sirkulasi juga mengembalikan nama petugas. Transaksi lama tetap bisa dibuka dengan nilai kosong jika petugasnya belum pernah dicatat.
