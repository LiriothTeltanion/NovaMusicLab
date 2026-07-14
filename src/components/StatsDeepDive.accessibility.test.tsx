import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatsDeepDive from './StatsDeepDive';
import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';

vi.mock('recharts', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Empty = () => null;
  return {
    ResponsiveContainer: Container,
    BarChart: Container,
    Bar: Container,
    XAxis: Empty,
    YAxis: Empty,
    Tooltip: Empty,
    Cell: Empty,
    RadarChart: Container,
    PolarGrid: Empty,
    PolarAngleAxis: Empty,
    Radar: Empty,
    AreaChart: Container,
    Area: Empty,
    CartesianGrid: Empty,
    Treemap: Empty,
  };
});
vi.mock('./DailyHeatmap', () => ({ default: () => null }));
vi.mock('./YearlyErasTable', () => ({ default: () => null }));
vi.mock('./GenreArt', () => ({ default: () => null }));
vi.mock('./CountUp', () => ({ default: ({ target }: { target: number }) => <>{target}</> }));
vi.mock('./SectionNarrative', () => ({ default: () => null }));
vi.mock('./chartKit', () => ({
  axisProps: () => ({}),
  gridStroke: () => '#000',
  useChartAnimation: () => ({ isAnimationActive: false }),
  ChartFrame: ({ children }: PropsWithChildren) => <div>{children}</div>,
  ChartCanvas: ({ children }: PropsWithChildren) => <div>{children}</div>,
  ChartSwap: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

const data = defaultMusicData as unknown as MusicDnaData;

describe('StatsDeepDive monthly matrix accessibility', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('uses one keyboard stop per year instead of one per month', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <StatsDeepDive data={data} />
      </AppProvider>,
    );

    const yearRows = screen.getAllByRole('button', { name: /Show \d{4} monthly breakdown/i });
    const monthCells = Array.from(document.querySelectorAll('[title*="plays"]'));
    expect(yearRows).toHaveLength(data.yearly_eras.length);
    expect(monthCells).toHaveLength(data.yearly_eras.length * 12);
    expect(monthCells.every(cell => !cell.hasAttribute('tabindex'))).toBe(true);
    expect(monthCells.every(cell => cell.getAttribute('aria-hidden') === 'true')).toBe(true);

    const targetRow = yearRows[0];
    targetRow.focus();
    await user.keyboard('{Enter}');
    expect(targetRow).toHaveAttribute('aria-pressed', 'true');
  });

  it('labels each annual stop in Spanish', () => {
    window.localStorage.setItem('nml_lang', 'es');
    render(
      <AppProvider>
        <StatsDeepDive data={data} />
      </AppProvider>,
    );

    expect(screen.getAllByRole('button', { name: /Ver desglose mensual de \d{4}/i }))
      .toHaveLength(data.yearly_eras.length);
  });
});
