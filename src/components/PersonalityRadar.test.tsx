import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import PersonalityRadar from './PersonalityRadar';

vi.mock('recharts', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Empty = () => null;
  return {
    ResponsiveContainer: Container,
    RadarChart: Container,
    PolarGrid: Empty,
    PolarAngleAxis: Empty,
    Radar: Empty,
  };
});

vi.mock('./chartKit', () => ({
  useChartAnimation: () => ({ isAnimationActive: false }),
}));

const data = musicData as unknown as MusicDnaData;

function renderRadar(lang: 'en' | 'es' | 'he' = 'en') {
  window.localStorage.setItem('nml_lang', lang);
  return render(
    <AppProvider>
      <PersonalityRadar data={data} />
    </AppProvider>,
  );
}

describe('PersonalityRadar interpretive boundaries', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('presents archive signals rather than a personality or wellbeing score', () => {
    renderRadar();

    expect(screen.getByRole('note')).toHaveAccessibleName(
      'Creative archive reading · not a psychological assessment',
    );
    expect(screen.getByText('Archive Signal Map')).toBeInTheDocument();
    expect(screen.getByText('0–100 reflects mapped archive evidence, not a score for the listener.')).toBeInTheDocument();
    expect(screen.getByText('Possible musical appeal')).toBeInTheDocument();
    expect(screen.getByText('Possible musical tension')).toBeInTheDocument();
    expect(screen.getByText('Listening prompt')).toBeInTheDocument();
    expect(screen.queryByText(/wellbeing tip|shadow side|musical identity radar/i)).not.toBeInTheDocument();
  });

  it('loads the same explicit boundary in Hebrew RTL', async () => {
    renderRadar('he');

    expect(await screen.findByText('מפת אותות הארכיון')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('0–100 משקף עדות ממופה מן הארכיון, לא ציון למאזין.')).toBeInTheDocument();
  });
});
