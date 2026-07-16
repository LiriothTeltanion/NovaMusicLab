/// <reference types="node" />
// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('global keyboard focus contract', () => {
  it('keeps selects and textareas inside the shared focus-visible treatment', () => {
    const stylesheet = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

    expect(stylesheet).toMatch(/select:focus-visible,/);
    expect(stylesheet).toMatch(/textarea:focus-visible,/);
    expect(stylesheet).toMatch(/outline:\s*2px solid var\(--c1\)/);
    expect(stylesheet).toMatch(/outline-offset:\s*3px/);
  });
});
