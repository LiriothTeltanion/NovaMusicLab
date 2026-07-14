import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const publicDir = path.join(process.cwd(), 'public');

function readPngSize(fileName) {
  const bytes = readFileSync(path.join(publicDir, fileName));
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bytes: bytes.length,
  };
}

describe('Nova Music Lab generated visual assets', () => {
  it.each([
    ['favicon-16.png', 16, 2_000],
    ['favicon-32.png', 32, 5_000],
    ['apple-touch-icon.png', 180, 70_000],
    ['icon-192.png', 192, 80_000],
    ['icon-512.png', 512, 300_000],
    ['maskable-icon-512.png', 512, 300_000],
  ])('%s has the expected square dimensions and stays inside its byte budget', (fileName, size, budget) => {
    const image = readPngSize(fileName);
    expect(image).toMatchObject({ width: size, height: size });
    expect(image.bytes).toBeLessThanOrEqual(budget);
  });

  it('keeps the detailed cartography backdrop optimized for a fixed decorative layer', () => {
    const filePath = path.join(publicDir, 'visuals', 'sonic-cartography-bg-v2.jpg');
    const bytes = readFileSync(filePath);

    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    expect(statSync(filePath).size).toBeLessThanOrEqual(350_000);
  });

  it('keeps one descriptive, scalable SVG source for browser favicons', () => {
    const svg = readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');

    expect(svg).toContain('<title id="title">Nova Music Lab</title>');
    expect(svg).toContain('A sonic N with a pulse point inside an open orbit.');
    expect(svg).toContain('id="pulse"');
    expect(svg).not.toMatch(/<text\b/i);
  });
});
