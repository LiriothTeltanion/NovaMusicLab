import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');

// This file is the source of truth for every Nova Music Lab app icon. The mark
// is intentionally made from three durable ideas: an N, a signal pulse, and an
// open orbit. The essential shape stays inside the maskable 80% safe zone.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title desc">
  <title id="title">Nova Music Lab</title>
  <desc id="desc">A sonic N with a pulse point inside an open orbit.</desc>
  <defs>
    <radialGradient id="surface" cx="0" cy="0" r="1" gradientTransform="translate(19 12) rotate(48) scale(62)" gradientUnits="userSpaceOnUse">
      <stop stop-color="#123454"/>
      <stop offset=".43" stop-color="#0b1028"/>
      <stop offset="1" stop-color="#050713"/>
    </radialGradient>
    <linearGradient id="orbit" x1="11" y1="13" x2="54" y2="49" gradientUnits="userSpaceOnUse">
      <stop stop-color="#83f3ff"/>
      <stop offset=".55" stop-color="#6878ff"/>
      <stop offset="1" stop-color="#b867ff"/>
    </linearGradient>
    <linearGradient id="signal" x1="18" y1="21" x2="47" y2="43" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f8fdff"/>
      <stop offset=".48" stop-color="#8cecff"/>
      <stop offset="1" stop-color="#d9c1ff"/>
    </linearGradient>
    <clipPath id="tile"><rect width="64" height="64" rx="15"/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="64" height="64" fill="#050713"/>
    <rect width="64" height="64" fill="url(#surface)"/>
    <circle cx="32" cy="32" r="18" fill="#080b1d" opacity=".42"/>
    <path d="M15.03 15.03A24 24 0 1 1 9.45 40.21" fill="none" stroke="url(#orbit)" stroke-width="3.25" stroke-linecap="round"/>
    <circle cx="15.03" cy="15.03" r="2.45" fill="#a8f7ff"/>
    <path d="M18 43V21l13 14 6-8 9 16V21" fill="none" stroke="#02040d" stroke-opacity=".82" stroke-width="9.25" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 43V21l13 14 6-8 9 16V21" fill="none" stroke="url(#signal)" stroke-width="5.75" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="37" cy="27" r="2.35" fill="#ffc857"/>
    <rect x=".75" y=".75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#fff" stroke-opacity=".13" stroke-width="1.5"/>
  </g>
</svg>
`;

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let value = i;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[i] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
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

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const amount = clamp((value - edge0) / (edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
};

function mix(colorA, colorB, amount) {
  const weight = clamp(amount);
  return colorA.map((channel, index) => channel * (1 - weight) + colorB[index] * weight);
}

function composite(color, layer, alpha) {
  const coverage = clamp(alpha);
  for (let channel = 0; channel < 3; channel += 1) {
    color[channel] = color[channel] * (1 - coverage) + layer[channel] * coverage;
  }
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const denominator = vx * vx + vy * vy;
  const amount = denominator === 0 ? 0 : clamp((vx * wx + vy * wy) / denominator);
  return Math.hypot(px - (ax + amount * vx), py - (ay + amount * vy));
}

function polylineDistance(x, y, points) {
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    distance = Math.min(
      distance,
      segmentDistance(x, y, points[index - 1][0], points[index - 1][1], points[index][0], points[index][1]),
    );
  }
  return distance;
}

function roundedSquareDistance(x, y, size, radius) {
  const half = size / 2;
  const dx = Math.max(Math.abs(x - half) - (half - radius), 0);
  const dy = Math.max(Math.abs(y - half) - (half - radius), 0);
  return Math.hypot(dx, dy) - radius;
}

function strokeCoverage(distance, width, antialias) {
  return 1 - smoothstep(width / 2 - antialias, width / 2 + antialias, distance);
}

function normalizeAngle(angle) {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = size / 64;
  const antialias = Math.max(0.58, scale * 0.72);
  const orbitWidth = size <= 16 ? 1.35 : Math.max(1.45, 3.25 * scale);
  const signalWidth = size <= 16 ? 2.05 : Math.max(2.65, 5.75 * scale);
  const shadowWidth = size <= 16 ? 2.55 : Math.max(3.45, 9.25 * scale);
  const pulsePoints = [
    [18, 43],
    [18, 21],
    [31, 35],
    [37, 27],
    [46, 43],
    [46, 21],
  ].map(([x, y]) => [x * scale, y * scale]);
  const orbitStart = normalizeAngle(-Math.PI * 0.75);
  const orbitSweep = (295 * Math.PI) / 180;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const u = px / size;
      const v = py / size;
      const centerDistance = Math.hypot(u - 0.5, v - 0.5);
      const surfaceGlow = 1 - smoothstep(0, 0.88, Math.hypot(u - 0.3, v - 0.2));
      const violetGlow = 1 - smoothstep(0, 0.72, Math.hypot(u - 0.78, v - 0.72));
      const color = mix([5, 7, 19], [18, 52, 84], surfaceGlow * 0.72);
      composite(color, [36, 16, 70], violetGlow * 0.28);
      composite(color, [8, 11, 29], (1 - smoothstep(0.24, 0.3, centerDistance)) * 0.42);

      const dx = px - size / 2;
      const dy = py - size / 2;
      const orbitDistance = Math.abs(Math.hypot(dx, dy) - 24 * scale);
      const angleFromStart = normalizeAngle(Math.atan2(dy, dx) - orbitStart);
      const orbitCoverage = angleFromStart <= orbitSweep
        ? strokeCoverage(orbitDistance, orbitWidth, antialias)
        : 0;
      const orbitColor = mix([131, 243, 255], [184, 103, 255], clamp((u - 0.16) / 0.68));
      composite(color, orbitColor, orbitCoverage * 0.92);

      const orbitNodeDistance = Math.hypot(px - 15.03 * scale, py - 15.03 * scale);
      const orbitNodeRadius = size <= 16 ? 1.05 : Math.max(1.25, 2.45 * scale);
      const orbitNode = 1 - smoothstep(orbitNodeRadius - antialias, orbitNodeRadius + antialias, orbitNodeDistance);
      composite(color, [168, 247, 255], orbitNode);

      const signalDistance = polylineDistance(px, py, pulsePoints);
      const shadow = strokeCoverage(signalDistance, shadowWidth, antialias);
      composite(color, [2, 4, 13], shadow * 0.84);
      const signal = strokeCoverage(signalDistance, signalWidth, antialias);
      const signalColor = u < 0.52
        ? mix([248, 253, 255], [140, 236, 255], u / 0.52)
        : mix([140, 236, 255], [217, 193, 255], (u - 0.52) / 0.48);
      composite(color, signalColor, signal);

      const pulseDistance = Math.hypot(px - 37 * scale, py - 27 * scale);
      const pulseRadius = size <= 16 ? 1.05 : Math.max(1.25, 2.35 * scale);
      const pulse = 1 - smoothstep(pulseRadius - antialias, pulseRadius + antialias, pulseDistance);
      composite(color, [255, 200, 87], pulse);

      const tileDistance = roundedSquareDistance(px, py, size, 15 * scale);
      const tileAlpha = maskable ? 1 : 1 - smoothstep(-antialias, antialias, tileDistance);
      const borderDistance = Math.abs(roundedSquareDistance(px, py, size, 14.25 * scale) + 0.75 * scale);
      const border = size > 32 ? strokeCoverage(borderDistance, 1.5 * scale, antialias) : 0;
      composite(color, [255, 255, 255], border * 0.13);

      const offset = (y * size + x) * 4;
      rgba[offset] = Math.round(clamp(color[0], 0, 255));
      rgba[offset + 1] = Math.round(clamp(color[1], 0, 255));
      rgba[offset + 2] = Math.round(clamp(color[2], 0, 255));
      rgba[offset + 3] = Math.round(tileAlpha * 255);
    }
  }

  return rgba;
}

writeFileSync(join(publicDir, 'favicon.svg'), faviconSvg);

for (const icon of [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-icon-512.png', size: 512, maskable: true },
]) {
  const pixels = drawIcon(icon.size, icon);
  writeFileSync(join(publicDir, icon.file), encodePng(icon.size, icon.size, pixels));
}
