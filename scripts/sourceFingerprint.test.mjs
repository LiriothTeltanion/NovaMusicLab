import { describe, expect, it } from 'vitest';

import { canonicalizeSourceText } from './lib/sourceFingerprint.mjs';

describe('artist manifest source fingerprints', () => {
  it('canonicalizes Windows, legacy Mac and Unix line endings to LF', () => {
    const expected = '{\n  "artist": "Nova"\n}\n';

    expect(canonicalizeSourceText('{\r\n  "artist": "Nova"\r\n}\r\n')).toBe(expected);
    expect(canonicalizeSourceText('{\r  "artist": "Nova"\r}\r')).toBe(expected);
    expect(canonicalizeSourceText(expected)).toBe(expected);
  });
});
