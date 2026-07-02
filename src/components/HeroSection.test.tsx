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
        <HeroSection data={data} onEnter={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByRole('button', { name: /enter the sound museum/i })).toBeInTheDocument();
    expect(screen.getByText('Archive Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Anchor artist')).toBeInTheDocument();
    expect(screen.getAllByText('Bring Me the Horizon').length).toBeGreaterThan(0);
    expect(screen.getByText('Entry Map')).toBeInTheDocument();
    expect(screen.getByText('Trust')).toBeInTheDocument();
  });

  it('surfaces the archive snapshot and entry map in Spanish', () => {
    localStorage.setItem('nml_lang', 'es');

    render(
      <AppProvider>
        <HeroSection data={data} onEnter={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByRole('button', { name: /entrar al museo sonoro/i })).toBeInTheDocument();
    expect(screen.getByText('Instantánea del Archivo')).toBeInTheDocument();
    expect(screen.getByText('Artista ancla')).toBeInTheDocument();
    expect(screen.getAllByText('Bring Me the Horizon').length).toBeGreaterThan(0);
    expect(screen.getByText('Mapa de Entrada')).toBeInTheDocument();
    expect(screen.getByText('Confianza')).toBeInTheDocument();
  });
});
