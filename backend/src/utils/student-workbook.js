const ZipStream = require('zip-stream');
const { SaxesParser } = require('saxes');
const path = require('node:path').posix;
const { promisify } = require('node:util');
const readZip = require('./zip-reader');

const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const columns = ['NIS', 'Nama', 'Kelas', 'Nomor WA', 'Pemilik Nomor', 'Status'];
const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rel = 'http://schemas.openxmlformats.org/package/2006/relationships';
const limit = 16 * 1024 * 1024;
const worksheetMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
const tooManyStudents = 'Maksimal 5.000 siswa dalam satu impor.';
const xml = (text) => String(text ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
  .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function classSheets(members) {
  const used = new Set(['history']);
  const groups = [...Map.groupBy(members, (member) => member.class_name || '')]
    .sort(([a], [b]) => Number(!a) - Number(!b) || a.localeCompare(b, 'id', { numeric: true }));
  return groups.map(([className, students]) => {
    const base = className
      .replace(/[\x00-\x1f\\/?*:[\]]/g, '-')
      .replace(/^[\s']+|[\s']+$/g, '') || 'Belum Ada Kelas';
    function sheetName(suffix = '') {
      return base.slice(0, 31 - suffix.length)
        .replace(/[\uD800-\uDBFF]$/, '').replace(/[\s']+$/, '') + suffix;
    }
    let name = sheetName();
    for (let n = 2; used.has(name.toLowerCase()); n++) name = sheetName(' (' + n + ')');
    used.add(name.toLowerCase());
    return { name, members: students };
  });
}

function worksheet(data, textColumns) {
  const rows = data.map((r, i) => {
    const number = i + 1;
    const cells = r.map((value, j) => {
      const column = String.fromCharCode(65 + j);
      return '<c r="' + column + number + '" t="inlineStr"><is><t xml:space="preserve">' + xml(value) + '</t></is></c>';
    });
    return '<row r="' + number + '">' + cells.join('') + '</row>';
  });
  const widths = data[0].map((_, index) => {
    const column = index + 1;
    const style = textColumns.includes(column) ? ' style="1"' : '';
    const width = column === 2 ? 32 : 21;
    return '<col min="' + column + '" max="' + column + '" width="' + width + '"' + style + ' customWidth="1"/>';
  }).join('');
  return '<worksheet xmlns="' + ns + '"><cols>' + widths + '</cols><sheetData>' + rows.join('') + '</sheetData></worksheet>';
}

function workbook(members = [], { byClass = false } = {}) {
  const groups = byClass && members.length ? classSheets(members) : [{ name: 'Siswa', members }];
  return writeWorkbook(groups.map((group) => ({
    name: group.name,
    rows: [columns, ...group.members.map((m) => [
      m.member_code, m.name, m.class_name, m.phone, m.phone_owner === 'wali' ? 'Wali' : 'Siswa',
      m.status === 'inactive' ? 'Nonaktif' : 'Aktif',
    ])],
  })), [1, 4]);
}

async function writeWorkbook(data, textColumns) {
  const sheets = data.map((sheet, index) => ({
    ...sheet, id: index + 1, part: 'worksheets/sheet' + (index + 1) + '.xml',
  }));
  const sheetTypes = sheets.map(({ part }) => '<Override PartName="/xl/' + part + '" ContentType="' + worksheetMime + '"/>').join('');
  const sheetList = sheets.map(({ name, id }) => '<sheet name="' + xml(name) + '" sheetId="' + id + '" r:id="rId' + id + '"/>').join('');
  const sheetRelations = sheets.map(({ id, part }) => '<Relationship Id="rId' + id + '" Type="' + office + '/worksheet" Target="' + part + '"/>').join('');
  const zip = new ZipStream();
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    zip.on('data', (chunk) => chunks.push(chunk));
    zip.once('end', () => resolve(Buffer.concat(chunks)));
    zip.once('error', reject);
  });
  const parts = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="' + mime.replace('.sheet', '.sheet.main+xml') + '"/>' + sheetTypes + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="' + rel + '"><Relationship Id="rId1" Type="' + office + '/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="' + ns + '" xmlns:r="' + office + '"><sheets>' + sheetList + '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="' + rel + '">' + sheetRelations + '<Relationship Id="rIdStyles" Type="' + office + '/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': '<styleSheet xmlns="' + ns + '"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" xfId="0"/><xf numFmtId="49" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    ...Object.fromEntries(sheets.map((sheet) => ['xl/' + sheet.part, worksheet(sheet.rows, textColumns)])),
  };
  async function write() {
    for (const [name, content] of Object.entries(parts))
      await promisify(zip.entry.bind(zip))('<?xml version="1.0" encoding="UTF-8"?>' + content, { name });
    zip.finalize();
  }
  const [, file] = await Promise.all([write(), done]);
  return file;
}

function parse(source, enter, exit = () => {}, value = () => {}) {
  if (!source) throw Error('Bagian file tidak ditemukan.');
  const parser = new SaxesParser();
  parser.on('doctype', () => { throw Error('Deklarasi XML tidak didukung.'); });
  parser.on('opentag', (tag) => enter(tag.name.split(':').at(-1), tag.attributes));
  parser.on('closetag', (tag) => exit(tag.name.split(':').at(-1)));
  parser.on('text', value);
  parser.on('cdata', value);
  parser.write(source.toString('utf8')).close();
}

async function readWorkbook(file, { maxColumns = 7, rowLimitMessage = tooManyStudents } = {}) {
  const parts = await readZip(file, {
    entryLimit: 6000, byteLimit: limit, accept: (name) => /\.(xml|rels)$/.test(name),
  });
  const sheets = [];
  parse(parts.get('xl/workbook.xml'), (name, attrs) => {
    if (name !== 'sheet') return;
    const id = Object.entries(attrs).find(([k]) => k.endsWith(':id'))?.[1];
    sheets.push({ id, name: attrs.name });
  });
  const relations = new Map();
  let stringsPath;
  parse(parts.get('xl/_rels/workbook.xml.rels'), (name, attrs) => {
    if (name !== 'Relationship' || attrs.TargetMode === 'External' || !attrs.Target) return;
    const target = attrs.Target.startsWith('/') ? attrs.Target.slice(1) : path.join('xl', attrs.Target);
    relations.set(attrs.Id, { target, type: attrs.Type });
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
  let total = 0;
  for (const sheet of sheets) {
    const relation = relations.get(sheet.id);
    if (!relation) throw Error('Referensi sheet tidak ditemukan.');
    if (!relation.type?.endsWith('/worksheet')) continue;
    const rows = readSheet(parts.get(relation.target), shared, maxColumns, () => {
      if (++total > 5000) throw Error(rowLimitMessage);
    });
    result.push({ name: sheet.name, rows });
  }
  return result;
}

function readSheet(source, shared, maxColumns, countRow) {
  const result = [];
  let row, cell, reading = false;
  parse(source, (name, attrs) => {
    if (name === 'row') row = { number: Number(attrs.r), values: Array(maxColumns).fill(''), hasFormula: false };
    if (name === 'c' && row) cell = { col: attrs.r?.match(/^([A-Z])\d+$/)?.[1], type: attrs.t, text: '', formula: false };
    if (cell) {
      if (name === 't' || name === 'v') reading = true;
      if (name === 'f') cell.formula = true;
    }
  }, (name) => {
    if (name === 't' || name === 'v') reading = false;
    if (name === 'c' && cell) {
      if (cell.col) {
        const i = cell.col.charCodeAt(0) - 65;
        if (i < maxColumns) {
          row.values[i] = cell.type === 's' ? (shared[Number(cell.text)] ?? '') : cell.text;
          row.hasFormula ||= cell.formula || cell.type === 'e';
        }
      }
      cell = null;
    }
    if (name === 'row' && row) {
      while (row.values.length && !row.values.at(-1).trim()) row.values.pop();
      if (row.hasFormula || row.values.length) {
        if (result.length) countRow();
        result.push(row);
      }
      row = null;
    }
  }, (text) => { if (reading && cell) cell.text += text; });
  return result;
}

module.exports = { mime, columns, workbook, writeWorkbook, readWorkbook };
