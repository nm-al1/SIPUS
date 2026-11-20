const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/sipus_current.json', 'utf8'));
const cmds = JSON.parse(fs.readFileSync('scratch/vector_injection_commands.json', 'utf8'));

cmds.forEach((cmd, idx) => {
  const p = doc.nodes[cmd.params.parent];
  const type = p ? p.type : 'MISSING';
  const name = p ? p.name : '';
  const canContain = p && (p.type === 'frame' || p.type === 'group' || p.type === 'page' || p.type === 'boolean_operation');
  console.log('Step ' + idx + ': parent ' + cmd.params.parent + ' -> ' + type + ' ("' + name + '") ' + (canContain ? 'OK' : 'INVALID'));
});
