const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_current.json', 'utf8'));

['4357', '4377'].forEach(id => {
  const f = doc.nodes[id];
  console.log(`\nContainer ${id} (${f.name}):`);
  f.children.forEach(cid => {
    const c = doc.nodes[cid];
    const tr = c && c.transform ? `pos: (${c.transform[4]}, ${c.transform[5]})` : 'no-pos';
    console.log(`  [${cid}] ${c.type} "${c.name}" chars: "${c.characters||''}" ${tr} ${c.width}x${c.height}`);
  });
});
