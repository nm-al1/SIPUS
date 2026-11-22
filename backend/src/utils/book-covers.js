const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const coverPrefix = '/uploads/sampul-buku/';
const coverFolder = path.resolve(
  process.env.SIPUS_COVER_DIR || path.join(__dirname, '../../uploads/sampul-buku'),
);
const coverLimit = 5 * 1024 * 1024;
const coverName = /^[\da-f-]{36}\.(jpg|png|webp)$/;
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');

function imageInfo(file) {
  if (file.length >= 33 && file.subarray(0, 8).equals(pngSignature) &&
      file.toString('ascii', 12, 16) === 'IHDR' && file.toString('ascii', file.length - 8, file.length - 4) === 'IEND') {
    return ['png', file.readUInt32BE(16), file.readUInt32BE(20)];
  }
  if (file[0] === 0xff && file[1] === 0xd8 && file.at(-2) === 0xff && file.at(-1) === 0xd9) {
    for (let offset = 2; offset + 8 < file.length && file[offset] === 0xff;) {
      while (file[offset] === 0xff) offset++;
      const marker = file[offset++];
      if (offset + 2 > file.length) break;
      const size = file.readUInt16BE(offset);
      if (size < 2 || offset + size > file.length || marker === 0xda) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 8) {
        return ['jpg', file.readUInt16BE(offset + 5), file.readUInt16BE(offset + 3)];
      }
      offset += size;
    }
  }
  if (file.length >= 25 && file.toString('ascii', 0, 4) === 'RIFF' &&
      file.toString('ascii', 8, 12) === 'WEBP' && file.readUInt32LE(4) + 8 === file.length) {
    const mode = file.toString('ascii', 12, 16);
    if (mode === 'VP8X' && file.length >= 30) {
      return ['webp', file.readUIntLE(24, 3) + 1, file.readUIntLE(27, 3) + 1];
    }
    if (mode === 'VP8L' && file[20] === 0x2f) {
      const bits = file.readUInt32LE(21);
      return ['webp', (bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    if (mode === 'VP8 ' && file.length >= 30 && file.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      return ['webp', file.readUInt16LE(26) & 0x3fff, file.readUInt16LE(28) & 0x3fff];
    }
  }
  return [];
}

function validateCover(file) {
  if (!Buffer.isBuffer(file) || !file.length || file.length > coverLimit) {
    throw Object.assign(new Error('Pilih gambar berukuran maksimal 5 MB.'), { status: 400 });
  }
  const [extension, width, height] = imageInfo(file);
  if (!extension || !width || !height || width > 6000 || height > 6000) {
    throw Object.assign(new Error('Gunakan gambar JPG, PNG, atau WebP yang valid, maksimal 6.000 piksel per sisi.'), { status: 400 });
  }
  return extension;
}

async function withCoverUploads(run) {
  const created = [];
  try {
    return await run(async (file, extension) => {
      await fs.mkdir(coverFolder, { recursive: true });
      const name = randomUUID() + '.' + extension;
      const target = path.join(coverFolder, name);
      const handle = await fs.open(target, 'wx');
      created.push(target);
      try {
        await handle.writeFile(file);
      } finally {
        await handle.close();
      }
      return coverPrefix + name;
    });
  } catch (error) {
    await Promise.allSettled(created.map((target) => fs.unlink(target)));
    throw error;
  }
}

module.exports = { coverPrefix, coverFolder, coverLimit, coverName, validateCover, withCoverUploads };
