import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import HeroSection from './HeroSection';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

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
    expect(screen.getByRole('link', { name: /open kevin cusnir's cv/i })).toHaveAttribute(
      'href',
      '/cv/kevin-cusnir-cv-en.pdf',
    );
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
    expect(screen.getByRole('link', { name: /abrir el cv de kevin cusnir/i })).toHaveAttribute(
      'href',
      '/cv/kevin-cusnir-cv-es.pdf',
    );
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
    expect(screen.queryByText(/KEVIN CUSNIR/i)).not.toBeInTheDocument();
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
});
