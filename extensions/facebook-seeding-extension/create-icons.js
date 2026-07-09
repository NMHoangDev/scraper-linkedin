/**
 * Tạo placeholder icons cho extension - không cần thư viện ngoài
 * Chạy: node create-icons.js
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c;
    }
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createPngChunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const combined = Buffer.concat([typeBytes, data]);
    const crcVal = crc32(combined);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([length, combined, crcBuf]);
}

function createPng(width, height, bgR, bgG, bgB, textR, textG, textB, text) {
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 2;  // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = createPngChunk('IHDR', ihdrData);

    // Raw pixel data (filter byte + RGB per row)
    const rawRows = [];
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const fontSize = Math.max(Math.floor(height * 0.55), 1);

    for (let y = 0; y < height; y++) {
        const row = [0]; // filter type: none
        for (let x = 0; x < width; x++) {
            // Simple "K" letter check - diagonal bar
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.abs(dx) + Math.abs(dy);

            // K shape: vertical bar + two diagonal arms
            const isVerticalBar = Math.abs(dx) < width * 0.15 && dy < height * 0.35 && dy > -height * 0.35;
            const isTopArm = (dy < 0 && dy > -height * 0.35 && Math.abs(dx - dy * 0.8) < width * 0.12);
            const isBottomArm = (dy > 0 && dy < height * 0.35 && Math.abs(dx + dy * 0.8) < width * 0.12);

            if (isVerticalBar || isTopArm || isBottomArm) {
                row.push(textR, textG, textB);
            } else {
                row.push(bgR, bgG, bgB);
            }
        }
        rawRows.push(Buffer.from(row));
    }

    const rawData = Buffer.concat(rawRows);
    const compressed = zlib.deflateSync(rawData, { level: 9 });
    const idat = createPngChunk('IDAT', compressed);

    // IEND
    const iend = createPngChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
}

// Tạo icons với màu gradient navy + emerald
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

const configs = [
    { size: 16, bg: [30, 58, 95], text: [16, 185, 129] },    // Navy + Emerald
    { size: 48, bg: [30, 58, 95], text: [16, 185, 129] },
    { size: 128, bg: [30, 58, 95], text: [16, 185, 129] },
];

configs.forEach(({ size, bg, text }) => {
    const png = createPng(size, size, bg[0], bg[1], bg[2], text[0], text[1], text[2], 'K');
    const name = size === 16 ? 'icon16.png' : size === 48 ? 'icon48.png' : 'icon128.png';
    fs.writeFileSync(path.join(iconsDir, name), png);
    console.log(`Created: ${name} (${png.length} bytes)`);
});

console.log('\nAll icons created successfully!');
