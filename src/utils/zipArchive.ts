import {
  unzip,
  type UnzipFileFilter,
  type UnzipFileInfo,
  type Unzipped,
} from 'fflate';

/**
 * Browser-memory safety boundary for visitor imports. Callers may tighten these
 * values for constrained devices or tests, but can never raise them.
 */
export interface ImportBudget {
  maxCompressedBytes: number;
  maxEntries: number;
  maxEntryBytes: number;
  maxExpandedBytes: number;
  maxCompressionRatio: number;
}

export const ZIP_IMPORT_LIMITS: Readonly<ImportBudget> = Object.freeze({
  maxCompressedBytes: 104_857_600,
  maxEntries: 128,
  maxEntryBytes: 67_108_864,
  maxExpandedBytes: 134_217_728,
  maxCompressionRatio: 100,
});

export type ZipArchiveErrorCode =
  | 'ARCHIVE_TOO_LARGE'
  | 'TOO_MANY_ENTRIES'
  | 'ENTRY_TOO_LARGE'
  | 'EXPANDED_TOO_LARGE'
  | 'COMPRESSION_RATIO_TOO_HIGH'
  | 'DUPLICATE_FLATTENED_NAME';

export class ZipArchiveError extends Error {
  readonly code: ZipArchiveErrorCode;
  readonly archiveName?: string;
  readonly entryName?: string;

  constructor(
    code: ZipArchiveErrorCode,
    options: { archiveName?: string; entryName?: string } = {},
  ) {
    super(code);
    this.name = 'ZipArchiveError';
    this.code = code;
    this.archiveName = options.archiveName;
    this.entryName = options.entryName;
  }
}

export interface ExpandZipOptions {
  signal?: AbortSignal;
  /** Safety limits may only be tightened; values above the defaults are clamped. */
  limits?: Partial<ImportBudget>;
}

/**
 * Expands dropped .zip archives into the files they contain, so the rest of the
 * import pipeline never has to know a zip was involved.
 *
 * Spotify exports can include account, payment, inference and search-history
 * files next to listening history. Nova first inspects the ZIP directory with
 * every entry filtered out, validates the complete archive, and only then runs
 * a second pass that inflates the approved music-history entries.
 */

/** Extensions the import pipeline knows how to parse. */
const IMPORTABLE = ['.csv', '.json', '.html', '.htm', '.xml'];

/** Sensitive or unrelated provider files that Nova deliberately ignores. */
const EXCLUDED_NAME_PATTERNS = [
  /identity/i,
  /payments?/i,
  /userdata/i,
  /inferences/i,
  /searchqueries/i,
  /follow(ers|ing)?\.json$/i,
  /marquee/i,
];

function baseName(path: string): string {
  const parts = path.replaceAll('\\', '/').split('/');
  return parts[parts.length - 1] ?? path;
}

function normalizedFlatName(path: string): string {
  return baseName(path).normalize('NFC').trim().toLocaleLowerCase('en-US');
}

function hasImportableExtension(path: string): boolean {
  const lower = baseName(path).toLowerCase();
  return IMPORTABLE.some(extension => lower.endsWith(extension));
}

/** Skips directories, resource forks, unsupported files and sensitive exports. */
function isImportableArchiveEntry(path: string): boolean {
  const normalizedPath = path.replaceAll('\\', '/');
  if (normalizedPath.endsWith('/')) return false;
  const name = baseName(normalizedPath);
  if (normalizedPath.startsWith('__MACOSX/') || name.startsWith('._')) return false;
  if (!name || !hasImportableExtension(name)) return false;
  return !EXCLUDED_NAME_PATTERNS.some(pattern => pattern.test(name.toLowerCase()));
}

function positiveTightenedLimit(value: number | undefined, ceiling: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return ceiling;
  return Math.min(value, ceiling);
}

function resolveLimits(overrides?: Partial<ImportBudget>): ImportBudget {
  return {
    maxCompressedBytes: Math.floor(positiveTightenedLimit(
      overrides?.maxCompressedBytes,
      ZIP_IMPORT_LIMITS.maxCompressedBytes,
    )),
    maxEntries: Math.floor(positiveTightenedLimit(
      overrides?.maxEntries,
      ZIP_IMPORT_LIMITS.maxEntries,
    )),
    maxEntryBytes: Math.floor(positiveTightenedLimit(
      overrides?.maxEntryBytes,
      ZIP_IMPORT_LIMITS.maxEntryBytes,
    )),
    maxExpandedBytes: Math.floor(positiveTightenedLimit(
      overrides?.maxExpandedBytes,
      ZIP_IMPORT_LIMITS.maxExpandedBytes,
    )),
    maxCompressionRatio: positiveTightenedLimit(
      overrides?.maxCompressionRatio,
      ZIP_IMPORT_LIMITS.maxCompressionRatio,
    ),
  };
}

function abortError(): Error {
  const error = new Error('Import cancelled.');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function arrayBufferWithAbort(file: File, signal?: AbortSignal): Promise<ArrayBuffer> {
  throwIfAborted(signal);
  if (!signal) return file.arrayBuffer();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(abortError()));
    signal.addEventListener('abort', onAbort, { once: true });

    void file.arrayBuffer().then(
      value => finish(() => resolve(value)),
      error => finish(() => reject(error)),
    );
    if (signal.aborted) onAbort();
  });
}

function unzipAsync(
  bytes: Uint8Array,
  filter: UnzipFileFilter,
  signal?: AbortSignal,
): Promise<Unzipped> {
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    let settled = false;
    let terminate: (() => void) | undefined;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => {
      try {
        terminate?.();
      } finally {
        finish(() => reject(abortError()));
      }
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      terminate = unzip(bytes, { filter }, (error, unzipped) => {
        if (error) finish(() => reject(error));
        else finish(() => resolve(unzipped));
      });
    } catch (error) {
      finish(() => reject(error));
    }
    if (signal?.aborted) onAbort();
  });
}

interface InspectedArchive {
  bytes: Uint8Array;
  entries: UnzipFileInfo[];
}

async function inspectArchive(file: File, signal?: AbortSignal): Promise<InspectedArchive> {
  const bytes = new Uint8Array(await arrayBufferWithAbort(file, signal));
  const entries: UnzipFileInfo[] = [];

  // First pass: collect the entire central directory while refusing every
  // entry. No payload is inflated until the whole archive has passed review.
  await unzipAsync(bytes, entry => {
    entries.push({ ...entry });
    return false;
  }, signal);

  return { bytes, entries };
}

export interface ZipExpansion {
  /** Loose files plus everything importable recovered from the archives. */
  files: File[];
  /** Archives that opened but held nothing this app can read. */
  emptyArchives: string[];
  /** Archives that could not be opened at all. */
  unreadableArchives: string[];
}

/**
 * Returns the original list with every .zip replaced by approved entries.
 * Nested folders are flattened only after duplicate names have been rejected.
 * Nothing touches the network; all work remains inside the browser.
 */
export async function expandZipArchives(
  input: File[],
  options: ExpandZipOptions = {},
): Promise<ZipExpansion> {
  const { signal } = options;
  const limits = resolveLimits(options.limits);
  const files: File[] = [];
  const emptyArchives: string[] = [];
  const unreadableArchives: string[] = [];
  const seenFlatNames = new Set<string>();
  let approvedFileCount = 0;
  let expandedBytes = 0;

  // Preflight every loose file that the parser would read before opening any
  // archive. Unsupported loose files remain available to the caller's normal
  // “no supported files” handling but do not consume the text-memory budget.
  for (const file of input) {
    if (file.name.toLowerCase().endsWith('.zip') || !hasImportableExtension(file.name)) continue;
    approvedFileCount += 1;
    if (approvedFileCount > limits.maxEntries) {
      throw new ZipArchiveError('TOO_MANY_ENTRIES', { entryName: file.name });
    }
    if (file.size > limits.maxEntryBytes) {
      throw new ZipArchiveError('ENTRY_TOO_LARGE', { entryName: file.name });
    }
    expandedBytes += file.size;
    if (expandedBytes > limits.maxExpandedBytes) {
      throw new ZipArchiveError('EXPANDED_TOO_LARGE', { entryName: file.name });
    }
    const flatName = normalizedFlatName(file.name);
    if (seenFlatNames.has(flatName)) {
      throw new ZipArchiveError('DUPLICATE_FLATTENED_NAME', { entryName: file.name });
    }
    seenFlatNames.add(flatName);
  }

  for (const file of input) {
    throwIfAborted(signal);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      files.push(file);
      continue;
    }
    if (file.size > limits.maxCompressedBytes) {
      throw new ZipArchiveError('ARCHIVE_TOO_LARGE', { archiveName: file.name });
    }

    let inspected: InspectedArchive;
    try {
      inspected = await inspectArchive(file, signal);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      unreadableArchives.push(file.name);
      continue;
    }

    if (inspected.entries.length > limits.maxEntries) {
      throw new ZipArchiveError('TOO_MANY_ENTRIES', { archiveName: file.name });
    }

    const approvedPaths = new Set<string>();
    const archiveFlatNames = new Set<string>();
    let archiveApprovedCount = 0;
    let archiveExpandedBytes = 0;

    for (const entry of inspected.entries) {
      // This check deliberately precedes every size/ratio check: excluded and
      // incompatible payloads never become extraction candidates.
      if (!isImportableArchiveEntry(entry.name)) continue;

      if (entry.originalSize > limits.maxEntryBytes) {
        throw new ZipArchiveError('ENTRY_TOO_LARGE', {
          archiveName: file.name,
          entryName: entry.name,
        });
      }
      const compressionRatio = entry.originalSize === 0
        ? 0
        : entry.originalSize / Math.max(1, entry.size);
      if (compressionRatio > limits.maxCompressionRatio) {
        throw new ZipArchiveError('COMPRESSION_RATIO_TOO_HIGH', {
          archiveName: file.name,
          entryName: entry.name,
        });
      }

      const flatName = normalizedFlatName(entry.name);
      if (archiveFlatNames.has(flatName) || seenFlatNames.has(flatName)) {
        throw new ZipArchiveError('DUPLICATE_FLATTENED_NAME', {
          archiveName: file.name,
          entryName: entry.name,
        });
      }
      archiveFlatNames.add(flatName);
      archiveApprovedCount += 1;
      if (approvedFileCount + archiveApprovedCount > limits.maxEntries) {
        throw new ZipArchiveError('TOO_MANY_ENTRIES', {
          archiveName: file.name,
          entryName: entry.name,
        });
      }
      archiveExpandedBytes += entry.originalSize;
      if (expandedBytes + archiveExpandedBytes > limits.maxExpandedBytes) {
        throw new ZipArchiveError('EXPANDED_TOO_LARGE', {
          archiveName: file.name,
          entryName: entry.name,
        });
      }
      approvedPaths.add(entry.name);
    }

    if (approvedPaths.size === 0) {
      emptyArchives.push(file.name);
      continue;
    }

    let unzipped: Unzipped;
    try {
      // Second pass: now and only now may approved payloads be inflated.
      unzipped = await unzipAsync(
        inspected.bytes,
        entry => approvedPaths.has(entry.name),
        signal,
      );
      throwIfAborted(signal);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      unreadableArchives.push(file.name);
      continue;
    }

    let recovered = 0;
    for (const [path, bytes] of Object.entries(unzipped)) {
      throwIfAborted(signal);
      if (!approvedPaths.has(path)) continue;
      files.push(new File([bytes as BlobPart], baseName(path)));
      recovered += 1;
    }

    if (recovered === 0) {
      emptyArchives.push(file.name);
      continue;
    }

    approvedFileCount += archiveApprovedCount;
    expandedBytes += archiveExpandedBytes;
    archiveFlatNames.forEach(name => seenFlatNames.add(name));
  }

  return { files, emptyArchives, unreadableArchives };
}
