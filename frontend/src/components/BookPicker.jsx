import React, { useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { matches } from './Common';

export default function BookPicker({ books, selected, onPick }) {
  const id = useId();
  const popup = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const options = open
    ? books.filter((b) => matches(query, b.title, b.author, b.isbn, b.shelf))
    : [];

  function choose(book) {
    onPick(book);
    setOpen(false);
  }

  function handleKey(e) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setQuery('');
        setActive(0);
        setOpen(true);
      } else if (options.length) {
        const next = active === -1
          ? (e.key === 'ArrowDown' ? 0 : options.length - 1)
          : Math.max(0, Math.min(options.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
        setActive(next);
        popup.current?.children[next]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    }
  }

  return (
    <div className="field book-picker">
      <label htmlFor={id}>Cari dan pilih buku</label>
      <div className="search">
        <Search size={18} aria-hidden="true" />
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? id + '-list' : undefined}
          aria-activedescendant={open && options[active] ? id + '-' + active : undefined}
          autoComplete="off"
          placeholder="Judul, penulis, ISBN, atau rak"
          value={open ? query : selected?.title || ''}
          onFocus={(e) => e.currentTarget.select()}
          onClick={() => {
            if (!open) {
              setQuery('');
              setActive(-1);
              setOpen(true);
            }
          }}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={handleKey}
        />
      </div>
      {open && (
        <div className="book-picker-popup">
          <ul id={id + '-list'} role="listbox" aria-label="Buku tersedia" ref={popup}>
            {options.map((book, index) => (
              <li
                key={book.id}
                id={id + '-' + index}
                role="option"
                aria-selected={index === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(book)}
              >
                <b>{book.title}</b>
                <small>{[book.author, book.shelf && 'Rak ' + book.shelf, book.stock + ' tersedia'].filter(Boolean).join(' · ')}</small>
              </li>
            ))}
          </ul>
          {!options.length && <p role="status">Tidak ada buku tersedia yang cocok.</p>}
        </div>
      )}
    </div>
  );
}
