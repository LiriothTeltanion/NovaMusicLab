import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import { buildSourceReconciliation } from '../utils/chartIntegrity';
import SpotifyVsLastfm from './SpotifyVsLastfm';

const data = musicData as unknown as MusicDnaData;

describe('SpotifyVsLastfm integrity view', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows an exact source bridge instead of a scaled yearly series', () => {
    localStorage.setItem('nml_lang', 'en');
    render(<AppProvider><SpotifyVsLastfm data={data} /></AppProvider>);

    const waterfall = screen.getByTestId('source-reconciliation-waterfall');
    const reconciliation = buildSourceReconciliation(data.source_summary!);
    expect(waterfall).toHaveTextContent(reconciliation.rawEvents.toLocaleString('en-US'));
    expect(waterfall).toHaveTextContent(reconciliation.shortEvents.toLocaleString('en-US'));
    expect(waterfall).toHaveTextContent(reconciliation.duplicateEvents.toLocaleString('en-US'));
    expect(waterfall).toHaveTextContent(reconciliation.finalListens.toLocaleString('en-US'));
    expect(screen.getByText(/reconcile exactly|visible .+-event adjustment/i)).toBeInTheDocument();
    expect(screen.queryByText(/plays by year/i)).not.toBeInTheDocument();
  });

  it('uses a qualitative capability matrix without synthetic scores', () => {
    localStorage.setItem('nml_lang', 'en');
    render(<AppProvider><SpotifyVsLastfm data={data} /></AppProvider>);

    expect(screen.getByText('Measured capability matrix')).toBeInTheDocument();
    expect(screen.getByText(/no synthetic scores/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('source-capability-matrix')).queryByText('95')).not.toBeInTheDocument();
  });
});
