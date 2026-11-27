import React, { useCallback, useEffect, useRef, useState } from 'react';
import BookCover from '../components/BookCover';
import { animate } from 'motion/mini';
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  EyeOff,
  LogIn,
  MapPin,
} from 'lucide-react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {
  Brand,
  Dialog,
  Field,
  SearchBox,
  Status,
  Tag,
  PaginatedList,
  matches,
  useData,
} from '../components/Common';
import api from '../services/api';
import { usePrefersReducedMotion } from '../services/reducedMotion';
import LandingHero from '../components/LandingHero';

const staffLink = () =>
  sessionStorage.token
    ? { to: '/dashboard', label: 'Ruang petugas' }
    : { to: '/login', label: 'Login petugas' };

function RulesLink() {
  return <Link to="/#aturan">Aturan peminjaman</Link>;
}

function BorrowingGuide() {
  return (
    <section
      id="aturan"
      className="landing-rules"
      aria-labelledby="aturan-judul"
      tabIndex={-1}
    >
      <div className="landing-guide">
        <h2 id="aturan-judul">Cara meminjam buku</h2>
        <ol className="steps">
          <li>
            <h3>Cari buku</h3>
            <p>Cek stok di katalog dan ambil buku dari rak yang tercantum.</p>
          </li>
          <li>
            <h3>Tunjukkan NIS</h3>
            <p>
              Bawa buku ke meja petugas dan sebutkan NIS untuk mencatat
              pinjaman.
            </p>
          </li>
          <li>
            <h3>Kembalikan ke petugas</h3>
            <p>
              Periksa tanggal jatuh tempo saat meminjam dan kembalikan buku
              paling lambat pada tanggal itu.
            </p>
          </li>
        </ol>
      </div>
      <div className="landing-policy">
        <h3>Ketentuan peminjaman</h3>
        <ul>
          <li>
            Masa pinjam tiga hari sekolah. Hari peminjaman dihitung sebagai hari
            pertama jika jatuh pada hari sekolah. Sabtu, Minggu, dan hari libur
            nasional dilewati.
          </li>
          <li>
            Denda keterlambatan Rp2.000 per buku per hari sekolah. Selesaikan
            tunggakan sebelum meminjam lagi.
          </li>
        </ul>
      </div>
    </section>
  );
}

function Header() {
  const staff = staffLink();
  return (
    <>
      <div id="atas" aria-hidden="true" />
      <header className="publicbar">
        <div>
          <Brand school />
          <nav aria-label="Navigasi utama">
            <NavLink to="/" end>
              Beranda
            </NavLink>
            <NavLink to="/katalog">Katalog buku</NavLink>
            <RulesLink />
          </nav>
          <Link className="btn staff-entry" to={staff.to}>
            <LogIn size={17} aria-hidden="true" /> {staff.label}
          </Link>
        </div>
      </header>
    </>
  );
}
function PublicFooter() {
  const staff = staffLink();
  return (
    <footer className="publicfooter">
      <div>
        <Brand school />
        <nav aria-label="Navigasi footer">
          <Link to="/katalog">Katalog buku</Link>
          <RulesLink />
          <Link to={staff.to}>{staff.label}</Link>
        </nav>
        <Link className="back-to-top" to="/#atas">
          Kembali ke atas <ArrowUp size={16} aria-hidden="true" />
        </Link>
      </div>
    </footer>
  );
}
function CatalogGrid({ books, onPick, compact = false, empty = 'Tidak ada judul yang cocok. Ubah kata kunci atau reset filter.' }) {
  const reduceMotion = usePrefersReducedMotion();
  const animateResult = useCallback((element) => {
    if (!element || reduceMotion) return;
    const entrance = animate(element, {
      opacity: [0.7, 1],
      transform: ['translateY(4px)', 'none'],
    }, { duration: 0.18, ease: [0.22, 1, 0.36, 1] });
    return () => entrance.cancel();
  }, [reduceMotion]);
  if (!books.length) {
    return <p className="empty" role="status">{empty}</p>;
  }
  return (
    <ul className={'catalog-grid' + (compact ? ' catalog-grid-compact' : '')} role="list" aria-label="Daftar koleksi">
      {books.map((item) => (
        <li key={item.id} ref={compact ? animateResult : undefined}>
          <button
            className="catalog-book"
            type="button"
            onClick={(e) => onPick(item, e.currentTarget)}
            aria-label={'Lihat detail ' + item.title}
            aria-describedby={'catalog-author-' + item.id + ' catalog-meta-' + item.id}
          >
            <span className="catalog-cover-stage"><BookCover book={item} size="grid" /></span>
            <span className="catalog-book-info">
              <strong>{item.title}</strong>
              <span className="catalog-book-author" id={'catalog-author-' + item.id}>{item.author}</span>
              <span className="catalog-book-meta" id={'catalog-meta-' + item.id}>
                <span>{[item.category, item.shelf && 'Rak ' + item.shelf].filter(Boolean).join(' · ')}</span>
                <Tag tone={item.stock ? '' : 'warn'}>{item.stock ? item.stock + ' tersedia' : 'Stok habis'}</Tag>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function useLandingScroll(enabled, loading) {
  const { hash, key } = useLocation();
  const reduceMotion = usePrefersReducedMotion();
  const lenis = useRef(null);
  const targetReady = hash !== '#aturan' || !loading;

  useEffect(() => {
    if (!enabled || reduceMotion) return;
    const instance = new Lenis({ autoRaf: true });
    lenis.current = instance;
    return () => {
      instance.destroy();
      lenis.current = null;
    };
  }, [enabled, reduceMotion]);

  useEffect(() => {
    if (!enabled || !hash) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    target.focus({ preventScroll: true });
    if (lenis.current) {
      lenis.current.resize();
      lenis.current.scrollTo(target, { duration: 0.65 });
    } else {
      target.scrollIntoView();
    }
    // Koleksi berada di atas aturan, jadi posisinya berubah saat data selesai dimuat.
  }, [enabled, hash, key, targetReady]);
}

export function Public({ catalog = false }) {
  const resultsHeading = useRef(null);
  const detailTrigger = useRef(null);
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(''),
    [book, setBook] = useState(null);
  useEffect(() => {
    if (!book && detailTrigger.current) {
      detailTrigger.current.focus({ preventScroll: true });
      detailTrigger.current = null;
    }
  }, [book]);
  function pickBook(item, trigger) {
    detailTrigger.current = trigger;
    setBook(item);
  }
  const [version, refresh] = useState(0),
    { data, error, loading } = useData(['/catalog'], version);
  useLandingScroll(!catalog, loading);
  const query = catalog ? params.get('q') || '' : search.trim();
  const category = catalog ? params.get('kategori') || '' : '';
  const available = catalog && params.get('tersedia') === '1';
  const filtering = Boolean(query || category || available);
  const books = data?.[0] || [],
    filtered = books.filter(
      (b) =>
        matches(query, b.title, b.author, b.isbn, b.category, b.shelf) &&
        (!category || b.category === category) &&
        (!available || b.stock > 0),
    );
  const highlights = catalog || query
    ? filtered
    : [...filtered].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
  const catalogLink = query ? '/katalog?' + new URLSearchParams({ q: query }) : '/katalog';
  function filterBy(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  return (
    <>
      <Header />
      <main>
        {!catalog && <LandingHero />}
        <div className={catalog ? 'publicmain' : 'publicmain landing-content'}>
          {catalog && (
            <>
              <div className="catalog-heading page-enter">
                <Link to="/">
                  <ArrowLeft size={16} aria-hidden="true" /> Beranda
                </Link>
                <h1>Katalog perpustakaan</h1>
                <p>Cari buku dan lihat ketersediaannya di rak.</p>
              </div>
              <div className="toolbar panel catalog-filters">
                <SearchBox
                  value={query}
                  onChange={(value) => filterBy('q', value)}
                  placeholder="Cari judul, penulis, ISBN, atau rak"
                />
                <select
                  aria-label="Kategori"
                  value={category}
                  onChange={(e) => filterBy('kategori', e.target.value)}
                >
                  <option value="">Semua kategori</option>
                  {[...new Set(books.map((b) => b.category).filter(Boolean))]
                    .sort((a, b) => a.localeCompare(b, 'id'))
                    .map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                </select>
                <label className="filter-check">
                  <input
                    type="checkbox"
                    checked={available}
                    onChange={(e) =>
                      filterBy('tersedia', e.target.checked ? '1' : '')
                    }
                  />{' '}
                  Stok tersedia
                </label>
                {filtering && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setParams({}, { replace: true })}
                  >
                    Reset filter
                  </button>
                )}
              </div>
            </>
          )}
          <section aria-labelledby="koleksi-judul">
            <div className={'sectionhead' + (catalog ? '' : ' landing-collection-heading')}>
              <h2 id="koleksi-judul" className={catalog ? 'catalog-results-heading' : undefined} tabIndex={catalog ? -1 : undefined} ref={resultsHeading}>
                {catalog ? 'Hasil pencarian' : 'Cari buku'}
              </h2>
              {catalog ? (
                <small aria-live="polite">
                  {loading
                    ? 'Memuat…'
                    : filtered.length + ' dari ' + books.length + ' judul'}
                </small>
              ) : (
                <Link to={catalogLink} className="collection-link">
                  {query ? 'Lihat di katalog' : 'Semua koleksi'} <ArrowRight size={17} aria-hidden="true" />
                </Link>
              )}
            </div>
            {!catalog && (
              <div className="landing-collection-search">
                <SearchBox value={search} onChange={setSearch} placeholder="Cari judul, penulis, ISBN, atau rak" />
              </div>
            )}
            {loading ? (
              <p>Memuat koleksi…</p>
            ) : error ? (
              <>
                <Status error>{error}</Status>
                <button onClick={() => refresh((v) => v + 1)}>Coba lagi</button>
              </>
            ) : catalog ? (
              <PaginatedList
                key={JSON.stringify([query, category, available])}
                items={filtered}
                pageSize={6}
                label="katalog"
                onPageChange={() => {
                  resultsHeading.current?.focus({ preventScroll: true });
                  resultsHeading.current?.scrollIntoView({ block: 'start' });
                }}
              >
                {(visible) => <CatalogGrid books={visible} onPick={pickBook} />}
              </PaginatedList>
            ) : (
              <>
                {query && filtered.length > 0 && (
                  <p className="landing-results-count" role="status">
                    {filtered.length > 3
                      ? 'Menampilkan 3 dari ' + filtered.length + ' judul yang cocok.'
                      : filtered.length + ' judul yang cocok.'}
                  </p>
                )}
                <CatalogGrid compact books={highlights.slice(0, 3)} onPick={pickBook}
                  empty={query ? 'Tidak ada judul yang cocok. Coba kata kunci lain.' : 'Koleksi belum tersedia.'} />
              </>
            )}
          </section>
          {!catalog && <BorrowingGuide />}
        </div>
      </main>
      <PublicFooter />
      {book && (
        <Dialog title={book.title} onClose={() => setBook(null)}>
          <div className="book-cell book-detail-cover">
            <BookCover book={book} size="detail" />
            <div>
              <p>{book.author} · {book.category || 'Koleksi umum'}</p>
              <p>{book.description}</p>
            </div>
          </div>
          <dl className="book-details">
            <div>
              <dt>
                <MapPin size={15} aria-hidden="true" /> Lokasi rak
              </dt>
              <dd>{book.shelf || 'Belum dicatat'}</dd>
            </div>
            <div>
              <dt>Eksemplar tersedia</dt>
              <dd>
                {book.stock} dari {book.total}
              </dd>
            </div>
          </dl>
        </Dialog>
      )}
    </>
  );
}
export function Login() {
  const navigate = useNavigate(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [passwordVisible, setPasswordVisible] = useState(false);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.post(
        '/login',
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      sessionStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <section className="login page-enter" aria-labelledby="login-title">
        <header className="login-heading">
          <Brand />
          <h1 id="login-title">Masuk petugas</h1>
          <p>Kelola koleksi dan sirkulasi perpustakaan sekolah.</p>
        </header>
        <form onSubmit={login}>
          <Field label="Email">
            <input required autoComplete="username" type="email" name="email" />
          </Field>
          <div className="field">
            <label htmlFor="staff-password">Kata sandi</label>
            <div className="password-input">
              <input
                id="staff-password"
                required
                autoComplete="current-password"
                type={passwordVisible ? 'text' : 'password'}
                name="password"
              />
              <button
                type="button"
                className="icon"
                aria-label={
                  passwordVisible
                    ? 'Sembunyikan kata sandi'
                    : 'Tampilkan kata sandi'
                }
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                {passwordVisible ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <Status error>{error}</Status>
          <button className="login-submit" disabled={busy}>
            {busy ? 'Memeriksa…' : 'Masuk ke ruang petugas'}
          </button>
          <Link to="/katalog" className="login-back">
            <ArrowLeft size={16} aria-hidden="true" /> Kembali ke katalog
          </Link>
        </form>
      </section>
    </main>
  );
}
