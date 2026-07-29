import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataUploader, {
  type DatasetOperationCoordinator,
  type DatasetOperationToken,
} from './DataUploader';
import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import { localeFor, type Lang } from '../utils/i18n';
import {
  MAX_MUSICBEE_XML_BYTES,
  MusicBeeSnapshotError,
  parseMusicBeeLibraryXml,
} from '../utils/musicBeeSnapshot';

class TestMusicBeeWorker {
  static holdResponses = false;
  static instances: TestMusicBeeWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor() {
    TestMusicBeeWorker.instances.push(this);
  }

  postMessage({ file }: { file: File }) {
    if (TestMusicBeeWorker.holdResponses) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (this.terminated) return;
      try {
        const snapshot = parseMusicBeeLibraryXml(String(reader.result ?? ''));
        this.onmessage?.({ data: { ok: true, snapshot } } as MessageEvent);
      } catch (error) {
        const parserError = error instanceof MusicBeeSnapshotError
          ? error
          : new MusicBeeSnapshotError('INVALID_XML', 'Test worker parsing failed.');
        this.onmessage?.({
          data: {
            ok: false,
            error: { code: parserError.code, message: parserError.message },
          },
        } as MessageEvent);
      }
    };
    reader.onerror = () => {
      if (!this.terminated) this.onerror?.(new ErrorEvent('error'));
    };
    reader.readAsText(file);
  }

  terminate() {
    this.terminated = true;
  }
}

function createOperationCoordinator(): DatasetOperationCoordinator {
  let nextId = 0;
  const coordinator: DatasetOperationCoordinator = {
    active: null,
    acquire(kind) {
      if (coordinator.active) return null;
      const operation: DatasetOperationToken = { id: ++nextId, kind };
      coordinator.active = operation;
      return operation;
    },
    isCurrent(operation) {
      return coordinator.active?.id === operation.id && coordinator.active.kind === operation.kind;
    },
    release(operation) {
      if (coordinator.isCurrent(operation)) coordinator.active = null;
    },
  };
  return coordinator;
}

const baseProps = {
  currentData: defaultMusicData as unknown as MusicDnaData,
  storedMeta: null,
  onClearStored: vi.fn(),
  operationCoordinator: createOperationCoordinator(),
};

function listenBrainzFile(name: string, trackName = 'In Blur') {
  return new File([JSON.stringify([{
    listened_at: 1770000000,
    track_metadata: {
      artist_name: 'Deafheaven',
      track_name: trackName,
      release_name: 'Infinite Granite',
    },
  }])], name, { type: 'application/json' });
}

function musicBeeXmlFile(name = 'MusicBeeLibrary.xml') {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <plist version="1.0">
      <dict>
        <key>Tracks</key>
        <dict>
          <key>1</key>
          <dict>
            <key>Track ID</key><integer>1</integer>
            <key>Name</key><string>Archive Track</string>
            <key>Artist</key><string>Archive Artist</string>
            <key>Album</key><string>Archive Album</string>
            <key>Genre</key><string>Progressive Metal</string>
            <key>Play Count</key><integer>7</integer>
            <key>Rating</key><integer>80</integer>
            <key>Play Date UTC</key><date>2026-07-20T18:00:00Z</date>
            <key>Location</key><string>file://localhost/C:/Users/listener/Music/private.flac</string>
            <key>Persistent ID</key><string>PRIVATE-LIBRARY-ID</string>
          </dict>
        </dict>
      </dict>
    </plist>`;
  return new File([xml], name, { type: 'application/xml' });
}

// STRINGS itself isn't exported from AppContext.tsx, so the expected copy is
// mirrored here from the es/en `uploader` blocks to keep assertions exact.
const STRINGS = {
  es: {
    uploader: {
      title: 'Sube tus datos reales',
      browseButton: 'Examinar archivos localmente',
      dropZoneAriaLabel: 'Subir archivos de historial musical',
      noFilesError:
        'Sube un CSV/JSON/HTML de historial compatible o una biblioteca XML de iTunes generada por MusicBee.',
      wizardTitle: 'Elige tu fuente, descarga tu historial y súbelo aquí',
      formatsLabel: 'Formatos admitidos',
    },
  },
  en: {
    uploader: {
      title: 'Upload your real music data',
      browseButton: 'Browse local files',
      dropZoneAriaLabel: 'Upload music history files',
      noFilesError:
        'Please upload a supported music-history CSV/JSON/HTML file or a MusicBee iTunes XML library.',
      wizardTitle: 'Choose your source, download your history and upload it here',
      formatsLabel: 'Accepted formats',
    },
  },
  he: {
    uploader: {
      title: 'העלה את נתוני המוזיקה האמיתיים שלך',
      browseButton: 'עיין בקבצים מקומיים',
      wizardTitle: 'בחר את המקור שלך, הורד את ההיסטוריה שלך והעלה אותה לכאן',
      formatsLabel: 'פורמטים נתמכים',
      localEyebrow: 'ייבוא פרטי ומקומי',
    },
  },
};

describe('DataUploader', () => {
  beforeEach(() => {
    window.localStorage.clear();
    baseProps.operationCoordinator = createOperationCoordinator();
    TestMusicBeeWorker.holdResponses = false;
    TestMusicBeeWorker.instances = [];
    vi.stubGlobal('Worker', TestMusicBeeWorker);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('renders the drop-zone with the upload title and browse button', () => {
    window.localStorage.setItem('nml_lang', 'es');
    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} {...baseProps} />
      </AppProvider>
    );

    expect(screen.getByText(STRINGS.es.uploader.title)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.es.uploader.wizardTitle)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: STRINGS.es.uploader.browseButton })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: STRINGS.es.uploader.dropZoneAriaLabel })
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('upload-primary-action')).getByText(STRINGS.es.uploader.formatsLabel)).toBeInTheDocument();
  });

  it('puts the upload action before a collapsed, accessible source guide', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} {...baseProps} />
      </AppProvider>
    );

    const primaryAction = screen.getByTestId('upload-primary-action');
    const feedback = screen.getByTestId('upload-feedback');
    const sourceGuide = screen.getByTestId('upload-source-guide') as HTMLDetailsElement;
    const summary = screen.getByText(STRINGS.en.uploader.wizardTitle).closest('summary');

    expect(primaryAction.compareDocumentPosition(feedback) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(feedback.compareDocumentPosition(sourceGuide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sourceGuide.open).toBe(false);
    expect(summary).toBeInTheDocument();
    expect(screen.getByText('▶️ YouTube / YouTube Music')).not.toBeVisible();

    await user.click(summary!);

    expect(sourceGuide.open).toBe(true);
    expect(screen.getByText('▶️ YouTube / YouTube Music')).toBeVisible();
  });

  it('shows the "no files" error when an unsupported file extension is selected', async () => {
    // The hidden input has accept=".csv,.json,.html,.htm,.xml", which user-event's default
    // upload() enforces client-side (silently dropping non-matching files
    // before they ever reach the input, like a real browser file picker
    // would). Disable that filtering so a file with the wrong extension
    // actually lands in e.target.files and exercises the component's own
    // extension-filter/error logic in processFiles/handleChange.
    window.localStorage.setItem('nml_lang', 'es');
    const user = userEvent.setup({ applyAccept: false });
    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const badFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    await user.upload(input, badFile);

    expect(await screen.findByText(STRINGS.es.uploader.noFilesError)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(STRINGS.es.uploader.noFilesError);
  });

  it('announces import progress and completion with accessible live regions', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    let releaseRead: (() => void) | undefined;

    class ControlledFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((event: { target: ControlledFileReader }) => void) | null = null;

      readAsText() {
        releaseRead = () => {
          this.result = [
            'Apple Id Number,Event Start Timestamp,Track Description,Artist Name,Container Description,Media Duration In Milliseconds',
            '123,2026-03-01T10:00:00Z,In Blur,Deafheaven,Infinite Granite,200000',
          ].join('\n');
          this.onload?.({ target: this });
        };
      }
    }

    vi.stubGlobal('FileReader', ControlledFileReader);
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['pending'], 'history.csv', { type: 'text/csv' }));

    const progressbar = await screen.findByRole('progressbar', { name: 'File import progress' });
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuenow');
    expect(screen.getByRole('status')).toHaveTextContent(/Processing and analyzing your history/i);

    await act(async () => {
      releaseRead?.();
    });

    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent(/Loaded 1 file/i);
  });

  it('keeps import single-flight through async persistence and blocks browse/drop re-entry', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    let finishPersistence: (() => void) | undefined;
    const persistencePending = new Promise<void>(resolve => {
      finishPersistence = resolve;
    });
    const onDataLoaded = vi.fn(() => persistencePending);

    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const browseButton = screen.getByRole('button', { name: STRINGS.en.uploader.browseButton });
    const dropZone = screen.getByRole('region', { name: STRINGS.en.uploader.dropZoneAriaLabel });

    await user.upload(input, listenBrainzFile('first.json'));
    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));

    expect(input).toBeDisabled();
    expect(browseButton).toBeDisabled();
    expect(dropZone).toHaveAttribute('aria-busy', 'true');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [listenBrainzFile('second.json', 'Dream House')] },
    });
    await act(async () => Promise.resolve());
    expect(onDataLoaded).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishPersistence?.();
      await persistencePending;
    });
    await waitFor(() => expect(browseButton).toBeEnabled());
    expect(dropZone).toHaveAttribute('aria-busy', 'false');
  });

  it('keeps Clear disabled until a slow import and its local save have finished', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    let finishPersistence: (() => void) | undefined;
    const persistencePending = new Promise<void>(resolve => {
      finishPersistence = resolve;
    });
    const onDataLoaded = vi.fn(() => persistencePending);
    const onClearStored = vi.fn(async () => ({ ok: true, status: 'cleared' } as const));

    render(
      <AppProvider>
        <DataUploader
          {...baseProps}
          storedMeta={{ savedAt: '2026-07-16T07:00:00.000Z', sourceLabel: 'Saved archive' }}
          onDataLoaded={onDataLoaded}
          onClearStored={onClearStored}
        />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clearButton = screen.getByRole('button', { name: 'Clear saved data' });

    await user.upload(input, listenBrainzFile('slow-import.json'));
    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));

    expect(clearButton).toBeDisabled();
    expect(screen.getByText(/Import and local save are still running/i)).toBeInTheDocument();
    await user.click(clearButton);
    expect(onClearStored).not.toHaveBeenCalled();

    await act(async () => {
      finishPersistence?.();
      await persistencePending;
    });
    await waitFor(() => expect(clearButton).toBeEnabled());

    await user.click(clearButton);
    expect(onClearStored).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes, clear this archive' }));
    await waitFor(() => expect(onClearStored).toHaveBeenCalledTimes(1));
  });

  it.each([
    {
      lang: 'en' as Lang,
      clearButton: 'Clear saved data',
      title: 'Confirm local archive removal',
      cancel: 'Cancel',
      confirm: 'Yes, clear this archive',
      acknowledged: 'Local data cleared. You are back on the demo archive.',
    },
    {
      lang: 'es' as Lang,
      clearButton: 'Borrar datos guardados',
      title: 'Confirma el borrado del archivo local',
      cancel: 'Cancelar',
      confirm: 'Sí, borrar este archivo',
      acknowledged: 'Datos locales borrados. Volviste al archivo de demostración.',
    },
    {
      lang: 'he' as Lang,
      clearButton: 'נקה נתונים שמורים',
      title: 'אישור מחיקת הארכיון המקומי',
      cancel: 'ביטול',
      confirm: 'כן, למחוק את הארכיון',
      acknowledged: 'הנתונים המקומיים נוקו. חזרת לארכיון ההדגמה.',
    },
  ])('confirms and acknowledges Clear inline in $lang with the exact stored identity', async ({
    lang,
    clearButton,
    title,
    cancel,
    confirm,
    acknowledged,
  }) => {
    window.localStorage.setItem('nml_lang', lang);
    const user = userEvent.setup();
    const savedAt = '2026-07-16T07:04:00.000Z';
    const sourceLabel = `Exact source · ${lang} · האוסף`;
    let finishClear!: (result: { ok: true; status: 'cleared' }) => void;
    const pendingClear = new Promise<{ ok: true; status: 'cleared' }>(resolve => {
      finishClear = resolve;
    });
    const onClearStored = vi.fn(() => pendingClear);

    render(
      <AppProvider>
        <DataUploader
          {...baseProps}
          storedMeta={{ savedAt, sourceLabel }}
          onDataLoaded={vi.fn()}
          onClearStored={onClearStored}
        />
      </AppProvider>
    );

    await user.click(await screen.findByRole('button', { name: clearButton }));
    const firstDialog = screen.getByRole('alertdialog', { name: title });
    expect(within(firstDialog).getByText(sourceLabel, { exact: true })).toBeInTheDocument();
    const savedTime = firstDialog.querySelector('time');
    expect(savedTime).toHaveAttribute('dateTime', savedAt);
    expect(savedTime).toHaveTextContent(new Date(savedAt).toLocaleString(localeFor(lang), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }));
    const cancelButton = within(firstDialog).getByRole('button', { name: cancel });
    expect(cancelButton).toHaveFocus();
    await user.click(cancelButton);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onClearStored).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: clearButton }));
    const secondDialog = screen.getByRole('alertdialog', { name: title });
    const confirmButton = within(secondDialog).getByRole('button', { name: confirm });
    const secondCancelButton = within(secondDialog).getByRole('button', { name: cancel });
    await user.click(confirmButton);
    expect(onClearStored).toHaveBeenCalledTimes(1);
    expect(confirmButton).toBeDisabled();
    expect(secondCancelButton).toBeDisabled();

    await act(async () => {
      finishClear({ ok: true, status: 'cleared' });
      await pendingClear;
    });
    expect(await screen.findByText(acknowledged)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('does not call onDataLoaded when an unsupported file extension is selected', async () => {
    window.localStorage.setItem('nml_lang', 'es');
    const user = userEvent.setup({ applyAccept: false });
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    await user.upload(input, badFile);

    await screen.findByText(STRINGS.es.uploader.noFilesError);
    expect(onDataLoaded).not.toHaveBeenCalled();
  });

  it('accepts YouTube Takeout HTML exports', async () => {
    window.localStorage.setItem('nml_lang', 'es');
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const youtubeHtml = `
      <html>
        <body>
          Watched <a href="https://www.youtube.com/watch?v=VAXg78MKJcM">Bring Me The Horizon - MANTRA (Official Video)</a><br>
          <a href="https://www.youtube.com/channel/example">Bring Me The Horizon</a><br>
          Feb 3, 2026, 8:15:00 PM UTC<br>
        </body>
      </html>
    `;
    const htmlFile = new File([youtubeHtml], 'watch-history.html', { type: 'text/html' });

    await user.upload(input, htmlFile);

    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));
    const parsed = onDataLoaded.mock.calls[0][0];
    expect(parsed.source_summary?.source_type).toBe('youtube');
    expect(parsed.source_summary?.youtube_plays).toBe(1);
    expect(parsed.knowledge_summary?.matched_artists).toBe(1);
    expect(parsed.top_tracks[0].title).toBe('MANTRA');
    expect(await screen.findByText('Cobertura del catálogo local de artistas')).toBeInTheDocument();
  });

  it('accepts an Apple Music Play Activity CSV export', async () => {
    window.localStorage.setItem('nml_lang', 'es');
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const appleMusicCsv = [
      'Apple Id Number,Event Start Timestamp,Track Description,Artist Name,Container Description,Media Duration In Milliseconds',
      '123,2026-03-01T10:00:00Z,MANTRA,Bring Me The Horizon,Post Human: Survival Horror,200000',
    ].join('\n');
    const csvFile = new File([appleMusicCsv], 'Apple Music Play Activity.csv', { type: 'text/csv' });

    await user.upload(input, csvFile);

    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));
    const parsed = onDataLoaded.mock.calls[0][0];
    expect(parsed.source_summary?.source_type).toBe('apple_music');
    expect(parsed.source_summary?.apple_music_plays).toBe(1);
    expect(parsed.top_artists[0].name).toBe('Bring Me the Horizon');
    expect(await screen.findByText('Cobertura del catálogo local de artistas')).toBeInTheDocument();
  });

  it('attaches a sanitized MusicBee library without changing timeline totals', async () => {
    window.localStorage.setItem('nml_lang', 'es');
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', expect.stringContaining('.xml'));
    await user.upload(input, musicBeeXmlFile());

    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));
    const [parsed, sourceLabel] = onDataLoaded.mock.calls[0];
    expect(parsed.core_metrics).toEqual(baseProps.currentData.core_metrics);
    expect(parsed.source_summary).toEqual(baseProps.currentData.source_summary);
    expect(parsed.musicbee_snapshot).toMatchObject({
      source: 'musicbee_itunes_xml',
      track_count: 1,
      artist_count: 1,
      total_play_count: 7,
    });
    expect(JSON.stringify(parsed.musicbee_snapshot)).not.toContain('private.flac');
    expect(JSON.stringify(parsed.musicbee_snapshot)).not.toContain('PRIVATE-LIBRARY-ID');
    expect(sourceLabel).toContain('Biblioteca MusicBee · 1 canciones');
    expect(await screen.findByText(
      'Biblioteca MusicBee conectada: 1 canciones y 1 artistas. Los totales del timeline no cambiaron.',
    )).toBeInTheDocument();
  });

  it('terminates an in-flight MusicBee worker when the uploader unmounts', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    TestMusicBeeWorker.holdResponses = true;
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    const operationCoordinator = createOperationCoordinator();
    const rendered = render(
      <AppProvider>
        <DataUploader
          onDataLoaded={onDataLoaded}
          {...baseProps}
          operationCoordinator={operationCoordinator}
        />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, musicBeeXmlFile());
    await waitFor(() => expect(TestMusicBeeWorker.instances).toHaveLength(1));
    expect(TestMusicBeeWorker.instances[0].terminated).toBe(false);

    rendered.unmount();

    await waitFor(() => expect(TestMusicBeeWorker.instances[0].terminated).toBe(true));
    await waitFor(() => expect(operationCoordinator.active).toBeNull());
    expect(onDataLoaded).not.toHaveBeenCalled();
  });

  it('does not silently carry a previous MusicBee library into a new timeline import', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    const currentWithMusicBee: MusicDnaData = {
      ...baseProps.currentData,
      musicbee_snapshot: {
        schema_version: 1,
        source: 'musicbee_itunes_xml',
        library_item_count: 0,
        track_count: 0,
        duplicate_item_count: 0,
        artist_count: 0,
        album_count: 0,
        played_track_count: 0,
        rated_track_count: 0,
        total_play_count: 0,
        total_skip_count: 0,
        latest_played_at: null,
        tracks: [],
        artists: [],
        albums: [],
        capabilities: {
          catalog: true,
          aggregate_play_counts: false,
          last_played: false,
          exact_event_timeline: false,
          sessions: false,
        },
        limitations: [
          'aggregate_counts_not_timeline',
          'separate_source_totals',
          'paths_and_ids_discarded',
        ],
      },
    };
    render(
      <AppProvider>
        <DataUploader
          {...baseProps}
          currentData={currentWithMusicBee}
          onDataLoaded={onDataLoaded}
        />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, listenBrainzFile('new-person.json'));

    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));
    expect(onDataLoaded.mock.calls[0][0].musicbee_snapshot).toBeUndefined();
  });

  it('rejects oversized MusicBee XML before reading it into browser memory', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const oversized = musicBeeXmlFile('oversized.xml');
    Object.defineProperty(oversized, 'size', {
      configurable: true,
      value: MAX_MUSICBEE_XML_BYTES + 1,
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, oversized);

    expect(await screen.findByRole('alert')).toHaveTextContent(/larger than the 50 MB safe browser limit/i);
    expect(onDataLoaded).not.toHaveBeenCalled();
  });

  it('accepts a ListenBrainz listens JSON export', async () => {
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const listenBrainzJson = JSON.stringify([
      {
        listened_at: 1770000000,
        track_metadata: { artist_name: 'Deafheaven', track_name: 'In Blur', release_name: 'Infinite Granite' },
      },
    ]);
    const jsonFile = new File([listenBrainzJson], 'listenbrainz-export.json', { type: 'application/json' });

    await user.upload(input, jsonFile);

    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));
    const parsed = onDataLoaded.mock.calls[0][0];
    expect(parsed.source_summary?.source_type).toBe('listenbrainz');
    expect(parsed.source_summary?.listenbrainz_plays).toBe(1);
    expect(parsed.top_artists[0].name).toBe('Deafheaven');
  });

  it('rejects a corrupt Nova marker with a localized backup error', async () => {
    window.localStorage.setItem('nml_lang', 'es');
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const corruptBackup = new File(
      ['{"nova_music_export":true,"version":3,"data":'],
      'nova-backup-corrupt.json',
      { type: 'application/json' },
    );

    await user.upload(input, corruptBackup);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Este archivo parece una copia de seguridad de Nova, pero su contenido no es válido o está dañado.',
    );
    expect(onDataLoaded).not.toHaveBeenCalled();
  });

  it('ignores a corrupt Nova near-match without suppressing valid files in a mixed batch', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} {...baseProps} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const corruptBackup = new File(
      [JSON.stringify({ nova_music_export: true, version: 3, data: { project: 'damaged' } })],
      'nova-backup-near-match.json',
      { type: 'application/json' },
    );
    const validListenBrainz = new File([JSON.stringify([
      {
        listened_at: 1770000000,
        track_metadata: {
          artist_name: 'Deafheaven',
          track_name: 'In Blur',
          release_name: 'Infinite Granite',
        },
      },
    ])], 'listenbrainz-export.json', { type: 'application/json' });

    await user.upload(input, [corruptBackup, validListenBrainz]);

    await waitFor(() => expect(onDataLoaded).toHaveBeenCalledTimes(1));
    const parsed = onDataLoaded.mock.calls[0][0];
    expect(parsed.source_summary?.source_type).toBe('listenbrainz');
    expect(parsed.core_metrics.total_plays).toBe(1);
    expect(await screen.findByText(/Loaded 1 file\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1 invalid Nova backup file\(s\) were ignored/i)).toBeInTheDocument();
  });

  it('renders English strings when nml_lang is set to "en"', () => {
    window.localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} {...baseProps} />
      </AppProvider>
    );

    expect(screen.getByText(STRINGS.en.uploader.title)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.en.uploader.wizardTitle)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: STRINGS.en.uploader.browseButton })
    ).toBeInTheDocument();
  });

  it('renders English strings by default when no language is stored', () => {
    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} {...baseProps} />
      </AppProvider>
    );

    expect(screen.getByText(STRINGS.en.uploader.title)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: STRINGS.en.uploader.browseButton })
    ).toBeInTheDocument();
  });

  it('localizes the new primary action and source disclosure in Hebrew', async () => {
    window.localStorage.setItem('nml_lang', 'he');

    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} {...baseProps} />
      </AppProvider>
    );

    const primaryAction = within(await screen.findByTestId('upload-primary-action'));
    expect(primaryAction.getByText(STRINGS.he.uploader.title)).toBeInTheDocument();
    expect(primaryAction.getByText(STRINGS.he.uploader.localEyebrow)).toBeInTheDocument();
    expect(primaryAction.getByText(STRINGS.he.uploader.formatsLabel)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.he.uploader.wizardTitle)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: STRINGS.he.uploader.browseButton })).toBeInTheDocument();
  });
});
