const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_current.json', 'utf8'));

function list(id) {
  const node = doc.nodes[id];
  console.log(`=== Node ${id}: ${node.type} ("${node.name}") ===`);
  if (node.children) {
    node.children.forEach(cid => {
      const c = doc.nodes[cid];
      console.log(`  child ${cid}: ${c ? c.type + ' ("' + c.name + '")' : 'MISSING'}`);
    });
  }
}

list('4569');
list('4065');
