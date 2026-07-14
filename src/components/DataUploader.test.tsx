import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataUploader from './DataUploader';
import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';

const baseProps = {
  currentData: defaultMusicData as unknown as MusicDnaData,
  storedMeta: null,
  onClearStored: vi.fn(),
};

// STRINGS itself isn't exported from AppContext.tsx, so the expected copy is
// mirrored here from the es/en `uploader` blocks to keep assertions exact.
const STRINGS = {
  es: {
    uploader: {
      title: 'Sube tus datos reales',
      browseButton: 'Examinar archivos localmente',
      dropZoneAriaLabel: 'Subir archivos de historial musical',
      noFilesError:
        'Por favor, sube un CSV de Last.fm/Apple Music, JSON de Spotify/ListenBrainz o JSON/HTML de YouTube Takeout.',
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
        'Please upload Last.fm/Apple Music CSV, Spotify/ListenBrainz JSON or YouTube Takeout JSON/HTML files.',
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
    // The hidden input has accept=".csv,.json,.html,.htm", which user-event's default
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
