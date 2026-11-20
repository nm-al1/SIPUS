const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_real_current.json', 'utf8'));

const g = doc.nodes['1631'];
if (g && g.children) {
  g.children.forEach(cid => {
    const c = doc.nodes[cid];
    if (!c) return;
    const x = c.transform ? Math.round(c.transform[4]) : 0;
    const y = c.transform ? Math.round(c.transform[5]) : 0;
    const txt = c.characters ? ` "${c.characters.slice(0, 30)}..."` : '';
    console.log(`[${cid}] ${c.type} "${c.name}" (${x}, ${y}) w:${Math.round(c.width || 0)} h:${Math.round(c.height || 0)}${txt}`);
  });
}
