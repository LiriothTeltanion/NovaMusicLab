import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Achievements from './Achievements';
import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';

const data = defaultMusicData as unknown as MusicDnaData;

describe('Achievements', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders the peak year as a plain year, never locale-formatted', () => {
    render(
      <AppProvider>
        <Achievements data={data} />
      </AppProvider>
    );

    // Regression: peak_year used to flow through CountUp -> toLocaleString,
    // rendering 2021 as "2,021" / "2.021".
    expect(screen.queryByText('2,021')).toBeNull();
    expect(screen.queryByText('2.021')).toBeNull();
    expect(screen.getAllByText('2021').length).toBeGreaterThan(0);
  });

  it('gives legendary achievements the animated shine treatment', () => {
    const { container } = render(
      <AppProvider>
        <Achievements data={data} />
      </AppProvider>
    );

    // The bundled archive unlocks several legendary achievements; each one
    // must carry the tier-shine class that drives the CSS sweep animation.
    expect(container.querySelectorAll('.tier-shine').length).toBeGreaterThan(0);
  });
});
