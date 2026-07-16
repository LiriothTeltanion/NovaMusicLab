export type ExternalUrlProvider =
  | 'bandcamp'
  | 'discogs'
  | 'musicbrainz'
  | 'spotify'
  | 'wikidata'
  | 'wikipedia'
  | 'youtube'
  | 'other';

function parseSafeExternalUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function externalUrlProvider(value: string): ExternalUrlProvider {
  const url = parseSafeExternalUrl(value);
  if (!url) return 'other';

  const host = url.hostname.toLowerCase();
  if (host === 'wikipedia.org' || host.endsWith('.wikipedia.org')) return 'wikipedia';
  if (host === 'wikidata.org' || host.endsWith('.wikidata.org')) return 'wikidata';
  if (host === 'bandcamp.com' || host.endsWith('.bandcamp.com')) return 'bandcamp';
  if (host === 'spotify.com' || host.endsWith('.spotify.com')) return 'spotify';
  if (
    host === 'youtube.com'
    || host.endsWith('.youtube.com')
    || host === 'youtu.be'
    || host.endsWith('.youtu.be')
  ) return 'youtube';
  if (host === 'discogs.com' || host.endsWith('.discogs.com')) return 'discogs';
  if (host === 'musicbrainz.org' || host.endsWith('.musicbrainz.org')) return 'musicbrainz';
  return 'other';
}

export function toSafeExternalUrl(value: string): string | null {
  return parseSafeExternalUrl(value)?.toString() ?? null;
}

export function isBandcampSearchUrl(value: string): boolean {
  const url = parseSafeExternalUrl(value);
  if (!url || externalUrlProvider(value) !== 'bandcamp') return false;
  return url.pathname.replace(/\/+$/, '') === '/search';
}
