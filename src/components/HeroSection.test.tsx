import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import HeroSection from './HeroSection';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const data = musicData as unknown as MusicDnaData;

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
        <HeroSection data={data} onEnter={vi.fn()} onUpload={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByRole('button', { name: /enter the sound museum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload my data/i })).toBeInTheDocument();
    expect(screen.getByText('Archive Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Anchor artist')).toBeInTheDocument();
    expect(screen.getAllByText('Bring Me the Horizon').length).toBeGreaterThan(0);
    expect(screen.getByText(/AI MUSIC PROFILE/i)).toBeInTheDocument();
    expect(screen.getByText(/Data trust/i)).toBeInTheDocument();
  });

  it('surfaces the archive snapshot and entry map in Spanish', () => {
    localStorage.setItem('nml_lang', 'es');

    render(
      <AppProvider>
        <HeroSection data={data} onEnter={vi.fn()} onUpload={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByRole('button', { name: /entrar al museo sonoro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir mis datos/i })).toBeInTheDocument();
    expect(screen.getByText('Instantánea del Archivo')).toBeInTheDocument();
    expect(screen.getByText('Artista ancla')).toBeInTheDocument();
    expect(screen.getAllByText('Bring Me the Horizon').length).toBeGreaterThan(0);
    expect(screen.getByText(/EXPEDIENTE DE MÚSICA IA/i)).toBeInTheDocument();
    expect(screen.getByText(/Confianza de datos/i)).toBeInTheDocument();
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
    expect(screen.getByText('Apple Music:')).toBeInTheDocument();
    expect(screen.getByText('ListenBrainz:')).toBeInTheDocument();
    expect(widths.every(width => width >= 0 && width <= 100)).toBe(true);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100, 8);
    expect(screen.getByText(/Counted after dedupe:/i)).toBeInTheDocument();
  });
});
