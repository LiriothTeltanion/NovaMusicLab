import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CURRENT_NOVA_RELEASE, NOVA_RELEASE_HISTORY } from './releaseHistory';

describe('Nova release history', () => {
  it('matches the package version and keeps ISO dates', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { version: string };

    expect(CURRENT_NOVA_RELEASE.version).toBe(packageJson.version);
    for (const release of NOVA_RELEASE_HISTORY) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isFinite(Date.parse(release.date))).toBe(true);
    }
  });

  it('has exactly one current release and complete language stories', () => {
    expect(NOVA_RELEASE_HISTORY.filter(release => release.current)).toHaveLength(1);
    for (const release of NOVA_RELEASE_HISTORY) {
      expect(Object.keys(release.story).sort()).toEqual(['en', 'es', 'he']);
    }
  });
});
