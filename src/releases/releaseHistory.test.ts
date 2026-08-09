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
    expect(CURRENT_NOVA_RELEASE).toMatchObject({
      version: '1.6.0',
      date: '2026-08-09',
      status: 'private-candidate',
    });
    expect(CURRENT_NOVA_RELEASE.story.en.name).toBe('The Living Archive Finds Its Voice');
    expect(CURRENT_NOVA_RELEASE.story.es.name).toBe('El archivo vivo encuentra su voz');
    expect(CURRENT_NOVA_RELEASE.story.he.name).toBe('הארכיון החי מוצא את קולו');
    for (const release of NOVA_RELEASE_HISTORY) {
      expect(Object.keys(release.story).sort()).toEqual(['en', 'es', 'he']);
    }
  });

  it('keeps the latest public release active until the private candidate is deployed', () => {
    const publicRelease = NOVA_RELEASE_HISTORY.find(release => release.version === '1.5.0');
    const previousPublicRelease = NOVA_RELEASE_HISTORY.find(release => release.version === '1.4.0');

    expect(publicRelease).toMatchObject({ status: 'deployed', current: false });
    expect(publicRelease?.secondaryStatus).toBeUndefined();
    expect(previousPublicRelease?.secondaryStatus).toBe('superseded');
  });
});
