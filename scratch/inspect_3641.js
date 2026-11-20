const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_real_current.json', 'utf8'));

const f = doc.nodes['3641'];
console.log('Frame 3641:', f.name, f.width, f.height);

function describeNode(id, indent = '  ') {
  const n = doc.nodes[id];
  if (!n) return;
  const x = n.transform ? Math.round(n.transform[4]) : 0;
  const y = n.transform ? Math.round(n.transform[5]) : 0;
  const w = Math.round(n.width || 0);
  const h = Math.round(n.height || 0);
  const text = n.characters ? ` "${n.characters.slice(0, 30)}..."` : '';
  console.log(`${indent}[${id}] ${n.type} "${n.name}" (${x}, ${y}) ${w}x${h}${text}`);
  if (n.children && indent.length < 6) {
    n.children.forEach(cid => describeNode(cid, indent + '  '));
  }
}

if (f.children) {
  f.children.forEach(cid => describeNode(cid));
}
