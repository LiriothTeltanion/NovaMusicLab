// @vitest-environment node
import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('optional public CV artifacts', () => {
  it('validates any explicitly published PDF without requiring private files', () => {
    const directory = resolve(process.cwd(), 'public', 'cv');
    if (!existsSync(directory)) return;

    const pdfFiles = readdirSync(directory).filter(filename => filename.toLowerCase().endsWith('.pdf'));

    for (const filename of pdfFiles) {
      const path = resolve(directory, filename);
      const descriptor = openSync(path, 'r');
      const signature = Buffer.alloc(5);

      try {
        readSync(descriptor, signature, 0, signature.length, 0);
      } finally {
        closeSync(descriptor);
      }

      expect(signature.toString('ascii'), `${filename} must be a real PDF`).toBe('%PDF-');
      expect(statSync(path).size, `${filename} is unexpectedly small`).toBeGreaterThan(50_000);
    }
  });
});
