# 📚 Perpusku - Sistem Manajemen Perpustakaan

Aplikasi manajemen perpustakaan modern berbasis fullstack web dengan arsitektur **Client-Server**.

---

## Setup dan sampul buku

Jika menjalankan server secara manual setelah pembaruan, jalankan `npm.cmd ci` dan `npm.cmd run setup` di folder `backend` sebelum menyalakannya kembali. Bangun ulang frontend dengan `npm.cmd run build` dari folder `frontend`.

Simpan sampul di `frontend/src/assets/sampul-buku` dengan nama sesuai ISBN atau kode koleksi, misalnya `DEMO-1.jpg`. Aplikasi mencocokkan nama tanpa spasi, tanda hubung, atau perbedaan huruf kapital. Bangun ulang frontend untuk memuat sampul baru.

Di **Buku dan Stok**, petugas bisa mengunggah sampul JPG, PNG, atau WebP dari form buku, mengimpor data dari template Excel, dan mengunggah ZIP sampul yang dinamai berdasarkan kode koleksi. SIPUS menyimpan unggahan di `backend/uploads/sampul-buku`. Saat memindahkan instalasi, salin folder unggahan bersama database.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Axios, React Router v7
- **Backend**: Node.js, Express.js, CORS, Dotenv, sesi MySQL, BcryptJS
- **Database**: MySQL (koneksi via `mysql2/promise` pool)

---

## 📁 Struktur Direktori

```text
Perpusku/
├── design/
│   └── perpusku-design.figcraft   # File desain native FigCraft
├── docs/
│   ├── PRD.md                     # Wadah Product Requirement Document
│   └── CODEX-HANDOFF.md           # Panduan spesifikasi desain untuk Codex
├── launch-figcraft-control.bat    # Script peluncur FigCraft (port 47800)
├── opencode.jsonc                 # Konfigurasi MCP FigCraft untuk AI Agent / Codex
│
├── backend/
│   ├── src/
│   │   ├── config/                # Koneksi MySQL pool (db.js)
│   │   ├── controllers/           # Logika bisnis endpoint API
│   │   ├── middleware/            # Middleware autentikasi JWT, validasi, upload
│   │   ├── models/                # Query & skema data
│   │   ├── routes/                # Router REST API
│   │   ├── utils/                 # Response formatter & helper
│   │   └── server.js              # Entry point server Express
│   ├── database.sql               # Skema dasar MySQL (jangan di-import langsung; buat database dengan `npm run setup`)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css              # Tailwind CSS v4
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
└── README.md
```
