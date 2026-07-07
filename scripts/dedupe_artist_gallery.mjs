/**
 * Removes same-photo duplicates from artist_gallery.json that hide behind
 * different Wikimedia URL shapes - e.g.
 * commons.wikimedia.org/wiki/Special:FilePath/X.jpg?width=800 and
 * upload.wikimedia.org/wikipedia/commons/thumb/.../960px-X.jpg both serve the
 * exact same underlying file, but a raw string/byte dedup misses it because
 * the two build scripts (build_artist_gallery.mjs vs. expand_artist_gallery_v2.mjs)
 * happened to use different Commons APIs that return different URL formats
 * for the same file. expand_artist_gallery_v2.mjs's own append-time dedup is
 * now canonicalization-aware (see wikimediaFileKey there), so this script is
 * a one-off cleanup / safety net, not something normal runs depend on.
 *
 * Run from the repo root: node scripts/dedupe_artist_gallery.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

function wikimediaFileKey(url) {
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

const path = 'src/data/artist_gallery.json';
const gallery = JSON.parse(readFileSync(path, 'utf8'));

let removedTotal = 0;
const affected = [];
for (const [name, photos] of Object.entries(gallery)) {
  const seen = new Set();
  const deduped = [];
  for (const photo of photos) {
    const key = wikimediaFileKey(photo.url) ?? photo.url;
    if (seen.has(key)) { removedTotal++; continue; }
    seen.add(key);
    deduped.push(photo);
  }
  if (deduped.length !== photos.length) {
    affected.push({ name, before: photos.length, after: deduped.length });
    gallery[name] = deduped;
  }
}

writeFileSync(path, `${JSON.stringify(gallery, null, 2)}\n`);
console.log(`Removed ${removedTotal} duplicate photo(s) across ${affected.length} artist(s):`);
console.log(JSON.stringify(affected, null, 2));
