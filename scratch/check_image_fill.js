const fs = require('fs');

// Read the original document.json from archive
const { execSync } = require('child_process');
execSync('tar -xf design/archive/Sipus_before_light_redesign_20261117-181525.figcraft -C scratch/zip_test document.json');
const origDoc = JSON.parse(fs.readFileSync('scratch/zip_test/document.json', 'utf8'));

console.log('3842 in origDoc:', JSON.stringify(origDoc.nodes['3842'], null, 2));
console.log('3411 in origDoc:', JSON.stringify(origDoc.nodes['3411'], null, 2));

const newDoc = JSON.parse(fs.readFileSync('scratch/sipus_true_polished.json', 'utf8'));
console.log('3842 in newDoc:', JSON.stringify(newDoc.nodes['3842'], null, 2));
console.log('3411 in newDoc:', JSON.stringify(newDoc.nodes['3411'], null, 2));
