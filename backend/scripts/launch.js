const { spawn } = require('node:child_process');
const path = require('node:path');
require('../src/config/db');
const port = Number(process.env.PORT || 5000);
const url = 'http://127.0.0.1:' + port;
async function ready() {
  try {
    const r = await fetch(url + '/api/health', {
      signal: AbortSignal.timeout(1200),
    });
    const v = await r.json();
    return r.ok && v.success && v.message === 'MySQL terhubung';
  } catch {
    return false;
  }
}
async function main() {
  let child;
  if (!(await ready())) {
    child = spawn(
      process.execPath,
      [path.join(__dirname, '../src/server.js')],
      { stdio: 'inherit', windowsHide: true },
    );
    let connected = false;
    for (let i = 0; i < 25 && child.exitCode === null; i++) {
      await new Promise((r) => setTimeout(r, 400));
      if (await ready()) {
        connected = true;
        break;
      }
    }
    if (!connected) {
      child.kill();
      throw Error('Server belum siap pada ' + url);
    }
    process.on('SIGINT', () => child.kill());
  }
  console.log('Buka ' + url + '. Akun petugas ada di backend/.env.demo.local.');
  spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
  }).unref();
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
