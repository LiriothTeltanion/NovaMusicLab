import { describe, expect, it, vi } from 'vitest';

import type { MusicBeeLibrarySnapshot } from '../types';
import { MAX_MUSICBEE_XML_BYTES, MusicBeeSnapshotError } from './musicBeeSnapshot';
import {
  parseMusicBeeFileInWorker,
  type MusicBeeWorkerLike,
  type MusicBeeWorkerResponse,
} from './musicBeeWorkerClient';

const snapshot = {
  schema_version: 1,
  source: 'musicbee_itunes_xml',
  library_item_count: 1,
  track_count: 1,
  duplicate_item_count: 0,
  artist_count: 1,
  album_count: 1,
  played_track_count: 1,
  rated_track_count: 0,
  total_play_count: 2,
  total_skip_count: 0,
  latest_played_at: null,
  tracks: [],
  artists: [],
  albums: [],
  capabilities: {
    catalog: true,
    aggregate_play_counts: true,
    last_played: false,
    exact_event_timeline: false,
    sessions: false,
  },
  limitations: [
    'aggregate_counts_not_timeline',
    'separate_source_totals',
    'paths_and_ids_discarded',
  ],
} satisfies MusicBeeLibrarySnapshot;

class FakeWorker implements MusicBeeWorkerLike {
  onmessage: ((event: MessageEvent<MusicBeeWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  respond(response: MusicBeeWorkerResponse) {
    this.onmessage?.({ data: response } as MessageEvent<MusicBeeWorkerResponse>);
  }
}

describe('parseMusicBeeFileInWorker', () => {
  it('resolves the sanitized snapshot and terminates its one-shot worker', async () => {
    const worker = new FakeWorker();
    const file = new File(['<plist/>'], 'MusicBeeLibrary.xml', { type: 'application/xml' });
    const pending = parseMusicBeeFileInWorker(file, { workerFactory: () => worker });

    expect(worker.postMessage).toHaveBeenCalledWith({ file });
    worker.respond({ ok: true, snapshot });

    await expect(pending).resolves.toBe(snapshot);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.onmessage).toBeNull();
    expect(worker.onerror).toBeNull();
  });

  it('terminates the worker and rejects with AbortError when canceled', async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    const file = new File(['<plist/>'], 'MusicBeeLibrary.xml', { type: 'application/xml' });
    const pending = parseMusicBeeFileInWorker(file, {
      signal: controller.signal,
      workerFactory: () => worker,
    });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.onmessage).toBeNull();
  });

  it('reconstructs stable parser errors returned by the worker', async () => {
    const worker = new FakeWorker();
    const file = new File(['not xml'], 'MusicBeeLibrary.xml', { type: 'application/xml' });
    const pending = parseMusicBeeFileInWorker(file, { workerFactory: () => worker });

    worker.respond({
      ok: false,
      error: {
        code: 'NOT_LIBRARY_XML',
        message: 'Not a library.',
      },
    });

    await expect(pending).rejects.toEqual(expect.objectContaining({
      name: 'MusicBeeSnapshotError',
      code: 'NOT_LIBRARY_XML',
      message: 'Not a library.',
    }));
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('terminates the worker if browser message delivery cannot start', async () => {
    const worker = new FakeWorker();
    worker.postMessage.mockImplementation(() => {
      throw new DOMException('Clone failed', 'DataCloneError');
    });
    const file = new File(['<plist/>'], 'MusicBeeLibrary.xml', { type: 'application/xml' });

    await expect(parseMusicBeeFileInWorker(file, { workerFactory: () => worker }))
      .rejects.toEqual(expect.objectContaining({
        name: 'MusicBeeSnapshotError',
        code: 'INVALID_XML',
      }));
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('rejects the 50 MB boundary before constructing a worker', async () => {
    const factory = vi.fn(() => new FakeWorker());
    const file = new File(['small'], 'oversized.xml', { type: 'application/xml' });
    Object.defineProperty(file, 'size', {
      configurable: true,
      value: MAX_MUSICBEE_XML_BYTES + 1,
    });

    await expect(parseMusicBeeFileInWorker(file, { workerFactory: factory }))
      .rejects.toEqual(expect.objectContaining({
        name: 'MusicBeeSnapshotError',
        code: 'FILE_TOO_LARGE',
      } satisfies Partial<MusicBeeSnapshotError>));
    expect(factory).not.toHaveBeenCalled();
  });
});
