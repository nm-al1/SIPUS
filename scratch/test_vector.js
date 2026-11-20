const fs = require('fs');
const { execSync } = require('child_process');

const script = [
  {
    command: 'vector.create',
    params: {
      path: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      width: 20,
      height: 20,
      x: 100,
      y: 100,
      name: 'Icon_Search_Test'
    }
  }
];

fs.writeFileSync('scratch/test_vector_cmd.json', JSON.stringify(script, null, 2));

const cmd = `& "C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe" run --in "scratch/sipus_current.json" --out "scratch/test_vector_out.figcraft" "scratch/test_vector_cmd.json"`;
try {
  const res = execSync(cmd, { shell: 'powershell' });
  console.log('Success:', res.toString());
} catch (err) {
  console.log('Error output:', err.stdout ? err.stdout.toString() : err.message);
}
