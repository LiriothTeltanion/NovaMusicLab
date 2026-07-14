import artistIdentityRegistryJson from '../data/artist_identity_registry.json';

interface ArtistIdentity {
  canonical: string;
  aliases: string[];
}

interface ArtistIdentityRegistry {
  identities: ArtistIdentity[];
}

const artistIdentityRegistry = artistIdentityRegistryJson as ArtistIdentityRegistry;

/**
 * Identity matching is intentionally narrow. NFC handles equivalent Unicode
 * encodings and trim handles exporter whitespace; punctuation, casing and
 * transliteration remain significant unless the exact spelling is registered.
 */
function exactIdentityKey(value: string): string {
  return value.normalize('NFC').trim();
}

function buildCanonicalArtistMap(): ReadonlyMap<string, string> {
  const result = new Map<string, string>();

  for (const identity of artistIdentityRegistry.identities) {
    for (const name of [identity.canonical, ...identity.aliases]) {
      const key = exactIdentityKey(name);
      const existing = result.get(key);
      if (existing && existing !== identity.canonical) {
        throw new Error(`Artist identity collision for "${name}": ${existing} / ${identity.canonical}`);
      }
      result.set(key, identity.canonical);
    }
  }

  return result;
}

const CANONICAL_ARTIST_BY_EXACT_NAME = buildCanonicalArtistMap();

/** Returns a registered display name, or the untouched trimmed source name. */
export function canonicalArtistName(rawArtist: string): string {
  const sourceName = exactIdentityKey(rawArtist);
  return CANONICAL_ARTIST_BY_EXACT_NAME.get(sourceName) ?? sourceName;
}
