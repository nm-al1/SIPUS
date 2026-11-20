const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/zip_test/document.json', 'utf8'));

console.log('=== STARTING MASTER POLISH (Preserving Dark Teal Palette & Images) ===');

let nextId = doc.next_id || 7000;
const allocId = () => nextId++;

// -------------------------------------------------------------
// 1. FIX TEXT OVERLAPS & LAYOUT COLLISION BUGS
// -------------------------------------------------------------

// A. Peminjaman Buku (Page 08, Frame 1976 / Group 1977)
console.log('1. Fixing text overlaps in Peminjaman Buku...');
if (doc.nodes['2020']) {
  doc.nodes['2020'].transform[5] = 348; // was 336 (collided with 2019)
}
if (doc.nodes['2017']) {
  doc.nodes['2017'].height = 104; // was 92
}
if (doc.nodes['2036']) {
  doc.nodes['2036'].transform[5] = 730; // was 718 (collided with 2035)
}
if (doc.nodes['2033']) {
  doc.nodes['2033'].height = 150; // was 138
}

// B. Pengembalian & Denda (Page 09, Frame 2063 / Group 2064)
console.log('2. Fixing text overlaps in Pengembalian & Denda...');
if (doc.nodes['2122']) doc.nodes['2122'].transform[5] = 684;
if (doc.nodes['2123']) doc.nodes['2123'].transform[5] = 722;
if (doc.nodes['2124']) doc.nodes['2124'].transform[5] = 760;
if (doc.nodes['2120']) doc.nodes['2120'].height = 168; // was 148

// C. Landing Page Hero Polish (Page 01, Frame 3641)
console.log('3. Polishing Landing Page Hero & Thumbnails...');
// Move floating thumbnails 3662 and 3663 to neat docked positions at bottom right of hero banner
if (doc.nodes['3662']) {
  doc.nodes['3662'].transform[4] = 1040;
  doc.nodes['3662'].transform[5] = 390;
  doc.nodes['3662'].width = 126;
  doc.nodes['3662'].height = 70;
}
if (doc.nodes['3417']) {
  doc.nodes['3417'].corners = { radii: [8, 8, 8, 8], smoothing: 0 };
  doc.nodes['3417'].strokes = [{ blend: 'normal', color: { r: 0.12, g: 0.23, b: 0.24, a: 1 }, opacity: 1, type: 'solid', visible: true }];
  doc.nodes['3417'].stroke = { align: 'inside', cap_end: 'none', cap_start: 'none', dashes: [], join: 'miter', miter_limit: 4, sides: null, weight: 1.5 };
}

if (doc.nodes['3663']) {
  doc.nodes['3663'].transform[4] = 1176;
  doc.nodes['3663'].transform[5] = 390;
  doc.nodes['3663'].width = 126;
  doc.nodes['3663'].height = 70;
}
if (doc.nodes['3419']) {
  doc.nodes['3419'].corners = { radii: [8, 8, 8, 8], smoothing: 0 };
  doc.nodes['3419'].strokes = [{ blend: 'normal', color: { r: 0.12, g: 0.23, b: 0.24, a: 1 }, opacity: 1, type: 'solid', visible: true }];
  doc.nodes['3419'].stroke = { align: 'inside', cap_end: 'none', cap_start: 'none', dashes: [], join: 'miter', miter_limit: 4, sides: null, weight: 1.5 };
}

// Hero Slide text overlay spacing & glass backdrop
if (doc.nodes['3413']) {
  doc.nodes['3413'].transform[5] = 186;
}
if (doc.nodes['3414']) {
  doc.nodes['3414'].transform[5] = 192;
}
if (doc.nodes['3415']) {
  doc.nodes['3415'].transform[5] = 222;
}
if (doc.nodes['3416']) {
  doc.nodes['3416'].transform[5] = 262;
}

// Add sleek glassmorphism backdrop behind hero text
const heroBackdropId = allocId();
const heroBackdrop = {
  blend: 'normal',
  corners: { radii: [12, 12, 12, 12], smoothing: 0 },
  fills: [{
    blend: 'normal',
    color: { r: 0.04, g: 0.07, b: 0.09, a: 0.8 },
    opacity: 0.8,
    type: 'solid',
    visible: true
  }],
  strokes: [{
    blend: 'normal',
    color: { r: 0.12, g: 0.23, b: 0.24, a: 1 },
    opacity: 1,
    type: 'solid',
    visible: true
  }],
  stroke: {
    align: 'inside',
    cap_end: 'none',
    cap_start: 'none',
    dashes: [],
    join: 'miter',
    miter_limit: 4,
    sides: null,
    weight: 1
  },
  height: 126,
  id: heroBackdropId,
  name: 'Hero_Text_Backdrop',
  parent: 3661,
  transform: [1, 0, 0, 1, 28, 174],
  type: 'rectangle',
  width: 880
};
doc.nodes[heroBackdropId] = heroBackdrop;
// insert backdrop right behind text in group 3661
if (doc.nodes['3661'] && doc.nodes['3661'].children) {
  doc.nodes['3661'].children.splice(3, 0, heroBackdropId);
}

// D. Placeholder shifts for vector icon placement
console.log('4. Shifting input placeholders for icon integration...');
// Landing Page
if (doc.nodes['3431']) doc.nodes['3431'].transform[4] = 142; // Cari judul buku...
if (doc.nodes['3433']) doc.nodes['3433'].transform[4] = 698; // Cari Buku btn
if (doc.nodes['3629']) doc.nodes['3629'].transform[4] = 910; // Masukkan NIS...
if (doc.nodes['3631']) doc.nodes['3631'].transform[4] = 1056; // Catat Kunjungan btn

// Dashboard
if (doc.nodes['1707']) doc.nodes['1707'].transform[4] = 1250; // Proses Pengembalian btn

// Peminjaman
if (doc.nodes['2016']) doc.nodes['2016'].transform[4] = 350; // NIS input
if (doc.nodes['2029']) doc.nodes['2029'].transform[4] = 350; // Book input
if (doc.nodes['2060']) doc.nodes['2060'].transform[4] = 1056; // Konfirmasi pinjaman

// Pengembalian
if (doc.nodes['2135']) doc.nodes['2135'].transform[4] = 1056; // Simpan Catatan Fisik Diterima
if (doc.nodes['2146']) doc.nodes['2146'].transform[4] = 1042; // Konfirmasi Lunas & Selesaikan

// Login
if (doc.nodes['1658']) doc.nodes['1658'].transform[4] = 538; // petugas.ratna
if (doc.nodes['1661']) doc.nodes['1661'].transform[4] = 538; // password dots

// Katalog
if (doc.nodes['1506']) doc.nodes['1506'].transform[4] = 134; // Cari Koleksi input
if (doc.nodes['1508']) doc.nodes['1508'].transform[4] = 710; // Cari Koleksi btn

// Laporan
if (doc.nodes['2298']) doc.nodes['2298'].transform[4] = 392; // Cetak Laporan btn

// -------------------------------------------------------------
// 2. VECTOR INJECTION COMMANDS
// -------------------------------------------------------------
const SVG_PATHS = {
  search: 'M21 21l-5.2-5.2m0 0a7.5 7.5 0 10-10.6-10.6 7.5 7.5 0 0010.6 10.6z',
  plus: 'M12 5v14M5 12h14',
  bookOpen: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zm0-14v6l4 2',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  lock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-7 4v2M7 11V7a5 5 0 0110 0v4',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  checkCircle: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  alertTriangle: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01',
  calendar: 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-3-2v4M8 2v4M3 10h18',
  messageCircle: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z'
};

const vectorCmds = [];

function addVector(parentFrameId, name, pathKey, x, y, width, height, strokeHex, strokeWeight) {
  vectorCmds.push({
    command: 'vector.create',
    params: {
      path: SVG_PATHS[pathKey],
      parent: parentFrameId,
      name: name,
      x: x,
      y: y,
      width: width || 16,
      height: height || 16,
      props: {
        strokes: [{
          type: 'solid',
          color: strokeHex || '#0F766E',
          opacity: 1,
          visible: true,
          blend: 'normal'
        }],
        strokeWeight: strokeWeight || 1.7
      }
    }
  });
}

// ==========================================
// A. LANDING PAGE (Frame 3641)
// ==========================================
console.log('Generating vectors for Landing Page...');
// 1. Search input icon
addVector(3641, 'Icon / Search_Input', 'search', 114, 729, 18, 18, '#52616B', 1.8);
// 2. Search button icon
addVector(3641, 'Icon / Search_Btn', 'search', 672, 729, 16, 16, '#FFFFFF', 2.0);
// 3. 4 Info Badges below Search
addVector(3641, 'Icon / Badge_Akses', 'user', 226, 840, 16, 16, '#0F766E', 1.8);
addVector(3641, 'Icon / Badge_Pinjam', 'clock', 410, 840, 16, 16, '#0F766E', 1.8);
addVector(3641, 'Icon / Badge_Libur', 'calendar', 594, 840, 16, 16, '#0F766E', 1.8);
addVector(3641, 'Icon / Badge_Notif', 'messageCircle', 778, 840, 16, 16, '#10B981', 1.8);

// 4. Book Cards bookOpen icons (8 cards)
const bookCardCoords = [
  { x: 348, y: 1040 },
  { x: 668, y: 1040 },
  { x: 988, y: 1040 },
  { x: 1308, y: 1040 },
  { x: 348, y: 1390 },
  { x: 668, y: 1390 },
  { x: 988, y: 1390 },
  { x: 1308, y: 1390 }
];
bookCardCoords.forEach((pt, i) => {
  addVector(3641, 'Icon / Book_' + (i + 1), 'bookOpen', pt.x, pt.y, 16, 16, '#8898A1', 1.6);
});

// 5. 3 Steps icons
addVector(3641, 'Icon / Step_1_User', 'user', 108, 1830, 18, 18, '#0F766E', 1.8);
addVector(3641, 'Icon / Step_2_Book', 'bookOpen', 108, 1926, 18, 18, '#0F766E', 1.8);
addVector(3641, 'Icon / Step_3_WA', 'messageCircle', 108, 2022, 18, 18, '#0F766E', 1.8);

// 6. Presensi form
addVector(3641, 'Icon / Presensi_NIS', 'user', 884, 1885, 18, 18, '#52616B', 1.8);
addVector(3641, 'Icon / Presensi_Btn', 'checkCircle', 1022, 1941, 16, 16, '#FFFFFF', 2.0);

// ==========================================
// B. DASHBOARD (Frame 1668)
// ==========================================
console.log('Generating vectors for Dashboard...');
// 4 Stat Cards top-right icons
addVector(1668, 'Icon / KPI_Pinjam', 'bookOpen', 520, 176, 20, 20, '#10B981', 1.8);
addVector(1668, 'Icon / KPI_Tempo', 'clock', 802, 176, 20, 20, '#F59E0B', 1.8);
addVector(1668, 'Icon / KPI_Terlambat', 'alertTriangle', 1084, 176, 20, 20, '#EF4444', 1.8);
addVector(1668, 'Icon / KPI_Kunjungan', 'user', 1366, 176, 20, 20, '#14B8A6', 1.8);

// Header Return button icon
addVector(1668, 'Icon / Return_Header_Btn', 'arrowRight', 1218, 116, 16, 16, '#FFFFFF', 2.0);

// Priority Table Status row icons
addVector(1668, 'Icon / Row1_Late', 'alertTriangle', 1026, 443, 14, 14, '#EF4444', 1.8);
addVector(1668, 'Icon / Row2_Late', 'alertTriangle', 1026, 521, 14, 14, '#EF4444', 1.8);
addVector(1668, 'Icon / Row3_Late', 'alertTriangle', 1026, 599, 14, 14, '#EF4444', 1.8);
addVector(1668, 'Icon / Row4_Soon', 'checkCircle', 1026, 677, 14, 14, '#10B981', 1.8);
addVector(1668, 'Icon / Row5_Soon', 'clock', 1026, 755, 14, 14, '#14B8A6', 1.8);

// ==========================================
// C. PEMINJAMAN BUKU (Frame 1976)
// ==========================================
console.log('Generating vectors for Peminjaman...');
addVector(1976, 'Icon / Input_NIS', 'search', 324, 233, 16, 16, '#52616B', 1.8);
addVector(1976, 'Icon / Input_Book', 'bookOpen', 324, 604, 16, 16, '#52616B', 1.8);
addVector(1976, 'Icon / Confirm_Borrow', 'checkCircle', 1028, 703, 18, 18, '#FFFFFF', 2.0);

// ==========================================
// D. PENGEMBALIAN & DENDA (Frame 2063)
// ==========================================
console.log('Generating vectors for Pengembalian...');
addVector(2063, 'Icon / Simpan_Fisik', 'clock', 1018, 409, 16, 16, '#F59E0B', 1.8);
addVector(2063, 'Icon / Confirm_Return', 'checkCircle', 1004, 727, 18, 18, '#FFFFFF', 2.0);

// ==========================================
// E. LOGIN PETUGAS (Frame 1630)
// ==========================================
console.log('Generating vectors for Login Petugas...');
addVector(1630, 'Icon / Login_User', 'user', 512, 420, 16, 16, '#52616B', 1.8);
addVector(1630, 'Icon / Login_Lock', 'lock', 512, 512, 16, 16, '#52616B', 1.8);
addVector(1630, 'Icon / Login_Arrow', 'arrowRight', 836, 587, 16, 16, '#FFFFFF', 2.0);

// ==========================================
// F. KATALOG (Frame 1482) & LAPORAN (Frame 2243)
// ==========================================
console.log('Generating vectors for Katalog & Laporan...');
addVector(1482, 'Icon / Search_Catalog_Page', 'search', 110, 208, 16, 16, '#52616B', 1.8);
addVector(1482, 'Icon / Search_Catalog_Btn', 'search', 684, 208, 14, 14, '#FFFFFF', 2.0);
addVector(2243, 'Icon / Print_Report_Btn', 'printer', 366, 692, 18, 18, '#FFFFFF', 1.8);

// Save updated JSON
doc.next_id = nextId;
fs.writeFileSync('scratch/zip_test/document.json', JSON.stringify(doc, null, 2), 'utf8');
fs.writeFileSync('scratch/sipus_true_polished.json', JSON.stringify(doc, null, 2), 'utf8');
console.log('Saved modified document to scratch/zip_test/document.json');

// Save vector commands
fs.writeFileSync('scratch/master_vector_commands.json', JSON.stringify(vectorCmds, null, 2), 'utf8');
console.log(`Generated ${vectorCmds.length} vector injection commands.`);
