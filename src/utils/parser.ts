import {
  ArtistGenreCatalogEntry,
  MusicDnaData,
  PlatformPlay,
  RecordsSummary,
  Session,
  SourceSummary,
  TopAlbum,
  TopArtist,
  TopTrack,
  YearlyEra,
  type PlaySource,
} from '../types';
import { countryCodeToName, normalizeGenre } from './analytics';
import artistMetaJson from '../data/artist_meta.json';
import { buildOfflineArtistKnowledgeSummary } from './offlineArtistKnowledge';
import { canonicalArtistName } from './artistIdentity';

type RawSource = Exclude<PlaySource, 'merged' | 'unknown'>;

export type ParseErrorCode = 'INVALID_JSON' | 'NO_VALID_ROWS';

/** Thrown with a stable, translatable `code` instead of a hardcoded-language message. */
export class ParseError extends Error {
  code: ParseErrorCode;
  constructor(code: ParseErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ParseError';
  }
}

interface ParsedPlay {
  artist: string;
  track: string;
  album: string;
  ts: Date;
  ts_str: string;
  source: RawSource;
  ms_played?: number;
  skipped?: boolean;
  conn_country?: string;
  platform?: string;
  reason_start?: string;
  reason_end?: string;
  offline?: boolean;
  spotify_uri?: string;
}

interface ArtistMeta {
  genre: string;
  country: string;
}

const FALLBACK_TRACK_MS = 200000;
const SESSION_GAP_MINUTES = 60;
const OBSESSION_MIN_PLAYS_PER_DAY = 5;

// Guard against corrupted/misparsed timestamps (epoch-zero dates, bare row
// numbers parsed as years, etc.) without discarding genuinely old history:
// Last.fm launched in 2002, so nothing earlier can be a real scrobble.
const MIN_VALID_YEAR = 2002;
const MAX_VALID_YEAR = new Date().getFullYear() + 1;

function isPlausiblePlayYear(year: number): boolean {
  return year >= MIN_VALID_YEAR && year <= MAX_VALID_YEAR;
}

/**
 * Bundled offline artist metadata (446 entries): the 100 curated artists from
 * the app's own dataset plus ~350 well-known artists across genres, authored
 * once at build time - no runtime API calls, keeping the app fully client-side.
 */
const KNOWN_ARTIST_META = artistMetaJson as Record<string, ArtistMeta>;

function artistMetadataKey(artist: string): string {
  return artist.normalize('NFC').trim().toLowerCase();
}

function artistCatalogKey(artist: string): string {
  // Keep the parser's deliberately exact identity policy: registered aliases
  // are canonicalized before aggregation, while casing and punctuation remain
  // distinct for names that are not in that evidence-backed registry.
  return artist.normalize('NFC').trim();
}

function metaForArtist(artist: string): ArtistMeta {
  // normalize('NFC') matters: macOS/some exporters emit decomposed (NFD)
  // Unicode, and "Sigur Rós" in NFD is a different string than the NFC key
  // stored in artist_meta.json - without this, every accented/non-Latin
  // artist from such an export silently falls back to Unclassified.
  return KNOWN_ARTIST_META[artistMetadataKey(artist)] ?? {
    genre: 'Unclassified',
    country: 'Unknown',
  };
}

const SOURCE_LABELS: Record<RawSource, string> = {
  lastfm: 'Last.fm CSV',
  apple_music: 'Apple Music CSV',
  spotify: 'Spotify JSON',
  youtube: 'YouTube JSON/HTML',
  listenbrainz: 'ListenBrainz JSON',
};

export function parseMusicSources(options: {
  /** CSV files of any supported shape - Last.fm and Apple Music are told apart by header sniffing. */
  csvTexts?: string[];
  spotifyJsonTexts?: string[];
  youtubeHtmlTexts?: string[];
}): MusicDnaData {
  const parsedPlays = [
    ...(options.csvTexts ?? []).flatMap(parseCsvSourceRows),
    ...parseStreamingJsonRows(options.spotifyJsonTexts ?? []),
    ...parseYoutubeHtmlRows(options.youtubeHtmlTexts ?? []),
  ];
  // Canonicalize only evidence-backed, explicitly registered aliases. This
  // happens before both cross-source dedupe and every downstream aggregation,
  // so tracks, albums, eras, sessions and obsessions share one identity.
  const plays = parsedPlays.map(play => {
    const artist = canonicalArtistName(play.artist);
    return artist === play.artist ? play : { ...play, artist };
  });
  // Spotify's export logs every track START, including 2-second skips; a
  // "play" here follows Spotify's own stream-counting rule (>=30s listened).
  // Raw events are still passed through for skip/short-play transparency stats.
  const counted = plays.filter(isCountablePlay);
  // Never let the threshold empty a real upload (e.g. a file of only skips).
  const base = counted.length ? counted : plays;
  const { items: deduped, dropped } = dedupeCrossSource(base);
  const detectedSources = [...new Set(plays.map(play => play.source))];
  const sourceLabel = detectedSources.length
    ? detectedSources.map(source => SOURCE_LABELS[source]).join(' + ')
    : 'Imported Files';
  return aggregateData(deduped, sourceLabel, plays, dropped);
}

/** Spotify counts a stream at 30 seconds listened; shorter events are skips/samples. */
const MIN_COUNTED_SPOTIFY_MS = 30000;

function isCountablePlay(play: ParsedPlay): boolean {
  if (play.source !== 'spotify') return true;
  if (!play.ms_played || play.ms_played <= 0) return true;
  return play.ms_played >= MIN_COUNTED_SPOTIFY_MS;
}

/**
 * The same real-world listen is often reported by two services at once - the
 * classic case is a Last.fm account auto-scrobbling Spotify, where every
 * Spotify stream also arrives as a Last.fm scrobble a moment later. Verified
 * empirically on the bundled archive: 77% of its Last.fm rows have the same
 * track on Spotify within ±10 minutes. Counting both would double-count most
 * of a user's history, so events with the same normalized artist+track from
 * DIFFERENT sources within the window collapse to one, keeping the richer
 * event (the one carrying measured playtime/platform/country data).
 * Same-source repeats (genuine loop listening) are never collapsed.
 */
const CROSS_SOURCE_WINDOW_MS = 10 * 60 * 1000;

function dedupeCrossSource(items: ParsedPlay[]): { items: ParsedPlay[]; dropped: number } {
  const sources = new Set(items.map(item => item.source));
  if (sources.size < 2) return { items, dropped: 0 };

  const richness = (play: ParsedPlay) =>
    (play.ms_played && play.ms_played > 0 ? 2 : 0) +
    (play.platform && play.platform !== 'Unknown' ? 1 : 0);

  const byKey = new Map<string, ParsedPlay[]>();
  items.forEach(item => {
    const key = normalizedTrackKey(item.artist, item.track);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)?.push(item);
  });

  const kept: ParsedPlay[] = [];
  let dropped = 0;
  byKey.forEach(group => {
    group.sort((a, b) => a.ts.getTime() - b.ts.getTime());
    const groupKept: ParsedPlay[] = [];
    group.forEach(play => {
      const prev = groupKept[groupKept.length - 1];
      if (prev && play.source !== prev.source && play.ts.getTime() - prev.ts.getTime() <= CROSS_SOURCE_WINDOW_MS) {
        if (richness(play) > richness(prev)) groupKept[groupKept.length - 1] = play;
        dropped++;
        return;
      }
      groupKept.push(play);
    });
    kept.push(...groupKept);
  });

  return { items: kept, dropped };
}

/**
 * Routes a single CSV file to the right row parser by sniffing its header
 * row - Apple Music's Play Activity export and Last.fm's scrobble export
 * share the .csv extension but nothing else, so extension alone can't tell
 * them apart.
 */
function parseCsvSourceRows(csvText: string): ParsedPlay[] {
  const rows = parseCsvRows(csvText);
  if (!rows.length) return [];
  const header = rows[0].map(cell => cell.trim().toLowerCase());
  return looksLikeAppleMusicHeader(header)
    ? appleMusicRowsFromParsedRows(rows)
    : lastfmRowsFromParsedRows(rows);
}

export function parseLastfmCsvRows(csvText: string): ParsedPlay[] {
  return lastfmRowsFromParsedRows(parseCsvRows(csvText));
}

function lastfmRowsFromParsedRows(rows: string[][]): ParsedPlay[] {
  const plays: ParsedPlay[] = [];

  rows.forEach((row, index) => {
    const clean = row.map(cell => cell.trim());
    if (clean.length < 4) return;
    if (index === 0 && looksLikeHeader(clean)) return;

    const [artist, album, track] = clean;
    const tsStr = clean.slice(3).join(',').trim();
    const ts = parseLastfmDate(tsStr);
    if (!artist || !track || Number.isNaN(ts.getTime())) return;

    plays.push({
      artist,
      album,
      track,
      ts,
      ts_str: ts.toISOString(),
      source: 'lastfm',
    });
  });

  return plays;
}

/**
 * Apple's "Play Activity" privacy-export CSV. Its exact column set varies by
 * export year/region and it notoriously omits a reliable artist column in
 * some variants, so this parser is deliberately conservative: it looks up
 * known column aliases and SKIPS any row it cannot confidently attribute to
 * an artist, rather than guessing. Wrong data is worse than missing data.
 */
const APPLE_MUSIC_HEADER_SIGNALS = [
  'track description',
  'apple id number',
  'media duration in milliseconds',
  'play duration milliseconds',
  'container description',
];

const APPLE_MUSIC_COLUMNS = {
  track: ['track description', 'song name', 'track name', 'title'],
  artist: ['artist name', 'artist'],
  album: ['container description', 'album name', 'container name'],
  timestamp: ['event start timestamp', 'event received timestamp', 'date played', 'timestamp', 'date'],
  playDurationMs: ['play duration milliseconds', 'play duration in millis', 'play duration ms'],
  mediaDurationMs: ['media duration in milliseconds', 'media duration ms'],
  endReason: ['end reason type'],
} as const;

function looksLikeAppleMusicHeader(header: string[]): boolean {
  const joined = header.join(',');
  // Require 2+ strong signals so a Last.fm export that happens to contain a
  // column named "track" or "date" is never misclassified as Apple Music.
  return APPLE_MUSIC_HEADER_SIGNALS.filter(signal => joined.includes(signal)).length >= 2;
}

function findColumnIndex(header: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const idx = header.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Best-effort "Artist - Track" split for Apple exports without a dedicated artist column. */
function splitDashedArtistTrack(title: string): { artist: string; track: string } | null {
  const normalized = title.replace(/[–—]/g, '-');
  const parts = normalized.split(/\s+-\s+/);
  if (parts.length < 2) return null;
  const artist = parts[0].trim();
  const track = cleanTrackDescriptor(parts.slice(1).join(' - '));
  return artist && track ? { artist, track } : null;
}

export function parseAppleMusicCsvRows(csvText: string): ParsedPlay[] {
  return appleMusicRowsFromParsedRows(parseCsvRows(csvText));
}

function appleMusicRowsFromParsedRows(rows: string[][]): ParsedPlay[] {
  if (!rows.length) return [];
  const header = rows[0].map(cell => cell.trim().toLowerCase());
  const col = {
    track: findColumnIndex(header, APPLE_MUSIC_COLUMNS.track),
    artist: findColumnIndex(header, APPLE_MUSIC_COLUMNS.artist),
    album: findColumnIndex(header, APPLE_MUSIC_COLUMNS.album),
    timestamp: findColumnIndex(header, APPLE_MUSIC_COLUMNS.timestamp),
    playDurationMs: findColumnIndex(header, APPLE_MUSIC_COLUMNS.playDurationMs),
    mediaDurationMs: findColumnIndex(header, APPLE_MUSIC_COLUMNS.mediaDurationMs),
    endReason: findColumnIndex(header, APPLE_MUSIC_COLUMNS.endReason),
  };
  if (col.track === -1 || col.timestamp === -1) return [];

  const plays: ParsedPlay[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawTrack = (row[col.track] ?? '').trim();
    const rawArtist = col.artist !== -1 ? (row[col.artist] ?? '').trim() : '';
    const rawTimestamp = (row[col.timestamp] ?? '').trim();
    if (!rawTrack || !rawTimestamp) continue;

    let artist = rawArtist;
    let track = cleanTrackDescriptor(rawTrack);
    if (!artist) {
      const split = splitDashedArtistTrack(rawTrack);
      if (!split) continue; // No dedicated artist column and no dash pattern - cannot attribute safely.
      artist = split.artist;
      track = split.track;
    }
    if (!artist || !track) continue;

    const ts = new Date(rawTimestamp);
    if (Number.isNaN(ts.getTime())) continue;
    if (!isPlausiblePlayYear(ts.getFullYear())) continue;

    const album = col.album !== -1 ? (row[col.album] ?? '').trim() : '';
    const playMs = col.playDurationMs !== -1 ? Number(row[col.playDurationMs]) || 0 : 0;
    const mediaMs = col.mediaDurationMs !== -1 ? Number(row[col.mediaDurationMs]) || 0 : 0;
    const endReason = col.endReason !== -1 ? (row[col.endReason] ?? '').toLowerCase() : '';

    plays.push({
      artist,
      track,
      album,
      ts,
      ts_str: ts.toISOString(),
      source: 'apple_music',
      ms_played: playMs > 0 ? playMs : (mediaMs > 0 ? mediaMs : undefined),
      skipped: endReason.includes('skip'),
      platform: 'Apple Music',
    });
  }

  return plays;
}

/**
 * Unwraps the shapes a JSON-based export can arrive in: a plain array
 * (Spotify Extended History, YouTube Takeout, ListenBrainz's own profile
 * export) or an object wrapping the listen array (ListenBrainz API-shaped
 * responses: `{listens:[...]}` or `{payload:{listens:[...]}}`).
 */
function extractJsonRowsArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.listens)) return obj.listens;
    const payload = obj.payload as Record<string, unknown> | undefined;
    if (payload && Array.isArray(payload.listens)) return payload.listens;
  }
  return null;
}

function parseStreamingJsonRows(jsonTexts: string[]): ParsedPlay[] {
  const plays: ParsedPlay[] = [];

  jsonTexts.forEach(text => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ParseError('INVALID_JSON', 'One of the uploaded files is not valid JSON.');
    }
    const rows = extractJsonRowsArray(parsed);
    if (!rows) return;

    rows.forEach(item => {
      if (!item || typeof item !== 'object') return;

      const spotifyPlay = spotifyPlayFromItem(item);
      if (spotifyPlay) {
        plays.push(spotifyPlay);
        return;
      }

      const listenBrainzPlay = listenBrainzPlayFromItem(item);
      if (listenBrainzPlay) {
        plays.push(listenBrainzPlay);
        return;
      }

      const youtubePlay = youtubePlayFromItem(item);
      if (youtubePlay) plays.push(youtubePlay);
    });
  });

  return plays;
}

function parseYoutubeHtmlRows(htmlTexts: string[]): ParsedPlay[] {
  const plays: ParsedPlay[] = [];

  htmlTexts.forEach(text => {
    const lines = htmlToLines(text);

    lines.forEach((line, index) => {
      if (!looksLikeYoutubeHistoryTitle(line)) return;

      const channelLine = lines[index + 1] && !looksLikeYoutubeDate(lines[index + 1])
        ? lines[index + 1]
        : 'YouTube';
      const dateLine = [lines[index + 1], lines[index + 2], lines[index + 3]]
        .find(looksLikeYoutubeDate);
      const play = youtubePlayFromParts(line, channelLine, dateLine, 'YouTube Takeout HTML');

      if (play) plays.push(play);
    });
  });

  return plays;
}

function spotifyPlayFromItem(item: any): ParsedPlay | undefined {
  const tsStr = item.ts || item.endTime;
  const artist = item.master_metadata_album_artist_name || item.artistName;
  const track = item.master_metadata_track_name || item.trackName;
  const album = item.master_metadata_album_album_name || item.albumName || '';
  const ts = new Date(tsStr);

  if (!artist || !track || !tsStr || Number.isNaN(ts.getTime())) return undefined;
  if (!isPlausiblePlayYear(ts.getFullYear())) return undefined;

  return {
    artist: String(artist).trim(),
    track: String(track).trim(),
    album: String(album).trim(),
    ts,
    ts_str: ts.toISOString(),
    source: 'spotify',
    ms_played: Number(item.ms_played ?? item.msPlayed ?? 0) || 0,
    skipped: Boolean(item.skipped),
    conn_country: item.conn_country ? countryCodeToName(item.conn_country) : 'Unknown',
    platform: item.platform || 'Unknown',
    reason_start: item.reason_start,
    reason_end: item.reason_end,
    offline: Boolean(item.offline),
    spotify_uri: item.spotify_track_uri,
  };
}

/**
 * ListenBrainz listens: `{listened_at: unixSeconds, track_metadata: {artist_name, track_name, release_name, additional_info}}`.
 * This is ListenBrainz's own documented listen shape (profile export and API responses share it).
 */
function listenBrainzPlayFromItem(item: any): ParsedPlay | undefined {
  const listenedAt = item.listened_at;
  const meta = item.track_metadata;
  if (typeof listenedAt !== 'number' || !meta || typeof meta !== 'object') return undefined;

  const artist = meta.artist_name;
  const track = meta.track_name;
  if (!artist || !track) return undefined;

  const ts = new Date(listenedAt * 1000);
  if (Number.isNaN(ts.getTime())) return undefined;

  const album = meta.release_name || '';
  const durationMs = meta.additional_info?.duration_ms;
  const listeningFrom = meta.additional_info?.listening_from;

  return {
    artist: String(artist).trim(),
    track: String(track).trim(),
    album: String(album).trim(),
    ts,
    ts_str: ts.toISOString(),
    source: 'listenbrainz',
    ms_played: typeof durationMs === 'number' ? durationMs : undefined,
    platform: typeof listeningFrom === 'string' ? listeningFrom : 'ListenBrainz',
  };
}

function youtubePlayFromItem(item: any): ParsedPlay | undefined {
  const title = typeof item.title === 'string' ? item.title : '';
  const tsStr = item.time || item.timestamp;
  const header = typeof item.header === 'string' ? item.header : '';
  const titleUrl = typeof item.titleUrl === 'string' ? item.titleUrl : '';
  const products = Array.isArray(item.products) ? item.products.join(' ') : '';
  const looksLikeYoutube = /youtube/i.test(`${header} ${titleUrl} ${products}`) || /^(watched|listened to|visto|has visto|escuchaste)\b/i.test(title);

  if (!looksLikeYoutube) return undefined;

  const channelName = youtubeSubtitleName(item) ?? 'YouTube';
  return youtubePlayFromParts(title, channelName, tsStr, header || 'YouTube');
}

function youtubePlayFromParts(title: string, channelName: string, tsStr?: string, platform = 'YouTube'): ParsedPlay | undefined {
  const ts = parseYoutubeTakeoutDate(tsStr);
  if (!title || !tsStr || Number.isNaN(ts.getTime())) return undefined;

  const cleanTitle = cleanYoutubeTitle(title);
  if (!cleanTitle) return undefined;

  const music = youtubeMusicAttribution(cleanTitle, channelName);
  if (!music) return undefined;

  return {
    artist: music.artist,
    track: music.track,
    album: '',
    ts,
    ts_str: ts.toISOString(),
    source: 'youtube',
    platform,
  };
}

const YT_MUSIC_TITLE_MARKERS = /[[(](official\s+)?(music\s+)?(video|audio|visualizer|lyric)/i;

/**
 * A full YouTube watch history is mostly NOT music (documentaries, gaming,
 * news...) - blindly importing 42K watch events as "plays" would poison every
 * chart. A row only counts as a music play with a confident attribution:
 * - "<Artist> - Topic" channel: YouTube's own auto-generated artist audio.
 * - "Artist - Track" title where the artist is in the bundled music catalog
 *   (artist_meta.json, ~450 real artists).
 * - "Artist - Track" title on a VEVO channel or carrying an explicit
 *   (Official Video/Audio/Lyric...) marker.
 * Everything else is skipped: a dropped documentary is correct, a documentary
 * counted as a song is not.
 */
function youtubeMusicAttribution(title: string, channelName: string): { artist: string; track: string } | undefined {
  const channel = channelName.trim();
  const dashParts = title.replace(/[–—]/g, '-').split(/\s+-\s+/);

  if (/\s-\s*Topic$/i.test(channel)) {
    const artist = channel.replace(/\s+-\s*Topic$/i, '').trim();
    if (!artist || /^youtube( music)?$/i.test(artist)) return undefined;
    const track = cleanTrackDescriptor(
      dashParts.length >= 2 && dashParts[0].trim().toLowerCase() === artist.toLowerCase()
        ? dashParts.slice(1).join(' - ')
        : title,
    );
    return track ? { artist, track } : undefined;
  }

  if (dashParts.length >= 2) {
    const artist = dashParts[0].trim();
    const track = cleanTrackDescriptor(dashParts.slice(1).join(' - '));
    if (!artist || !track || /^youtube( music)?$/i.test(artist)) return undefined;

    const isKnownArtist = Boolean(KNOWN_ARTIST_META[artist.normalize('NFC').trim().toLowerCase()]);
    const isVevoChannel = /vevo$/i.test(channel.replace(/\s+/g, ''));
    const hasMusicMarker = YT_MUSIC_TITLE_MARKERS.test(title);
    if (isKnownArtist || isVevoChannel || hasMusicMarker) return { artist, track };
  }

  return undefined;
}

function youtubeSubtitleName(item: any) {
  if (!Array.isArray(item.subtitles)) return undefined;
  const first = item.subtitles.find((subtitle: any) => typeof subtitle?.name === 'string' && subtitle.name.trim());
  return first?.name?.trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function htmlToLines(html: string) {
  const inlineAnchors = html.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (_, inner: string) => (
    decodeHtmlEntities(inner.replace(/<[^>]+>/g, ' '))
  ));

  return decodeHtmlEntities(inlineAnchors)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|tr|td|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function looksLikeYoutubeHistoryTitle(line: string) {
  return /^(watched|listened to|visto|has visto|escuchaste)\b/i.test(line);
}

// Takeout localizes month abbreviations to the ACCOUNT language - a Spanish
// account's watch history says "3 jul 2026, 5:00:15 p.m. IDT", which
// `new Date()` cannot parse (this once silently dropped 42,000 real rows).
const YT_MONTH_ABBREV: Record<string, number> = {
  // English
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7,
  sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  // Spanish
  ene: 0, abr: 3, ago: 7, dic: 11,
};

function parseYoutubeTakeoutDate(input?: string) {
  if (!input) return new Date(Number.NaN);
  const normalized = decodeHtmlEntities(input)
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^\d+$/.test(normalized)) {
    return new Date(Number.NaN);
  }

  // Localized "D MMM YYYY, H:MM:SS a.m./p.m. TZ" (Spanish-style) branch first.
  // Parsed as wall-clock local time: the timezone abbreviation is where the
  // user actually was, which is exactly what the hour/day heatmaps want.
  const localized = normalized.match(
    /^(\d{1,2})\s+([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc]{3,5})\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/i,
  );
  if (localized) {
    const [, day, monthName, year, hourRaw, minute, second, ampm] = localized;
    const month = YT_MONTH_ABBREV[monthName.toLowerCase().replace(/\./g, '')];
    if (month !== undefined) {
      if (!isPlausiblePlayYear(Number(year))) return new Date(Number.NaN);
      let hour = Number(hourRaw);
      if (ampm) {
        const isPm = /^p/i.test(ampm);
        if (isPm && hour < 12) hour += 12;
        if (!isPm && hour === 12) hour = 0;
      }
      return new Date(Number(year), month, Number(day), hour, Number(minute), Number(second ?? 0));
    }
  }

  const direct = new Date(normalized);
  const yr = direct.getFullYear();
  if (!Number.isNaN(yr) && !isPlausiblePlayYear(yr)) {
    return new Date(Number.NaN);
  }
  return direct;
}

function looksLikeYoutubeDate(line?: string) {
  return !Number.isNaN(parseYoutubeTakeoutDate(line).getTime());
}

function cleanYoutubeTitle(title: string) {
  return decodeHtmlEntities(title)
    .replace(/^(watched|listened to|visto|has visto|escuchaste)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTrackDescriptor(title: string) {
  return title
    .replace(/\s*[[(](official\s+)?(music\s+)?(video|audio|visualizer|lyrics?|lyric video|hd|4k|live session)[\])]/ig, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function aggregateData(
  items: ParsedPlay[],
  sourceType: string,
  // Raw pre-filter/pre-dedup events: skip/short-play/per-source stats are
  // reported from these so the summary stays transparent about what arrived,
  // while every counted metric comes from the deduped `items`.
  rawItems: ParsedPlay[] = items,
  crossSourceDuplicates = 0,
): MusicDnaData {
  const sortedItems = [...items].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  if (sortedItems.length === 0) {
    throw new ParseError('NO_VALID_ROWS', 'No valid rows were found in the uploaded files.');
  }

  const artistCounts: Record<string, number> = {};
  const trackCounts: Record<string, number> = {};
  const albumCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};
  const yearBuckets = new Map<number, ParsedPlay[]>();
  const monthlyCounts = new Map<string, number>();
  const dateCounts = new Map<string, number>();
  // Separate from `countryCounts`: this tracks the artists' home countries
  // across the entire counted history, while `countryCounts` is listener-side
  // Spotify connection telemetry.
  const artistOriginCountryCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const platformCounts: Record<string, number> = {};
  const heatmap: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));

  let totalMs = 0;

  sortedItems.forEach(item => {
    const artist = item.artist.trim();
    const track = item.track.trim();
    const album = item.album.trim();
    const year = item.ts.getFullYear();
    const month = item.ts.getMonth();
    const dateKey = getLocalDateKey(item.ts);
    const trackKey = makeTrackKey(artist, track);
    const artistMeta = metaForArtist(artist);
    const msPlayed = item.ms_played && item.ms_played > 0 ? item.ms_played : FALLBACK_TRACK_MS;

    totalMs += msPlayed;
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    trackCounts[trackKey] = (trackCounts[trackKey] || 0) + 1;
    genreCounts[normalizeGenre(artistMeta.genre)] = (genreCounts[normalizeGenre(artistMeta.genre)] || 0) + 1;
    if (artistMeta.country && artistMeta.country !== 'Unknown') {
      artistOriginCountryCounts[artistMeta.country] = (artistOriginCountryCounts[artistMeta.country] || 0) + 1;
    }

    if (album) {
      const albumKey = makeAlbumKey(artist, album);
      albumCounts[albumKey] = (albumCounts[albumKey] || 0) + 1;
    }

    if (!yearBuckets.has(year)) yearBuckets.set(year, []);
    yearBuckets.get(year)?.push(item);
    monthlyCounts.set(`${year}-${month}`, (monthlyCounts.get(`${year}-${month}`) || 0) + 1);
    dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);

    const hour = item.ts.getHours();
    const weekday = mondayFirstWeekday(item.ts);
    heatmap[hour][weekday]++;

    if (item.conn_country) countryCounts[item.conn_country] = (countryCounts[item.conn_country] || 0) + 1;
    if (item.platform) platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
  });

  const totalPlays = sortedItems.length;
  const totalMinutes = totalMs / 60000;
  const sessions = buildSessions(sortedItems);
  const records = buildRecords(dateCounts, sessions);
  const sourceSummary: SourceSummary = {
    ...buildSourceSummary(rawItems),
    merged_plays: sortedItems.length,
    cross_source_duplicates: crossSourceDuplicates,
  };

  const topArtists: TopArtist[] = entriesByCount(artistCounts, 100).map(([name, plays]) => {
    const meta = metaForArtist(name);
    return { name, plays, genre: meta.genre, country: meta.country };
  });

  const topTracks: TopTrack[] = entriesByCount(trackCounts, 100).map(([key, plays]) => {
    const { artist, title } = splitTrackKey(key);
    return { artist, title, plays, genre: metaForArtist(artist).genre };
  });

  const topAlbums: TopAlbum[] = entriesByCount(albumCounts, 100).map(([key, plays]) => {
    const { artist, title } = splitAlbumKey(key);
    return { artist, title, plays };
  });
  const artistGenreCatalog: ArtistGenreCatalogEntry[] = entriesByCount(
    artistCounts,
    Object.keys(artistCounts).length,
  ).map(([name, plays]) => {
    const meta = metaForArtist(name);
    const source = KNOWN_ARTIST_META[artistMetadataKey(name)] ? 'catalog' : 'unclassified';
    return {
      artistKey: artistCatalogKey(name),
      name,
      plays,
      automaticGenre: meta.genre,
      automaticFamily: normalizeGenre(meta.genre),
      country: meta.country,
      source,
    };
  });
  const knowledgeSummary = buildOfflineArtistKnowledgeSummary(topArtists);

  const countries = entriesByCount(countryCounts, 50)
    .map(([country, plays]) => ({ country, plays }))
    .filter(c => c.country && c.country !== 'Unknown');
  const artistOriginCountries = entriesByCount(
    artistOriginCountryCounts,
    Object.keys(artistOriginCountryCounts).length,
  ).map(([country, plays]) => ({ country, plays }));
  const platformBreakdown: PlatformPlay[] = entriesByCount(platformCounts, 30).map(([platform, plays]) => ({ platform, plays }));
  const monthlyActivity = Array.from(monthlyCounts.entries())
    .map(([key, plays]) => {
      const [year, month] = key.split('-').map(Number);
      return { year, month, plays };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const yearlyEras = buildYearlyEras(yearBuckets);

  return {
    project: `Nova Music Lab - Datos Importados (${sourceType})`,
    generated_at: new Date().toISOString(),
    core_metrics: {
      total_plays: totalPlays,
      unique_artists: Object.keys(artistCounts).length,
      unique_tracks: Object.keys(trackCounts).length,
      unique_albums: Object.keys(albumCounts).length,
      listening_minutes: round1(totalMinutes),
      listening_hours: round1(totalMinutes / 60),
      listening_days: round1(totalMinutes / 60 / 24),
      active_days: dateCounts.size,
      max_year: yearlyEras.length ? [...yearlyEras].sort((a, b) => b.plays - a.plays)[0].year : 'N/A',
      match_rate_pct: sourceSummary.source_type === 'merged'
        ? round2(sourceSummary.overlap_unique_tracks / Math.max(1, new Set(sortedItems.map(item => normalizedTrackKey(item.artist, item.track))).size) * 100)
        : 100,
    },
    top_artists: topArtists,
    top_tracks: topTracks,
    top_albums: topAlbums,
    top_genres: entriesByCount(genreCounts, 20).map(([name, plays]) => ({ name, plays })),
    artist_genre_catalog: artistGenreCatalog,
    yearly_eras: yearlyEras,
    sessions: sessions.slice(0, 50),
    obsessions: buildObsessions(sortedItems),
    artist_origin_countries: artistOriginCountries,
    countries: countries.length ? countries : [{ country: 'Unknown', plays: totalPlays }],
    heatmap,
    daily_plays: Object.fromEntries(dateCounts),
    monthly_activity: monthlyActivity,
    platform_breakdown: platformBreakdown,
    source_summary: sourceSummary,
    knowledge_summary: knowledgeSummary,
    records,
  };
}

const SOURCE_NOTES: Record<RawSource, string> = {
  lastfm: 'Last.fm-only upload: timestamps and scrobbles are direct, while skip/platform data are unavailable.',
  spotify: 'Spotify-only upload: skip, platform and country data are measured directly from the export.',
  youtube: 'YouTube-only upload: watch history timestamps are direct, while artist and track names are inferred from video titles and channel names.',
  apple_music: 'Apple Music-only upload: Play Activity timestamps are direct, while rows without a resolvable artist are skipped.',
  listenbrainz: 'ListenBrainz-only upload: listens are direct, including the artist, track and album fields already scrobbled there.',
};

function buildSourceSummary(items: ParsedPlay[]): SourceSummary {
  const bySource: Record<RawSource, ParsedPlay[]> = {
    lastfm: items.filter(item => item.source === 'lastfm'),
    spotify: items.filter(item => item.source === 'spotify'),
    youtube: items.filter(item => item.source === 'youtube'),
    apple_music: items.filter(item => item.source === 'apple_music'),
    listenbrainz: items.filter(item => item.source === 'listenbrainz'),
  };
  const activeSources = (Object.keys(bySource) as RawSource[]).filter(source => bySource[source].length > 0);

  const trackKeyCounts = new Map<string, number>();
  activeSources.forEach(source => {
    new Set(bySource[source].map(item => normalizedTrackKey(item.artist, item.track))).forEach(key => {
      trackKeyCounts.set(key, (trackKeyCounts.get(key) ?? 0) + 1);
    });
  });
  const overlap = [...trackKeyCounts.values()].filter(count => count > 1).length;

  const spotifyItems = bySource.spotify;
  const spotifySkips = spotifyItems.filter(item => item.skipped).length;
  const spotifyShortPlays = spotifyItems.filter(item => (item.ms_played ?? 0) > 0 && (item.ms_played ?? 0) < 30000).length;

  const sourceType: PlaySource = activeSources.length > 1 ? 'merged' : (activeSources[0] ?? 'unknown');

  return {
    source_type: sourceType,
    lastfm_plays: bySource.lastfm.length,
    spotify_plays: bySource.spotify.length,
    youtube_plays: bySource.youtube.length,
    apple_music_plays: bySource.apple_music.length,
    listenbrainz_plays: bySource.listenbrainz.length,
    merged_plays: items.length,
    spotify_skips: spotifySkips,
    spotify_skip_rate_pct: spotifyItems.length ? round2((spotifySkips / spotifyItems.length) * 100) : 0,
    spotify_short_plays: spotifyShortPlays,
    spotify_short_play_rate_pct: spotifyItems.length ? round2((spotifyShortPlays / spotifyItems.length) * 100) : 0,
    overlap_unique_tracks: overlap,
    source_note: sourceType === 'merged'
      ? 'Merged upload: the same listen reported by two services (e.g. Last.fm auto-scrobbling Spotify) is counted once, and Spotify events under 30s are tracked as skips/short plays rather than counted as plays.'
      : SOURCE_NOTES[sourceType as RawSource] ?? 'Unknown source: this dataset uses the best available imported events.',
  };
}

function buildYearlyEras(yearBuckets: Map<number, ParsedPlay[]>): YearlyEra[] {
  return Array.from(yearBuckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, plays]) => {
      const artistCounts: Record<string, number> = {};
      const trackCounts: Record<string, number> = {};
      const dayparts: Record<string, number> = {
        'Madrugada 00-05': 0,
        'Mañana 06-11': 0,
        'Tarde 12-17': 0,
        'Noche 18-23': 0,
      };

      plays.forEach(play => {
        artistCounts[play.artist] = (artistCounts[play.artist] || 0) + 1;
        trackCounts[play.track] = (trackCounts[play.track] || 0) + 1;
        dayparts[daypartForHour(play.ts.getHours())]++;
      });

      const topArtist = entriesByCount(artistCounts, 1)[0]?.[0] ?? 'Unknown';
      const topTrack = entriesByCount(trackCounts, 1)[0]?.[0] ?? 'Unknown';
      const uniqueArtists = Object.keys(artistCounts).length;
      const uniqueTracks = Object.keys(trackCounts).length;
      const diversityIndex = plays.length ? round1((uniqueTracks / plays.length) * 100) : 0;
      const dominantDaypart = entriesByCount(dayparts, 1)[0]?.[0] ?? 'Tarde 12-17';

      return {
        year,
        plays: plays.length,
        unique_artists: uniqueArtists,
        unique_tracks: uniqueTracks,
        top_artist: topArtist,
        top_track: topTrack,
        dominant_daypart: dominantDaypart,
        era_label: `Era de ${topArtist}`,
        era_desc: `Un año marcado por ${topArtist}, ${plays.length.toLocaleString('es-ES')} reproducciones y ${uniqueArtists.toLocaleString('es-ES')} artistas unicos.`,
        diversity_index: diversityIndex,
      };
    });
}

function buildSessions(items: ParsedPlay[]): Session[] {
  const sessions: Session[] = [];
  let current: ParsedPlay[] = [];

  items.forEach(item => {
    const last = current[current.length - 1];
    const gapMinutes = last ? (item.ts.getTime() - last.ts.getTime()) / 60000 : 0;

    if (!last || gapMinutes <= SESSION_GAP_MINUTES) {
      current.push(item);
      return;
    }

    sessions.push(summarizeSession(sessions.length, current));
    current = [item];
  });

  if (current.length) sessions.push(summarizeSession(sessions.length, current));
  return sessions.sort((a, b) => b.tracks_count - a.tracks_count);
}

function summarizeSession(id: number, session: ParsedPlay[]): Session {
  const artists = session.map(item => item.artist);
  const tracks = session.map(item => item.track);
  const durationFromTime = (session[session.length - 1].ts.getTime() - session[0].ts.getTime()) / 60000;
  const durationFromTracks = session.reduce((sum, item) => sum + ((item.ms_played && item.ms_played > 0 ? item.ms_played : FALLBACK_TRACK_MS) / 60000), 0);
  const artistCounts = countBy(artists);
  const trackCounts = countBy(tracks);

  return {
    id,
    start: session[0].ts.toISOString(),
    end: session[session.length - 1].ts.toISOString(),
    tracks_count: session.length,
    duration_min: round1(Math.max(durationFromTime, durationFromTracks)),
    top_artist: entriesByCount(artistCounts, 1)[0]?.[0] ?? 'Unknown',
    top_track: entriesByCount(trackCounts, 1)[0]?.[0] ?? 'Unknown',
    unique_artists: new Set(artists).size,
  };
}

function buildObsessions(items: ParsedPlay[]) {
  const groups: Record<string, { artist: string; track: string; date: string; count: number }> = {};
  items.forEach(item => {
    const date = getLocalDateKey(item.ts);
    const key = `${makeTrackKey(item.artist, item.track)}__${date}`;
    groups[key] ??= { artist: item.artist, track: item.track, date, count: 0 };
    groups[key].count++;
  });

  return Object.values(groups)
    .filter(group => group.count >= OBSESSION_MIN_PLAYS_PER_DAY)
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

function buildRecords(dateCounts: Map<string, number>, sessions: Session[]): RecordsSummary {
  const dates = Array.from(dateCounts.keys()).sort();
  let bestStreak = 0;
  let bestStart: string | undefined;
  let bestEnd: string | undefined;
  let currentStreak = 0;
  let currentStart: string | undefined;
  let previousDate: Date | undefined;

  dates.forEach(dateKey => {
    const date = new Date(`${dateKey}T00:00:00`);
    const consecutive = previousDate
      ? Math.round((date.getTime() - previousDate.getTime()) / 86400000) === 1
      : false;

    if (!previousDate || !consecutive) {
      currentStreak = 1;
      currentStart = dateKey;
    } else {
      currentStreak++;
    }

    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
      bestStart = currentStart;
      bestEnd = dateKey;
    }
    previousDate = date;
  });

  const maxDay = Array.from(dateCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const longestSession = [...sessions].sort((a, b) => b.duration_min - a.duration_min)[0];
  const bestSession = [...sessions].sort((a, b) => b.tracks_count - a.tracks_count)[0];

  return {
    longest_streak_days: bestStreak,
    longest_streak_start: bestStart,
    longest_streak_end: bestEnd,
    max_day_plays: maxDay?.[1] ?? 0,
    max_day_date: maxDay?.[0],
    longest_session_minutes: round1(longestSession?.duration_min ?? 0),
    longest_session_tracks: longestSession?.tracks_count ?? 0,
    longest_session_start: longestSession?.start,
    best_session_tracks: bestSession?.tracks_count ?? 0,
    best_session_start: bestSession?.start,
  };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function parseLastfmDate(input: string) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return new Date(Number.NaN);

  // Last.fm's "DD Mon YYYY HH:MM" export format is UTC by convention. This
  // branch must run BEFORE the generic Date() fallback, which would silently
  // interpret the same string in the machine's local timezone - shifting
  // every scrobble by the UTC offset and breaking cross-source dedup against
  // Spotify's properly-zoned ISO timestamps.
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (match) {
    const [, day, monthName, year, hour, minute] = match;
    const yr = Number(year);
    if (!isPlausiblePlayYear(yr)) return new Date(Number.NaN);

    const months: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
      may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8,
      sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
      dec: 11, december: 11,
    };

    const month = months[monthName.toLowerCase()];
    if (month === undefined) return new Date(Number.NaN);
    return new Date(Date.UTC(yr, month, Number(day), Number(hour), Number(minute)));
  }

  // Anything else (ISO strings etc.) carries its own timezone information.
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    if (isPlausiblePlayYear(direct.getFullYear())) return direct;
    return new Date(Number.NaN);
  }

  return new Date(Number.NaN);
}

const LASTFM_HEADER_FIELDS = {
  artist: new Set(['artist', 'artist name']),
  album: new Set(['album', 'album name']),
  track: new Set(['track', 'track name', 'song', 'song name']),
  timestamp: new Set(['date', 'timestamp', 'time', 'played at', 'scrobbled at']),
};

function normalizeCsvHeaderCell(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
}

function looksLikeHeader(row: string[]) {
  const [artist = '', album = '', track = '', timestamp = ''] = row.map(normalizeCsvHeaderCell);
  return LASTFM_HEADER_FIELDS.artist.has(artist)
    && LASTFM_HEADER_FIELDS.album.has(album)
    && LASTFM_HEADER_FIELDS.track.has(track)
    && LASTFM_HEADER_FIELDS.timestamp.has(timestamp);
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function entriesByCount<T extends Record<string, number>>(record: T, limit: number) {
  return Object.entries(record).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function makeTrackKey(artist: string, track: string) {
  return `${artist.trim()}|||${track.trim()}`;
}

/**
 * Case-insensitive variant of makeTrackKey, used for cross-source overlap detection
 * where Last.fm and Spotify often differ only in artist/track capitalization.
 */
function normalizedTrackKey(artist: string, track: string) {
  return makeTrackKey(artist, track).toLowerCase();
}

function splitTrackKey(key: string) {
  const [artist, title] = key.split('|||');
  return { artist: artist ?? 'Unknown', title: title ?? 'Unknown' };
}

function makeAlbumKey(artist: string, album: string) {
  return `${artist.trim()}|||${album.trim()}`;
}

function splitAlbumKey(key: string) {
  const [artist, title] = key.split('|||');
  return { artist: artist ?? 'Unknown', title: title ?? 'Unknown' };
}

function mondayFirstWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daypartForHour(hour: number) {
  if (hour < 6) return 'Madrugada 00-05';
  if (hour < 12) return 'Mañana 06-11';
  if (hour < 18) return 'Tarde 12-17';
  return 'Noche 18-23';
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}
