import path from 'node:path';

export const DEEZER_CACHE_SCHEMA_VERSION = 1;
export const DEEZER_ARTIST_SEARCH_LIMIT = 5;
export const DEEZER_ALBUM_PAGE_LIMIT = 100;

export function artistSearchCacheFileName(artistName, limit = DEEZER_ARTIST_SEARCH_LIMIT) {
  const key = Buffer.from(String(artistName), 'utf8').toString('base64url').slice(0, 120);
  return `${key}.v${DEEZER_CACHE_SCHEMA_VERSION}-limit-${limit}.json`;
}

export function albumCacheFileName(artistId, limit = DEEZER_ALBUM_PAGE_LIMIT) {
  const id = String(artistId);
  if (!/^\d+$/.test(id)) throw new Error(`Unsafe Deezer artist id: ${id}`);
  return `artist-${id}-albums.v${DEEZER_CACHE_SCHEMA_VERSION}-limit-${limit}.json`;
}

export function artistSearchCacheRecord(data, limit = DEEZER_ARTIST_SEARCH_LIMIT) {
  return {
    schemaVersion: DEEZER_CACHE_SCHEMA_VERSION,
    kind: 'deezer-artist-search',
    requestLimit: limit,
    complete: true,
    data,
  };
}

export function albumCacheRecord(artistId, result, limit = DEEZER_ALBUM_PAGE_LIMIT) {
  if (!result?.complete
    || !Array.isArray(result.data)
    || !Number.isInteger(result.receivedRows)
    || !Number.isInteger(result.total)
    || result.receivedRows < 0
    || result.total < 0
    || result.data.length > result.receivedRows
    || result.receivedRows < result.total) {
    throw new Error('Cannot cache an incomplete Deezer album result.');
  }

  return {
    schemaVersion: DEEZER_CACHE_SCHEMA_VERSION,
    kind: 'deezer-artist-albums',
    artistId: Number(artistId),
    requestLimit: limit,
    complete: true,
    receivedRows: result.receivedRows,
    total: result.total,
    data: result.data,
  };
}

function compatibleRecord(value, kind, limit) {
  return value
    && value.schemaVersion === DEEZER_CACHE_SCHEMA_VERSION
    && value.kind === kind
    && value.requestLimit === limit
    && value.complete === true
    && Array.isArray(value.data);
}

export function readArtistSearchCache(value, limit = DEEZER_ARTIST_SEARCH_LIMIT) {
  return compatibleRecord(value, 'deezer-artist-search', limit) ? value.data : null;
}

export function readAlbumCache(value, artistId, limit = DEEZER_ALBUM_PAGE_LIMIT) {
  if (!compatibleRecord(value, 'deezer-artist-albums', limit)) return null;
  if (!Number.isInteger(value.receivedRows)
    || !Number.isInteger(value.total)
    || value.receivedRows < 0
    || value.total < 0
    || value.data.length > value.receivedRows
    || value.receivedRows < value.total) return null;
  return Number(value.artistId) === Number(artistId) ? value.data : null;
}

/**
 * The one write boundary used by both caches. Dry-run returns before mkdir, so
 * it cannot leave directories or partial cache files behind.
 */
export function persistDeezerCache({
  filePath,
  record,
  dryRun,
  mkdirSync,
  writeFileSync,
}) {
  if (dryRun) return false;
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(record)}\n`);
  return true;
}

function safeNextPageUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'api.deezer.com') {
    throw new Error(`Unsafe Deezer pagination URL: ${url.href}`);
  }
  return url.href;
}

/** Deezer sometimes returns provider errors with HTTP 200; never cache them. */
export function requireDeezerData(body, context) {
  if (body?.error) {
    const providerMessage = typeof body.error.message === 'string'
      ? `: ${body.error.message}`
      : '';
    throw new Error(`Deezer ${context} provider error${providerMessage}`);
  }
  if (!Array.isArray(body?.data)) {
    throw new Error(`Deezer ${context} response has no data array.`);
  }
  return body.data;
}

/** Fetches every page advertised by Deezer and de-duplicates stable album IDs. */
export async function fetchAllDeezerAlbums({
  artistId,
  requestLimit = DEEZER_ALBUM_PAGE_LIMIT,
  fetchImpl = fetch,
  headers = {},
  onRequest = async () => {},
}) {
  const id = String(artistId);
  if (!/^\d+$/.test(id)) throw new Error(`Unsafe Deezer artist id: ${id}`);

  let nextUrl = `https://api.deezer.com/artist/${id}/albums?limit=${requestLimit}`;
  const visited = new Set();
  const albums = [];
  const seenAlbums = new Set();
  let pages = 0;
  let receivedRows = 0;
  let expectedTotal = null;

  while (nextUrl) {
    const safeUrl = safeNextPageUrl(nextUrl);
    if (visited.has(safeUrl)) throw new Error(`Repeated Deezer pagination URL: ${safeUrl}`);
    visited.add(safeUrl);

    const response = await fetchImpl(safeUrl, { headers });
    await onRequest();
    if (!response.ok) throw new Error(`Deezer albums ${response.status} ${response.statusText ?? ''}`.trim());

    const body = await response.json();
    const rows = requireDeezerData(body, 'albums');
    pages += 1;
    receivedRows += rows.length;

    if (!Number.isInteger(body.total) || body.total < 0) {
      throw new Error('Deezer albums response has no valid total.');
    }
    if (expectedTotal !== null && body.total !== expectedTotal) {
      throw new Error(
        `Inconsistent Deezer album total: expected ${expectedTotal}, received ${body.total}.`,
      );
    }
    expectedTotal = body.total;

    for (const album of rows) {
      const identity = album?.id == null
        ? `${String(album?.title ?? '')}\u0000${String(album?.link ?? '')}`
        : `id:${album.id}`;
      if (seenAlbums.has(identity)) continue;
      seenAlbums.add(identity);
      albums.push(album);
    }

    nextUrl = safeNextPageUrl(body.next);
    if (!nextUrl && expectedTotal !== null && receivedRows < expectedTotal) {
      throw new Error(
        `Incomplete Deezer album response: received ${receivedRows} of ${expectedTotal} rows without a next page.`,
      );
    }
  }

  return {
    data: albums,
    pages,
    receivedRows,
    total: expectedTotal,
    complete: true,
  };
}
