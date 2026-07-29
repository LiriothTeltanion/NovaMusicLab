/**
 * Shared Wikimedia Commons portrait heuristics.
 *
 * Extracted from scripts/expand_artist_gallery_v2.mjs so the artist-gallery
 * builder and the band-member portrait waterfall cannot drift apart: a filename
 * signal that is unsafe for one is unsafe for the other, and a Commons file
 * reached through two different URL shapes must dedupe to one identity in both.
 */

export const EXCLUDE_FILENAME_SIGNALS = [
  'cover', 'album', 'single', ' ep ', '-ep', 'logo', 'poster', 'flyer',
  'ticket', 'setlist', 'banner', 'wordmark', 'symbol', 'artwork',
  'discography', 'tracklist', 'billboard', 'map', 'flag', 'award',
  // Some band names (Slaves, Nightlife, ...) collide with unrelated, sensitive
  // real-world Commons categories - a bare portrait-likeness filter isn't
  // enough to keep those out. Block specific known-bad patterns rather than
  // a bare "slave" substring, since the band's OWN legitimate photo is
  // literally titled "Slaves_American_band.jpg" and would match otherwise.
  'newly_released_slaves', 'cargo_of_newly_released', 'slavery',
  'plantation', 'auschwitz', 'holocaust', 'genocide', 'lynching', 'massacre',
  'file-type-icons', 'fileicon', '.pdf', '.stl', 'page1-',
];

/**
 * Same Commons file can be reached through different URL shapes
 * (commons.wikimedia.org/wiki/Special:FilePath/X vs.
 * upload.wikimedia.org/.../thumb/.../NNNpx-X) depending on which API served
 * it. A raw string dedup misses that, so callers should key their
 * "already have this photo" sets by this instead of the literal URL.
 */
export function wikimediaFileKey(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'commons.wikimedia.org' && u.pathname.startsWith('/wiki/Special:FilePath/')) {
      const name = decodeURIComponent(u.pathname.replace('/wiki/Special:FilePath/', ''));
      return name.replace(/_/g, ' ').toLowerCase();
    }
    if (u.hostname === 'upload.wikimedia.org') {
      const parts = u.pathname.split('/').filter(Boolean);
      let last = decodeURIComponent(parts[parts.length - 1] || '');
      last = last.replace(/^\d+px-/, '');
      return last.replace(/_/g, ' ').toLowerCase();
    }
  } catch { /* not a valid URL */ }
  return url;
}

export function looksLikePortrait(title) {
  const lower = String(title ?? '').toLowerCase();
  if (lower.endsWith('.svg')) return false;
  return !EXCLUDE_FILENAME_SIGNALS.some((signal) => lower.includes(signal));
}

/**
 * Wikidata occupation QIDs that mark a human as a music performer. Used to
 * reject same-named non-musicians before accepting their face: a wrong face is
 * worse than no face.
 * musician, singer, composer, singer-songwriter, rapper, DJ, guitarist,
 * bassist, drummer. Carried over verbatim from enrich_members_wikidata.mjs -
 * only extend this with QIDs you have actually looked up, since a wrong QID
 * silently widens what counts as "verified musician".
 */
export const MUSICIAN_OCCUPATIONS = new Set([
  'Q639669', 'Q177220', 'Q36834', 'Q488205', 'Q713200',
  'Q130857', 'Q855091', 'Q183945', 'Q207869',
]);

/**
 * A pure ASCII-strip key collapses any non-Latin-script name (Hebrew, etc.)
 * to the same empty string, silently sharing one cache file across different
 * people. The hash suffix guarantees uniqueness regardless of script.
 */
export function cacheKeyFor(name) {
  const value = String(name ?? '');
  const ascii = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return `${ascii || 'x'}_${(hash >>> 0).toString(36)}`;
}

/**
 * Must match the readers exactly: src/components/ArtistAvatar.tsx and
 * src/components/CoverArt.tsx normalize to NFC and trim before lowercasing.
 * A bare .toLowerCase() writes keys that an accented or padded name can never
 * look up ("Sigur Ros" arriving as NFD).
 */
export function mediaKey(name) {
  return String(name ?? '').normalize('NFC').trim().toLowerCase();
}
