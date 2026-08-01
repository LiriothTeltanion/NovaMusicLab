import { createHash } from 'node:crypto';
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const LASTFM_API_ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';
export const LASTFM_PAGE_LIMIT = 200;
const MAX_REPORTED_PAGES = 10_000;
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 20_000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429]);
const RETRYABLE_API_ERROR_CODES = new Set([11, 16, 29]);

function abortError() {
  const error = new Error('Last.fm export cancelled. No final file was written.');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function asNonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`Last.fm returned an invalid ${label}.`);
  }
  return number;
}

function textValue(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && typeof value['#text'] === 'string') {
    return value['#text'].trim();
  }
  return '';
}

function retryDelayMs(response, attempt) {
  const retryAfter = response.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 30_000);

    const retryAt = Date.parse(retryAfter);
    if (!Number.isNaN(retryAt)) return Math.min(Math.max(0, retryAt - Date.now()), 30_000);
  }
  return Math.min(500 * (2 ** (attempt - 1)), 8_000);
}

function isRetryableHttpStatus(status) {
  return RETRYABLE_STATUS_CODES.has(status) || (status >= 500 && status <= 599);
}

function defaultSleep(milliseconds, signal) {
  return new Promise((resolvePromise, reject) => {
    throwIfAborted(signal);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolvePromise();
    }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function responseJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error('Last.fm returned a response that was not valid JSON.');
  }
}

async function fetchPageJson({
  apiKey,
  lastfmUser,
  page,
  from,
  to,
  limit,
  fetchImpl,
  sleepImpl,
  signal,
}) {
  const query = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: lastfmUser,
    api_key: apiKey,
    format: 'json',
    limit: String(limit),
    page: String(page),
    to: String(to),
  });
  if (from !== undefined) query.set('from', String(from));

  const requestUrl = `${LASTFM_API_ENDPOINT}?${query}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    throwIfAborted(signal);
    let response;
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;
    try {
      response = await fetchImpl(requestUrl, {
        headers: {
          accept: 'application/json',
          'user-agent': 'NovaMusicLab-Lastfm-Exporter/1.0',
        },
        signal: requestSignal,
      });
    } catch {
      clearTimeout(timeout);
      if (signal?.aborted) throw abortError();
      if (attempt === MAX_ATTEMPTS) {
        throw new Error('Last.fm did not respond before the retry budget expired. Check the connection and retry.');
      }
      await sleepImpl(Math.min(500 * (2 ** (attempt - 1)), 8_000), signal);
      continue;
    }
    clearTimeout(timeout);

    if (response.ok) {
      const payload = await responseJson(response);
      if (payload && typeof payload === 'object' && 'error' in payload) {
        const apiErrorCode = Number(payload.error);
        if (RETRYABLE_API_ERROR_CODES.has(apiErrorCode) && attempt < MAX_ATTEMPTS) {
          await sleepImpl(Math.min(500 * (2 ** (attempt - 1)), 8_000), signal);
          continue;
        }
        const safeReason = apiErrorCode === 6
          ? 'user not found'
          : apiErrorCode === 10
            ? 'invalid API key'
            : 'request rejected';
        throw new Error(`Last.fm API error ${String(payload.error)} (${safeReason}).`);
      }
      return payload;
    }

    if (isRetryableHttpStatus(response.status) && attempt < MAX_ATTEMPTS) {
      await sleepImpl(retryDelayMs(response, attempt), signal);
      continue;
    }

    throw new Error(`Last.fm request failed with HTTP ${response.status}.`);
  }

  throw new Error('Last.fm request exhausted its retry budget.');
}

function pageContract(payload, expectedPage) {
  const recentTracks = payload?.recenttracks;
  if (!recentTracks || typeof recentTracks !== 'object') {
    throw new Error('Last.fm returned no recent-tracks collection. Check the username and API key.');
  }

  const attributes = recentTracks['@attr'];
  if (!attributes || typeof attributes !== 'object') {
    throw new Error('Last.fm returned a recent-tracks collection without pagination metadata.');
  }

  const total = asNonNegativeInteger(attributes.total, 'total scrobble count');
  const totalPages = asNonNegativeInteger(attributes.totalPages, 'page count');
  const page = asNonNegativeInteger(attributes.page, 'page number');
  if (page !== expectedPage) {
    throw new Error(`Last.fm returned page ${page} while page ${expectedPage} was requested.`);
  }
  if (totalPages > MAX_REPORTED_PAGES) {
    throw new Error(`Last.fm reported ${totalPages} pages, above the exporter safety limit.`);
  }

  const rawTracks = recentTracks.track;
  const tracks = Array.isArray(rawTracks) ? rawTracks : rawTracks ? [rawTracks] : [];
  return { total, totalPages, tracks };
}

export function normalizeLastfmTrack(track) {
  if (!track || typeof track !== 'object') return { kind: 'invalid' };
  if (!track.date || track.date.uts === undefined || track.date.uts === null) {
    const isNowPlaying = track['@attr']?.nowplaying === 'true' || track['@attr']?.nowplaying === true;
    return { kind: isNowPlaying ? 'now-playing' : 'invalid' };
  }

  const unixTime = Number(track.date.uts);
  const artist = textValue(track.artist);
  const album = textValue(track.album);
  const title = textValue(track.name);
  const timestamp = new Date(unixTime * 1_000);
  if (!Number.isSafeInteger(unixTime) || unixTime <= 0 || Number.isNaN(timestamp.getTime()) || !artist || !title) {
    return { kind: 'invalid' };
  }

  return {
    kind: 'scrobble',
    row: {
      artist,
      album,
      track: title,
      date: timestamp.toISOString(),
      unixTime,
    },
  };
}

export async function fetchLastfmHistory({
  apiKey,
  lastfmUser,
  from,
  to = Math.floor(Date.now() / 1_000),
  limit = LASTFM_PAGE_LIMIT,
  fetchImpl = globalThis.fetch,
  sleepImpl = defaultSleep,
  signal,
  onProgress = () => {},
}) {
  const normalizedApiKey = String(apiKey || '').trim();
  if (!/^[\x21-\x7e]{8,128}$/.test(normalizedApiKey)) {
    throw new Error('LASTFM_API_KEY is empty or has an invalid shape.');
  }
  if (!String(lastfmUser || '').trim()) throw new Error('A Last.fm account name is required.');
  if (typeof fetchImpl !== 'function') throw new Error('This Node.js runtime does not provide fetch().');
  if (!Number.isSafeInteger(to) || to <= 0) throw new Error('The snapshot end time is invalid.');
  if (from !== undefined && (!Number.isSafeInteger(from) || from <= 0 || from > to)) {
    throw new Error('The snapshot start time is invalid or occurs after the end time.');
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > LASTFM_PAGE_LIMIT) {
    throw new Error(`Last.fm page size must be between 1 and ${LASTFM_PAGE_LIMIT}.`);
  }

  const normalizedLastfmUser = String(lastfmUser).trim();
  const rows = [];
  let nowPlayingSkipped = 0;
  let invalidRows = 0;
  let reportedTotal;
  let reportedTotalPages;

  for (let page = 1; page === 1 || page <= reportedTotalPages; page += 1) {
    const payload = await fetchPageJson({
      apiKey: normalizedApiKey,
      lastfmUser: normalizedLastfmUser,
      page,
      from,
      to,
      limit,
      fetchImpl,
      sleepImpl,
      signal,
    });
    const contract = pageContract(payload, page);

    if (page === 1) {
      reportedTotal = contract.total;
      reportedTotalPages = contract.totalPages;
    } else if (contract.total !== reportedTotal || contract.totalPages !== reportedTotalPages) {
      throw new Error('Last.fm pagination changed during the frozen export. Retry to avoid an incomplete snapshot.');
    }

    for (const track of contract.tracks) {
      const normalized = normalizeLastfmTrack(track);
      if (normalized.kind === 'scrobble') rows.push(normalized.row);
      else if (normalized.kind === 'now-playing') nowPlayingSkipped += 1;
      else invalidRows += 1;
    }

    onProgress({
      page,
      totalPages: reportedTotalPages,
      downloaded: rows.length,
      reportedTotal,
    });

    if (page < reportedTotalPages) await sleepImpl(100, signal);
  }

  throwIfAborted(signal);
  if (invalidRows > 0) {
    throw new Error(`Last.fm returned ${invalidRows} malformed dated row(s); no file was written.`);
  }
  if (rows.length !== reportedTotal) {
    throw new Error(`Last.fm reported ${reportedTotal} scrobbles but ${rows.length} valid dated rows were downloaded; no file was written.`);
  }

  rows.sort((left, right) => left.unixTime - right.unixTime);
  return {
    rows,
    reportedTotal,
    pageCount: reportedTotalPages,
    nowPlayingSkipped,
    snapshotTo: to,
    snapshotFrom: from,
  };
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function lastfmRowsToCsv(rows) {
  const lines = ['Artist,Album,Track,Date'];
  for (const row of rows) {
    lines.push([
      csvCell(row.artist),
      csvCell(row.album),
      csvCell(row.track),
      csvCell(row.date),
    ].join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function parseUtcBoundary(value, boundary) {
  if (value === undefined) return undefined;
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) {
    const unixTime = Number(raw);
    if (!Number.isSafeInteger(unixTime) || unixTime <= 0) throw new Error(`Invalid --${boundary} value.`);
    return unixTime;
  }

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const isoValue = dateOnly
    ? `${raw}T${boundary === 'to' ? '23:59:59' : '00:00:00'}Z`
    : raw;
  const milliseconds = Date.parse(isoValue);
  if (Number.isNaN(milliseconds)) throw new Error(`Invalid --${boundary} value.`);
  return Math.floor(milliseconds / 1_000);
}

export async function writeLastfmCsvAtomically({ rows, outputPath, signal }) {
  throwIfAborted(signal);
  const finalPath = resolve(outputPath);
  const partialPath = `${finalPath}.partial-${process.pid}`;
  const csv = lastfmRowsToCsv(rows);

  await mkdir(dirname(finalPath), { recursive: true });
  try {
    await access(finalPath);
    throw new Error(`Refusing to overwrite an existing export: ${finalPath}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  try {
    throwIfAborted(signal);
    await writeFile(partialPath, csv, { encoding: 'utf8', flag: 'wx' });
    throwIfAborted(signal);
    await rename(partialPath, finalPath);
  } catch (error) {
    await rm(partialPath, { force: true }).catch(() => {});
    throw error;
  }

  return {
    path: finalPath,
    bytes: Buffer.byteLength(csv),
    sha256: createHash('sha256').update(csv).digest('hex'),
  };
}
