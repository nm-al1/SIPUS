const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_real_current.json', 'utf8'));

const frames = [
  { id: '1668', name: 'Dashboard' },
  { id: '1630', name: 'Login' },
  { id: '1482', name: 'Katalog' },
  { id: '1767', name: 'Buku' },
  { id: '1874', name: 'Siswa' },
  { id: '2147', name: 'WhatsApp' },
  { id: '2243', name: 'Laporan' }
];

frames.forEach(f => {
  const node = doc.nodes[f.id];
  console.log(`=== ${f.name} (Frame ${f.id}) ===`);
  if (!node || !node.children) return;
  node.children.forEach(cid => {
    const c = doc.nodes[cid];
    if (!c) return;
    const txt = c.characters ? ` "${c.characters.slice(0, 30)}..."` : '';
    console.log(`  [${cid}] ${c.type} "${c.name}" (${c.transform ? Math.round(c.transform[4]) : 0}, ${c.transform ? Math.round(c.transform[5]) : 0})${txt}`);
  });
});
