import React from 'react';
import { BookOpen } from 'lucide-react';

const files = import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp,avif,PNG,JPG,JPEG,WEBP,AVIF}', {
  eager: true, query: '?url', import: 'default',
});
const key = (value) => value?.replace(/[^a-z0-9]/gi, '').toLowerCase();
const byIsbn = new Map(Object.entries(files)
  .filter(([path]) => /\/(sampul-buku|cover|covers)\//i.test(path))
  .map(([path, url]) => [key(path.split('/').at(-1).replace(/\.[^.]+$/, '')), url]));

const sizes = {
  thumbnail: [30, 42],
  detail: [100, 142],
  grid: [160, 226],
};

export default function BookCover({ book, size = 'thumbnail' }) {
  const url = byIsbn.get(key(book.isbn));
  const [failed, setFailed] = React.useState(null);
  const [width, height] = sizes[size];
  const detail = size === 'detail';
  const className = 'book-cover book-cover-' + size;
  return url && failed !== url ? (
    <img className={className} src={url} alt={detail ? 'Sampul ' + book.title : ''} width={width} height={height} loading={detail ? 'eager' : 'lazy'} onError={() => setFailed(url)} />
  ) : (
    <span className={className} aria-hidden="true"><BookOpen size={size === 'thumbnail' ? 15 : 30} /></span>
  );
}
