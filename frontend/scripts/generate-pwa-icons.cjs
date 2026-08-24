const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcVal = crc32(buf.slice(4, 8 + len));
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

function encodePNG(width, height, rgbaBuffer) {
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 4)] = 0; // Filter None
    rgbaBuffer.copy(scanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  let ihdr = null;
  const idatBuffers = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    if (type === 'IHDR') {
      ihdr = {
        width: buf.readUInt32BE(pos + 8),
        height: buf.readUInt32BE(pos + 12),
        bitDepth: buf.readUInt8(pos + 16),
        colorType: buf.readUInt8(pos + 17)
      };
    } else if (type === 'IDAT') {
      idatBuffers.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 8 + len + 4;
  }

  const uncompressed = zlib.inflateSync(Buffer.concat(idatBuffers));
  const width = ihdr.width;
  const height = ihdr.height;
  const stride = 1 + width * 4;

  // Unfilter scanlines (handling type 0/1/2/3/4 standard PNG filters)
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const filter = uncompressed[y * stride];
    const srcRow = y * stride + 1;
    const dstRow = y * width * 4;
    const prevDstRow = (y - 1) * width * 4;

    for (let x = 0; x < width * 4; x++) {
      const raw = uncompressed[srcRow + x];
      const left = x >= 4 ? rgba[dstRow + x - 4] : 0;
      const up = y > 0 ? rgba[prevDstRow + x] : 0;
      const upLeft = (y > 0 && x >= 4) ? rgba[prevDstRow + x - 4] : 0;

      let val = raw;
      if (filter === 1) val = (raw + left) & 0xFF;
      else if (filter === 2) val = (raw + up) & 0xFF;
      else if (filter === 3) val = (raw + Math.floor((left + up) / 2)) & 0xFF;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let pr;
        if (pa <= pb && pa <= pc) pr = left;
        else if (pb <= pc) pr = up;
        else pr = upLeft;
        val = (raw + pr) & 0xFF;
      }
      rgba[dstRow + x] = val;
    }
  }

  return { width, height, rgba };
}

// Crop emblem from source logo
function cropEmblem(src) {
  const cropX = 0;
  const cropY = 0;
  const cropW = 304;
  const cropH = 289;

  const emblem = Buffer.alloc(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = ((cropY + y) * src.width + (cropX + x)) * 4;
      const dstIdx = (y * cropW + x) * 4;
      emblem[dstIdx] = src.rgba[srcIdx];
      emblem[dstIdx + 1] = src.rgba[srcIdx + 1];
      emblem[dstIdx + 2] = src.rgba[srcIdx + 2];
      emblem[dstIdx + 3] = src.rgba[srcIdx + 3];
    }
  }
  return { width: cropW, height: cropH, rgba: emblem };
}

// Resample / scale with bilinear interpolation and centering on target canvas
function renderIcon(emblem, targetSize, options = {}) {
  const {
    padding = 0.12, // 12% padding around emblem
    bg = null, // null for transparent, or [r, g, b, a]
    cornerRadius = 0 // rounded corners if bg
  } = options;

  const target = Buffer.alloc(targetSize * targetSize * 4);

  // Fill background if specified
  if (bg) {
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        let inside = true;
        if (cornerRadius > 0) {
          const r = cornerRadius * targetSize;
          const cx = x < r ? r : x > targetSize - r ? targetSize - r : x;
          const cy = y < r ? r : y > targetSize - r ? targetSize - r : y;
          const dist = Math.hypot(x - cx, y - cy);
          if (dist > r) inside = false;
        }
        if (inside) {
          const idx = (y * targetSize + x) * 4;
          target[idx] = bg[0];
          target[idx + 1] = bg[1];
          target[idx + 2] = bg[2];
          target[idx + 3] = bg[3];
        }
      }
    }
  }

  const availW = targetSize * (1 - padding * 2);
  const availH = targetSize * (1 - padding * 2);
  const scale = Math.min(availW / emblem.width, availH / emblem.height);

  const drawW = Math.round(emblem.width * scale);
  const drawH = Math.round(emblem.height * scale);
  const offsetX = Math.round((targetSize - drawW) / 2);
  const offsetY = Math.round((targetSize - drawH) / 2);

  for (let dy = 0; dy < drawH; dy++) {
    const sy = dy / scale;
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, emblem.height - 1);
    const wy = sy - y0;

    for (let dx = 0; dx < drawW; dx++) {
      const sx = dx / scale;
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, emblem.width - 1);
      const wx = sx - x0;

      // Sample 4 neighbor pixels
      const i00 = (y0 * emblem.width + x0) * 4;
      const i10 = (y0 * emblem.width + x1) * 4;
      const i01 = (y1 * emblem.width + x0) * 4;
      const i11 = (y1 * emblem.width + x1) * 4;

      const r = Math.round(
        (1 - wy) * ((1 - wx) * emblem.rgba[i00] + wx * emblem.rgba[i10]) +
        wy * ((1 - wx) * emblem.rgba[i01] + wx * emblem.rgba[i11])
      );
      const g = Math.round(
        (1 - wy) * ((1 - wx) * emblem.rgba[i00 + 1] + wx * emblem.rgba[i10 + 1]) +
        wy * ((1 - wx) * emblem.rgba[i01 + 1] + wx * emblem.rgba[i11 + 1])
      );
      const b = Math.round(
        (1 - wy) * ((1 - wx) * emblem.rgba[i00 + 2] + wx * emblem.rgba[i10 + 2]) +
        wy * ((1 - wx) * emblem.rgba[i01 + 2] + wx * emblem.rgba[i11 + 2])
      );
      const a = Math.round(
        (1 - wy) * ((1 - wx) * emblem.rgba[i00 + 3] + wx * emblem.rgba[i10 + 3]) +
        wy * ((1 - wx) * emblem.rgba[i01 + 3] + wx * emblem.rgba[i11 + 3])
      );

      const targetX = offsetX + dx;
      const targetY = offsetY + dy;
      if (targetX >= 0 && targetX < targetSize && targetY >= 0 && targetY < targetSize) {
        const dstIdx = (targetY * targetSize + targetX) * 4;
        if (!bg) {
          target[dstIdx] = r;
          target[dstIdx + 1] = g;
          target[dstIdx + 2] = b;
          target[dstIdx + 3] = a;
        } else {
          // Alpha composite over bg
          const srcAlpha = a / 255;
          const dstAlpha = (target[dstIdx + 3] / 255) * (1 - srcAlpha);
          const outAlpha = srcAlpha + dstAlpha;
          if (outAlpha > 0) {
            target[dstIdx] = Math.round((r * srcAlpha + target[dstIdx] * dstAlpha) / outAlpha);
            target[dstIdx + 1] = Math.round((g * srcAlpha + target[dstIdx + 1] * dstAlpha) / outAlpha);
            target[dstIdx + 2] = Math.round((b * srcAlpha + target[dstIdx + 2] * dstAlpha) / outAlpha);
            target[dstIdx + 3] = Math.round(outAlpha * 255);
          }
        }
      }
    }
  }

  return encodePNG(targetSize, targetSize, target);
}

// Main execution
const logoPath = path.resolve(__dirname, '../public/aadya-logo.png');
const publicDir = path.resolve(__dirname, '../public');

const src = decodePNG(logoPath);
const emblem = cropEmblem(src);

console.log('Generating PWA Icons for Aadya Institute...');

// 1. Standard transparent PWA 192x192
const pwa192 = renderIcon(emblem, 192, { padding: 0.08 });
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('✓ Created public/pwa-192x192.png');

// 2. Standard transparent PWA 512x512
const pwa512 = renderIcon(emblem, 512, { padding: 0.08 });
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('✓ Created public/pwa-512x512.png');

// 3. Apple Touch Icon 180x180 (with clean white background)
const appleIcon = renderIcon(emblem, 180, { padding: 0.15, bg: [255, 255, 255, 255] });
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('✓ Created public/apple-touch-icon.png');

// 4. Maskable 512x512 icon (with 20% safe-zone padding on Aadya white/light background)
const maskable512 = renderIcon(emblem, 512, { padding: 0.20, bg: [255, 255, 255, 255] });
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512x512.png'), maskable512);
console.log('✓ Created public/maskable-icon-512x512.png');

// 5. Favicon 64x64
const pwa64 = renderIcon(emblem, 64, { padding: 0.06 });
fs.writeFileSync(path.join(publicDir, 'pwa-64x64.png'), pwa64);
console.log('✓ Created public/pwa-64x64.png');

console.log('All PWA icons generated successfully!');
