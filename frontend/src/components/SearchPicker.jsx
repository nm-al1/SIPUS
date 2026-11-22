import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { matches } from './Common';

export default function SearchPicker({ label, placeholder, listLabel, empty, items, selectedLabel, onPick }) {
  const id = useId();
  const popup = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const options = open
    ? items.filter((item) => matches(query, item.label, ...(item.searchTerms || [])))
    : [];

  useEffect(() => {
    popup.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, query, active]);

  function choose(item) {
    onPick(item);
    setOpen(false);
  }

  function openList(index = -1) {
    setQuery('');
    setActive(index);
    setOpen(true);
  }

  function handleKey(e) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openList(e.key === 'ArrowDown' ? 0 : items.length - 1);
      } else if (options.length) {
        const next = active === -1
          ? (e.key === 'ArrowDown' ? 0 : options.length - 1)
          : Math.max(0, Math.min(options.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
        setActive(next);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!open) openList(0);
      else if (options[active]) choose(options[active]);
    }
  }

  return (
    <div className="field search-picker">
      <label htmlFor={id}>{label}</label>
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
          placeholder={placeholder}
          value={open ? query : selectedLabel || ''}
          onFocus={(e) => e.currentTarget.select()}
          onClick={() => {
            if (!open) openList();
          }}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={handleKey}
        />
        <ChevronDown className="search-picker-chevron" size={17} aria-hidden="true" />
      </div>
      {open && (
        <div className="search-picker-popup">
          <ul id={id + '-list'} role="listbox" aria-label={listLabel} ref={popup}>
            {options.map((item, index) => (
              <li
                key={item.id}
                id={id + '-' + index}
                role="option"
                aria-selected={index === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item)}
              >
                <b>{item.label}</b>
                {item.description && <small>{item.description}</small>}
              </li>
            ))}
          </ul>
          {!options.length && <p role="status">{empty}</p>}
        </div>
      )}
    </div>
  );
}
