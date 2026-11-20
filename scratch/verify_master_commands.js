const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_true_polished.json', 'utf8'));
const cmds = JSON.parse(fs.readFileSync('scratch/master_vector_commands.json', 'utf8'));

let ok = true;
cmds.forEach((cmd, idx) => {
  const p = doc.nodes[cmd.params.parent];
  const canContain = p && (p.type === 'frame' || p.type === 'group' || p.type === 'page' || p.type === 'boolean_operation');
  if (!canContain) {
    console.error(`ERROR at step ${idx}: parent ${cmd.params.parent} is ${p ? p.type : 'MISSING'}`);
    ok = false;
  }
});

if (ok) {
  console.log('ALL', cmds.length, 'VECTOR COMMANDS HAVE VALID FRAME PARENTS!');
}
