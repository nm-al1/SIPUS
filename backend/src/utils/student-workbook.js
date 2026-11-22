const yauzl = require('yauzl');
const ZipStream = require('zip-stream');
const { SaxesParser } = require('saxes');
const path = require('node:path').posix;
const { promisify } = require('node:util');

const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const columns = ['NIS', 'Nama', 'Kelas', 'Nomor WA', 'Pemilik Nomor', 'Izin WA', 'Status'];
const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rel = 'http://schemas.openxmlformats.org/package/2006/relationships';
const limit = 16 * 1024 * 1024;
const xml = (text) => String(text ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
  .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

async function workbook(members = []) {
  const data = [columns, ...members.map((m) => [
    m.member_code, m.name, m.class_name, m.phone, m.phone_owner === 'wali' ? 'Wali' : 'Siswa',
    m.consent_at ? 'Ya' : 'Tidak', m.status === 'inactive' ? 'Nonaktif' : 'Aktif',
  ])];
  const rows = data.map((r, i) => {
    const number = i + 1;
    const cells = r.map((value, j) => {
      const column = String.fromCharCode(65 + j);
      return '<c r="' + column + number + '" t="inlineStr"><is><t xml:space="preserve">' + xml(value) + '</t></is></c>';
    });
    return '<row r="' + number + '">' + cells.join('') + '</row>';
  });
  const zip = new ZipStream();
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    zip.on('data', (chunk) => chunks.push(chunk));
    zip.once('end', () => resolve(Buffer.concat(chunks)));
    zip.once('error', reject);
  });
  const parts = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="' + mime.replace('.sheet', '.sheet.main+xml') + '"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="' + rel + '"><Relationship Id="rId1" Type="' + office + '/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="' + ns + '" xmlns:r="' + office + '"><sheets><sheet name="Siswa" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="' + rel + '"><Relationship Id="rId1" Type="' + office + '/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="' + office + '/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': '<styleSheet xmlns="' + ns + '"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" xfId="0"/><xf numFmtId="49" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml': '<worksheet xmlns="' + ns + '"><cols><col min="1" max="1" width="19" style="1" customWidth="1"/><col min="2" max="2" width="32" customWidth="1"/><col min="3" max="3" width="18" customWidth="1"/><col min="4" max="4" width="21" style="1" customWidth="1"/><col min="5" max="7" width="17" customWidth="1"/></cols><sheetData>' + rows.join('') + '</sheetData></worksheet>',
  };
  async function write() {
    for (const [name, content] of Object.entries(parts))
      await promisify(zip.entry.bind(zip))('<?xml version="1.0" encoding="UTF-8"?>' + content, { name });
    zip.finalize();
  }
  const [, file] = await Promise.all([write(), done]);
  return file;
}

async function readZip(file) {
  const zip = await promisify(yauzl.fromBuffer)(file, { lazyEntries: true, validateEntrySizes: true });
  const parts = new Map();
  try {
    if (zip.entryCount > 256) throw Error('Terlalu banyak bagian dalam file.');
    await new Promise((resolve, reject) => {
      let size = 0;
      zip.once('end', resolve);
      zip.once('error', reject);
      zip.on('entry', async (entry) => {
        try {
          if (entry.fileName.endsWith('.xml') || entry.fileName.endsWith('.rels')) {
            size += entry.uncompressedSize;
            if (size > limit || parts.has(entry.fileName)) throw Error('File melebihi batas ukuran.');
            const stream = await promisify(zip.openReadStream.bind(zip))(entry);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            parts.set(entry.fileName, Buffer.concat(chunks).toString('utf8'));
          }
          zip.readEntry();
        } catch (error) {
          reject(error);
        }
      });
      zip.readEntry();
    });
    return parts;
  } finally {
    zip.close();
  }
}

function parse(source, enter, exit = () => {}, value = () => {}) {
  if (!source) throw Error('Bagian file tidak ditemukan.');
  const parser = new SaxesParser();
  parser.on('doctype', () => { throw Error('Deklarasi XML tidak didukung.'); });
  parser.on('opentag', (tag) => enter(tag.name.split(':').at(-1), tag.attributes));
  parser.on('closetag', (tag) => exit(tag.name.split(':').at(-1)));
  parser.on('text', value);
  parser.on('cdata', value);
  parser.write(source).close();
}

async function readWorkbook(file) {
  const parts = await readZip(file);
  let sheet;
  parse(parts.get('xl/workbook.xml'), (name, attrs) => {
    if (name === 'sheet' && !sheet) sheet = Object.entries(attrs).find(([k]) => k.endsWith(':id'))?.[1];
  });
  let sheetPath, stringsPath;
  parse(parts.get('xl/_rels/workbook.xml.rels'), (name, attrs) => {
    if (name !== 'Relationship' || attrs.TargetMode === 'External' || !attrs.Target) return;
    const target = attrs.Target.startsWith('/') ? attrs.Target.slice(1) : path.join('xl', attrs.Target);
    if (attrs.Id === sheet && attrs.Type?.endsWith('/worksheet')) sheetPath = target;
    if (attrs.Type?.endsWith('/sharedStrings')) stringsPath = target;
  });
  const shared = [];
  if (stringsPath) {
    let text = '', reading = false, phonetic = false;
    parse(parts.get(stringsPath), (name) => {
      if (name === 'si') text = '';
      if (name === 'rPh') phonetic = true;
      if (name === 't' && !phonetic) reading = true;
    }, (name) => {
      if (name === 't') reading = false;
      if (name === 'rPh') phonetic = false;
      if (name === 'si') shared.push(text);
    }, (value) => { if (reading) text += value; });
  }
  const result = [];
  let row, cell, reading = false;
  parse(parts.get(sheetPath), (name, attrs) => {
    if (name === 'row') row = { number: Number(attrs.r), values: Array(7).fill(''), hasFormula: false };
    if (name === 'c' && row) cell = { col: attrs.r?.match(/^([A-G])\d+$/)?.[1], type: attrs.t, text: '', formula: false };
    if (cell) {
      if (name === 't' || name === 'v') reading = true;
      if (name === 'f') cell.formula = true;
    }
  }, (name) => {
    if (name === 't' || name === 'v') reading = false;
    if (name === 'c' && cell) {
      if (cell.col) {
        const i = cell.col.charCodeAt(0) - 65;
        row.values[i] = cell.type === 's' ? (shared[Number(cell.text)] ?? '') : cell.text;
        row.hasFormula ||= cell.formula || cell.type === 'e';
      }
      cell = null;
    }
    if (name === 'row' && row && (row.hasFormula || row.values.some((v) => v.trim()))) {
      result.push(row);
      if (result.length > 5001) throw Error('Maksimal 5.000 siswa dalam satu impor.');
    }
  }, (text) => { if (reading && cell) cell.text += text; });
  return result;
}

module.exports = { mime, columns, workbook, readWorkbook };
