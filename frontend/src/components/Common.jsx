import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { animate } from 'motion/mini';
import emblem from '../assets/logo/lambang.png';
import wordmark from '../assets/logo/wordmark.png';
import api from '../services/api';
import { usePrefersReducedMotion } from '../services/reducedMotion';

export function Brand({ school = false }) {
  return (
    <Link className="brand" to="/" aria-label="SIPUS · Beranda">
      <img src={emblem} alt="" />
      <img src={wordmark} alt="SIPUS" />
      {school && (
        <span>
          SMK Mutiara Ilmu
          <br />
          Makassar
        </span>
      )}
    </Link>
  );
}
export function useData(paths, version = 0) {
  const key = paths.join('|');
  const [state, set] = useState({ loading: true });
  useEffect(() => {
    let current = true;
    set({ loading: true });
    Promise.all(key.split('|').map((p) => api.get(p)))
      .then((data) => {
        if (current) set({ data });
      })
      .catch((e) => {
        if (current) set({ error: e.message });
      });
    return () => {
      current = false;
    };
  }, [key, version]);
  return state;
}
export function Status({ children, error = false }) {
  return (
    children && (
      <div
        className={'notice ' + (error ? 'bad' : '')}
        role={error ? 'alert' : 'status'}
      >
        {children}
      </div>
    )
  );
}
export function SearchBox({ value, onChange, placeholder = 'Cari data' }) {
  const input = useRef(null);
  return (
    <div className="search">
      <Search size={18} aria-hidden="true" />
      <input
        ref={input}
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="icon search-clear"
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => {
            onChange('');
            input.current.focus();
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
export function Tag({ children, tone = '' }) {
  return <span className={'tag ' + tone}>{children}</span>;
}
export function LoanStatus({ state }) {
  const tone =
    state === 'Selesai' ? '' : state === 'Dipinjam' ? 'neutral' : 'warn';
  return <Tag tone={tone}>{state}</Tag>;
}
export function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const reduceMotion = usePrefersReducedMotion();
  useLayoutEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  useLayoutEffect(() => {
    if (reduceMotion) return;
    const entrance = animate(ref.current, {
      opacity: [0, 1],
      transform: ['translateY(6px) scale(0.985)', 'none'],
    }, { duration: 0.2, ease: [0.22, 1, 0.36, 1] });
    return () => entrance.cancel();
  }, [reduceMotion]);
  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog-wide' : undefined}
      aria-labelledby={titleId}
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon"
          aria-label="Tutup"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Table({ pageSize, filterKey, rows, ...props }) {
  if (!pageSize) return <TableContents rows={rows} {...props} />;
  return (
    <PaginatedList key={filterKey} items={rows} pageSize={pageSize} label={props.label}>
      {(visible) => <TableContents rows={visible} {...props} />}
    </PaginatedList>
  );
}
export function PaginatedList({ pageSize, items, label = 'data', onPageChange, children }) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(items.length / pageSize);
  const current = Math.max(0, Math.min(page, pages - 1));
  const start = current * pageSize;
  const end = Math.min(start + pageSize, items.length);
  const numbers = pages <= 7
    ? Array.from({ length: pages }, (_, index) => index)
    : [...new Set([0, current - 1, current, current + 1, pages - 1])]
      .filter((index) => index >= 0 && index < pages)
      .sort((a, b) => a - b);

  function changePage(next) {
    if (next === current) return;
    setPage(next);
    onPageChange?.();
  }
  function pageButton(index) {
    return (
      <button
        key={index}
        type="button"
        className="secondary pagination-number"
        aria-label={'Halaman ' + (index + 1)}
        aria-current={index === current ? 'page' : undefined}
        onClick={() => changePage(index)}
      >
        {index + 1}
      </button>
    );
  }

  return (
    <>
      {children(items.slice(start, end))}
      {items.length > 0 && (
        <nav className="pagination" aria-label={'Halaman ' + label}>
          <span role="status">{start + 1}–{end} dari {items.length}</span>
          {pages > 1 && (
            <div className="pagination-controls">
              <button type="button" className="secondary pagination-direction" disabled={current === 0} onClick={() => changePage(current - 1)} aria-label="Sebelumnya">
                <ChevronLeft size={18} aria-hidden="true" />
                <span>Sebelumnya</span>
              </button>
              <div className="pagination-numbers">
                {numbers.flatMap((index, position) => {
                  const gap = position ? index - numbers[position - 1] : 0;
                  if (gap === 2) return [pageButton(index - 1), pageButton(index)];
                  if (gap > 2) {
                    return [
                      <span key={'gap-' + index} className="pagination-gap" aria-hidden="true">…</span>,
                      pageButton(index),
                    ];
                  }
                  return pageButton(index);
                })}
              </div>
              <button type="button" className="secondary pagination-direction" disabled={current + 1 >= pages} onClick={() => changePage(current + 1)} aria-label="Berikutnya">
                <ChevronRight size={18} aria-hidden="true" />
                <span>Berikutnya</span>
              </button>
            </div>
          )}
        </nav>
      )}
    </>
  );
}
function TableContents({ headers, rows, empty = 'Belum ada data.', label, printHeader, printFooter }) {
  return (
    <div
      className="table-scroll"
      role={label ? 'region' : undefined}
      aria-label={label}
      tabIndex={label ? 0 : undefined}
    >
      <table>
        <thead>
          {printHeader && <tr className="print-letterhead"><td colSpan={headers.length}>{printHeader}</td></tr>}
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map(({ id, cells }) => (
              <tr key={id}>
                {cells.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="empty">
                {empty}
              </td>
            </tr>
          )}
          {printFooter && <tr className="print-signatures"><td colSpan={headers.length}>{printFooter}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
export const date = (d) =>
  d
    ? new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(d.slice(0, 10) + 'T00:00:00Z'))
    : '—';
export { matches } from '../services/search';
