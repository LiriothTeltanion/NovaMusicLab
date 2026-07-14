import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it('uses a real disclosure button without nesting the dossier action', () => {
    const { container } = render(
      <AppProvider>
        <Achievements data={data} />
      </AppProvider>
    );
    const disclosure = screen.getByRole('button', { name: /Scrobble Master/i });

    expect(container.querySelector('button button')).toBeNull();
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(disclosure);

    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(disclosure.getAttribute('aria-controls')!)).toBeInTheDocument();
  });

  it('exposes achievement copy and controls in Hebrew without translating artist names', async () => {
    window.localStorage.setItem('nml_lang', 'he');
    render(
      <AppProvider>
        <Achievements data={data} />
      </AppProvider>
    );

    expect(await screen.findByRole('group', { name: 'סינון הישגים לפי דרגה' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /מאסטר ה־Scrobble/i })).toBeInTheDocument();

    const loyalFan = screen.getByRole('button', { name: /מעריץ ללא תנאים/i });
    fireEvent.click(loyalFan);
    expect(screen.getByRole('button', { name: '🔍 פתח את תיק האמן' })).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Bring Me the Horizon');
    expect(document.body).not.toHaveTextContent('Unconditional Fan');
  });
});
