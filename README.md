# 📚 Perpusku - Sistem Manajemen Perpustakaan

Aplikasi manajemen perpustakaan modern berbasis fullstack web dengan arsitektur **Client-Server**.

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
