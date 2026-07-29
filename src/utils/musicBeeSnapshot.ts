import type {
  MusicBeeAlbumSnapshot,
  MusicBeeArtistSnapshot,
  MusicBeeLibrarySnapshot,
  MusicBeeTrackSnapshot,
} from '../types';
import { canonicalArtistName } from './artistIdentity';
import { normalizeCatalogName } from './catalogName';

export type MusicBeeSnapshotErrorCode =
  | 'INVALID_XML'
  | 'NOT_LIBRARY_XML'
  | 'NO_TRACKS'
  | 'FILE_TOO_LARGE';

export class MusicBeeSnapshotError extends Error {
  code: MusicBeeSnapshotErrorCode;

  constructor(code: MusicBeeSnapshotErrorCode, message: string) {
    super(message);
    this.name = 'MusicBeeSnapshotError';
    this.code = code;
  }
}

export const MAX_MUSICBEE_XML_BYTES = 50 * 1024 * 1024;
const MAX_XML_CHARACTERS = MAX_MUSICBEE_XML_BYTES;

interface ParsedMusicBeeTrack {
  track: MusicBeeTrackSnapshot;
  hasAggregatePlayCount: boolean;
  hasLastPlayed: boolean;
}

interface XmlStartToken {
  type: 'start';
  name: string;
  selfClosing: boolean;
}

interface XmlEndToken {
  type: 'end';
  name: string;
}

interface XmlTextToken {
  type: 'text';
  value: string;
}

type XmlToken = XmlStartToken | XmlEndToken | XmlTextToken;

class XmlSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XmlSyntaxError';
  }
}

function validateXmlAttributes(value: string) {
  let cursor = 0;
  while (cursor < value.length) {
    while (cursor < value.length && /\s/.test(value[cursor])) cursor += 1;
    if (cursor >= value.length) return;

    const name = value.slice(cursor).match(/^([A-Za-z_][\w:.-]*)/)?.[1];
    if (!name) throw new XmlSyntaxError('Invalid XML attribute name.');
    cursor += name.length;
    while (cursor < value.length && /\s/.test(value[cursor])) cursor += 1;
    if (value[cursor] !== '=') throw new XmlSyntaxError('XML attribute is missing "=".');
    cursor += 1;
    while (cursor < value.length && /\s/.test(value[cursor])) cursor += 1;

    const quote = value[cursor];
    if (quote !== '"' && quote !== "'") {
      throw new XmlSyntaxError('XML attribute value must be quoted.');
    }
    const end = value.indexOf(quote, cursor + 1);
    if (end < 0) throw new XmlSyntaxError('Unterminated XML attribute value.');
    cursor = end + 1;
  }
}

function decodeXmlEntities(value: string): string {
  let cursor = 0;
  let decoded = '';

  while (cursor < value.length) {
    const entityStart = value.indexOf('&', cursor);
    if (entityStart < 0) {
      decoded += value.slice(cursor);
      break;
    }

    decoded += value.slice(cursor, entityStart);
    const entityEnd = value.indexOf(';', entityStart + 1);
    if (entityEnd < 0) throw new XmlSyntaxError('Unterminated XML entity.');

    const entity = value.slice(entityStart + 1, entityEnd);
    const namedEntities: Record<string, string> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      quot: '"',
    };

    if (Object.prototype.hasOwnProperty.call(namedEntities, entity)) {
      decoded += namedEntities[entity];
    } else if (/^#\d+$/.test(entity) || /^#x[0-9a-f]+$/i.test(entity)) {
      const codePoint = entity[1].toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      try {
        decoded += String.fromCodePoint(codePoint);
      } catch {
        throw new XmlSyntaxError('Invalid numeric XML entity.');
      }
    } else {
      throw new XmlSyntaxError('Unsupported XML entity.');
    }

    cursor = entityEnd + 1;
  }

  return decoded;
}

/**
 * Minimal, non-DOM XML tokenizer for Apple plist exports.
 *
 * It intentionally resolves only XML's built-in entities and never loads the
 * external DTD declared by iTunes-compatible files. The importer only retains
 * allowlisted track fields, while ignored dictionaries are validated and
 * skipped without being materialized.
 */
class XmlTokenReader {
  private cursor = 0;
  private readonly xml: string;

  constructor(xml: string) {
    this.xml = xml;
  }

  next(): XmlToken | null {
    while (this.cursor < this.xml.length) {
      if (this.xml[this.cursor] !== '<') {
        const end = this.xml.indexOf('<', this.cursor);
        const boundary = end < 0 ? this.xml.length : end;
        const raw = this.xml.slice(this.cursor, boundary);
        this.cursor = boundary;
        return { type: 'text', value: decodeXmlEntities(raw) };
      }

      if (this.xml.startsWith('<!--', this.cursor)) {
        const end = this.xml.indexOf('-->', this.cursor + 4);
        if (end < 0) throw new XmlSyntaxError('Unterminated XML comment.');
        this.cursor = end + 3;
        continue;
      }

      if (this.xml.startsWith('<?', this.cursor)) {
        const end = this.xml.indexOf('?>', this.cursor + 2);
        if (end < 0) throw new XmlSyntaxError('Unterminated XML processing instruction.');
        this.cursor = end + 2;
        continue;
      }

      if (this.xml.startsWith('<![CDATA[', this.cursor)) {
        const end = this.xml.indexOf(']]>', this.cursor + 9);
        if (end < 0) throw new XmlSyntaxError('Unterminated XML CDATA block.');
        const value = this.xml.slice(this.cursor + 9, end);
        this.cursor = end + 3;
        return { type: 'text', value };
      }

      if (this.xml.slice(this.cursor, this.cursor + 9).toUpperCase() === '<!DOCTYPE') {
        this.skipDoctype();
        continue;
      }

      if (this.xml.startsWith('<!', this.cursor)) {
        throw new XmlSyntaxError('Unsupported XML declaration.');
      }

      return this.readTag();
    }

    return null;
  }

  nextSignificant(): XmlToken | null {
    let token = this.next();
    while (token?.type === 'text' && token.value.trim() === '') token = this.next();
    return token;
  }

  private skipDoctype() {
    let quote: '"' | "'" | null = null;
    let subsetDepth = 0;

    for (let index = this.cursor + 9; index < this.xml.length; index += 1) {
      const char = this.xml[index];
      if (quote) {
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '[') {
        subsetDepth += 1;
      } else if (char === ']') {
        subsetDepth = Math.max(0, subsetDepth - 1);
      } else if (char === '>' && subsetDepth === 0) {
        this.cursor = index + 1;
        return;
      }
    }

    throw new XmlSyntaxError('Unterminated XML doctype.');
  }

  private readTag(): XmlStartToken | XmlEndToken {
    let quote: '"' | "'" | null = null;
    let end = -1;

    for (let index = this.cursor + 1; index < this.xml.length; index += 1) {
      const char = this.xml[index];
      if (quote) {
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        end = index;
        break;
      }
    }

    if (end < 0) throw new XmlSyntaxError('Unterminated XML tag.');
    const content = this.xml.slice(this.cursor + 1, end).trim();
    this.cursor = end + 1;
    if (!content) throw new XmlSyntaxError('Empty XML tag.');

    if (content.startsWith('/')) {
      const name = content.slice(1).trim();
      if (!/^[A-Za-z_][\w:.-]*$/.test(name)) {
        throw new XmlSyntaxError('Invalid XML closing tag.');
      }
      return { type: 'end', name: name.toLowerCase() };
    }

    const selfClosing = content.endsWith('/');
    const startContent = selfClosing ? content.slice(0, -1).trimEnd() : content;
    const nameMatch = startContent.match(/^([A-Za-z_][\w:.-]*)/);
    if (!nameMatch) throw new XmlSyntaxError('Invalid XML opening tag.');
    validateXmlAttributes(startContent.slice(nameMatch[1].length));
    return {
      type: 'start',
      name: nameMatch[1].toLowerCase(),
      selfClosing,
    };
  }
}

function readSimpleElement(reader: XmlTokenReader, start: XmlStartToken): string {
  if (start.selfClosing) return '';
  let value = '';

  while (true) {
    const token = reader.next();
    if (!token) throw new XmlSyntaxError(`Unterminated <${start.name}> element.`);
    if (token.type === 'text') {
      value += token.value;
      continue;
    }
    if (token.type === 'start') {
      throw new XmlSyntaxError(`Nested element inside <${start.name}>.`);
    }
    if (token.name !== start.name) {
      throw new XmlSyntaxError(`Mismatched closing tag for <${start.name}>.`);
    }
    return value.normalize('NFC').trim();
  }
}

function skipElement(reader: XmlTokenReader, start: XmlStartToken) {
  if (start.selfClosing) return;
  const stack = [start.name];

  while (stack.length) {
    const token = reader.next();
    if (!token) throw new XmlSyntaxError(`Unterminated <${start.name}> element.`);
    if (token.type === 'start' && !token.selfClosing) {
      stack.push(token.name);
    } else if (token.type === 'end') {
      const expected = stack.pop();
      if (expected !== token.name) {
        throw new XmlSyntaxError(`Mismatched closing tag for <${expected ?? start.name}>.`);
      }
    }
  }
}

function requireValueStart(reader: XmlTokenReader): XmlStartToken {
  const token = reader.nextSignificant();
  if (!token || token.type !== 'start') {
    throw new XmlSyntaxError('A plist key is missing its value.');
  }
  return token;
}

function nonNegativeInteger(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function boundedRating(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
}

function isoDate(value: string | undefined): string | null {
  const text = value?.normalize('NFC').trim() ?? '';
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function laterDate(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

function earlierDate(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

function normalizedTrackKey(track: Pick<MusicBeeTrackSnapshot, 'artist' | 'title' | 'album'>) {
  return [
    normalizeCatalogName(track.artist),
    normalizeCatalogName(track.title),
    normalizeCatalogName(track.album),
  ].join('\u0000');
}

const ALLOWED_TRACK_FIELDS = new Set([
  'Album',
  'Album Artist',
  'Artist',
  'Date Added',
  'Genre',
  'Name',
  'Play Count',
  'Play Date',
  'Play Date UTC',
  'Rating',
  'Skip Count',
  'Total Time',
]);

function parseTrackFields(fields: Map<string, string>): ParsedMusicBeeTrack | null {
  const artist = canonicalArtistName(fields.get('Artist') || fields.get('Album Artist') || '');
  const title = fields.get('Name') ?? '';
  if (!artist || !title) return null;

  const totalTime = nonNegativeInteger(fields.get('Total Time'));
  const lastPlayedAt = isoDate(fields.get('Play Date UTC') ?? fields.get('Play Date'));
  return {
    track: {
      artist,
      title,
      album: fields.get('Album') ?? '',
      genre: fields.get('Genre') ?? '',
      play_count: nonNegativeInteger(fields.get('Play Count')),
      skip_count: nonNegativeInteger(fields.get('Skip Count')),
      duration_ms: totalTime || null,
      rating: boundedRating(fields.get('Rating')),
      last_played_at: lastPlayedAt,
      date_added: isoDate(fields.get('Date Added')),
    },
    hasAggregatePlayCount: fields.has('Play Count'),
    hasLastPlayed: lastPlayedAt !== null,
  };
}

function parseTrackDictionary(reader: XmlTokenReader, start: XmlStartToken): ParsedMusicBeeTrack | null {
  if (start.name !== 'dict' || start.selfClosing) return null;
  const fields = new Map<string, string>();

  while (true) {
    const token = reader.nextSignificant();
    if (!token) throw new XmlSyntaxError('Unterminated track dictionary.');
    if (token.type === 'end') {
      if (token.name !== 'dict') throw new XmlSyntaxError('Mismatched track dictionary closing tag.');
      return parseTrackFields(fields);
    }
    if (token.type !== 'start' || token.name !== 'key') {
      throw new XmlSyntaxError('Track dictionary contains a value without a key.');
    }

    const key = readSimpleElement(reader, token);
    const valueStart = requireValueStart(reader);
    if (ALLOWED_TRACK_FIELDS.has(key)) {
      fields.set(key, readSimpleElement(reader, valueStart));
    } else {
      skipElement(reader, valueStart);
    }
  }
}

function parseTracksDictionary(reader: XmlTokenReader, start: XmlStartToken): ParsedMusicBeeTrack[] {
  if (start.name !== 'dict' || start.selfClosing) {
    throw new MusicBeeSnapshotError(
      'NOT_LIBRARY_XML',
      'The XML does not contain a MusicBee/iTunes Tracks dictionary.',
    );
  }

  const parsedRows: ParsedMusicBeeTrack[] = [];
  while (true) {
    const token = reader.nextSignificant();
    if (!token) throw new XmlSyntaxError('Unterminated Tracks dictionary.');
    if (token.type === 'end') {
      if (token.name !== 'dict') throw new XmlSyntaxError('Mismatched Tracks dictionary closing tag.');
      return parsedRows;
    }
    if (token.type !== 'start' || token.name !== 'key') {
      throw new XmlSyntaxError('Tracks dictionary contains a value without a key.');
    }

    readSimpleElement(reader, token);
    const valueStart = requireValueStart(reader);
    if (valueStart.name !== 'dict') {
      skipElement(reader, valueStart);
      continue;
    }
    const track = parseTrackDictionary(reader, valueStart);
    if (track) parsedRows.push(track);
  }
}

function parseRootDictionary(reader: XmlTokenReader, start: XmlStartToken): ParsedMusicBeeTrack[] {
  if (start.name !== 'dict' || start.selfClosing) {
    throw new MusicBeeSnapshotError(
      'NOT_LIBRARY_XML',
      'The XML does not contain an iTunes-style library dictionary.',
    );
  }

  let parsedRows: ParsedMusicBeeTrack[] | null = null;
  while (true) {
    const token = reader.nextSignificant();
    if (!token) throw new XmlSyntaxError('Unterminated library dictionary.');
    if (token.type === 'end') {
      if (token.name !== 'dict') throw new XmlSyntaxError('Mismatched library dictionary closing tag.');
      break;
    }
    if (token.type !== 'start' || token.name !== 'key') {
      throw new XmlSyntaxError('Library dictionary contains a value without a key.');
    }

    const key = readSimpleElement(reader, token);
    const valueStart = requireValueStart(reader);
    if (key === 'Tracks') {
      parsedRows = parseTracksDictionary(reader, valueStart);
    } else {
      skipElement(reader, valueStart);
    }
  }

  if (parsedRows === null) {
    throw new MusicBeeSnapshotError(
      'NOT_LIBRARY_XML',
      'The XML does not contain a MusicBee/iTunes Tracks dictionary.',
    );
  }
  return parsedRows;
}

function parseMusicBeeTrackRows(xmlText: string): ParsedMusicBeeTrack[] {
  const reader = new XmlTokenReader(xmlText);
  const plistStart = reader.nextSignificant();
  if (!plistStart || plistStart.type !== 'start' || plistStart.name !== 'plist' || plistStart.selfClosing) {
    throw new MusicBeeSnapshotError(
      'NOT_LIBRARY_XML',
      'The XML does not contain an iTunes-style library dictionary.',
    );
  }

  const rootStart = reader.nextSignificant();
  if (!rootStart || rootStart.type !== 'start') {
    throw new MusicBeeSnapshotError(
      'NOT_LIBRARY_XML',
      'The XML does not contain an iTunes-style library dictionary.',
    );
  }
  const parsedRows = parseRootDictionary(reader, rootStart);

  const plistEnd = reader.nextSignificant();
  if (!plistEnd || plistEnd.type !== 'end' || plistEnd.name !== 'plist') {
    throw new XmlSyntaxError('The plist root is not closed correctly.');
  }
  if (reader.nextSignificant() !== null) {
    throw new XmlSyntaxError('Unexpected content after the plist root.');
  }
  return parsedRows;
}

function mergeDuplicateTrack(
  existing: MusicBeeTrackSnapshot,
  incoming: MusicBeeTrackSnapshot,
): MusicBeeTrackSnapshot {
  return {
    ...existing,
    genre: existing.genre || incoming.genre,
    play_count: existing.play_count + incoming.play_count,
    skip_count: existing.skip_count + incoming.skip_count,
    duration_ms: existing.duration_ms ?? incoming.duration_ms,
    rating: Math.max(existing.rating ?? 0, incoming.rating ?? 0) || null,
    last_played_at: laterDate(existing.last_played_at, incoming.last_played_at),
    date_added: earlierDate(existing.date_added, incoming.date_added),
  };
}

function buildArtistSnapshots(tracks: MusicBeeTrackSnapshot[]): MusicBeeArtistSnapshot[] {
  const artists = new Map<string, {
    name: string;
    tracks: number;
    albums: Set<string>;
    plays: number;
    skips: number;
    lastPlayed: string | null;
    genres: Set<string>;
  }>();

  for (const track of tracks) {
    const key = normalizeCatalogName(track.artist);
    const current = artists.get(key) ?? {
      name: track.artist,
      tracks: 0,
      albums: new Set<string>(),
      plays: 0,
      skips: 0,
      lastPlayed: null,
      genres: new Set<string>(),
    };
    current.tracks += 1;
    if (track.album) current.albums.add(normalizeCatalogName(track.album));
    if (track.genre) current.genres.add(track.genre);
    current.plays += track.play_count;
    current.skips += track.skip_count;
    current.lastPlayed = laterDate(current.lastPlayed, track.last_played_at);
    artists.set(key, current);
  }

  return [...artists.values()]
    .map(artist => ({
      name: artist.name,
      track_count: artist.tracks,
      album_count: artist.albums.size,
      total_play_count: artist.plays,
      total_skip_count: artist.skips,
      last_played_at: artist.lastPlayed,
      genres: [...artist.genres].sort((left, right) => left.localeCompare(right)).slice(0, 12),
    }))
    .sort((left, right) => right.total_play_count - left.total_play_count || left.name.localeCompare(right.name));
}

function buildAlbumSnapshots(tracks: MusicBeeTrackSnapshot[]): MusicBeeAlbumSnapshot[] {
  const albums = new Map<string, MusicBeeAlbumSnapshot>();
  for (const track of tracks) {
    if (!track.album) continue;
    const key = `${normalizeCatalogName(track.artist)}\u0000${normalizeCatalogName(track.album)}`;
    const current = albums.get(key) ?? {
      artist: track.artist,
      title: track.album,
      track_count: 0,
      total_play_count: 0,
    };
    current.track_count += 1;
    current.total_play_count += track.play_count;
    albums.set(key, current);
  }

  return [...albums.values()]
    .sort((left, right) => right.total_play_count - left.total_play_count
      || left.artist.localeCompare(right.artist)
      || left.title.localeCompare(right.title));
}

export function parseMusicBeeLibraryXml(xmlText: string): MusicBeeLibrarySnapshot {
  if (xmlText.length > MAX_XML_CHARACTERS) {
    throw new MusicBeeSnapshotError('FILE_TOO_LARGE', 'MusicBee XML exceeds the safe local parser limit.');
  }
  let parsedRows: ParsedMusicBeeTrack[];
  try {
    parsedRows = parseMusicBeeTrackRows(xmlText);
  } catch (error) {
    if (error instanceof MusicBeeSnapshotError) throw error;
    throw new MusicBeeSnapshotError('INVALID_XML', 'MusicBee XML is malformed.');
  }
  const libraryItems = parsedRows.map(row => row.track);
  if (!libraryItems.length) {
    throw new MusicBeeSnapshotError('NO_TRACKS', 'The MusicBee/iTunes XML contains no usable artist and track rows.');
  }

  const uniqueTracks = new Map<string, MusicBeeTrackSnapshot>();
  for (const track of libraryItems) {
    const key = normalizedTrackKey(track);
    const existing = uniqueTracks.get(key);
    uniqueTracks.set(key, existing ? mergeDuplicateTrack(existing, track) : track);
  }

  const tracks = [...uniqueTracks.values()]
    .sort((left, right) => right.play_count - left.play_count
      || left.artist.localeCompare(right.artist)
      || left.title.localeCompare(right.title));
  const artists = buildArtistSnapshots(tracks);
  const albums = buildAlbumSnapshots(tracks);

  return {
    schema_version: 1,
    source: 'musicbee_itunes_xml',
    library_item_count: libraryItems.length,
    track_count: tracks.length,
    duplicate_item_count: libraryItems.length - tracks.length,
    artist_count: artists.length,
    album_count: albums.length,
    played_track_count: tracks.filter(track => track.play_count > 0).length,
    rated_track_count: tracks.filter(track => track.rating !== null && track.rating > 0).length,
    total_play_count: tracks.reduce((sum, track) => sum + track.play_count, 0),
    total_skip_count: tracks.reduce((sum, track) => sum + track.skip_count, 0),
    latest_played_at: tracks.reduce<string | null>(
      (latest, track) => laterDate(latest, track.last_played_at),
      null,
    ),
    tracks,
    artists,
    albums,
    capabilities: {
      catalog: true,
      aggregate_play_counts: parsedRows.some(row => row.hasAggregatePlayCount),
      last_played: parsedRows.some(row => row.hasLastPlayed),
      exact_event_timeline: false,
      sessions: false,
    },
    limitations: [
      'aggregate_counts_not_timeline',
      'separate_source_totals',
      'paths_and_ids_discarded',
    ],
  };
}
