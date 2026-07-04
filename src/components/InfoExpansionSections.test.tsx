import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import TimeCapsule from './TimeCapsule';
import WrappedCard from './WrappedCard';
import RecentPulse from './RecentPulse';
import DataQualityCenter from './DataQualityCenter';
import FinalReport from './FinalReport';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('html-to-image', () => ({ toPng: vi.fn() }));

const data = musicData as unknown as MusicDnaData;

describe('expanded info sections', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
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

  it('explains Time Capsule methodology and localizes era labels in English', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <TimeCapsule data={data} />
      </AppProvider>
    );

    expect(screen.getByText('Comparative memory')).toBeInTheDocument();
    expect(screen.getByText('How the app decides what stayed alive and what belongs to the past')).toBeInTheDocument();
    expect(screen.getByText('Darksynth & Prog Metal Era')).toBeInTheDocument();
    expect(screen.getAllByText('Night 18-23').length).toBeGreaterThan(0);
  });

  it('adds a selected-year reading and export methodology to Wrapped', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <WrappedCard data={data} />
      </AppProvider>
    );

    expect(screen.getByText('Yearly snapshot')).toBeInTheDocument();
    expect(screen.getByText('Selected year reading')).toBeInTheDocument();
    expect(screen.getByText('Why this card can summarize a full year')).toBeInTheDocument();
    expect(screen.getByText('Luminous Blackgaze Era')).toBeInTheDocument();
  });

  it('documents Current Pulse as a local snapshot with match confidence', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <RecentPulse data={data} />
      </AppProvider>
    );

    expect(screen.getByText('Present vs archive')).toBeInTheDocument();
    expect(screen.getByText('How the present is compared with the historical archive')).toBeInTheDocument();
    expect(screen.getByText('Local Spotify snapshot')).toBeInTheDocument();
    expect(screen.getByText('Historical match')).toBeInTheDocument();
  });

  it('renders the Data Quality dictionary with grouped definitions', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <DataQualityCenter data={data} />
      </AppProvider>
    );

    expect(screen.getByText('Data Dictionary')).toBeInTheDocument();
    expect(screen.getByText('🧠 Offline Brain Coverage')).toBeInTheDocument();
    expect(screen.getByText('Enrichment queue')).toBeInTheDocument();
    expect(screen.getByText('Artists recognized')).toBeInTheDocument();
    expect(screen.getByText('Play / Scrobble')).toBeInTheDocument();
    expect(screen.getByText('Sources and trust')).toBeInTheDocument();
    expect(screen.getByText('Current Pulse')).toBeInTheDocument();
  });

  it('expands the Final Essay with the living museum chapter', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <FinalReport data={data} />
      </AppProvider>
    );

    expect(screen.getByText('The Living Museum: Memory, Snapshot and Trust')).toBeInTheDocument();
    expect(screen.getByText(/newer museum layers reveal/i)).toBeInTheDocument();
    expect(screen.getByText('reading confidence')).toBeInTheDocument();
  });
});
