/**
 * Tạo icon xanh LinkedIn (#0A66C2) cho extension — không cần thư viện ngoài.
 * Chạy: node create-icons.js
 */
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

function crc32(data) {
  let crc = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const combined = Buffer.concat([typeBytes, data]);
  const crcVal = crc32(combined);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([length, combined, crcBuf]);
}

// Chữ "in" cách điệu: 1 gạch dọc (i) + 2 gạch dọc nối gạch chéo phía trên (n).
function isLinkedInGlyph(nx, ny) {
  const top = 0.3;
  const bottom = 0.72;
  if (ny < top || ny > bottom) return false;

  const barW = 0.1;

  const iX = 0.24;
  if (Math.abs(nx - iX) < barW / 2) return true;

  const nLeftX = 0.52;
  const nRightX = 0.8;
  if (Math.abs(nx - nLeftX) < barW / 2) return true;
  if (Math.abs(nx - nRightX) < barW / 2 && ny > top + (bottom - top) * 0.15) return true;

  // Gạch chéo nối 2 chân chữ "n" ở phần trên
  if (ny < top + (bottom - top) * 0.4 && nx >= nLeftX - barW / 2 && nx <= nRightX + barW / 2) {
    const t = (ny - top) / ((bottom - top) * 0.4);
    const expectedX = nLeftX + (nRightX - nLeftX) * t;
    if (Math.abs(nx - expectedX) < barW / 2) return true;
  }

  return false;
}

function createIcon(size, bg, fg) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createPngChunk("IHDR", ihdrData);

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter type: none
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      if (isLinkedInGlyph(nx, ny)) {
        row.push(fg[0], fg[1], fg[2]);
      } else {
        row.push(bg[0], bg[1], bg[2]);
      }
    }
    rows.push(Buffer.from(row));
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idat = createPngChunk("IDAT", compressed);
  const iend = createPngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const LINKEDIN_BLUE = [10, 102, 194]; // #0A66C2
const WHITE = [255, 255, 255];

[16, 48, 128].forEach((size) => {
  const png = createIcon(size, LINKEDIN_BLUE, WHITE);
  const name = `icon${size}.png`;
  fs.writeFileSync(path.join(iconsDir, name), png);
  console.log(`Created: ${name} (${png.length} bytes)`);
});

console.log("\nDone.");
