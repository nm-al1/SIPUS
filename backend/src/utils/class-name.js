function normalizeClassName(value) {
  return typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
}

function classKey(value) {
  return normalizeClassName(value).toLowerCase();
}

module.exports = { normalizeClassName, classKey };
