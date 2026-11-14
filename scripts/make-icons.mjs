// Génère les icônes PNG de l'application (sans dépendance externe).
import zlib from 'node:zlib';
import fs from 'node:fs';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(size) {
  const s = size / 512;
  const pts = [[256, 70], [408, 158], [408, 354], [256, 442], [104, 354], [104, 158]].map(([x, y]) => [x * s, y * s]);
  const segs = pts.map((p, i) => [p, pts[(i + 1) % 6]]);
  const inner = [[pts[0], pts[3]], [pts[5], pts[2]], [pts[1], pts[4]]];
  const dist = (px, py, [[x1, y1], [x2, y2]]) => {
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let col = [20, 18, 26];
      const d = Math.min(...segs.map((g) => dist(x + 0.5, y + 0.5, g)));
      const di = Math.min(...inner.map((g) => dist(x + 0.5, y + 0.5, g)));
      if (di < 5 * s) col = [110, 88, 40];
      if (d < 11 * s) col = [212, 167, 58];
      const r = Math.hypot(x - 256 * s, y - 256 * s);
      if (r < 52 * s) col = [240, 214, 138];
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const n of [192, 512]) fs.writeFileSync(new URL(`../public/icon-${n}.png`, import.meta.url), png(n));
console.log('icônes générées');
