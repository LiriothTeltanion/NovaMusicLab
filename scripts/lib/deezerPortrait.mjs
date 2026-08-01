const EMPTY_CONTENT_HASH = 'd41d8cd98f00b204e9800998ecf8427e';

const normalizeArtistName = value => String(value ?? '')
  .normalize('NFC')
  .trim()
  .toLowerCase();

/**
 * Deezer can return a syntactically valid CDN URL that points to its empty
 * artist image. Those URLs are not portraits and must remain an honest
 * generated-avatar fallback in Nova.
 */
export function isUsableDeezerPortraitUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const path = decodeURIComponent(url.pathname).toLowerCase();
    if (path.includes('/images/artist//')) return false;
    if (path.includes(EMPTY_CONTENT_HASH)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a confident Deezer artist portrait match or an explicit refusal.
 * Exact names are required; duplicate names need a dominant follower signal.
 */
export function chooseDeezerArtistPortrait(name, data) {
  const exact = Array.isArray(data)
    ? data.filter(candidate => (
      normalizeArtistName(candidate?.name) === normalizeArtistName(name)
      && isUsableDeezerPortraitUrl(candidate?.picture_xl)
    ))
    : [];

  if (exact.length === 1) return { artist: exact[0], reason: 'exact' };
  if (exact.length === 0) return { artist: null, reason: 'no exact name match with a usable portrait' };

  const sorted = [...exact].sort((left, right) => (right.nb_fan || 0) - (left.nb_fan || 0));
  const [top, second] = sorted;
  if ((top.nb_fan || 0) >= Math.max(1000, (second.nb_fan || 0) * 5)) {
    return { artist: top, reason: 'dominant follower count' };
  }
  return { artist: null, reason: `${exact.length} equally plausible matches` };
}
