import type { MusicBeeLibrarySnapshot } from '../types';
import {
  MAX_MUSICBEE_XML_BYTES,
  MusicBeeSnapshotError,
  type MusicBeeSnapshotErrorCode,
} from './musicBeeSnapshot';

interface MusicBeeWorkerSuccess {
  ok: true;
  snapshot: MusicBeeLibrarySnapshot;
}

interface MusicBeeWorkerFailure {
  ok: false;
  error: {
    code: MusicBeeSnapshotErrorCode;
    message: string;
  };
}

export type MusicBeeWorkerResponse = MusicBeeWorkerSuccess | MusicBeeWorkerFailure;

export interface MusicBeeWorkerLike {
  onmessage: ((event: MessageEvent<MusicBeeWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage: (message: { file: File }) => void;
  terminate: () => void;
}

export type MusicBeeWorkerFactory = () => MusicBeeWorkerLike;

export interface MusicBeeWorkerOptions {
  signal?: AbortSignal;
  workerFactory?: MusicBeeWorkerFactory;
}

const MUSICBEE_ERROR_CODES = new Set<MusicBeeSnapshotErrorCode>([
  'FILE_TOO_LARGE',
  'INVALID_XML',
  'NOT_LIBRARY_XML',
  'NO_TRACKS',
]);

function defaultWorkerFactory(): MusicBeeWorkerLike {
  return new Worker(
    new URL('../workers/musicBeeImport.worker.ts', import.meta.url),
    { type: 'module', name: 'nova-musicbee-import' },
  );
}

function abortError(): Error {
  const error = new Error('MusicBee import was canceled.');
  error.name = 'AbortError';
  return error;
}

function isWorkerResponse(value: unknown): value is MusicBeeWorkerResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<MusicBeeWorkerResponse>;
  if (response.ok === true) return Boolean(response.snapshot);
  if (response.ok !== false || !response.error || typeof response.error !== 'object') return false;
  return typeof response.error.message === 'string'
    && typeof response.error.code === 'string'
    && MUSICBEE_ERROR_CODES.has(response.error.code as MusicBeeSnapshotErrorCode);
}

export function parseMusicBeeFileInWorker(
  file: File,
  options: MusicBeeWorkerOptions = {},
): Promise<MusicBeeLibrarySnapshot> {
  if (file.size > MAX_MUSICBEE_XML_BYTES) {
    return Promise.reject(new MusicBeeSnapshotError(
      'FILE_TOO_LARGE',
      'MusicBee XML exceeds the safe browser parsing limit.',
    ));
  }
  if (options.signal?.aborted) return Promise.reject(abortError());

  return new Promise((resolve, reject) => {
    const worker = (options.workerFactory ?? defaultWorkerFactory)();
    let settled = false;

    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      options.signal?.removeEventListener('abort', handleAbort);
      worker.terminate();
    };
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleAbort = () => settle(() => reject(abortError()));

    worker.onmessage = event => {
      const response = event.data;
      if (!isWorkerResponse(response)) {
        settle(() => reject(new MusicBeeSnapshotError(
          'INVALID_XML',
          'MusicBee background parser returned an invalid response.',
        )));
        return;
      }
      if (response.ok === true) {
        settle(() => resolve(response.snapshot));
        return;
      }
      settle(() => reject(new MusicBeeSnapshotError(
        response.error.code,
        response.error.message,
      )));
    };
    worker.onerror = event => {
      event.preventDefault();
      settle(() => reject(new MusicBeeSnapshotError(
        'INVALID_XML',
        'MusicBee background parsing failed.',
      )));
    };
    options.signal?.addEventListener('abort', handleAbort, { once: true });
    try {
      worker.postMessage({ file });
    } catch {
      settle(() => reject(new MusicBeeSnapshotError(
        'INVALID_XML',
        'MusicBee background parsing could not start.',
      )));
    }
  });
}
