import { unzip, type Unzipped } from 'fflate';

/**
 * Expands dropped .zip archives into the files they contain, so the rest of the
 * import pipeline never has to know a zip was involved.
 *
 * This exists because of one very ordinary fact: Spotify hands you a .zip. Every
 * other supported export is a loose file, but the one export most people
 * actually have arrives compressed - and unzipping it on a phone means
 * installing a separate app. Requiring that was quietly turning "import your own
 * music" into something only a desktop user could finish.
 *
 * Only entries the importer can actually read are returned. A Spotify archive
 * also carries account, payment, inference and search-history files that are
 * none of our business, so they are never even decoded to text.
 */

/** Extensions the import pipeline knows how to parse. */
const IMPORTABLE = ['.csv', '.json', '.html', '.htm', '.xml'];

/**
 * Entries that are readable but that we deliberately skip. Spotify's account
 * export bundles identity, payment and inference data next to the listening
 * history; pulling it into memory would be careless when nothing consumes it.
 */
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
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

/** Skips directories, macOS resource forks and anything the parser cannot read. */
function isImportableEntry(path: string): boolean {
  if (path.endsWith('/')) return false;
  const name = baseName(path);
  // Zips made on macOS carry a __MACOSX/ shadow tree of ._ prefixed forks.
  if (path.startsWith('__MACOSX/') || name.startsWith('._')) return false;
  if (!name) return false;
  const lower = name.toLowerCase();
  if (!IMPORTABLE.some(extension => lower.endsWith(extension))) return false;
  return !EXCLUDED_NAME_PATTERNS.some(pattern => pattern.test(lower));
}

function unzipAsync(bytes: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (error, unzipped) => {
      if (error) reject(error);
      else resolve(unzipped);
    });
  });
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
 * Returns the original list with every .zip replaced by its importable entries.
 * Nested folders are flattened; a Spotify export keeps its JSON a few levels
 * down and the user should not have to care.
 *
 * Nothing here touches the network - the archive is decoded in the browser and
 * never leaves the device.
 */
export async function expandZipArchives(input: File[]): Promise<ZipExpansion> {
  const files: File[] = [];
  const emptyArchives: string[] = [];
  const unreadableArchives: string[] = [];

  for (const file of input) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      files.push(file);
      continue;
    }

    let unzipped: Unzipped;
    try {
      unzipped = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
    } catch {
      // An unreadable archive is reported, never silently dropped: a visitor who
      // uploaded the wrong thing deserves to be told which file failed.
      unreadableArchives.push(file.name);
      continue;
    }

    let recovered = 0;
    for (const [path, bytes] of Object.entries(unzipped)) {
      if (!isImportableEntry(path)) continue;
      // Flatten: the parser keys off the file name, not the folder it sat in.
      files.push(new File([bytes as BlobPart], baseName(path)));
      recovered += 1;
    }
    if (recovered === 0) emptyArchives.push(file.name);
  }

  return { files, emptyArchives, unreadableArchives };
}
