import {
  MusicDnaData,
  PersonalityMatrix,
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

/**
 * Bundled offline artist metadata (446 entries): the 100 curated artists from
 * the app's own dataset plus ~350 well-known artists across genres, authored
 * once at build time - no runtime API calls, keeping the app fully client-side.
 */
const KNOWN_ARTIST_META = artistMetaJson as Record<string, ArtistMeta>;

function metaForArtist(artist: string): ArtistMeta {
  return KNOWN_ARTIST_META[artist.trim().toLowerCase()] ?? {
    genre: 'Unclassified',
    country: 'Unknown',
  };
}

export function parseLastfmCsv(csvText: string): MusicDnaData {
  return aggregateData(parseLastfmCsvRows(csvText), 'Last.fm CSV');
}

export function parseSpotifyJsons(jsonTexts: string[]): MusicDnaData {
  return aggregateData(parseStreamingJsonRows(jsonTexts), 'Streaming History JSON');
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
  const plays = [
    ...(options.csvTexts ?? []).flatMap(parseCsvSourceRows),
    ...parseStreamingJsonRows(options.spotifyJsonTexts ?? []),
    ...parseYoutubeHtmlRows(options.youtubeHtmlTexts ?? []),
  ];
  const detectedSources = [...new Set(plays.map(play => play.source))];
  const sourceLabel = detectedSources.length
    ? detectedSources.map(source => SOURCE_LABELS[source]).join(' + ')
    : 'Imported Files';
  return aggregateData(plays, sourceLabel);
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

  const parsed = splitYoutubeArtistTitle(cleanTitle, channelName);
  if (!parsed.track) return undefined;

  return {
    artist: parsed.artist,
    track: parsed.track,
    album: '',
    ts,
    ts_str: ts.toISOString(),
    source: 'youtube',
    platform,
  };
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

function parseYoutubeTakeoutDate(input?: string) {
  if (!input) return new Date(Number.NaN);
  const normalized = decodeHtmlEntities(input)
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const direct = new Date(normalized);
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

function splitYoutubeArtistTitle(title: string, channelName: string) {
  const normalizedDashTitle = title.replace(/[–—]/g, '-');
  const dashParts = normalizedDashTitle.split(/\s+-\s+/);

  if (dashParts.length >= 2) {
    const artist = dashParts[0].trim();
    const track = cleanTrackDescriptor(dashParts.slice(1).join(' - '));
    if (artist && track) return { artist, track };
  }

  return {
    artist: channelName.replace(/\s+-\s+Topic$/i, '').trim() || 'YouTube',
    track: cleanTrackDescriptor(title),
  };
}

export function aggregateData(items: ParsedPlay[], sourceType: string): MusicDnaData {
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
  const sourceSummary = buildSourceSummary(sortedItems);

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
  const knowledgeSummary = buildOfflineArtistKnowledgeSummary(topArtists);

  const countries = entriesByCount(countryCounts, 50).map(([country, plays]) => ({ country, plays }));
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
    yearly_eras: yearlyEras,
    sessions: sessions.slice(0, 50),
    obsessions: buildObsessions(sortedItems),
    countries: countries.length ? countries : [{ country: 'Unknown', plays: totalPlays }],
    heatmap,
    daily_plays: Object.fromEntries(dateCounts),
    monthly_activity: monthlyActivity,
    platform_breakdown: platformBreakdown,
    source_summary: sourceSummary,
    knowledge_summary: knowledgeSummary,
    records,
    personality_matrix: defaultPersonalityMatrix,
    archetypes: defaultArchetypes,
    artist_profile: defaultArtistProfile,
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
      ? 'Merged upload: totals include all imported events. Overlap is measured by normalized artist + track names.'
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
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return new Date(Number.NaN);

  const [, day, monthName, year, hour, minute] = match;
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8,
    sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
    dec: 11, december: 11,
  };

  const month = months[monthName.toLowerCase()];
  if (month === undefined) return new Date(Number.NaN);
  return new Date(Number(year), month, Number(day), Number(hour), Number(minute));
}

function looksLikeHeader(row: string[]) {
  const joined = row.join(',').toLowerCase();
  return joined.includes('artist') && joined.includes('track') && (joined.includes('timestamp') || joined.includes('date'));
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

// Fallback matrices when parsing new user data client-side.
const defaultPersonalityMatrix: PersonalityMatrix = {
  sensibilidad_emocional: { score: 85, evidence: 'Escucha recurrente de post-metal, shoegaze o canciones de alta carga emocional.', artists: ['Deafheaven'], positive: 'Empatia y lectura emocional profunda.', shadow: 'Tendencia a quedarse demasiado tiempo en estados intensos.', tip: 'Alterna canciones catarticas con cierres luminosos.' },
  nostalgia: { score: 80, evidence: 'Presencia de sonidos retro, synthwave o artistas que vuelven a traves de los años.', artists: ['The Midnight'], positive: 'Memoria afectiva poderosa.', shadow: 'Idealizar etapas pasadas.', tip: 'Crea playlists por era y cierra cada una con una cancion nueva.' },
  energia: { score: 75, evidence: 'Bloques de rock, punk, metalcore o pop de alto pulso.', artists: ['Bring Me the Horizon'], positive: 'Impulso y resiliencia.', shadow: 'Sobreestimulacion si todo el dia se vuelve intensidad.', tip: 'Usa la energia alta como ritual de accion.' },
  oscuridad_estetica: { score: 85, evidence: 'Afinidad por texturas oscuras, atmosfericas o cyberpunk.', artists: ['Carpenter Brut'], positive: 'Imaginacion visual fuerte.', shadow: 'Aislamiento estetizado.', tip: 'Convierte esa oscuridad en diseño, escritura o sonido.' },
  creatividad: { score: 90, evidence: 'Variedad amplia de artistas y cambios de etapa.', artists: ['Bilmuri'], positive: 'Exploracion y apertura.', shadow: 'Saltar demasiado rapido entre ideas.', tip: 'Elige una micro-era creativa por semana.' },
  rebeldia: { score: 80, evidence: 'Canciones de catarsis, ruptura y reconstruccion.', artists: ['The Word Alive'], positive: 'Autodefensa emocional.', shadow: 'Tension acumulada.', tip: 'Cierra los loops intensos con movimiento fisico.' },
  futurismo: { score: 85, evidence: 'Sintetizadores, produccion moderna y estética digital.', artists: ['The Midnight'], positive: 'Vision de futuro.', shadow: 'Desconexion del presente.', tip: 'Usa la musica futurista para programar, diseñar o planear.' },
};

const defaultArchetypes = [
  { name: 'El Explorador Melancolico', desc: 'Buscador de belleza en la tristeza', artists: ['Deafheaven'], tracks: ['In Blur'], color: 'cyan', aesthetic: 'Luna de neon', strength: 'Introspeccion', wound: 'Soledad', advice: 'Transforma la melancolia en obra.' },
  { name: 'El Guerrero Emocional', desc: 'Usa la intensidad como escudo creativo', artists: ['Bring Me the Horizon'], tracks: ['MANTRA'], color: 'pink', aesthetic: 'Lluvia rosa', strength: 'Resiliencia', wound: 'Ansiedad', advice: 'Convierte la fuerza en accion concreta.' },
];

const defaultArtistProfile = {
  alias: 'Lirioth Teltanion',
  sound: 'Fusion de Blackgaze, Metalcore melodico y Synthwave Cyberpunk',
  tempo: '120 BPM',
  influences: ['Deafheaven', 'Bring Me the Horizon', 'The Midnight'],
  aesthetic: 'Cyberpunk / Glassmorphic',
  ep_concept: {
    title: 'Neon Catarsis',
    description: 'Un EP conceptual sobre memoria, reconstruccion y luces nocturnas.',
    tracklist: ['1. Portal de Ruido', '2. In Blur (Echo)', '3. Ciudad Interior', '4. Amanecer Sintetico'],
  },
  live_show: 'Hologramas reactivos',
};
