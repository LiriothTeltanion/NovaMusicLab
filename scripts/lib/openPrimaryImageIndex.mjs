export const OPEN_PRIMARY_IMAGE_INDEX_RELATIVE_PATH = 'src/data/artist_open_primary_images.json';

const ELIGIBLE_LICENSE_STATUSES = new Set(['declared', 'verified']);
const WIKIMEDIA_HOSTS = new Set(['upload.wikimedia.org', 'commons.wikimedia.org']);

function runtimeArtistKey(value) {
  return String(value ?? '').normalize('NFC').trim().toLowerCase();
}

function isEligibleWikimediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && WIKIMEDIA_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Builds the compact browser-facing map used by editorial surfaces.
 *
 * The canonical knowledge manifest remains the only authority for rights:
 * provider and host alone never make an image eligible.
 */
export function buildOpenPrimaryImageIndex(manifest) {
  const artistNamesById = new Map(
    (manifest.artists ?? [])
      .map(artist => [artist.id, runtimeArtistKey(artist.name)])
      .filter(([, name]) => Boolean(name)),
  );
  const entries = [];
  const seenArtists = new Set();

  for (const asset of manifest.visualAssets ?? []) {
    if (
      asset.role !== 'primary'
      || asset.provider !== 'wikimedia-commons'
      || !ELIGIBLE_LICENSE_STATUSES.has(asset.license?.status)
      || !isEligibleWikimediaUrl(asset.url)
    ) {
      continue;
    }

    const normalizedName = artistNamesById.get(asset.entityId);
    if (!normalizedName) continue;
    if (seenArtists.has(normalizedName)) {
      throw new Error(`Multiple eligible primary images for artist: ${normalizedName}.`);
    }
    seenArtists.add(normalizedName);
    entries.push([normalizedName, asset.url]);
  }

  entries.sort(([left], [right]) => compareText(left, right));
  return Object.fromEntries(entries);
}
