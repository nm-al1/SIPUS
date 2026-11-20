const fs = require('fs');
const { execSync } = require('child_process');

const icons = [
  { name: 'search', path: 'M21 21l-5.2-5.2m0 0a7.5 7.5 0 10-10.6-10.6 7.5 7.5 0 0010.6 10.6z' },
  { name: 'chevron_down', path: 'M6 9l6 6 6-6' },
  { name: 'plus', path: 'M12 5v14M5 12h14' },
  { name: 'arrow_right', path: 'M5 12h14M12 5l7 7-7 7' },
  { name: 'printer', path: 'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z' },
  { name: 'clock', path: 'M12 22a10 10 0 100-20 10 10 0 000 20zm0-14v6l4 2' },
  { name: 'alert_triangle', path: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01' },
  { name: 'check_circle', path: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3' },
  { name: 'book_open', path: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z' },
  { name: 'user_check', path: 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 3a4 4 0 100 8 4 4 0 000-8zm8.5 8l2 2 4-4' },
  { name: 'message_circle', path: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' }
];

const commands = icons.map((ic, i) => ({
  command: 'vector.create',
  params: {
    path: ic.path,
    width: 20,
    height: 20,
    x: 50 + (i % 6) * 40,
    y: 50 + Math.floor(i / 6) * 40,
    name: 'Test_' + ic.name
  }
}));

fs.writeFileSync('scratch/test_batch_icons.json', JSON.stringify(commands, null, 2));

const cmd = `& "C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe" run --in "scratch/sipus_current.json" --out "scratch/test_batch_out.figcraft" "scratch/test_batch_icons.json"`;
try {
  const res = execSync(cmd, { shell: 'powershell' });
  console.log('Batch Icons Success!');
} catch (err) {
  console.log('Batch Icons Error:', err.stdout ? err.stdout.toString() : err.message);
}
