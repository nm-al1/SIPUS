# SIPUS Digital — handoff demo dosen

[Sumber FigCraft](Sipus_base.figcraft) · [Render 1440 dan 1280](renders/light/) · [Arsip sebelum revisi](archive/SIPUS-sebelum-demo-20261119-090913.figcraft)

## Beranda

Hero selebar halaman terletak tepat di bawah navbar. Foto siswa, ruang perpustakaan, dan gedung sekolah tampil bergantian setiap lima detik. Judul dan tombol katalog berada di atas foto dengan lapisan gelap untuk menjaga kontras. Pilih titik untuk membuka foto tertentu dan menjeda putaran. Tombol putar melanjutkan urutan. Di web, preferensi pengurangan gerakan memulai galeri dalam keadaan jeda dan meniadakan animasi geser.

Setelah hero, tampilkan pencarian, tiga pilihan koleksi beserta rak dan stoknya, panduan peminjaman, serta footer. Di FigCraft, jalankan pratinjau dari **Utama / Beranda** untuk melihat interaksi carousel.

## Halaman dan identitas

Urutan presentasi adalah beranda, katalog, login petugas, dashboard, buku dan stok, data siswa, peminjaman, pengembalian dan denda, pengingat WhatsApp, lalu laporan. Setiap page memiliki satu frame **Utama**. Frame **State** di sebelah kanan menampung detail dan cabang prototipe. Logo di header publik dan sidebar memakai lambang serta wordmark asli dengan proporsi terjaga. Nama sekolah berupa teks yang bisa diedit.

Gunakan Inter, judul operasional 36 px, teks isi 15–18 px, serta kontrol utama setinggi 44 px. Sidebar selebar 232 px memuat label dan ikon garis. Gunakan latar #F5F7F8, panel putih, teks #172B35, teks sekunder #52616B, teal #0F766E untuk aksi, dan #102A2D untuk navigasi. Status memuat teks agar dapat dibaca ketika warna proyektor kurang jelas.

## Jalur yang diperagakan

| Layar | Tindakan dan hasil |
| --- | --- |
| Beranda dan katalog | Buka katalog atau pilih judul dari beranda. Tiap detail menunjukkan penulis, rak, jumlah tersedia, dan total eksemplar. |
| Login dan dashboard | Masuk ke ruang petugas, lihat empat metrik dan buka transaksi dari daftar tindak lanjut. |
| Buku dan siswa | Tabel stok memperlihatkan total, dipinjam, hilang, dan tersedia. Form siswa mengelompokkan nomor, pemilik nomor, dan izin pengingat. Presensi kunjungan tersimpan di arsip. |
| Pinjaman normal | Cek NIS 240101, pilih Administrasi Infrastruktur Jaringan, lalu konfirmasi satu eksemplar. Pinjam Kamis 19 November 2026, jatuh tempo Rabu 25 November. Stok contoh berkurang dari 7 menjadi 6. |
| Validasi | Pilih contoh NIS 999999 untuk hasil tidak ditemukan, atau minta 8 eksemplar saat tersedia 7. Tombol konfirmasi aktif setelah syarat terpenuhi. |
| Pengembalian | Cek NIS 240102 untuk membuka DEMO-DENDA. Per 19 November, satu buku yang jatuh tempo 13 November terlambat empat hari sekolah. Penerimaan fisik membekukan denda Rp8.000. Petugas mengonfirmasi pembayaran untuk menutup pinjaman dan mengembalikan stok. Pada pengembalian tepat waktu, penerimaan fisik langsung menyelesaikan pinjaman. |
| WhatsApp | Halaman awal memperlihatkan konfigurasi tanpa token. Jalur pratinjau memperlihatkan gateway memproses pesan, petugas memeriksa HP, lalu mengonfirmasi penerimaan. Bukti pengiriman aktual diperoleh lewat [panduan Fonnte](../docs/FONNTE-DEMO.md). |
| Laporan | Pilih sirkulasi atau inventaris. Periode Desember menunjukkan contoh hasil kosong. Buka pratinjau A4 untuk memeriksa isi, waktu cetak, dan ruang tanda tangan. |

## Pemeriksaan

Dokumen mencakup sepuluh halaman dan komponen carousel dengan enam varian foto dan status putar. Semua halaman utama dirender pada lebar 1440 px dan pada komposisi uji laptop 1280 px dengan ukuran huruf tetap. File master menyimpan komposisi 1440 px. Tanggal dan jumlah di FigCraft adalah contoh tetap untuk presentasi. Aplikasi menghitung nilai dari MySQL dan kalender WITA saat dijalankan.
