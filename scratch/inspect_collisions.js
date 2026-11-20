const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_real_current.json', 'utf8'));

function inspectChildren(id) {
  const f = doc.nodes[id];
  console.log(`=== Node ${id}: ${f.type} "${f.name}" ===`);
  if (!f.children) return;
  f.children.forEach(cid => {
    const c = doc.nodes[cid];
    if (!c) return;
    const x = c.transform ? Math.round(c.transform[4]) : 0;
    const y = c.transform ? Math.round(c.transform[5]) : 0;
    const txt = c.characters ? ` "${c.characters.replace(/\n/g, ' ')}"` : '';
    console.log(`  [${cid}] ${c.type} "${c.name}" (${x}, ${y}) w:${Math.round(c.width || 0)} h:${Math.round(c.height || 0)}${txt}`);
  });
}

inspectChildren('1976'); // Peminjaman
inspectChildren('2063'); // Pengembalian
