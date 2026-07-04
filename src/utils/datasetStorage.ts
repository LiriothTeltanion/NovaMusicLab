import type { MusicDnaData } from '../types';

/**
 * Local persistence for uploaded datasets via IndexedDB, so a user's own
 * museum survives page reloads without ever leaving their machine. All
 * operations degrade to no-ops when IndexedDB is unavailable (SSR, tests,
 * ancient browsers) - the app then simply falls back to the bundled archive.
 */

const DB_NAME = 'nova-music-lab';
const DB_VERSION = 1;
const STORE = 'datasets';
const ACTIVE_KEY = 'active';

export interface StoredDataset {
  data: MusicDnaData;
  savedAt: string;       // ISO date
  sourceLabel: string;   // e.g. "Last.fm CSV + Spotify History JSON"
}

/** Wrapper shape for portable JSON exports (distinguishes them from raw Spotify exports). */
export interface NovaMusicExport {
  nova_music_export: true;
  version: 1;
  exported_at: string;
  source_label: string;
  data: MusicDnaData;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function saveDataset(data: MusicDnaData, sourceLabel: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const record: StoredDataset = { data, savedAt: new Date().toISOString(), sourceLabel };
      tx.objectStore(STORE).put(record, ACTIVE_KEY);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function loadDataset(): Promise<StoredDataset | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(ACTIVE_KEY);
      req.onsuccess = () => {
        db.close();
        const rec = req.result as StoredDataset | undefined;
        resolve(rec && rec.data && rec.data.core_metrics ? rec : null);
      };
      req.onerror = () => { db.close(); resolve(null); };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function clearDataset(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(ACTIVE_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch {
      db.close();
      resolve();
    }
  });
}

/** Serialize the active dataset into the portable export wrapper. */
export function buildExport(data: MusicDnaData, sourceLabel: string): NovaMusicExport {
  return {
    nova_music_export: true,
    version: 1,
    exported_at: new Date().toISOString(),
    source_label: sourceLabel,
    data,
  };
}

/**
 * Recognize and unwrap a portable export. Returns null if the parsed JSON is
 * anything else (e.g. a raw Spotify Extended Streaming History array), so the
 * uploader can fall through to its normal source parsers.
 */
export function parseExport(parsed: unknown): NovaMusicExport | null {
  if (
    typeof parsed === 'object' && parsed !== null &&
    (parsed as NovaMusicExport).nova_music_export === true &&
    typeof (parsed as NovaMusicExport).data === 'object' &&
    (parsed as NovaMusicExport).data !== null &&
    'core_metrics' in (parsed as NovaMusicExport).data
  ) {
    return parsed as NovaMusicExport;
  }
  return null;
}

/** Trigger a browser download of the portable export file. */
export function downloadExport(data: MusicDnaData, sourceLabel: string): void {
  const payload = JSON.stringify(buildExport(data, sourceLabel), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nova-music-lab-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
