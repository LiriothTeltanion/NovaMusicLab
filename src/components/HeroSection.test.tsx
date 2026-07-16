import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import HeroSection from './HeroSection';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
const paintMoodArtMock = vi.hoisted(() => vi.fn());
vi.mock('./MoodArtCanvas', () => ({ paintMoodArt: paintMoodArtMock }));

const data = musicData as unknown as MusicDnaData;
const singleSourcePlays = data.source_summary?.lastfm_plays ?? data.core_metrics.total_plays;
const singleSourceData = {
  ...data,
  core_metrics: {
    ...data.core_metrics,
    total_plays: singleSourcePlays,
    match_rate_pct: 0,
  },
  source_summary: {
    ...data.source_summary!,
    source_type: 'lastfm',
    spotify_plays: 0,
    youtube_plays: 0,
    apple_music_plays: 0,
    listenbrainz_plays: 0,
    merged_plays: singleSourcePlays,
    cross_source_duplicates: 0,
  },
} as MusicDnaData;

describe('HeroSection intro rebalance', () => {
  beforeAll(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  });

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces the archive snapshot and entry map in English', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <HeroSection data={singleSourceData} onEnter={vi.fn()} onUpload={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByTestId('hero-first-viewport')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/NOVA\s*MUSIC LAB/i);
    expect(screen.getByRole('button', { name: /enter the sound museum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload my data/i })).toBeInTheDocument();
    expect(screen.queryByTestId('hero-cv-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('hero-deep-archive')).toBeInTheDocument();
    expect(screen.getByText('Archive Snapshot')).toBeInTheDocument();
    expect(screen.getAllByText('Anchor artist').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Bring Me the Horizon').length).toBeGreaterThan(0);
    expect(screen.getByText(/AI MUSIC PROFILE/i)).toBeInTheDocument();
    expect(screen.getByText('Archive source')).toBeInTheDocument();
    expect(document.body).toHaveTextContent(/Archive source: Last\.fm/i);
    expect(document.body).toHaveTextContent(/no cross-source overlap is claimed/i);
    expect(document.body).not.toHaveTextContent(/data sync integrity/i);
    expect(screen.getByText('24h Music Days')).toBeInTheDocument();

    const anchorPortraits = screen.getAllByAltText(/Bring Me the Horizon/i);
    expect(anchorPortraits.some(image => (
      image.getAttribute('loading') === 'eager'
      && image.getAttribute('fetchpriority') === 'high'
    ))).toBe(true);
  });

  it('surfaces the archive snapshot and entry map in Spanish', () => {
    localStorage.setItem('nml_lang', 'es');

    render(
      <AppProvider>
        <HeroSection data={singleSourceData} onEnter={vi.fn()} onUpload={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByTestId('hero-first-viewport')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/NOVA\s*MUSIC LAB/i);
    expect(screen.getByRole('button', { name: /entrar al museo sonoro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir mis datos/i })).toBeInTheDocument();
    expect(screen.queryByTestId('hero-cv-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('hero-deep-archive')).toBeInTheDocument();
    expect(screen.getByText('Instantánea del Archivo')).toBeInTheDocument();
    expect(screen.getAllByText('Artista ancla').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Bring Me the Horizon').length).toBeGreaterThan(0);
    expect(screen.getByText(/EXPEDIENTE DE MÚSICA IA/i)).toBeInTheDocument();
    expect(screen.getByText('Fuente del archivo')).toBeInTheDocument();
    expect(document.body).toHaveTextContent(/Fuente del archivo: Last\.fm/i);
    expect(document.body).toHaveTextContent(/no afirma un solapamiento entre fuentes/i);
    expect(document.body).not.toHaveTextContent(/integridad de datos/i);
    expect(screen.getByText('Días de Música (24 h)')).toBeInTheDocument();
  });

  it('labels match rate as track overlap only for merged archives', () => {
    localStorage.setItem('nml_lang', 'en');
    const mergedData = {
      ...data,
      core_metrics: {
        ...data.core_metrics,
        match_rate_pct: 48.92,
      },
      source_summary: {
        ...data.source_summary!,
        source_type: 'merged',
      },
    } as MusicDnaData;

    render(
      <AppProvider>
        <HeroSection data={mergedData} onEnter={vi.fn()} onUpload={vi.fn()} />
      </AppProvider>
    );

    expect(document.body).toHaveTextContent(/cross-source track overlap/i);
    expect(document.body).toHaveTextContent(/48\.92% of normalized tracks overlap/i);
    expect(document.body).not.toHaveTextContent(/data sync integrity/i);
  });

  it('removes the fixed archive-owner copy for an uploaded personal archive', () => {
    localStorage.setItem('nml_lang', 'en');
    const oneYearArchive = {
      ...data,
      yearly_eras: [data.yearly_eras[0]],
    } as MusicDnaData;

    render(
      <AppProvider>
        <HeroSection
          data={oneYearArchive}
          onEnter={vi.fn()}
          onUpload={vi.fn()}
          isPersonalArchive
        />
      </AppProvider>
    );

    expect(screen.getByText('✨ 1 Year in Your Archive')).toBeInTheDocument();
    expect(screen.getByText('✧ Your Musical Universe ✧')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /YOUR ARCHIVE/i })).toBeInTheDocument();
    expect(screen.getByText('Private · active in this tab only')).toBeInTheDocument();
    expect(screen.getByLabelText('Personal archive: Private · active in this tab only')).toBeInTheDocument();
    expect(screen.queryByText('Private · saved locally')).not.toBeInTheDocument();
    expect(screen.queryByText(/KEVIN CUSNIR/i)).not.toBeInTheDocument();
  });

  it('shows saved-local status only when persistence has been confirmed', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <HeroSection
          data={data}
          onEnter={vi.fn()}
          onUpload={vi.fn()}
          isPersonalArchive
          isArchivePersisted
        />
      </AppProvider>
    );

    expect(screen.getByText('Private · saved locally')).toBeInTheDocument();
    expect(screen.getByLabelText('Personal archive: Private · saved locally')).toBeInTheDocument();
    expect(screen.queryByText('Private · active in this tab only')).not.toBeInTheDocument();
  });

  it('keeps the persistence truth visibly rendered at the narrow mobile breakpoint', () => {
    const css = readFileSync('src/components/HeroSection.css', 'utf8');
    const mobileStart = css.indexOf('@media (max-width: 520px)');
    const mobileEnd = css.indexOf('@media (min-width: 761px)', mobileStart);
    const mobileRules = css.slice(mobileStart, mobileEnd);

    expect(mobileStart).toBeGreaterThanOrEqual(0);
    expect(mobileRules).toMatch(/\.nova-hero__archive-state small\s*\{[^}]*display:\s*block/s);
    expect(mobileRules).not.toMatch(/\.nova-hero__archive-state small\s*\{[^}]*display:\s*none/s);
  });

  it.each([
    ['en', '✨ Archive timeline unavailable'],
    ['es', '✨ Cronología del archivo no disponible'],
    ['he', '✨ ציר הזמן של הארכיון אינו זמין'],
  ] as const)('does not invent a one-year timeline for an empty %s archive', async (lang, unavailableCopy) => {
    localStorage.setItem('nml_lang', lang);
    const emptyArchive = {
      ...singleSourceData,
      core_metrics: {
        ...singleSourceData.core_metrics,
        total_plays: 0,
        listening_hours: 0,
        unique_artists: 0,
        unique_tracks: 0,
        max_year: 2026,
      },
      top_artists: [],
      top_tracks: [],
      top_genres: [],
      yearly_eras: [],
    } as MusicDnaData;

    render(
      <AppProvider>
        <HeroSection
          data={emptyArchive}
          onEnter={vi.fn()}
          onUpload={vi.fn()}
          isPersonalArchive
          motionMode="static"
        />
      </AppProvider>,
    );

    expect(await screen.findByText(unavailableCopy)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/1 year|1 año|שנה אחת/i);
    expect(document.body).not.toHaveTextContent(/alternative/i);
    expect(document.body).not.toHaveTextContent('2026');
  });

  it('keeps a partial artist dossier honest when genre and annual evidence are absent', () => {
    localStorage.setItem('nml_lang', 'en');
    const evidenceLimitedArchive = {
      ...singleSourceData,
      core_metrics: { ...singleSourceData.core_metrics, max_year: 2026 },
      top_artists: [{
        ...singleSourceData.top_artists[0],
        name: 'Evidence Limited Artist',
        genre: '',
      }],
      top_genres: [],
      yearly_eras: [],
    } as MusicDnaData;

    render(
      <AppProvider>
        <HeroSection
          data={evidenceLimitedArchive}
          onEnter={vi.fn()}
          onUpload={vi.fn()}
          isPersonalArchive
          motionMode="static"
        />
      </AppProvider>,
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/genre unavailable/i);
    expect(document.body).toHaveTextContent(/annual evidence is unavailable, so no peak era is claimed/i);
    expect(document.body).not.toHaveTextContent(/alternative/i);
    expect(document.body).not.toHaveTextContent('2026');
  });

  it('keeps the visual fallback and skips decorative canvas work in Static mode', () => {
    localStorage.setItem('nml_lang', 'en');
    const createElement = vi.spyOn(document, 'createElement');

    render(
      <AppProvider>
        <HeroSection
          data={singleSourceData}
          onEnter={vi.fn()}
          onUpload={vi.fn()}
          motionMode="static"
        />
      </AppProvider>,
    );

    expect(document.querySelector('.nova-hero__mood-art'))
      .toHaveAttribute('data-art-source', 'fallback');
    expect(createElement).not.toHaveBeenCalledWith('canvas');
  });

  it('names the real archive owner for the bundled demo archive only', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <HeroSection data={data} onEnter={vi.fn()} onUpload={vi.fn()} isPersonalArchive={false} />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 3, name: /KEVIN CUSNIR/i })).toBeInTheDocument();
  });

  it('renders every raw source on a normalized telemetry bar', () => {
    localStorage.setItem('nml_lang', 'en');
    const telemetryData = {
      ...data,
      source_summary: {
        ...data.source_summary!,
        spotify_plays: 1_600,
        lastfm_plays: 500,
        youtube_plays: 100,
        apple_music_plays: 40,
        listenbrainz_plays: 10,
        merged_plays: 900,
      },
    } as MusicDnaData;

    render(
      <AppProvider>
        <HeroSection data={telemetryData} onEnter={vi.fn()} onUpload={vi.fn()} />
      </AppProvider>
    );

    const widths = ['spotify', 'lastfm', 'youtube', 'apple_music', 'listenbrainz']
      .map(id => Number.parseFloat(screen.getByTestId(`source-segment-${id}`).style.width));

    expect(screen.getByText('Raw Source Ingestion')).toBeInTheDocument();
    expect(screen.getByText('Apple Music')).toBeInTheDocument();
    expect(screen.getByText('ListenBrainz')).toBeInTheDocument();
    expect(widths.every(width => width >= 0 && width <= 100)).toBe(true);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100, 8);
    expect(screen.getByText(/Counted after dedupe:/i)).toBeInTheDocument();
  });

  it('renders the personal dossier and transition state in idiomatic Hebrew', async () => {
    localStorage.setItem('nml_lang', 'he');
    const oneYearArchive = {
      ...singleSourceData,
      yearly_eras: [singleSourceData.yearly_eras[0]],
    } as MusicDnaData;

    render(
      <AppProvider>
        <HeroSection
          data={oneYearArchive}
          onEnter={vi.fn()}
          onUpload={vi.fn()}
          isPersonalArchive
        />
      </AppProvider>
    );

    expect(await screen.findByText('✨ שנה אחת בארכיון שלך')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('המודיעין של הארכיון')).toBeInTheDocument();
    expect(screen.getByText('ניתוח בינה מלאכותית מקומי')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /פרופיל מוזיקלי מבוסס בינה מלאכותית/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /נגן את החתימה הצלילית של/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'פתח את תיק המוזיקה שלך מבוסס הבינה המלאכותית' }));
    expect(screen.getByText('אתחול הממשק העצבי')).toBeInTheDocument();
    expect(screen.getByText('מפענח אטלס של שנה אחת…')).toBeInTheDocument();
    expect(screen.queryByText('Offline AI reading')).not.toBeInTheDocument();
  });

  it('generates mood art during idle time with async blob URLs and revokes them', () => {
    localStorage.setItem('nml_lang', 'en');
    paintMoodArtMock.mockClear();
    let idleCallback: IdleRequestCallback | null = null;
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallback = callback;
      return 37;
    });
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);

    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({} as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(callback => callback(new Blob(['nova'], { type: 'image/png' })));
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');
    const createObjectURL = vi.fn(() => 'blob:nova-hero-art');
    const revokeObjectURL = vi.fn();
    const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    try {
      const { unmount } = render(
        <AppProvider>
          <HeroSection data={singleSourceData} onEnter={vi.fn()} onUpload={vi.fn()} />
        </AppProvider>,
      );

      expect(requestIdleCallback).toHaveBeenCalledOnce();
      expect(document.querySelector('.nova-hero__mood-art'))
        .toHaveAttribute('data-art-source', 'fallback');

      act(() => {
        idleCallback?.({ didTimeout: false, timeRemaining: () => 20 });
      });

      expect(getContext).toHaveBeenCalledWith('2d');
      expect(paintMoodArtMock).toHaveBeenCalledOnce();
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
      expect(toDataURL).not.toHaveBeenCalled();
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(document.querySelector('.nova-hero__mood-art'))
        .toHaveAttribute('data-art-source', 'generated');

      unmount();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:nova-hero-art');
      expect(cancelIdleCallback).not.toHaveBeenCalled();
    } finally {
      if (createDescriptor) {
        Object.defineProperty(URL, 'createObjectURL', createDescriptor);
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL');
      }
      if (revokeDescriptor) {
        Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
      } else {
        Reflect.deleteProperty(URL, 'revokeObjectURL');
      }
    }
  });
});
