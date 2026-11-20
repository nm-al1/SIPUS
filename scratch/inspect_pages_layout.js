const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_current.json', 'utf8'));

[4078, 4322, 4391, 4453, 3999].forEach(fid => {
  const f = doc.nodes[fid];
  console.log(`\n=============================`);
  console.log(`FRAME ${fid}: ${f.name} (${f.width}x${f.height})`);
  console.log(`=============================`);
  (f.children||[]).forEach(cid => {
    const c = doc.nodes[cid];
    const tr = c && c.transform ? `pos: (${c.transform[4]}, ${c.transform[5]})` : 'no-pos';
    console.log(`  [${cid}] ${c ? `${c.type} "${c.name}" ${c.width}x${c.height} ${tr}` : 'null'}`);
  });
});
