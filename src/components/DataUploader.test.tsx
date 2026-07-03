import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataUploader from './DataUploader';
import { AppProvider } from '../context/AppContext';

// STRINGS itself isn't exported from AppContext.tsx, so the expected copy is
// mirrored here from the es/en `uploader` blocks to keep assertions exact.
const STRINGS = {
  es: {
    uploader: {
      title: 'Sube tus datos reales',
      browseButton: 'Examinar archivos localmente',
      dropZoneAriaLabel: 'Subir archivos de historial musical',
      noFilesError:
        'Por favor, sube un CSV de Last.fm, JSON de Spotify o JSON/HTML de YouTube Takeout.',
      wizardTitle: 'Elige tu fuente, descarga tu historial y súbelo aquí',
    },
  },
  en: {
    uploader: {
      title: 'Upload your real music data',
      browseButton: 'Browse local files',
      dropZoneAriaLabel: 'Upload music history files',
      noFilesError:
        'Please upload Last.fm CSV, Spotify JSON or YouTube Takeout JSON/HTML files.',
      wizardTitle: 'Choose your source, download your history and upload it here',
    },
  },
};

describe('DataUploader', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders the drop-zone with the upload title and browse button', () => {
    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByText(STRINGS.es.uploader.title)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.es.uploader.wizardTitle)).toBeInTheDocument();
    expect(screen.getByText('▶️ YouTube / YouTube Music')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: STRINGS.es.uploader.browseButton })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: STRINGS.es.uploader.dropZoneAriaLabel })
    ).toBeInTheDocument();
  });

  it('shows the "no files" error when an unsupported file extension is selected', async () => {
    // The hidden input has accept=".csv,.json,.html,.htm", which user-event's default
    // upload() enforces client-side (silently dropping non-matching files
    // before they ever reach the input, like a real browser file picker
    // would). Disable that filtering so a file with the wrong extension
    // actually lands in e.target.files and exercises the component's own
    // extension-filter/error logic in processFiles/handleChange.
    const user = userEvent.setup({ applyAccept: false });
    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const badFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    await user.upload(input, badFile);

    expect(await screen.findByText(STRINGS.es.uploader.noFilesError)).toBeInTheDocument();
  });

  it('does not call onDataLoaded when an unsupported file extension is selected', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} />
      </AppProvider>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    await user.upload(input, badFile);

    await screen.findByText(STRINGS.es.uploader.noFilesError);
    expect(onDataLoaded).not.toHaveBeenCalled();
  });

  it('accepts YouTube Takeout HTML exports', async () => {
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(
      <AppProvider>
        <DataUploader onDataLoaded={onDataLoaded} />
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
    expect(parsed.top_tracks[0].title).toBe('MANTRA');
  });

  it('renders English strings when nml_lang is set to "en"', () => {
    window.localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByText(STRINGS.en.uploader.title)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.en.uploader.wizardTitle)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: STRINGS.en.uploader.browseButton })
    ).toBeInTheDocument();
  });

  it('renders Spanish strings by default when no language is stored', () => {
    render(
      <AppProvider>
        <DataUploader onDataLoaded={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByText(STRINGS.es.uploader.title)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: STRINGS.es.uploader.browseButton })
    ).toBeInTheDocument();
  });
});
