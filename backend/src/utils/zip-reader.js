const yauzl = require('yauzl');
const { promisify } = require('node:util');

async function readZip(file, { entryLimit, byteLimit, accept }) {
  const zip = await promisify(yauzl.fromBuffer)(file, {
    lazyEntries: true, validateEntrySizes: true, strictFileNames: true,
  });
  const parts = new Map();
  try {
    if (zip.entryCount > entryLimit) throw Error('Terlalu banyak file dalam arsip.');
    await new Promise((resolve, reject) => {
      let size = 0;
      zip.once('end', resolve);
      zip.once('error', reject);
      zip.on('entry', async (entry) => {
        try {
          if (accept(entry.fileName)) {
            size += entry.uncompressedSize;
            if (size > byteLimit || parts.has(entry.fileName)) {
              throw Error('Arsip melebihi batas ukuran atau berisi nama file ganda.');
            }
            const stream = await promisify(zip.openReadStream.bind(zip))(entry);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            parts.set(entry.fileName, Buffer.concat(chunks));
          }
          zip.readEntry();
        } catch (error) {
          reject(error);
        }
      });
      zip.readEntry();
    });
    return parts;
  } finally {
    zip.close();
  }
}

module.exports = readZip;
