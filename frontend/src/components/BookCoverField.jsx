import React, { useEffect, useRef, useState } from 'react';
import BookCover from './BookCover';
import { Field } from './Common';

export default function BookCoverField({ book, file, onChange, disabled }) {
  const input = useRef(null);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="book-cover-field">
      {file && preview
        ? <img src={preview} className="book-cover book-cover-detail" width="100" height="142" alt="Pratinjau sampul baru" />
        : <BookCover book={book} size="detail" />}
      <div>
        <Field label="Foto sampul">
          <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            disabled={disabled} onChange={(event) => onChange(event.target.files?.[0] || null)} />
        </Field>
        <small>JPG, PNG, atau WebP. Maksimal 5 MB.</small>
        {file && (
          <button type="button" className="linkbtn" disabled={disabled} onClick={() => {
            input.current.value = '';
            onChange(null);
          }}>Batal pilih sampul</button>
        )}
      </div>
    </div>
  );
}
