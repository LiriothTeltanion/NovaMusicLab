import { describe, expect, it } from 'vitest';

import { chooseArtistByName, looseName } from './lib/artistNameMatch.mjs';

const artist = (name, extra = {}) => ({ name, ...extra });
const byFans = matches => {
  const sorted = [...matches].sort((left, right) => (right.nb_fan || 0) - (left.nb_fan || 0));
  const [top, second] = sorted;
  return (top.nb_fan || 0) >= Math.max(1000, (second.nb_fan || 0) * 5) ? top : null;
};

describe('looseName', () => {
  it('normalises the spellings catalogues actually disagree on', () => {
    expect(looseName('30 Seconds to Mars')).toBe(looseName('Thirty Seconds to Mars'));
    expect(looseName('Earth, Wind & Fire')).toBe(looseName('Earth Wind and Fire'));
    expect(looseName('The Weeknd')).toBe(looseName('Weeknd'));
    expect(looseName('Sigur Rós')).toBe(looseName('Sigur Ros'));
    expect(looseName('Blue Öyster Cult')).toBe(looseName('Blue Oyster Cult'));
  });

  it('keeps genuinely different names apart', () => {
    expect(looseName('Chief')).not.toBe(looseName('Chief Keef'));
    expect(looseName('Nerv')).not.toBe(looseName('Nerve'));
    expect(looseName('Graham')).not.toBe(looseName('Dan Graham'));
    // It never reorders words, so a swapped pair stays a different artist.
    expect(looseName('Mars Seconds Thirty')).not.toBe(looseName('Thirty Seconds to Mars'));
  });
});

describe('chooseArtistByName', () => {
  it('prefers an exact match over anything the relaxed tier could reach', () => {
    const result = chooseArtistByName('Weeknd', [artist('The Weeknd'), artist('Weeknd')]);
    expect(result.artist?.name).toBe('Weeknd');
    expect(result.reason).toBe('exact');
  });

  it('falls back to the relaxed comparison only when no exact match exists', () => {
    // The case that motivated the shared matcher: one candidate, spelled out.
    const result = chooseArtistByName('30 Seconds to Mars', [
      artist('Thirty Seconds to Mars', { nb_fan: 1_754_372 }),
    ]);
    expect(result.artist?.name).toBe('Thirty Seconds to Mars');
    expect(result.reason).toBe('loose name match');
  });

  it('refuses rather than guessing when nothing matches', () => {
    // Real MusicBrainz response for "GRAHAM": three people, none of them GRAHAM.
    const result = chooseArtistByName('GRAHAM', [
      artist('Dan Graham'), artist('Graham Preskett'), artist('Graham Johnson'),
    ]);
    expect(result.artist).toBeNull();
    expect(result.reason).toBe('no exact name match');
  });

  it('refuses a tie, and accepts a dominant duplicate when asked to', () => {
    const tied = [artist('Oasis', { nb_fan: 900 }), artist('Oasis', { nb_fan: 800 })];
    expect(chooseArtistByName('Oasis', tied).artist).toBeNull();
    expect(chooseArtistByName('Oasis', tied, { tieBreak: byFans }).artist).toBeNull();

    const dominant = [artist('Oasis', { nb_fan: 4_000_000 }), artist('Oasis', { nb_fan: 12 })];
    expect(chooseArtistByName('Oasis', dominant, { tieBreak: byFans }).artist?.nb_fan)
      .toBe(4_000_000);
  });

  it('survives an empty or absent candidate list', () => {
    // MusicBrainz answered the "30 Seconds to Mars" query with nothing at all,
    // which is why the relaxed tier alone could not rescue it there.
    expect(chooseArtistByName('30 Seconds to Mars', []).artist).toBeNull();
    expect(chooseArtistByName('Anything', undefined).artist).toBeNull();
    expect(chooseArtistByName('Anything', [null, undefined]).artist).toBeNull();
  });
});
