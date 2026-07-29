import {
  MAX_MUSICBEE_XML_BYTES,
  MusicBeeSnapshotError,
  parseMusicBeeLibraryXml,
  type MusicBeeSnapshotErrorCode,
} from '../utils/musicBeeSnapshot';
import type { MusicBeeWorkerResponse } from '../utils/musicBeeWorkerClient';

interface MusicBeeWorkerRequest {
  file: File;
}

interface MusicBeeWorkerScope {
  onmessage: ((event: MessageEvent<MusicBeeWorkerRequest>) => void) | null;
  postMessage: (message: MusicBeeWorkerResponse) => void;
}

const workerScope = self as unknown as MusicBeeWorkerScope;

function safeFailure(error: unknown): MusicBeeWorkerResponse {
  if (error instanceof MusicBeeSnapshotError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    ok: false,
    error: {
      code: 'INVALID_XML' satisfies MusicBeeSnapshotErrorCode,
      message: 'MusicBee background parsing failed.',
    },
  };
}

workerScope.onmessage = event => {
  void (async () => {
    try {
      const { file } = event.data;
      if (!(file instanceof File)) {
        throw new MusicBeeSnapshotError('INVALID_XML', 'MusicBee import did not receive a file.');
      }
      if (file.size > MAX_MUSICBEE_XML_BYTES) {
        throw new MusicBeeSnapshotError(
          'FILE_TOO_LARGE',
          'MusicBee XML exceeds the safe browser parsing limit.',
        );
      }

      const xmlText = await file.text();
      workerScope.postMessage({
        ok: true,
        snapshot: parseMusicBeeLibraryXml(xmlText),
      });
    } catch (error) {
      workerScope.postMessage(safeFailure(error));
    }
  })();
};

export {};
