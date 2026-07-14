// @vitest-environment node
import { closeSync, openSync, readSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('localized CV artifacts', () => {
  it.each([
    ['en', 'kevin-cusnir-cv-en.pdf'],
    ['es', 'kevin-cusnir-cv-es.pdf'],
  ])('ships a valid %s PDF asset', (_lang, filename) => {
    const path = resolve(process.cwd(), 'public', 'cv', filename);
    const descriptor = openSync(path, 'r');
    const signature = Buffer.alloc(5);

    try {
      readSync(descriptor, signature, 0, signature.length, 0);
    } finally {
      closeSync(descriptor);
    }

    expect(signature.toString('ascii')).toBe('%PDF-');
    expect(statSync(path).size).toBeGreaterThan(50_000);
  });
});
