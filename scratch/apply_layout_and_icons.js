const fs = require('fs');

const jsonPath = 'scratch/sipus_current.json';
const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('--- Enhancing Layout & Vector Icons across All Pages (Preserving Colors) ---');

let nextId = doc.next_id || 6000;
const allocId = () => nextId++;

// Icon SVG path definitions
const SVG_PATHS = {
  search: 'M21 21l-5.2-5.2m0 0a7.5 7.5 0 10-10.6-10.6 7.5 7.5 0 0010.6 10.6z',
  chevronDown: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zm0-14v6l4 2',
  alertTriangle: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01',
  checkCircle: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  bookOpen: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  lock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-7 4v2M7 11V7a5 5 0 0110 0v4',
  messageCircle: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
  calendar: 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-3-2v4M8 2v4M3 10h18',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zm0-8v4m0-8h.01'
};

// Helper to create a cloned vector node from an existing vector (like 4085)
const baseVector = JSON.parse(JSON.stringify(doc.nodes['4085']));
delete baseVector.bound;

function createVectorNode(id, parentId, name, x, y, width, height, strokeColor, strokeWeight) {
  const v = JSON.parse(JSON.stringify(baseVector));
  v.id = id;
  v.parent = parentId;
  v.name = name;
  v.transform = [1, 0, 0, 1, x, y];
  v.width = width || 16;
  v.height = height || 16;
  v.stroke = {
    align: 'center',
    cap_end: 'round',
    cap_start: 'round',
    dashes: [],
    join: 'round',
    miter_limit: 4,
    sides: null,
    weight: strokeWeight || 1.7
  };
  v.strokes = [{
    blend: 'normal',
    color: strokeColor || { r: 0.059, g: 0.463, b: 0.431, a: 1 }, // Teal
    opacity: 1,
    type: 'solid',
    visible: true
  }];
  delete v.fills;
  return v;
}

// Helper to create rectangle node
function createRectNode(id, parentId, name, x, y, width, height, cornerRadius, fillColor, strokeColor, strokeWeight) {
  return {
    blend: 'normal',
    corners: cornerRadius ? { radii: [cornerRadius, cornerRadius, cornerRadius, cornerRadius], smoothing: 0 } : undefined,
    fills: fillColor ? [{
      blend: 'normal',
      color: fillColor,
      opacity: fillColor.a !== undefined ? fillColor.a : 1,
      type: 'solid',
      visible: true
    }] : [],
    strokes: strokeColor ? [{
      blend: 'normal',
      color: strokeColor,
      opacity: strokeColor.a !== undefined ? strokeColor.a : 1,
      type: 'solid',
      visible: true
    }] : undefined,
    stroke: strokeColor ? {
      align: 'inside',
      cap_end: 'none',
      cap_start: 'none',
      dashes: [],
      join: 'miter',
      miter_limit: 4,
      sides: null,
      weight: strokeWeight || 1
    } : undefined,
    height: height,
    id: id,
    name: name,
    parent: parentId,
    transform: [1, 0, 0, 1, x, y],
    type: 'rectangle',
    width: width
  };
}

// Helper to create text node
function createTextNode(id, parentId, name, characters, x, y, width, height, fontSize, fontStyle, color) {
  return {
    blend: 'normal',
    characters: characters,
    child_layout: {
      absolute: false,
      grid_column: null,
      grid_column_span: 0,
      grid_row: null,
      grid_row_span: 0,
      max_h: null,
      max_w: null,
      min_h: null,
      min_w: null,
      sizing_h: 'fixed',
      sizing_v: 'hug'
    },
    fills: [{
      blend: 'normal',
      color: color || { r: 0.09, g: 0.17, b: 0.21, a: 1 },
      opacity: 1,
      type: 'solid',
      visible: true
    }],
    height: height,
    id: id,
    name: name,
    parent: parentId,
    style: {
      case: 'original',
      decoration: 'none',
      fills: null,
      font_family: 'Inter',
      font_size: fontSize || 14,
      font_style: fontStyle || 'Regular',
      letter_spacing: { unit: 'percent', value: 0 },
      line_height: { unit: 'percent', value: 140 },
      link: null
    },
    transform: [1, 0, 0, 1, x, y],
    type: 'text',
    width: width
  };
}

// Colors from design system palette
const COLORS = {
  teal: { r: 0.059, g: 0.463, b: 0.431, a: 1 },        // #0F766E
  tealLight: { r: 0.91, g: 0.96, b: 0.93, a: 1 },     // #E8F5EE
  tealBorder: { r: 0.08, g: 0.72, b: 0.65, a: 0.3 },
  amber: { r: 0.505, g: 0.329, b: 0.02, a: 1 },       // #815405
  amberBg: { r: 1.0, g: 0.96, b: 0.86, a: 1 },        // #FFF5DB
  amberBorder: { r: 0.99, g: 0.90, b: 0.54, a: 1 },
  red: { r: 0.705, g: 0.137, b: 0.196, a: 1 },        // #B42332
  redBg: { r: 1.0, g: 0.94, b: 0.94, a: 1 },          // #FFF0F0
  redBorder: { r: 0.99, g: 0.65, b: 0.65, a: 1 },
  slateDark: { r: 0.09, g: 0.17, b: 0.21, a: 1 },     // #172B35
  slateMuted: { r: 0.32, g: 0.38, b: 0.42, a: 1 },    // #52616B
  slateFaint: { r: 0.53, g: 0.60, b: 0.63, a: 1 },    // #8898A1
  borderLight: { r: 0.86, g: 0.89, b: 0.91, a: 1 },   // #DCE4E7
  white: { r: 1, g: 1, b: 1, a: 1 },
  cardBg: { r: 0.97, g: 0.98, b: 0.99, a: 1 }         // #F8FAFC
};

// Array of vector commands to execute via figcraft-cli run for exact geometry
const vectorCommands = [];

function registerVector(parentId, name, pathKey, x, y, width, height, strokeColorHex, strokeWeight) {
  vectorCommands.push({
    command: 'vector.create',
    params: {
      path: SVG_PATHS[pathKey] || SVG_PATHS.search,
      parent: parentId,
      name: name,
      x: x,
      y: y,
      width: width || 18,
      height: height || 18,
      props: {
        strokes: [{
          type: 'solid',
          color: strokeColorHex || '#0F766E',
          opacity: 1,
          visible: true,
          blend: 'normal'
        }],
        strokeWeight: strokeWeight || 1.7
      }
    }
  });
}

// =========================================================================
// 1. PAGE 01 - BERANDA (Frame 3929)
// =========================================================================
console.log('Polishing Page 01: Beranda Layout & Icons...');
const f3929 = doc.nodes['3929'];

// A. Hero section image polish (3946)
if (doc.nodes['3946']) {
  doc.nodes['3946'].corners = { radii: [16, 16, 16, 16], smoothing: 0 };
  doc.nodes['3946'].stroke = { align: 'inside', cap_end: 'none', cap_start: 'none', dashes: [], join: 'miter', miter_limit: 4, sides: null, weight: 1 };
  doc.nodes['3946'].strokes = [{ blend: 'normal', color: COLORS.borderLight, opacity: 1, type: 'solid', visible: true }];
}

// B. Search Section (3948)
// Add search icon to search input
registerVector(3929, 'Icon / Search_Hero', 'search', 104, 612, 18, 18, '#52616B', 1.7);
if (doc.nodes['3952']) {
  doc.nodes['3952'].transform[4] = 132; // Shift placeholder right
}
// Add button icon on "Cari buku" (3953)
registerVector(3953, 'Icon / Search_Btn', 'search', 34, 13, 16, 16, '#FFFFFF', 2);

// Expand search card 3948 to house quick filter chips
if (doc.nodes['3948']) {
  doc.nodes['3948'].height = 168;
}
// Add filter chips row below search input:
const chipData = [
  { text: 'Semua Koleksi', active: true },
  { text: 'Teknik Komputer (TJKT)', active: false },
  { text: 'Akuntansi (AKL)', active: false },
  { text: 'Otomotif (TKR)', active: false },
  { text: 'PPLG & DKV', active: false }
];
let chipX = 88;
chipData.forEach((c, idx) => {
  const rId = allocId();
  const tId = allocId();
  const cWidth = c.text.length * 7.5 + 24;
  const chipRect = createRectNode(rId, 3929, 'Chip / ' + c.text, chipX, 660, cWidth, 28, 14,
    c.active ? COLORS.teal : COLORS.white,
    c.active ? undefined : COLORS.borderLight, 1);
  const chipText = createTextNode(tId, 3929, 'Text / ' + c.text, c.text, chipX + 12, 666, cWidth - 24, 16, 12, c.active ? 'SemiBold' : 'Regular', c.active ? COLORS.white : COLORS.slateMuted);
  doc.nodes[rId] = chipRect;
  doc.nodes[tId] = chipText;
  f3929.children.push(rId, tId);
  chipX += cWidth + 10;
});

// Shift subsequent sections down by +32px to accommodate chips
const shiftDown = (fromY, delta) => {
  f3929.children.forEach(cid => {
    const n = doc.nodes[cid];
    if (n && n.transform && n.transform[5] >= fromY) {
      n.transform[5] += delta;
    }
  });
};
shiftDown(720, 32);

// C. Book cards polish (3957, 3963, 3969, 3975)
[3957, 3963, 3969, 3975].forEach(cardId => {
  const card = doc.nodes[cardId];
  if (!card) return;
  card.corners = { radii: [12, 12, 12, 12], smoothing: 0 };
  card.stroke = { align: 'inside', cap_end: 'none', cap_start: 'none', dashes: [], join: 'miter', miter_limit: 4, sides: null, weight: 1 };
  card.strokes = [{ blend: 'normal', color: COLORS.borderLight, opacity: 1, type: 'solid', visible: true }];
  // Add subtle book icon inside card at top-right
  registerVector(cardId, 'Icon / BookCard', 'bookOpen', 260, 22, 18, 18, '#8898A1', 1.6);
});

// D. 3-Steps Section Polish (3981 at y: 1154)
// Replace plain text steps with structured step cards
const stepCards = [
  { num: '01', title: '1. Pilih Koleksi di Rak', desc: 'Cari buku pelajaran atau referensi kejuruan di rak perpustakaan.', icon: 'bookOpen', x: 64 },
  { num: '02', title: '2. Datangi Meja Sirkulasi', desc: 'Sebutkan NIS kepada petugas untuk verifikasi identitas dan status pinjaman.', icon: 'user', x: 512 },
  { num: '03', title: '3. Kembalikan Tepat Waktu', desc: 'Masa pinjam 5 hari sekolah. Notifikasi pengingat otomatis terkirim via WhatsApp.', icon: 'clock', x: 960 }
];

const stepY = 1224;
stepCards.forEach(st => {
  const cId = allocId();
  const bId = allocId();
  const btId = allocId();
  const card = createRectNode(cId, 3929, 'StepCard / ' + st.num, st.x, stepY, 416, 116, 12, COLORS.white, COLORS.borderLight, 1);
  const badge = createRectNode(bId, 3929, 'Badge / ' + st.num, st.x + 20, stepY + 20, 34, 24, 6, COLORS.tealLight, COLORS.tealBorder, 1);
  const badgeTxt = createTextNode(btId, 3929, 'Num / ' + st.num, st.num, st.x + 28, stepY + 24, 20, 16, 11, 'Bold', COLORS.teal);
  
  doc.nodes[cId] = card;
  doc.nodes[bId] = badge;
  doc.nodes[btId] = badgeTxt;
  f3929.children.push(cId, bId, btId);
  
  registerVector(3929, 'Icon / Step_' + st.num, st.icon, st.x + 64, stepY + 22, 20, 20, '#0F766E', 1.7);
});

// Hide the old plain text steps
[3982, 3983, 3984, 3985, 3986, 3987].forEach(id => {
  if (doc.nodes[id]) doc.nodes[id].visible = false;
});

// E. Add visual text inside step cards
stepCards.forEach(st => {
  const tTitleId = allocId();
  const tDescId = allocId();
  const titleNode = createTextNode(tTitleId, 3929, 'Title / ' + st.num, st.title, st.x + 20, stepY + 54, 376, 24, 16, 'SemiBold', COLORS.slateDark);
  const descNode = createTextNode(tDescId, 3929, 'Desc / ' + st.num, st.desc, st.x + 20, stepY + 80, 376, 32, 13, 'Regular', COLORS.slateMuted);
  doc.nodes[tTitleId] = titleNode;
  doc.nodes[tDescId] = descNode;
  f3929.children.push(tTitleId, tDescId);
});

// =========================================================================
// 2. PAGE 04 - DASHBOARD (Frame 4078)
// =========================================================================
console.log('Polishing Page 04: Dashboard Layout & Icons...');
const f4078 = doc.nodes['4078'];

// A. Move button "Catat peminjaman" (4122) into Header Row at (1204, 104)
if (doc.nodes['4122']) {
  doc.nodes['4122'].transform[4] = 1204;
  doc.nodes['4122'].transform[5] = 104;
  registerVector(4122, 'Icon / Plus_Borrow', 'plus', 16, 14, 16, 16, '#FFFFFF', 2.2);
  // Shift text inside button slightly right
  if (doc.nodes['4123']) {
    doc.nodes['4123'].transform[4] = 38;
  }
}

// B. Expand & align 3 Stat cards across 1128px content width (width: 360, gap: 24)
const statConfig = [
  { id: 4113, x: 280, icon: 'bookOpen', colorHex: '#0F766E' },
  { id: 4116, x: 664, icon: 'clock', colorHex: '#815405' },
  { id: 4119, x: 1048, icon: 'alertTriangle', colorHex: '#B42332' }
];

statConfig.forEach(st => {
  const card = doc.nodes[st.id];
  if (!card) return;
  card.transform[4] = st.x;
  card.transform[5] = 204;
  card.width = 360;
  card.height = 116;
  card.corners = { radii: [12, 12, 12, 12], smoothing: 0 };
  card.stroke = { align: 'inside', cap_end: 'none', cap_start: 'none', dashes: [], join: 'miter', miter_limit: 4, sides: null, weight: 1 };
  card.strokes = [{ blend: 'normal', color: COLORS.borderLight, opacity: 1, type: 'solid', visible: true }];
  
  // Add icon in top right of stat card
  registerVector(st.id, 'Icon / KPI', st.icon, 316, 20, 22, 22, st.colorHex, 1.8);
});

// C. Polish Priority Table (4125)
const f4125 = doc.nodes['4125'];
if (f4125) {
  f4125.corners = { radii: [12, 12, 12, 12], smoothing: 0 };
  f4125.stroke = { align: 'inside', cap_end: 'none', cap_start: 'none', dashes: [], join: 'miter', miter_limit: 4, sides: null, weight: 1 };
  f4125.strokes = [{ blend: 'normal', color: COLORS.borderLight, opacity: 1, type: 'solid', visible: true }];
}

// Enhance Status text into Badges and Action buttons into clickable pills
const rowStatusActions = [
  { statusId: 4135, actionId: 4136, y: 64, type: 'late', text: 'Terlambat 2 hari' },
  { statusId: 4141, actionId: 4142, y: 136, type: 'late', text: 'Terlambat 1 hari' },
  { statusId: 4147, actionId: 4148, y: 208, type: 'due', text: 'Jatuh tempo' },
  { statusId: 4153, actionId: 4154, y: 280, type: 'soon', text: 'Besok (H-1)' },
  { statusId: 4159, actionId: 4160, y: 352, type: 'soon', text: 'Besok (H-1)' }
];

rowStatusActions.forEach(row => {
  // Add Status Badge pill behind status text
  const badgeId = allocId();
  const isLate = row.type === 'late';
  const badgeRect = createRectNode(badgeId, 4125, 'Badge / ' + row.type, 724, row.y, 142, 28, 6,
    isLate ? COLORS.redBg : COLORS.amberBg,
    isLate ? COLORS.redBorder : COLORS.amberBorder, 1);
  doc.nodes[badgeId] = badgeRect;
  f4125.children.push(badgeId);
  
  if (doc.nodes[row.statusId]) {
    doc.nodes[row.statusId].transform[4] = 736;
    doc.nodes[row.statusId].transform[5] = row.y + 5;
    doc.nodes[row.statusId].characters = (isLate ? '⚠ ' : '🕒 ') + row.text;
    doc.nodes[row.statusId].fills = [{ blend: 'normal', color: isLate ? COLORS.red : COLORS.amber, opacity: 1, type: 'solid', visible: true }];
    doc.nodes[row.statusId].style.font_size = 12.5;
    doc.nodes[row.statusId].style.font_style = 'SemiBold';
  }
  
  // Add Action Button pill behind action text
  const actionBtnId = allocId();
  const actionBtn = createRectNode(actionBtnId, 4125, 'Btn / Kembali', 914, row.y, 140, 28, 6,
    COLORS.tealLight, COLORS.tealBorder, 1);
  doc.nodes[actionBtnId] = actionBtn;
  f4125.children.push(actionBtnId);
  
  if (doc.nodes[row.actionId]) {
    doc.nodes[row.actionId].transform[4] = 926;
    doc.nodes[row.actionId].transform[5] = row.y + 5;
    doc.nodes[row.actionId].characters = 'Proses kembali →';
    doc.nodes[row.actionId].fills = [{ blend: 'normal', color: COLORS.teal, opacity: 1, type: 'solid', visible: true }];
    doc.nodes[row.actionId].style.font_size = 12.5;
    doc.nodes[row.actionId].style.font_style = 'SemiBold';
  }
});

// =========================================================================
// 3. PAGE 07 - PEMINJAMAN (Frame 4322)
// =========================================================================
console.log('Polishing Page 07: Peminjaman Layout & Icons...');
const f4322 = doc.nodes['4322'];

// Input NIS icon (4360)
registerVector(4357, 'Icon / Search_NIS', 'search', 38, 116, 18, 18, '#52616B', 1.7);
if (doc.nodes['4361']) {
  doc.nodes['4361'].transform[4] = 66; // Shift NIS text right
}
// Button Periksa NIS (4362)
registerVector(4362, 'Icon / Check_NIS', 'checkCircle', 20, 13, 16, 16, '#FFFFFF', 2);

// Verified Student Card container
const stuCardId = allocId();
const stuCard = createRectNode(stuCardId, 4357, 'Card / Verified_Student', 24, 172, 640, 116, 10,
  COLORS.cardBg, COLORS.borderLight, 1);
doc.nodes[stuCardId] = stuCard;
doc.nodes['4357'].children.unshift(stuCardId);

registerVector(4357, 'Icon / User_Student', 'user', 44, 194, 28, 28, '#0F766E', 1.8);

if (doc.nodes['4366']) {
  doc.nodes['4366'].transform[4] = 84;
  doc.nodes['4366'].transform[5] = 192;
}
if (doc.nodes['4367']) {
  doc.nodes['4367'].transform[4] = 84;
  doc.nodes['4367'].transform[5] = 226;
}
// Status pill "Layak Meminjam"
if (doc.nodes['4364']) {
  doc.nodes['4364'].transform[4] = 480;
  doc.nodes['4364'].transform[5] = 192;
  doc.nodes['4364'].width = 160;
  doc.nodes['4364'].corners = { radii: [6, 6, 6, 6], smoothing: 0 };
}
if (doc.nodes['4365']) {
  doc.nodes['4365'].transform[4] = 490;
  doc.nodes['4365'].transform[5] = 197;
  doc.nodes['4365'].characters = '✓ Layak Meminjam';
  doc.nodes['4365'].style.font_style = 'SemiBold';
}

// Section 2: Book select input icon
registerVector(4357, 'Icon / Book_Input', 'bookOpen', 38, 438, 18, 18, '#52616B', 1.7);
if (doc.nodes['4372']) {
  doc.nodes['4372'].transform[4] = 66;
}

// Right summary card (4377): Fill empty gap with Informational Rule Notice
const ruleBoxId = allocId();
const ruleTxtId = allocId();
const ruleBox = createRectNode(ruleBoxId, 4377, 'Box / Aturan_Notice', 24, 448, 368, 54, 8,
  COLORS.tealLight, COLORS.tealBorder, 1);
const ruleTxt = createTextNode(ruleTxtId, 4377, 'Text / Aturan_Notice',
  'Aturan A-02: Hari pinjam terhitung hari ke-1. Sabtu, Minggu & libur nasional otomatis dilewati.',
  38, 456, 340, 38, 11.5, 'Regular', COLORS.teal);

doc.nodes[ruleBoxId] = ruleBox;
doc.nodes[ruleTxtId] = ruleTxt;
doc.nodes['4377'].children.push(ruleBoxId, ruleTxtId);

registerVector(4377, 'Icon / Rule_Info', 'info', 32, 458, 14, 14, '#0F766E', 1.8);

// Button "Konfirmasi peminjaman" (4389)
registerVector(4389, 'Icon / Arrow_Confirm', 'arrowRight', 324, 14, 16, 16, '#FFFFFF', 2);

// =========================================================================
// 4. PAGE 08 - PENGEMBALIAN & DENDA (Frame 4391)
// =========================================================================
console.log('Polishing Page 08: Pengembalian Layout & Icons...');
// Search input icon
registerVector(4426, 'Icon / Search_NIS_Ret', 'search', 38, 64, 18, 18, '#52616B', 1.7);
if (doc.nodes['4429']) doc.nodes['4429'].transform[4] = 66;

// Book return items: add book icon & clean status pill
[4434, 4437].forEach((boxId, idx) => {
  const box = doc.nodes[boxId];
  if (!box) return;
  box.corners = { radii: [10, 10, 10, 10], smoothing: 0 };
  box.stroke = { align: 'inside', cap_end: 'none', cap_start: 'none', dashes: [], join: 'miter', miter_limit: 4, sides: null, weight: 1 };
  box.strokes = [{ blend: 'normal', color: COLORS.borderLight, opacity: 1, type: 'solid', visible: true }];
  
  registerVector(4426, 'Icon / Book_Item_' + idx, 'bookOpen', 44, box.transform[5] + 24, 22, 22, '#0F766E', 1.7);
});

// Shift book texts right for icon
if (doc.nodes['4435']) doc.nodes['4435'].transform[4] = 76;
if (doc.nodes['4436']) {
  doc.nodes['4436'].transform[4] = 76;
  doc.nodes['4436'].characters = '✓ Kondisi Fisik: Baik (Lengkap & Bersih)';
  doc.nodes['4436'].fills = [{ blend: 'normal', color: COLORS.teal, opacity: 1, type: 'solid', visible: true }];
  doc.nodes['4436'].style.font_style = 'SemiBold';
}
if (doc.nodes['4438']) doc.nodes['4438'].transform[4] = 76;
if (doc.nodes['4439']) {
  doc.nodes['4439'].transform[4] = 76;
  doc.nodes['4439'].characters = '✓ Kondisi Fisik: Baik (Lengkap & Bersih)';
  doc.nodes['4439'].fills = [{ blend: 'normal', color: COLORS.teal, opacity: 1, type: 'solid', visible: true }];
  doc.nodes['4439'].style.font_style = 'SemiBold';
}

// Fine resolution card (4441)
// Add alert icon to "Terlambat 2 hari"
if (doc.nodes['4444']) {
  doc.nodes['4444'].characters = '⚠ Terlambat 2 Hari Sekolah';
  doc.nodes['4444'].fills = [{ blend: 'normal', color: COLORS.red, opacity: 1, type: 'solid', visible: true }];
  doc.nodes['4444'].style.font_style = 'SemiBold';
}
if (doc.nodes['4443']) {
  doc.nodes['4443'].fills = [{ blend: 'normal', color: COLORS.redBg, opacity: 1, type: 'solid', visible: true }];
  doc.nodes['4443'].strokes = [{ blend: 'normal', color: COLORS.redBorder, opacity: 1, type: 'solid', visible: true }];
}

// Button "Simpan pengembalian" (4451)
registerVector(4451, 'Icon / Check_Return', 'checkCircle', 324, 14, 16, 16, '#FFFFFF', 2);

// =========================================================================
// 5. PAGE 02 - KATALOG BUKU (Frame 3999)
// =========================================================================
console.log('Polishing Page 02: Katalog Layout & Icons...');
// Search input icon
registerVector(3999, 'Icon / Search_Catalog', 'search', 78, 268, 18, 18, '#52616B', 1.7);
if (doc.nodes['4016']) doc.nodes['4016'].transform[4] = 106;

// Dropdown "Semua jurusan" (4019)
registerVector(4019, 'Icon / Chevron_Dept', 'chevronDown', 154, 15, 14, 14, '#52616B', 1.8);

// =========================================================================
// 6. PAGE 09 - WHATSAPP (Frame 4453)
// =========================================================================
console.log('Polishing Page 09: WhatsApp Layout & Icons...');
// Stat cards with icons
const waStats = [
  { id: 4488, icon: 'checkCircle', color: '#16654B' },
  { id: 4491, icon: 'clock', color: '#815405' },
  { id: 4494, icon: 'alertTriangle', color: '#B42332' },
  { id: 4497, icon: 'info', color: '#52616B' }
];
waStats.forEach(st => {
  const c = doc.nodes[st.id];
  if (!c) return;
  c.corners = { radii: [12, 12, 12, 12], smoothing: 0 };
  c.stroke = { align: 'inside', cap_end: 'none', cap_start: 'none', dashes: [], join: 'miter', miter_limit: 4, sides: null, weight: 1 };
  c.strokes = [{ blend: 'normal', color: COLORS.borderLight, opacity: 1, type: 'solid', visible: true }];
  registerVector(st.id, 'Icon / WA_KPI', st.icon, 230, 18, 22, 22, st.color, 1.8);
});

// Dropdown "Semua status" (4500)
registerVector(4500, 'Icon / Chevron_WA', 'chevronDown', 170, 15, 14, 14, '#52616B', 1.8);

// =========================================================================
// 7. PAGE 10 - LAPORAN (Frame 4534)
// =========================================================================
console.log('Polishing Page 10: Laporan Layout & Icons...');
// Button "Cetak laporan A4" (4582 is Action:print frame, 4583 is text)
if (doc.nodes['4582']) {
  registerVector(4582, 'Icon / Print_Report', 'printer', 48, 13, 18, 18, '#FFFFFF', 1.8);
  if (doc.nodes['4583']) {
    doc.nodes['4583'].transform[4] = 78;
  }
}

// =========================================================================
// 8. PAGE 03 - LOGIN PETUGAS (Frame 4052)
// =========================================================================
console.log('Polishing Page 03: Login Layout & Icons...');
// In Form login (4065): add user icon to username input and lock icon to password input
registerVector(4065, 'Icon / User_Login', 'user', 52, 213, 18, 18, '#52616B', 1.7);
registerVector(4065, 'Icon / Lock_Login', 'lock', 52, 317, 18, 18, '#52616B', 1.7);
// Shift placeholders right
if (doc.nodes['4070']) doc.nodes['4070'].transform[4] = 80;
if (doc.nodes['4073']) doc.nodes['4073'].transform[4] = 80;
// Button "Masuk" (4074 Action:dashboard): add arrow icon
registerVector(4074, 'Icon / Arrow_Login', 'arrowRight', 256, 14, 16, 16, '#FFFFFF', 2);

// =========================================================================
// 9. PAGE 05 & 06 - BUKU & DATA SISWA
// =========================================================================
console.log('Polishing Page 05 & 06: Search & Action Icons...');
// Buku search & add
registerVector(4162, 'Icon / Search_Books', 'search', 296, 249, 18, 18, '#52616B', 1.7);
if (doc.nodes['4199']) doc.nodes['4199'].transform[4] = 324;
if (doc.nodes['4200']) {
  registerVector(4200, 'Icon / Plus_Book', 'plus', 74, 14, 16, 16, '#FFFFFF', 2);
  if (doc.nodes['4201']) doc.nodes['4201'].transform[4] = 100;
}

// Siswa search & add
registerVector(4245, 'Icon / Search_Students', 'search', 296, 249, 18, 18, '#52616B', 1.7);
if (doc.nodes['4282']) doc.nodes['4282'].transform[4] = 324;
if (doc.nodes['4283']) {
  registerVector(4283, 'Icon / Plus_Student', 'plus', 74, 14, 16, 16, '#FFFFFF', 2);
  if (doc.nodes['4284']) doc.nodes['4284'].transform[4] = 100;
}

// Save modified JSON
doc.next_id = nextId;
fs.writeFileSync('scratch/sipus_layout_polished.json', JSON.stringify(doc, null, 2), 'utf8');
console.log('Saved modified document to scratch/sipus_layout_polished.json');

// Save vector commands script
fs.writeFileSync('scratch/vector_injection_commands.json', JSON.stringify(vectorCommands, null, 2), 'utf8');
console.log(`Prepared ${vectorCommands.length} vector injection commands.`);
