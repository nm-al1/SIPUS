import React, { useEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  useLocation,
  useNavigationType,
  useNavigate,
} from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  MessageSquare,
  FileText,
  BookDown,
  BookUp,
  CalendarDays,
  ArrowUpRight,
  Menu,
  X,
} from 'lucide-react';
import { Brand, Status, useData } from './components/Common';
import { Public, Login } from './pages/Public';
import Master from './pages/Master';
import { Borrow, Returns } from './pages/Circulation';
import ActiveLoans from './pages/ActiveLoans';
import { Dashboard, Reports, WhatsApp } from './pages/Operations';
import api from './services/api';
const screens = [
  [
    '/dashboard',
    'Dashboard',
    'Ringkasan perpustakaan',
    'Pantau koleksi dan pinjaman yang perlu ditindaklanjuti.',
    LayoutDashboard,
    ['dashboard'],
  ],
  [
    '/sirkulasi/pinjam',
    'Peminjaman',
    'Peminjaman buku',
    'Verifikasi siswa, pilih koleksi, lalu konfirmasi transaksi.',
    BookUp,
    ['members', 'books', 'loans', 'calendar'],
  ],
  [
    '/sirkulasi/aktif',
    'Pinjaman Aktif',
    'Pinjaman Aktif',
    'Lihat buku yang masih dipegang siswa dan kelola batas pengembaliannya.',
    CalendarDays,
    ['loans/active', 'calendar'],
  ],
  [
    '/sirkulasi/kembali',
    'Pengembalian',
    'Pengembalian dan denda',
    'Periksa transaksi, catat penerimaan buku, dan selesaikan pembayaran.',
    BookDown,
    ['loans'],
  ],
  [
    '/buku',
    'Buku dan stok',
    'Buku dan stok',
    'Kelola judul, lokasi rak, dan jumlah eksemplar.',
    BookOpen,
    ['books'],
  ],
  [
    '/siswa',
    'Data siswa',
    'Data siswa',
    'Kelola identitas siswa, kontak wali, dan persetujuan pengingat.',
    Users,
    ['members'],
  ],
  [
    '/whatsapp',
    'WhatsApp',
    'Pengingat WhatsApp',
    'Periksa jadwal dan hasil pengiriman ke siswa atau wali.',
    MessageSquare,
    ['reminders'],
  ],
  [
    '/laporan',
    'Laporan',
    'Laporan perpustakaan',
    'Pilih laporan, periksa hasilnya, lalu cetak.',
    FileText,
    [],
  ],
];
function Workspace({ screen }) {
  const [path, , heading, desc, , resources] = screen,
    navigate = useNavigate();
  const [version, setVersion] = useState(0),
    [notice, setNotice] = useState(''),
    [logoutError, setLogoutError] = useState(''),
    [menuOpen, setMenuOpen] = useState(false);
  const { data, error, loading } = useData(
    ['/me', ...resources.map((r) => '/' + r)],
    version,
  );
  function reload(msg) {
    setNotice(msg);
    setVersion((v) => v + 1);
  }
  async function logout() {
    try {
      await api.post('/logout');
      sessionStorage.removeItem('token');
      navigate('/login');
    } catch (e) {
      setLogoutError(e.message);
    }
  }
  const props = Object.fromEntries(resources.map((r, i) => [r, data?.[i + 1]]));
  const content = () => {
    switch (path) {
      case '/dashboard':
        return <Dashboard {...props} />;
      case '/sirkulasi/pinjam':
        return <Borrow {...props} reload={reload} />;
      case '/sirkulasi/aktif':
        return <ActiveLoans loans={props['loans/active']} calendar={props.calendar} reload={reload} />;
      case '/sirkulasi/kembali':
        return <Returns {...props} reload={reload} />;
      case '/buku':
        return <Master data={props.books} reload={reload} />;
      case '/siswa':
        return <Master students data={props.members} reload={reload} />;
      case '/whatsapp':
        return <WhatsApp info={props.reminders} reload={reload} />;
      case '/laporan':
        return <Reports {...props} />;
    }
  };
  return (
    <div className="workspace">
      <aside className="workside">
        <div className="workside-brand">
          <Brand />
          <button
            type="button"
            className="workside-toggle"
            aria-expanded={menuOpen}
            aria-controls="staff-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X size={18} aria-hidden="true" />
            ) : (
              <Menu size={18} aria-hidden="true" />
            )}
            Menu
          </button>
        </div>
        <div
          className={'workside-menu' + (menuOpen ? ' is-open' : '')}
          id="staff-menu"
        >
          <nav aria-label="Ruang petugas">
            {screens.map(([url, label, , , Icon]) => (
              <NavLink to={url} key={url} onClick={() => setMenuOpen(false)}>
                <Icon size={19} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="account">
            <div>
              <b>{data?.[0].name || 'Ruang petugas'}</b>
              <small>Petugas perpustakaan</small>
            </div>
            <button type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Keluar
            </button>
            <Status error>{logoutError}</Status>
          </div>
        </div>
      </aside>
      <div className="workbody">
        <header className="topline">
          <span>Perpustakaan SMK Mutiara Ilmu Makassar</span>
          <Link to="/katalog">
            Lihat katalog <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </header>
        <main className="workmain">
          <div className="workheading">
            <div>
              <h1>{heading}</h1>
              <p>{desc}</p>
            </div>
            {path === '/dashboard' && (
              <Link className="btn" to="/sirkulasi/pinjam">
                <BookUp size={17} aria-hidden="true" /> Catat peminjaman
              </Link>
            )}
          </div>
          <Status>{notice}</Status>
          {loading ? (
            <p role="status">Memuat data…</p>
          ) : error ? (
            <>
              <Status error>{error}</Status>
              <button onClick={() => reload('')}>Coba lagi</button>
            </>
          ) : (
            content()
          )}
        </main>
      </div>
    </div>
  );
}
function NavigationScroll() {
  const { pathname, hash } = useLocation();
  const navigation = useNavigationType();
  const previous = useRef(null);

  useEffect(() => {
    const last = previous.current;
    previous.current = { pathname, hash };
    if (hash && (last?.pathname !== pathname || last?.hash !== hash)) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else if (last && last.pathname !== pathname && navigation !== 'POP') {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [pathname, hash, navigation]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigationScroll />
      <Routes>
        <Route path="/" element={<Public key="home" />} />
        <Route path="/katalog" element={<Public key="catalog" catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/kalender" element={<Navigate to="/sirkulasi/aktif" replace />} />
        {screens.map((s) => (
          <Route path={s[0]} key={s[0]} element={<Guard screen={s} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
function Guard({ screen }) {
  return sessionStorage.getItem('token') ? (
    <Workspace key={screen[0]} screen={screen} />
  ) : (
    <Navigate to="/login" replace />
  );
}
