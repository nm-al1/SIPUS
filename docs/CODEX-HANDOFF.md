> Pembaruan desain final: gunakan `design/VISUAL-HANDOFF.md` dan koleksi `SIPUS / Light` di FigCraft. Pengguna memilih tema terang + teal, satu desain utama per page, serta pengarsipan presensi mandiri. Spesifikasi warna gelap dan navigasi presensi dalam dokumen lama di bawah tidak lagi menjadi acuan visual.

# 🤝 Panduan Handoff UI/UX & Spesifikasi Implementasi Codex (SIPUS Digital)

Dokumen ini adalah cetak biru teknis resmi dari **UI/UX Designer & Architect** untuk **Codex** (Fullstack Engineer). Seluruh rancangan visual, alur antarmuka, design tokens, dan logika bisnis telah diselaraskan 1:1 dengan acuan **`design/Sipus_base.figcraft`**, **PRD v0.5**, **UML v0.1**, dan standar **Anti-Slop (R-01 s.d. R-40)**.

---

## 1. Berkas Acuan Desain & Akses Figcraft

| Sumber Daya | Lokasi / Parameter | Keterangan |
| :--- | :--- | :--- |
| **Berkas Native Figcraft** | [`design/Sipus_base.figcraft`](file:///c:/Users/nmal1/Desktop/Perpusku/design/Sipus_base.figcraft) | Berisi 10 layar operasional desktop lengkap (1.018 node) mapping 1:1 ke UML v0.1 & PRD v0.5 |
| **Renders Resolusi Tinggi (PNG)** | [`design/renders/`](file:///c:/Users/nmal1/Desktop/Perpusku/design/renders/) | Pratinjau piksel visual per layar dari 01 hingga 10 |
| **Design System Master File** | [`design-system/sipus-digital/MASTER.md`](file:///c:/Users/nmal1/Desktop/Perpusku/design-system/sipus-digital/MASTER.md) | Token desain, CSS variables, dan aturan interaksi UI/UX Pro Max |
| **Aset Logo Resmi** | [`frontend/src/assets/logo/SIPUS.png`](file:///c:/Users/nmal1/Desktop/Perpusku/frontend/src/assets/logo/SIPUS.png) | Lambang buku bergelombang huruf S Teal & teks SIPUS emas elegan |
| **Aset Foto Sekolah (Marquee)** | [`frontend/src/assets/foto landing page/`](file:///c:/Users/nmal1/Desktop/Perpusku/frontend/src/assets/foto%20landing%20page/) | 3 foto autentik: `landing1.jpg` (ruang baca), `landing2.jpg` (gedung sekolah), `landing3.jpg` (spanduk & siswa) |
| **Laporan Visual Review** | [`visual_review.md`](file:///c:/Users/nmal1/.gemini/antigravity/brain/ded6d9c4-8565-49f3-973a-e76a8d679a30/visual_review.md) | Analisis desain, galeri carousel 10 layar, dan matriks aturan bisnis |

---

## 2. Inventaris 10 Layar Operasional Desktop (Zero Mobile)

> [!IMPORTANT]
> **Keputusan Arsitektur Final Pengguna:**
> 1. **Khusus Desktop & Laptop:** Seluruh antarmuka dioptimalkan untuk resolusi desktop (1440px) dan laptop. Tidak ada versi mobile (390px).
> 2. **Eliminasi Kiosk Presensi Mandiri Siswa:** Presensi mandiri siswa di pintu masuk ditiadakan.
> 3. **Pemusatan Input NIS Siswa:** Validasi dan input NIS siswa dilakukan langsung oleh petugas di Meja Sirkulasi Peminjaman (`/sirkulasi/pinjam`) untuk verifikasi identitas, data peminjam, dan status tunggakan denda.

| No | ID Frame FigCraft | Dimensi | Rute URL | Target Pengguna & Fungsi |
| :---: | :--- | :---: | :---: | :--- |
| **01** | `01_Landing_Page_Desktop_1440px` | 1440 × 2180 | `/` | **Publik & Siswa**: Hero pencarian koleksi, showcase galeri foto marquee 3 gambar, katalog cuplikan buku, panduan sirkulasi 3 langkah, CTA Petugas, 4 aturan pinjam, dan footer. |
| **02** | `02_Katalog_dan_Modal_Detail_Buku` | 1440 × 1080 | `/katalog` | **Publik & Siswa**: Katalog tabel/grid, filter kejuruan, dan modal rincian eksemplar di rak A-02 beserta status ketersediaan stok fisik real-time. |
| **03** | `03_Login_Petugas` | 1440 × 1080 | `/login` | **Petugas Sirkulasi**: Halaman otentikasi operator (dengan catatan: Siswa tidak perlu login akun). |
| **04** | `04_Dashboard_Petugas` | 1440 × 1080 | `/dashboard` | **Petugas & Pustakawan**: 4 kartu metrik operasional dan tabel tindak lanjut prioritas pinjaman terlambat & H-1 dengan tombol aksi sekali klik. |
| **05** | `05_Buku_dan_Stok_CRUD` | 1440 × 1080 | `/buku` | **Petugas Sirkulasi**: Kelola buku & stok (Aturan A-06: Total, Pinjam, Hilang, Tersedia) serta form tambah/edit koleksi. |
| **06** | `06_Data_Siswa_dan_Persetujuan_WA` | 1440 × 1080 | `/siswa` | **Petugas Sirkulasi**: Kelola database siswa, kontak WhatsApp wali/siswa, dan status izin pengingat otomatis. |
| **07** | `07_Peminjaman_dan_Validasi_Tunggakan` | 1440 × 1080 | `/sirkulasi/pinjam` | **Meja Kerja Sirkulasi**: Verifikasi NIS & status tunggakan (A-05A), pilih buku, kalkulasi 5 hari sekolah, dan simpan atomik. |
| **08** | `08_Pengembalian_dan_Penyelesaian_Denda` | 1440 × 1080 | `/sirkulasi/kembali` | **Meja Kerja Sirkulasi**: Verifikasi buku kembali, kalkulasi hari sekolah terlambat (A-04: Rp2.000/hari), pelunasan denda tunai di tempat. |
| **09** | `09_Pengingat_WhatsApp_dan_Log_Status` | 1440 × 1080 | `/whatsapp` | **Petugas & Pustakawan**: Monitoring gateway WhatsApp H-1 (A-08), 4 status (Diterima, Diproses, Gagal, Belum Tahu), dan log retry. |
| **10** | `10_Laporan_Filter_dan_Pratinjau_Cetak_A4` | 1440 × 1080 | `/laporan` | **Kepala Sekolah & Yayasan**: Generator laporan sirkulasi/inventaris dengan lembar pratinjau cetak A4 siap tandatangan Kepala Sekolah & Petugas. |

---

## 3. Design Tokens & Pemetaan Tailwind CSS

### A. Palet Warna Obsidian Slate & Scholar Teal (Dark Theme)

Implementasikan palet warna terpadu ini pada `frontend/tailwind.config.js`:

```js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0B0F19',     // Latar belakang halaman utama (Dark Slate)
        surface: {
          DEFAULT: '#111827',  // Permukaan kartu & sidebar (Dark Gray)
          elevated: '#1E293B', // Permukaan input & panel tingkat 2
          border: '#1F2937'    // Garis pemisah 1px
        },
        teal: {
          DEFAULT: '#0F766E',  // Brand aksen primer tunggal
          accent: '#14B8A6',   // Aksen terang / link
          hover: '#0D6861',
          subtle: '#064E3B'    // Latar belakang tab / badge aktif
        },
        slate: {
          heading: '#F9FAFB',  // Judul utama (Putih jernih)
          body: '#E5E7EB',     // Teks isi
          muted: '#9CA3AF',    // Keterangan & sub-label
          faint: '#4B5563'     // Placeholder & border sekunder
        },
        status: {
          successBg: '#064E3B',
          successText: '#34D399',
          successBorder: '#065F46',
          warningBg: '#451A03',
          warningText: '#FBBF24',
          warningBorder: '#78350F',
          errorBg: '#450A0A',
          errorText: '#F87171',
          errorBorder: '#7F1D1D'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  }
}
```

---

## 4. Spesifikasi Komponen Landing Page (`/`)

### A. Komponen Logo & Header Navbar
- Menampilkan logo horizontal lockup resmi [`frontend/src/assets/logo/sipus_horizontal_lockup.png`](file:///c:/Users/nmal1/Desktop/Perpusku/frontend/src/assets/logo/sipus_horizontal_lockup.png) (tinggi 48px, rasio 4.415:1) yang memuat lambang buku, tipografi emas `SiPUS SISTEM PERPUSTAKAAN DIGITAL`, divider vertikal `|`, serta `SMK Mutiara Ilmu Makassar` tanpa teks terpisah duplikat.
- Menu navigasi publik: `Katalog`, `Informasi Layanan`, `Presensi`, `Aturan Peminjaman`, dan tombol CTA `Login Petugas`.
- Seluruh 10 layar pada [`design/Sipus_base.figcraft`](file:///c:/Users/nmal1/Desktop/Perpusku/design/Sipus_base.figcraft) telah dilengkapi interaksi prototype (194 node terhubung) dengan 4 Flow Starting Points sesuai alur Use Case & Activity UML PRD v0.5.
- Tombol CTA Header: `Login Petugas` (merujuk ke `/login`).

### B. Hero Carousel Banner & Dua Kolom Layanan (1:1 Sesuai Mockup Referensi)
- **Hero Carousel Banner (Full Width 1280px):**
  - Menggunakan foto utama siswa `landing3.jpg` sebagai latar belakang dengan sudut lengkung 16px dan dark overlay untuk legibilitas teks.
  - Badge kiri atas: `SLIDE 01 / 03 • PUSAT LITERASI SMK` (pill scholar teal `#0F766E`).
  - Judul utama: `Selamat Datang di Perpustakaan SMKS Mutiara Ilmu Makassar` (putih bold 26px).
  - Deskripsi: `Mendukung kebutuhan literasi dan referensi praktik siswa program keahlian TJKT, PPLG, dan DKV.` (slate terang).
  - Thumbnail mengambang kanan atas: Pratinjau slide berikutnya (`landing1.jpg` dan `landing2.jpg`) dengan border putih 1.5px dan sudut melengkung 8px.
  - Kontrol kanan bawah: Indikator putar otomatis `● ○ ○ Auto 4.5d` pada kapsul transparan gelap.
- **Kolom Kiri Bawah Banner:**
  - Header `SISTEM PERPUSTAKAAN DIGITAL` & `Perpustakaan SMK Mutiara Ilmu`.
  - Kartu pencarian katalog (`Pencarian Koleksi Buku & Referensi`) lengkap dengan tombol `Cari Buku` teal, chip filter (Semua, Produktif, Muatan Nasional, Literasi), serta checkbox `Hanya stok tersedia`.
  - 4 kartu badge kebijakan: `AKSES SISWA` (Cukup NIS), `MASA PINJAM` (5 Hari Sekolah), `HARI LIBUR` (Sabtu-Minggu Off), dan `NOTIFIKASI` (WhatsApp Otomatis).
- **Kolom Kanan Bawah Banner (Identitas & Layanan SIPUS Digital):**
  - Kartu kontainer gelap dengan header logo SIPUS resmi, judul aksen emas `Identitas & Layanan SIPUS Digital`, dan keterangan terintegrasi.
  - 2 kartu fisik buku kejuruan berdampingan:
    - *Buku 1 (TKJ):* Latar belakang teal `#0F4C45`, kode `004.6 HAR`, judul `Administrasi Infrastruktur Jaringan`, dan penanda `RAK KOMPUTER A-02`.
    - *Buku 2 (AKL):* Latar belakang navy `#1E293B`, kode `657 WAH`, judul `Praktikum Akuntansi Jasa & Dagang`, dan penanda `4 tersedia dari 10`.

### C. Alur Sirkulasi 3 Langkah & Card CTA Petugas
- **3 Langkah Prosedur:**
  1. *Pilih Buku Kejuruan di Rak:* Siswa mencari buku di katalog atau langsung ke rak fisik.
  2. *Bawa Buku ke Meja Sirkulasi:* Serahkan buku kepada petugas dan sebutkan NIS siswa.
  3. *Validasi & Pengingat WhatsApp Otomatis:* Petugas memproses pinjaman 5 hari sekolah; jadwal jatuh tempo dikirimkan ke WhatsApp siswa.
- **Card Ruang Kerja Sirkulasi Petugas:**
  - Penegasan bahwa seluruh pencatatan sirkulasi dilakukan langsung oleh petugas (tanpa presensi mandiri siswa).
  - Tombol CTA: `Masuk ke Ruang Kerja Petugas →` mengarahkan ke halaman login petugas.

---

## 5. Matriks Aturan Bisnis untuk Codex (Backend & Frontend)

| Kode Aturan | Nama Aturan Bisnis | Implementasi Validasi Sistem |
| :---: | :--- | :--- |
| **A-01** | Akses Katalog Tanpa Login Siswa | Rute `/` dan `/katalog` bersifat publik. Siswa tidak memiliki username/password. |
| **A-02** | Masa Pinjam 5 Hari Sekolah | Hari peminjaman dihitung sebagai **Hari ke-1 (H1)**. Contoh: Pinjam Senin → Jatuh Tempo Jumat (jika tidak ada tanggal merah). |
| **A-03** | Pengecualian Hari Libur | Sabtu, Minggu, dan tanggal merah nasional otomatis dilewati dari perhitungan hari kerja pinjam dan denda. |
| **A-04** | Tarif Denda Keterlambatan | Tarif Rp2.000 per buku untuk setiap hari sekolah yang terlambat. |
| **A-05** | Validasi Tunggakan & Status Ditolak | Pada `/sirkulasi/pinjam`, jika siswa memiliki buku terlambat atau denda belum lunas, sistem menolak peminjaman baru sampai tunggakan selesai. |
| **A-06** | Manajemen Stok per Judul | Stok dikelola per judul buku (`stokTotal`, `stokDipinjam`, `stokHilang`, `stokTersedia`). Tidak memerlukan nomor barcode unik per eksemplar fisik. |
| **A-07** | Integritas Transaksi Atomik | Peminjaman dan pengembalian dilakukan secara transaksi database atomik untuk memastikan saldo stok buku selalu sinkron. |
| **A-08** | Pengingat Otomatis WhatsApp | Notifikasi dikirimkan H-1 pukul 09.00 WITA hanya kepada nomor siswa/wali yang status persetujuannya disetujui. |
