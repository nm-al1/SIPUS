import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import emblem from '../assets/logo/lambang.png';
import wordmark from '../assets/logo/wordmark.png';
import api from '../services/api';

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
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog-wide' : undefined}
      aria-labelledby={titleId}
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
export function Table({ headers, rows, empty = 'Belum ada data.', label }) {
  return (
    <div
      className="table-scroll"
      role={label ? 'region' : undefined}
      aria-label={label}
      tabIndex={label ? 0 : undefined}
    >
      <table>
        <thead>
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
