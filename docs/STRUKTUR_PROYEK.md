# 📁 Struktur Direktori & Arsitektur Teknologi Proyek
## SIPUS Digital (Sistem Informasi Perpustakaan SMK Mutiara Ilmu)

Dokumen ini disusun sebagai **softfile dokumentasi teknis** untuk keperluan pelaporan akademik dan presentasi kepada dosen pengampu / pembimbing. Dokumen ini merangkum arsitektur aplikasi, teknologi yang digunakan, serta susunan direktori proyek yang bersih (*clean architecture*).

---

## 1. Ringkasan Arsitektur & Teknologi (Tech Stack)

Sistem ini dibangun dengan arsitektur **Client-Server Terpisah (Decoupled Fullstack Web)** yang berkomunikasi melalui antarmuka **RESTful API** berbasis format pertukaran data JSON.

```
┌────────────────────────────────────────────────────────┐
│             FRONTEND (CLIENT LAYER)                    │
│      React 19 + Vite 6 + Tailwind CSS v4               │
│   (Single Page Application / Desktop Optimized)        │
└───────────────────────────┬────────────────────────────┘
                            │
                   HTTP/HTTPS REST API (JSON)
                   Axios Client Calls
                            │
┌───────────────────────────▼────────────────────────────┐
│              BACKEND (SERVER LAYER)                    │
│           Node.js + Express.js Framework               │
│  (Controllers, Middleware JWT, Routes, Models)         │
└───────────────────────────┬────────────────────────────┘
                            │
                    MySQL2 Connection Pool
                    SQL Queries & Transactions
                            │
┌───────────────────────────▼────────────────────────────┐
│             DATABASE (DATA LAYER)                      │
│            MySQL Relational Database                   │
│      (InnoDB Engine, ACID Transactions, DDL)           │
└────────────────────────────────────────────────────────┘
```

### A. Frontend Layer
- **Core Library**: React.js (v19.0.0)
- **Build Tool / Bundler**: Vite (v6.2.0) – *Hot Module Replacement (HMR) & lightning-fast bundling*
- **Styling Engine**: Tailwind CSS (v4.0.9 via `@tailwindcss/vite`) – *Utility-first modern styling*
- **Routing**: React Router DOM (v7.2.0) – *Client-side declarative routing*
- **HTTP Client**: Axios (v1.7.9) – *Promise-based HTTP client dengan interceptor*
- **Iconography**: Lucide React (v1.16.0) – *Clean, accessible SVG icons*
- **Bahasa**: JavaScript (ES6+ / JSX)

### B. Backend Layer
- **Runtime Environment**: Node.js (v20+ LTS / v26)
- **Web Framework**: Express.js (v4.21.2) – *Minimalist RESTful web API framework*
- **Database Driver**: MySQL2 (v3.12.0) – *Mendukung Prepared Statements & Promise/Async Connection Pool*
- **Autentikasi & Keamanan**:
  - `jsonwebtoken` (v9.0.2) – *Stateless Authentication token JWT untuk sesi petugas*
  - `bcryptjs` (v3.0.3) – *Hashing password satu arah (Salted SHA-256/Blowfish)*
- **Middleware Pendukung**:
  - `cors` (v2.8.5) – *Cross-Origin Resource Sharing control*
  - `dotenv` (v16.4.7) – *Manajemen konfigurasi variabel lingkungan (.env)*
  - `multer` (v1.4.5) – *Penanganan upload file multipart/form-data*
- **Development Engine**: Nodemon (v3.1.9) – *Automatic server restart on file changes*

### C. Database Layer
- **DBMS**: MySQL (Server 8.0 / MariaDB 10.4+)
- **Storage Engine**: InnoDB (Mendukung Foreign Key constraints dan transaksi atomik `BEGIN` / `COMMIT` / `ROLLBACK`)
- **Skema Data**: DDL terstruktur pada `backend/database.sql`

---

## 2. Susunan Direktori Proyek (File Path Structure)

Berikut adalah susunan file dan folder utama proyek (tanpa menyertakan folder dependency `node_modules`, direktori AI agent, dan berkas render sementara):

```text
Perpusku/
├── backend/                                  # Server RESTful API (Node.js & Express)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                         # Konfigurasi koneksi MySQL Connection Pool
│   │   ├── controllers/                      # Logika bisnis (Business Logic Layer) per modul
│   │   ├── middleware/                       # Middleware autentikasi JWT, validasi, & upload
│   │   ├── models/                           # Abstraksi data model & query database SQL
│   │   ├── routes/                           # Definisi endpoint rute REST API
│   │   ├── utils/
│   │   │   └── response.js                   # Standard response formatter (sukses, gagal, validasi)
│   │   └── server.js                         # Entry point utama server backend Express
│   ├── database.sql                          # Skema DDL tabel relasional database MySQL
│   ├── .env.example                          # Template konfigurasi variabel lingkungan backend
│   └── package.json                          # Manifest dependensi & script runner backend
│
├── frontend/                                 # Antarmuka Pengguna (React + Vite SPA)
│   ├── public/                               # Aset statis yang disajikan langsung
│   ├── src/
│   │   ├── assets/                           # Media & grafis aplikasi
│   │   │   ├── foto landing page/            # Foto dokumentasi fisik perpustakaan & sekolah
│   │   │   └── logo/                         # Aset visual logo SIPUS Digital & SMK Mutiara Ilmu
│   │   ├── components/                       # Komponen antarmuka modular yang dapat digunakan ulang
│   │   ├── context/                          # State management global (Auth Context & User Session)
│   │   ├── hooks/                            # Custom React Hooks untuk logika reusable
│   │   ├── layouts/                          # Kerangka tata letak halaman (Sidebar, Header, Footer)
│   │   ├── pages/                            # Komponen tampilan halaman utama aplikasi
│   │   ├── services/
│   │   │   └── api.js                        # Konfigurasi instance Axios & interceptor token
│   │   ├── utils/                            # Helper pemformat tanggal sekolah, rupiah, denda
│   │   ├── App.jsx                           # Root component & registrasi router antarmuka
│   │   ├── main.jsx                          # Titik masuk render React ke elemen DOM HTML
│   │   └── index.css                         # Styling global & inisialisasi Tailwind CSS v4
│   ├── index.html                            # Dokumen HTML template utama Single Page Application
│   ├── vite.config.js                        # Konfigurasi bundler Vite dan plugin React/Tailwind
│   ├── .env.example                          # Template konfigurasi variabel lingkungan frontend
│   └── package.json                          # Manifest dependensi & script build frontend
│
├── docs/                                     # Dokumentasi Teknis & Rekayasa Perangkat Lunak
│   ├── PRD_SIPUS_Digital.md                  # Product Requirement Document (Spesifikasi Kebutuhan)
│   ├── UML_SIPUS_Digital.md                  # Spesifikasi UML (Use Case, Activity, Sequence, State)
│   └── STRUKTUR_PROYEK.md                    # Dokumentasi susunan direktori & teknologi proyek
│
└── README.md                                 # Panduan umum proyek & instruksi instalasi lingkungan
```

---

## 3. Penjelasan Rinci Per Komponen & File Path

### 3.1 Backend (`backend/`)
Mengikuti pola arsitektur **MVC (Model-View-Controller)** yang disesuaikan untuk API service (tanpa View template engine HTML karena antarmuka ditangani sepenuhnya oleh React).

1. **`backend/src/server.js`**  
   Titik awal (*entry point*) server Express.js. Bertugas memuat variabel lingkungan (`dotenv`), mengaktifkan middleware global (`cors`, `express.json()`), mendaftarkan seluruh endpoint router (`/api/...`), serta menjalankan listener pada port server.

2. **`backend/src/config/db.js`**  
   Modul koneksi database yang menginstansiasi *connection pool* MySQL menggunakan pustaka `mysql2/promise`. Menggunakan pool mencegah koneksi terputus dan mengoptimalkan performa transaksi konkurensi.

3. **`backend/src/controllers/`**  
   Lapisan penanganan logika bisnis. Menerima parameter dari request pengguna, melakukan validasi logika (misal: verifikasi apakah siswa memiliki tunggakan denda atau stok buku tersedia), memanggil model query, dan mengembalikan response JSON standar.

4. **`backend/src/middleware/`**  
   Lapisan pemeriksa request sebelum mencapai controller:
   - **Autentikasi**: Memverifikasi validitas token JWT pada header `Authorization: Bearer <token>` untuk melindungi endpoint operasional petugas.
   - **Upload**: Konfigurasi `multer` untuk validasi tipe MIME dan ukuran berkas cover buku.

5. **`backend/src/models/`**  
   Lapisan data access object (DAO) yang mengeksekusi query SQL terstruktur (Prepared Statements) guna mencegah celah keamanan SQL Injection.

6. **`backend/src/routes/`**  
   Mendefinisikan endpoint URL RESTful API dan memetakannya ke metode controller yang bersesuaian (misal: `GET /api/buku`, `POST /api/peminjaman`, `POST /api/pengembalian`).

7. **`backend/src/utils/response.js`**  
   Utilitas untuk menyeragamkan format respon JSON backend, baik status sukses maupun gagal (`{ success: true, message: "...", data: {...} }`).

8. **`backend/database.sql`**  
   Berkas skrip SQL *Data Definition Language* (DDL) untuk inisialisasi skema tabel relasional perpustakaan, meliputi:
   - Tabel `users` (Akun petugas & admin perpustakaan)
   - Tabel `members` (Data siswa, NIS, kelas, dan kontak WhatsApp)
   - Tabel `categories` & `books` (Katalog buku kejuruan, kode rak, dan stok)
   - Tabel `borrowings` & `borrowing_details` (Pencatatan sirkulasi peminjaman 5 hari sekolah)
   - Tabel `fines` (Pencatatan denda keterlambatan Rp2.000/hari sekolah dan pelunasan)
   - Tabel `visit_logs` (Pencatatan riwayat presensi kunjungan berbasis NIS)

---

### 3.2 Frontend (`frontend/`)
Menggunakan arsitektur berbasis komponen (*Component-Driven Architecture*) dengan standar modern React 19 dan Tailwind CSS v4.

1. **`frontend/src/main.jsx` & `index.html`**  
   Titik masuk Single Page Application (SPA). `main.jsx` me-mount komponen root React `<App />` ke elemen `<div id="root">` pada `index.html`.

2. **`frontend/src/App.jsx`**  
   Komponen utama yang memuat konfigurasi rute deklaratif menggunakan `react-router-dom` (rute publik seperti Landing Page & Katalog, serta rute terproteksi untuk Ruang Kerja Petugas).

3. **`frontend/src/pages/`**  
   Komponen tampilan tingkat halaman, mencakup:
   - `LandingPage`: Beranda publik dengan hero pencarian buku, banner slider fasilitas, dan panduan sirkulasi.
   - `KatalogPage`: Penelusuran katalog buku terbuka, filter jurusan, dan modal detail eksemplar rak.
   - `LoginPage`: Form autentikasi petugas perpustakaan.
   - `DashboardPage`: Ringkasan metrik operasional dan daftar prioritas tindak lanjut.
   - `PeminjamanPage`: Meja sirkulasi pencatatan pinjaman dan validasi tunggakan siswa.
   - `PengembalianPage`: Meja sirkulasi pengembalian buku dan penyelesaian denda.
   - `BukuPage`: Manajemen data koleksi dan stok per judul buku.
   - `SiswaPage`: Pengelolaan data siswa dan persetujuan pengingat WhatsApp.
   - `WhatsAppPage`: Monitoring log status pengiriman notifikasi pengingat jatuh tempo.
   - `LaporanPage`: Penyaringan data dan pratinjau lembar cetak laporan resmi format A4.

4. **`frontend/src/components/`**  
   Elemen antarmuka modular yang dapat digunakan kembali lintas halaman (Buttons, Modal Dialogs, Input Fields, Stat Cards, Data Tables, dan Badges).

5. **`frontend/src/layouts/`**  
   Komponen kerangka antarmuka konsisten, seperti Navbar publik dan Universal Sidebar navigasi operasional petugas.

6. **`frontend/src/services/api.js`**  
   Sentralisasi koneksi ke backend menggunakan Axios instance dengan base URL terkonfigurasi, penanganan timeout, dan otomatisasi injeksi token JWT pada request header.

7. **`frontend/src/utils/`**  
   Fungsi pembantu logika murni pada sisi klien, seperti algoritma penghitungan hari sekolah aktif (melewati Sabtu, Minggu, dan hari libur) serta pemformatan nominal mata uang Rupiah.

---

### 3.3 Dokumentasi Rekayasa Perangkat Lunak (`docs/`)
1. **`docs/PRD_SIPUS_Digital.md`**  
   Dokumen Spesifikasi Kebutuhan Perangkat Lunak (*Product Requirement Document*) yang mendefinisikan aturan bisnis (A-01 s.d. A-09), batasan sistem, dan target operasional bersama mitra SMK Mutiara Ilmu Makassar.
2. **`docs/UML_SIPUS_Digital.md`**  
   Pemodelan visual formal rekayasa perangkat lunak menggunakan standar UML, mencakup Use Case Diagram, Activity Diagrams (alur presensi, peminjaman, pengembalian, pengingat WhatsApp, dan laporan), Sequence Diagrams, Class Diagram, serta State Machine Diagram.
3. **`docs/STRUKTUR_PROYEK.md`**  
   Dokumen ini, sebagai ikhtisar arsitektur dan susunan direktori proyek untuk evaluasi akademik.

---

## 4. Keunggulan Arsitektur untuk Penilaian Akademik
1. **Separation of Concerns (SoC)**: Pemisahan tegas antara logika presentasi (React), logika bisnis/layanan (Express), dan penyimpanan data persisten (MySQL).
2. **Kepatuhan Terhadap Standar Industri**: Penggunaan arsitektur REST API dengan autentikasi stateless berbasis JSON Web Token (JWT) dan hashing Bcrypt.
3. **Performa & Skalabilitas**: Frontend didukung Vite dan Tailwind CSS v4 untuk ukuran bundle yang sangat ringan (*tree-shaken*), serta koneksi database backend menggunakan *connection pooling* terkelola.
4. **Keamanan Data**: Menggunakan *parameterized queries* (Prepared Statements) untuk menangkal celah SQL Injection serta sanitasi input pada controller.

