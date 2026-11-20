# 📚 Perpusku - Sistem Manajemen Perpustakaan

Aplikasi manajemen perpustakaan modern berbasis fullstack web dengan arsitektur **Client-Server**.

---

## Demo lokal

Klik dua kali **Mulai-Demo.cmd**, kemudian ikuti [alur demo dosen](docs/DEMO-DOSEN.md) dan [panduan Fonnte](docs/FONNTE-DEMO.md).

## 🎨 Peran & Kolaborasi
- **UI/UX Designer & Architect**: Antigravity (merancang user flow, wireframe, design tokens, frame desain di FigCraft, dan panduan handoff).
- **Software Engineer / Implementasi Kode**: Codex.

---

## 🎨 Integrasi FigCraft
- **File Desain**: [`design/Sipus_base.figcraft`](design/Sipus_base.figcraft)
- **Koneksi MCP**: Port `47800`
- **Launcher**: Jalankan `launch-figcraft-control.bat` untuk membuka FigCraft dengan loopback control aktif agar dapat diakses oleh AI agent / Codex via MCP.
- **Konfigurasi MCP**: [`opencode.jsonc`](opencode.jsonc)

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
│   ├── database.sql               # Skema database MySQL
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
