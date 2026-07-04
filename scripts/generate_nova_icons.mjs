import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">Nova Music Lab</title>
  <desc id="desc">A luminous sonic orb with a waveform and Nova monogram.</desc>
  <defs>
    <linearGradient id="bg" x1="64" y1="36" x2="448" y2="476" gradientUnits="userSpaceOnUse">
      <stop stop-color="#08111f"/>
      <stop offset=".42" stop-color="#101038"/>
      <stop offset=".72" stop-color="#221039"/>
      <stop offset="1" stop-color="#030712"/>
    </linearGradient>
    <radialGradient id="cyanGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(155 126) rotate(46) scale(318)">
      <stop stop-color="#00f2fe" stop-opacity=".95"/>
      <stop offset=".38" stop-color="#00f2fe" stop-opacity=".28"/>
      <stop offset="1" stop-color="#00f2fe" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="magentaGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(374 154) rotate(124) scale(286)">
      <stop stop-color="#f472b6" stop-opacity=".9"/>
      <stop offset=".42" stop-color="#a855f7" stop-opacity=".32"/>
      <stop offset="1" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="goldGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(324 393) rotate(38) scale(238)">
      <stop stop-color="#facc15" stop-opacity=".74"/>
      <stop offset=".48" stop-color="#fb7185" stop-opacity=".22"/>
      <stop offset="1" stop-color="#fb7185" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(246 238) rotate(61) scale(186)">
      <stop stop-color="#e0faff"/>
      <stop offset=".23" stop-color="#00f2fe"/>
      <stop offset=".56" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#070b1b"/>
    </radialGradient>
    <linearGradient id="ring" x1="112" y1="96" x2="399" y2="404" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22d3ee"/>
      <stop offset=".46" stop-color="#f472b6"/>
      <stop offset="1" stop-color="#facc15"/>
    </linearGradient>
    <linearGradient id="wave" x1="117" y1="266" x2="395" y2="266" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22d3ee"/>
      <stop offset=".5" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#facc15"/>
    </linearGradient>
    <filter id="softGlow" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="13" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1.18 0 0 0  0 0 1.35 0 0  0 0 0 .9 0" result="colored"/>
      <feMerge>
        <feMergeNode in="colored"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000814" flood-opacity=".65"/>
      <feDropShadow dx="0" dy="0" stdDeviation="18" flood-color="#22d3ee" flood-opacity=".38"/>
    </filter>
    <clipPath id="rounded">
      <rect width="512" height="512" rx="112"/>
    </clipPath>
  </defs>
  <g clip-path="url(#rounded)">
    <rect width="512" height="512" fill="url(#bg)"/>
    <rect width="512" height="512" fill="url(#cyanGlow)"/>
    <rect width="512" height="512" fill="url(#magentaGlow)"/>
    <rect width="512" height="512" fill="url(#goldGlow)"/>
    <path d="M39 119C126 75 185 64 256 94c88 37 151 16 221-32v390H39V119Z" fill="#030712" opacity=".26"/>
    <path d="M64 402c88-43 169-55 251-33 49 13 93 36 133 68v75H64V402Z" fill="#020617" opacity=".48"/>
    <g filter="url(#shadow)">
      <circle cx="256" cy="256" r="166" fill="#050816" opacity=".86"/>
      <circle cx="256" cy="256" r="148" fill="url(#core)"/>
      <circle cx="256" cy="256" r="168" fill="none" stroke="url(#ring)" stroke-width="20" opacity=".96"/>
      <circle cx="256" cy="256" r="198" fill="none" stroke="#22d3ee" stroke-width="3" stroke-dasharray="12 18" opacity=".46"/>
      <circle cx="256" cy="256" r="116" fill="none" stroke="#f8fafc" stroke-width="2" opacity=".2"/>
    </g>
    <g filter="url(#softGlow)">
      <path d="M110 271h46l17-48 36 100 31-134 34 154 28-76h100" fill="none" stroke="url(#wave)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M174 342V170l164 172V170" fill="none" stroke="#f8fafc" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M174 342V170l164 172V170" fill="none" stroke="#facc15" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>
    </g>
    <g fill="#f8fafc">
      <circle cx="137" cy="135" r="7" opacity=".86"/>
      <circle cx="385" cy="119" r="5" opacity=".7"/>
      <circle cx="103" cy="319" r="4" opacity=".58"/>
      <circle cx="409" cy="360" r="7" opacity=".72"/>
      <circle cx="308" cy="78" r="4" opacity=".62"/>
    </g>
    <path d="M420 74l8 17 18 7-18 7-8 18-8-18-17-7 17-7 8-17Z" fill="#facc15" opacity=".9"/>
    <path d="M89 92l5 11 12 5-12 5-5 12-5-12-12-5 12-5 5-11Z" fill="#22d3ee" opacity=".8"/>
    <rect x="1.5" y="1.5" width="509" height="509" rx="110.5" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="3"/>
  </g>
</svg>
`;

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function addGlow(color, u, v, cx, cy, glowColor, radius, strength) {
  const d = Math.hypot(u - cx, v - cy);
  const a = (1 - smoothstep(0, radius, d)) * strength;
  color[0] += glowColor[0] * a;
  color[1] += glowColor[1] * a;
  color[2] += glowColor[2] * a;
}

function mixInto(color, target, amount) {
  const a = clamp(amount);
  color[0] = color[0] * (1 - a) + target[0] * a;
  color[1] = color[1] * (1 - a) + target[1] * a;
  color[2] = color[2] * (1 - a) + target[2] * a;
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 === 0 ? 0 : clamp(c1 / c2);
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function roundedSquareAlpha(x, y, size, radius) {
  const cx = size / 2;
  const cy = size / 2;
  const half = size / 2;
  const dx = Math.max(Math.abs(x - cx) - (half - radius), 0);
  const dy = Math.max(Math.abs(y - cy) - (half - radius), 0);
  const sdf = Math.hypot(dx, dy) - radius;
  return 1 - smoothstep(-1.2, 1.6, sdf);
}

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const stars = [
    [0.268, 0.264, 0.014, [248, 250, 252]],
    [0.752, 0.232, 0.01, [244, 114, 182]],
    [0.204, 0.626, 0.008, [34, 211, 238]],
    [0.8, 0.706, 0.014, [250, 204, 21]],
    [0.604, 0.152, 0.008, [248, 250, 252]],
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const d = Math.hypot(u - 0.5, v - 0.5);
      const angle = Math.atan2(v - 0.5, u - 0.5);
      const alpha = maskable ? 1 : roundedSquareAlpha(x + 0.5, y + 0.5, size, size * 0.218);
      const color = [3 + 13 * u, 7 + 10 * v, 22 + 28 * (1 - v)];

      addGlow(color, u, v, 0.3, 0.24, [0, 242, 254], 0.52, 0.7);
      addGlow(color, u, v, 0.72, 0.28, [244, 114, 182], 0.48, 0.55);
      addGlow(color, u, v, 0.64, 0.76, [250, 204, 21], 0.42, 0.35);

      const core = 1 - smoothstep(0.18, 0.36, d);
      mixInto(color, [14, 18, 55], core * 0.72);
      addGlow(color, u, v, 0.46, 0.42, [0, 242, 254], 0.23, core * 0.85);
      addGlow(color, u, v, 0.58, 0.46, [124, 58, 237], 0.29, core * 0.66);

      const ring = (1 - smoothstep(0.006, 0.025, Math.abs(d - 0.333))) * 0.92;
      const ringPulse = 0.68 + 0.32 * Math.sin(angle * 3.2 + 0.7);
      mixInto(color, [
        34 + 216 * clamp(Math.sin(angle + 2.2) * 0.5 + 0.5),
        211 + 33 * clamp(Math.cos(angle - 0.4) * 0.5 + 0.5),
        238 - 120 * clamp(Math.sin(angle - 1.2) * 0.5 + 0.5),
      ], ring * ringPulse);

      const outerRing = (1 - smoothstep(0.001, 0.008, Math.abs(d - 0.392))) * 0.35;
      mixInto(color, [34, 211, 238], outerRing);

      if (u > 0.21 && u < 0.79) {
        const waveY = 0.525 + 0.055 * Math.sin(u * Math.PI * 6.6) + 0.024 * Math.sin(u * Math.PI * 15.2);
        const wave = (1 - smoothstep(0.007, 0.023, Math.abs(v - waveY))) * 0.95;
        mixInto(color, u < 0.58 ? [34, 211, 238] : [250, 204, 21], wave);
      }

      const nShadow = Math.min(
        segmentDistance(u, v, 0.34, 0.66, 0.34, 0.34),
        segmentDistance(u, v, 0.34, 0.34, 0.66, 0.66),
        segmentDistance(u, v, 0.66, 0.66, 0.66, 0.34),
      );
      const shadow = (1 - smoothstep(0.025, 0.064, nShadow)) * core * 0.55;
      mixInto(color, [0, 242, 254], shadow);

      const nStroke = (1 - smoothstep(0.013, 0.027, nShadow)) * core;
      mixInto(color, [248, 250, 252], nStroke);
      const nGold = (1 - smoothstep(0.004, 0.011, nShadow)) * core * 0.55;
      mixInto(color, [250, 204, 21], nGold);

      for (const [sx, sy, sr, starColor] of stars) {
        const sd = Math.hypot(u - sx, v - sy);
        const star = (1 - smoothstep(sr * 0.45, sr, sd)) * 0.75;
        mixInto(color, starColor, star);
      }

      const noise = (Math.sin((x * 12.9898 + y * 78.233) * 0.015) + 1) * 2.2;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(clamp(color[0] + noise, 0, 255));
      rgba[i + 1] = Math.round(clamp(color[1] + noise, 0, 255));
      rgba[i + 2] = Math.round(clamp(color[2] + noise, 0, 255));
      rgba[i + 3] = Math.round(alpha * 255);
    }
  }

  return rgba;
}

writeFileSync(join(publicDir, 'favicon.svg'), faviconSvg);

for (const item of [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-icon-512.png', size: 512, maskable: true },
]) {
  writeFileSync(join(publicDir, item.file), encodePng(item.size, item.size, drawIcon(item.size, item)));
}
