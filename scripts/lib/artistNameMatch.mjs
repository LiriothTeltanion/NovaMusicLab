// Shared artist-name comparison for the dev-side harvest scripts.
//
// It lives here rather than in each script because both MusicBrainz and Deezer
// hit the same wall on the same names, and two copies of a normalisation rule
// drift the moment one of them is tightened. The case that forced it out:
// "30 Seconds to Mars", 85 plays. MusicBrainz files the band as "Thirty Seconds
// to Mars" and Deezer returned exactly that, 1.75M followers, one candidate -
// and both harvests threw it away for not matching character-for-character.

/** Exact identity: NFC, trimmed, lower-cased. The first thing every match tries. */
export function exactName(value) {
  return String(value ?? '').normalize('NFC').trim().toLowerCase();
}

// Only small numbers, which is where bands and catalogues actually disagree
// about the spelling.
const NUMBER_WORDS = new Map(Object.entries({
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven',
  8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 20: 'twenty',
  30: 'thirty', 40: 'forty', 50: 'fifty', 100: 'hundred', 1000: 'thousand',
}));

/**
 * A deliberately narrow relaxation, used only once an exact match has failed:
 * ampersands, a leading "The", diacritics, punctuation and spelled-out small
 * numbers. It never drops or reorders words, so it cannot turn one band into a
 * different one - "Chief" still will not match "Chief Keef".
 */
export function looseName(value) {
  return exactName(value)
    .replace(/&/g, ' and ')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/^the\s+/, '')
    .split(' ')
    .filter(Boolean)
    .map(token => NUMBER_WORDS.get(token) ?? token)
    .join(' ');
}

/**
 * Picks the one candidate we are confident about, or refuses.
 *
 * Exact matches are considered first and alone; only if none exists does the
 * relaxed comparison get a turn. Either tier is all-or-nothing unless the
 * caller supplies `tieBreak`, which resolves duplicates of the *same* name -
 * catalogues carry those for well-known acts, and there the one that dominates
 * on popularity is the canonical entry rather than a different artist.
 *
 * A wrong genre or a wrong face silently rewrites what the museum says about a
 * record, so ambiguity is always a refusal rather than a coin flip.
 */
export function chooseArtistByName(name, candidates, { nameOf = c => c.name, tieBreak } = {}) {
  const pool = (candidates ?? []).filter(Boolean);

  const decide = (matches, reason) => {
    if (matches.length === 1) return { artist: matches[0], reason };
    if (!tieBreak) return { artist: null, reason: `${matches.length} equally plausible artists` };
    const winner = tieBreak(matches);
    return winner
      ? { artist: winner, reason: `${reason}, resolved by popularity` }
      : { artist: null, reason: `${matches.length} equally plausible artists` };
  };

  const exact = pool.filter(c => exactName(nameOf(c)) === exactName(name));
  if (exact.length) return decide(exact, 'exact');

  const target = looseName(name);
  const loose = pool.filter(c => looseName(nameOf(c)) === target);
  if (loose.length) return decide(loose, 'loose name match');

  return { artist: null, reason: 'no exact name match' };
}
