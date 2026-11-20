const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_current.json', 'utf8'));

function listChildren(id) {
  const node = doc.nodes[id];
  console.log(`=== Node ${id}: ${node.type} ("${node.name}") ===`);
  if (node.children) {
    node.children.forEach(cid => {
      const c = doc.nodes[cid];
      console.log(`  child ${cid}: ${c ? c.type + ' ("' + c.name + '")' : 'MISSING'}`);
    });
  }
}

listChildren('4534'); // Page 10 Laporan
listChildren('4052'); // Page 03 Login
listChildren('4162'); // Page 05 Buku
listChildren('4245'); // Page 06 Siswa
