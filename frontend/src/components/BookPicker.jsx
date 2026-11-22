import React from 'react';
import SearchPicker from './SearchPicker';

export default function BookPicker({ books, selected, onPick }) {
  const items = books.map((book) => ({
    id: book.id,
    label: book.title,
    description: [book.author, book.shelf && 'Rak ' + book.shelf, book.stock + ' tersedia'].filter(Boolean).join(' · '),
    searchTerms: [book.author, book.isbn, book.shelf],
    book,
  }));
  return (
    <SearchPicker
      label="Cari dan pilih buku"
      placeholder="Judul, penulis, ISBN, atau rak"
      listLabel="Buku tersedia"
      empty="Tidak ada buku tersedia yang cocok."
      items={items}
      selectedLabel={selected?.title}
      onPick={(item) => onPick(item.book)}
    />
  );
}
