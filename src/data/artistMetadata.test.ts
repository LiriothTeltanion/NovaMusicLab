import { describe, expect, it } from 'vitest';
import artistMeta from './artist_meta.json';

describe('artist metadata corrections', () => {
  it('keeps Odeon aligned with the Brazil profile used by dossiers and offline knowledge', () => {
    expect(artistMeta.odeon).toMatchObject({
      country: 'Brazil',
      genre: 'Post-Hardcore / Electronic',
    });
  });
});
