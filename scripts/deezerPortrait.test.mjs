import { describe, expect, it } from 'vitest';

import {
  chooseDeezerArtistPortrait,
  isUsableDeezerPortraitUrl,
} from './lib/deezerPortrait.mjs';

const validPortrait = 'https://cdn-images.dzcdn.net/images/artist/abc123/1000x1000-000000-80-0-0.jpg';

describe('Deezer portrait evidence', () => {
  it('rejects both known empty-image URL forms', () => {
    expect(isUsableDeezerPortraitUrl(
      'https://cdn-images.dzcdn.net/images/artist//1000x1000-000000-80-0-0.jpg',
    )).toBe(false);
    expect(isUsableDeezerPortraitUrl(
      'https://cdn-images.dzcdn.net/images/artist/d41d8cd98f00b204e9800998ecf8427e/1000x1000-000000-80-0-0.jpg',
    )).toBe(false);
    expect(isUsableDeezerPortraitUrl(validPortrait)).toBe(true);
  });

  it('does not accept a matching artist when Deezer only supplies a placeholder', () => {
    expect(chooseDeezerArtistPortrait('Nova Artist', [{
      name: 'Nova Artist',
      picture_xl: 'https://cdn-images.dzcdn.net/images/artist//1000x1000-000000-80-0-0.jpg',
      nb_fan: 100_000,
    }])).toEqual({
      artist: null,
      reason: 'no exact name match with a usable portrait',
    });
  });

  it('keeps the existing exact-name and dominant-follower safeguards', () => {
    const result = chooseDeezerArtistPortrait('Nova Artist', [
      { name: 'Nova Artist', picture_xl: validPortrait, nb_fan: 10_000 },
      { name: 'Nova Artist', picture_xl: `${validPortrait}?duplicate=1`, nb_fan: 100 },
    ]);
    expect(result.artist?.picture_xl).toBe(validPortrait);
    expect(result.reason).toBe('dominant follower count');
  });
});
