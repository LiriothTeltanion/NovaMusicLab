import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');

// This file is the source of truth for every Nova Music Lab app icon. The mark
// is intentionally made from three durable ideas: an N, a signal pulse, and an
// open orbit. Large icons add a spectral atlas, grooves and constellation dust,
// while small favicons keep the same strong silhouette. The essential shape
// stays inside the maskable 80% safe zone.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title desc">
  <title id="title">Nova Music Lab</title>
  <desc id="desc">A sonic N with a pulse point inside an open orbit.</desc>
  <defs>
    <radialGradient id="surface" cx="0" cy="0" r="1" gradientTransform="translate(19 12) rotate(48) scale(62)" gradientUnits="userSpaceOnUse">
      <stop stop-color="#163c52"/>
      <stop offset=".43" stop-color="#0b132c"/>
      <stop offset="1" stop-color="#050816"/>
    </radialGradient>
    <linearGradient id="orbit" x1="11" y1="13" x2="54" y2="49" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2de2e6"/>
      <stop offset=".52" stop-color="#8b5cf6"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="signal" x1="18" y1="21" x2="47" y2="43" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f8fdff"/>
      <stop offset=".48" stop-color="#74edf0"/>
      <stop offset="1" stop-color="#d8c7ff"/>
    </linearGradient>
    <radialGradient id="pulse" cx="0" cy="0" r="1" gradientTransform="translate(37 27) scale(8)" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f6b73c" stop-opacity=".62"/>
      <stop offset="1" stop-color="#f6b73c" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="tile"><rect width="64" height="64" rx="15"/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="64" height="64" fill="#050816"/>
    <rect width="64" height="64" fill="url(#surface)"/>
    <path d="M-3 39c7-10 12 9 19 0s12-9 19 0 12 9 32-2" fill="none" stroke="#2de2e6" stroke-opacity=".13" stroke-width=".8"/>
    <g fill="none" stroke="#8beeff" stroke-opacity=".08" stroke-width=".6">
      <circle cx="32" cy="32" r="12.5"/><circle cx="32" cy="32" r="15.5"/><circle cx="32" cy="32" r="18.5"/>
    </g>
    <g fill="#d9f9ff" opacity=".32">
      <circle cx="11" cy="27" r=".55"/><circle cx="51" cy="16" r=".45"/><circle cx="53" cy="44" r=".6"/><circle cx="24" cy="10" r=".4"/>
    </g>
    <circle cx="32" cy="32" r="18" fill="#080d22" opacity=".46"/>
    <path d="M15.03 15.03A24 24 0 1 1 9.45 40.21" fill="none" stroke="url(#orbit)" stroke-width="3.25" stroke-linecap="round"/>
    <circle cx="15.03" cy="15.03" r="2.45" fill="#b7fbff"/>
    <path d="M18 43V21l13 14 6-8 9 16V21" fill="none" stroke="#02040d" stroke-opacity=".82" stroke-width="9.25" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 43V21l13 14 6-8 9 16V21" fill="none" stroke="url(#signal)" stroke-width="5.75" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="37" cy="27" r="8" fill="url(#pulse)"/>
    <circle cx="37" cy="27" r="2.35" fill="#f6b73c"/>
    <rect x=".75" y=".75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#fff" stroke-opacity=".13" stroke-width="1.5"/>
  </g>
</svg>
`;

const monochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Nova Music Lab">
  <path fill="currentColor" fill-rule="evenodd" d="M15.03 11.28a3.75 3.75 0 0 1 3.75 3.75 3.75 3.75 0 0 1-7.5 0 3.75 3.75 0 0 1 3.75-3.75Zm.87.22a27.75 27.75 0 1 1-9.98 30.27l6.94-2.84A20.25 20.25 0 1 0 20.1 17.1L15.9 11.5ZM14.75 21A3.25 3.25 0 0 1 21 19.8l10.2 11 3.2-4.27a3.25 3.25 0 0 1 5.42.3l3.18 5.66V21a3.25 3.25 0 1 1 6.5 0v22a3.25 3.25 0 0 1-6.08 1.59L36.6 32.46l-3 4a3.25 3.25 0 0 1-4.98.25L21.25 28.8V43a3.25 3.25 0 1 1-6.5 0V21Z"/>
  <circle cx="37" cy="27" r="2.6" fill="currentColor"/>
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
const fract = (value) => value - Math.floor(value);
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
  const antialias = size <= 32 ? 0.68 : 0.9;
  const markScale = maskable ? 0.86 : 1;
  const markCoordinate = (value) => (32 + (value - 32) * markScale) * scale;
  const orbitWidth = size <= 16 ? 1.35 : Math.max(1.45, 3.25 * scale * markScale);
  const signalWidth = size <= 16 ? 2.05 : Math.max(2.65, 5.75 * scale * markScale);
  const shadowWidth = size <= 16 ? 2.55 : Math.max(3.45, 9.25 * scale * markScale);
  const pulsePoints = [
    [18, 43],
    [18, 21],
    [31, 35],
    [37, 27],
    [46, 43],
    [46, 21],
  ].map(([x, y]) => [markCoordinate(x), markCoordinate(y)]);
  const orbitStart = normalizeAngle(-Math.PI * 0.75);
  const orbitSweep = (295 * Math.PI) / 180;
  const detailLevel = size >= 128 ? 1 : size >= 48 ? 0.55 : 0;

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

      // Large launcher icons carry a quiet sonic-atlas texture. These details
      // intentionally disappear from 16/32px favicons to preserve legibility.
      if (detailLevel > 0) {
        const edgeVignette = smoothstep(0.4, 0.72, centerDistance);
        composite(color, [1, 3, 12], edgeVignette * 0.58);

        const grooveRadius = Math.hypot(px - size / 2, py - size / 2);
        const groove = Math.max(
          strokeCoverage(Math.abs(grooveRadius - 12.5 * scale), 0.52 * scale, antialias),
          strokeCoverage(Math.abs(grooveRadius - 15.5 * scale), 0.46 * scale, antialias),
          strokeCoverage(Math.abs(grooveRadius - 18.5 * scale), 0.4 * scale, antialias),
        );
        composite(color, [114, 227, 255], groove * 0.095 * detailLevel);

        const waveY = size * (0.57 + Math.sin(u * Math.PI * 8) * 0.025 + Math.sin(u * Math.PI * 18) * 0.009);
        const wave = strokeCoverage(Math.abs(py - waveY), 0.52 * scale, antialias);
        composite(color, [126, 235, 255], wave * 0.11 * detailLevel);

        const dust = fract(Math.sin((x + 17) * 12.9898 + (y + 31) * 78.233) * 43758.5453);
        if (dust > 0.9982 && centerDistance > 0.28) {
          composite(color, dust > 0.9994 ? [255, 202, 101] : [190, 246, 255], 0.52 * detailLevel);
        }

        const glassSheen = (1 - smoothstep(0.05, 0.5, Math.hypot(u - 0.24, v - 0.13))) * 0.16;
        composite(color, [189, 244, 255], glassSheen * detailLevel);
      }

      const dx = px - size / 2;
      const dy = py - size / 2;
      const orbitDistance = Math.abs(Math.hypot(dx, dy) - 24 * scale * markScale);
      const angleFromStart = normalizeAngle(Math.atan2(dy, dx) - orbitStart);
      const orbitCoverage = angleFromStart <= orbitSweep
        ? strokeCoverage(orbitDistance, orbitWidth, antialias)
        : 0;
      const orbitColor = u < 0.55
        ? mix([45, 226, 230], [139, 92, 246], clamp((u - 0.14) / 0.41))
        : mix([139, 92, 246], [236, 72, 153], clamp((u - 0.55) / 0.34));
      const orbitHalo = angleFromStart <= orbitSweep
        ? strokeCoverage(orbitDistance, orbitWidth * 3.6, antialias)
        : 0;
      composite(color, orbitColor, orbitHalo * 0.12);
      composite(color, orbitColor, orbitCoverage * 0.92);

      const orbitNodeDistance = Math.hypot(px - markCoordinate(15.03), py - markCoordinate(15.03));
      const orbitNodeRadius = size <= 16 ? 1.05 : Math.max(1.25, 2.45 * scale * markScale);
      const orbitNode = 1 - smoothstep(orbitNodeRadius - antialias, orbitNodeRadius + antialias, orbitNodeDistance);
      composite(color, [183, 251, 255], orbitNode);

      const signalDistance = polylineDistance(px, py, pulsePoints);
      const shadow = strokeCoverage(signalDistance, shadowWidth, antialias);
      composite(color, [2, 4, 13], shadow * 0.84);
      const signal = strokeCoverage(signalDistance, signalWidth, antialias);
      const signalColor = u < 0.52
        ? mix([248, 253, 255], [140, 236, 255], u / 0.52)
        : mix([140, 236, 255], [217, 193, 255], (u - 0.52) / 0.48);
      composite(color, signalColor, signal);

      const pulseDistance = Math.hypot(px - markCoordinate(37), py - markCoordinate(27));
      const pulseRadius = size <= 16 ? 1.05 : Math.max(1.25, 2.35 * scale * markScale);
      const pulseHalo = 1 - smoothstep(2.2 * scale * markScale, 8.5 * scale * markScale, pulseDistance);
      composite(color, [246, 183, 60], pulseHalo * 0.22);
      const pulse = 1 - smoothstep(pulseRadius - antialias, pulseRadius + antialias, pulseDistance);
      composite(color, [246, 183, 60], pulse);

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
writeFileSync(join(publicDir, 'icon-monochrome.svg'), monochromeSvg);

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
