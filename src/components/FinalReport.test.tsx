import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import FinalReport from './FinalReport';

vi.mock('./CountUp', () => ({
  default: ({ target }: { target: number }) => <>{target}</>,
}));

vi.mock('./MuseumPoster', () => ({
  default: () => <div data-testid="museum-poster" />,
}));

const data = musicData as unknown as MusicDnaData;

function withYears(years: number[]): MusicDnaData {
  const template = data.yearly_eras[0];
  return {
    ...data,
    yearly_eras: years.map(year => ({ ...template, year, plays: Math.max(1, template.plays) })),
  };
}

function renderReport(dataset: MusicDnaData, lang: 'en' | 'es' | 'he' = 'en') {
  window.localStorage.setItem('nml_lang', lang);
  return render(
    <AppProvider>
      <FinalReport data={dataset} />
    </AppProvider>,
  );
}

describe('FinalReport evidence-aware narrative', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('derives a one-year duration and avoids the former identity and therapy claims', () => {
    renderReport(withYears([2025]));

    const duration = screen.getByText('1 year of listening');
    expect(duration).toBeInTheDocument();
    expect(duration.closest('h3')).toHaveTextContent('can suggest');
    expect(screen.getByRole('note')).toHaveAccessibleName(
      'Creative archive reading · not a psychological assessment',
    );
    expect(screen.getByText('Mapped Patterns, Not Identity')).toBeInTheDocument();
    expect(screen.queryByText('11 years of music')).not.toBeInTheDocument();
    expect(screen.queryByText(/intimate emotional diary|language, therapy, identity|who you are according/i)).not.toBeInTheDocument();
  });

  it('derives a multi-year duration from the active archive instead of fixed copy', () => {
    renderReport(withYears([2015, 2020]));

    expect(screen.getByText('5 years of listening')).toBeInTheDocument();
  });

  it.each([
    ['es', '1 año de escucha', 'puede sugerir'],
    ['he', 'שנת האזנה אחת', 'יכולה להציע'],
  ] as const)('localizes the dynamic one-year heading in %s', async (lang, duration, conclusion) => {
    renderReport(withYears([2025]), lang);

    const durationText = await screen.findByText(duration);
    expect(durationText).toBeInTheDocument();
    expect(durationText.closest('h3')).toHaveTextContent(conclusion);
  });
});
