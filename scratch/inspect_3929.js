const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_current.json', 'utf8'));

const f = doc.nodes['3929'];
console.log('3929 children count:', (f.children||[]).length);
(f.children||[]).forEach(cid => {
  const c = doc.nodes[cid];
  const tr = c && c.transform ? `pos: (${c.transform[4]}, ${c.transform[5]})` : 'no-pos';
  console.log(`  [${cid}] ${c ? `${c.type} "${c.name}" ${c.width}x${c.height} ${tr}` : 'null'}`);
});
