function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('id')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function matches(query, ...fields) {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length) return true;
  const searchable = fields.map(normalize);
  const fieldText = searchable.join(' ');
  const compact = searchable.map((field) => field.replaceAll(' ', ''));
  return terms.every(
    (term) =>
      fieldText.includes(term) || compact.some((field) => field.includes(term)),
  );
}
