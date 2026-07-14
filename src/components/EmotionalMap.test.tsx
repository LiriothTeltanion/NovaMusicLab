import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import EmotionalMap from './EmotionalMap';
import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';

vi.mock('recharts', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const ResponsiveContainer = ({ children, minWidth }: PropsWithChildren<{ minWidth?: number }>) => (
    <div data-testid="scatter-responsive-container" data-min-width={minWidth}>{children}</div>
  );
  const Scatter = ({
    children,
    data,
    ...props
  }: PropsWithChildren<{ data?: unknown[]; 'data-testid'?: string }>) => (
    <div data-testid={props['data-testid'] ?? 'scatter-series'} data-count={data?.length ?? 0}>{children}</div>
  );
  const Empty = () => null;
  return {
    ResponsiveContainer,
    ScatterChart: Container,
    Scatter,
    XAxis: Empty,
    YAxis: Empty,
    ZAxis: Empty,
    Tooltip: Empty,
    Cell: Empty,
  };
});

vi.mock('./chartKit', () => ({
  axisProps: () => ({}),
  useChartAnimation: () => ({ isAnimationActive: false }),
}));
vi.mock('./SectionNarrative', () => ({ default: () => <div data-testid="narrative-placeholder" /> }));
vi.mock('./SectionQuickRead', () => ({ default: () => <div data-testid="quick-read-placeholder" /> }));
vi.mock('./EmotionalTimeline', () => ({ default: () => <div data-testid="timeline-placeholder" /> }));
vi.mock('./ExpandableInsightCard', () => ({ default: () => <div data-testid="insight-placeholder" /> }));
vi.mock('./MoodArtCanvas', () => ({ default: () => <div data-testid="mood-art-placeholder" /> }));
vi.mock('./CoverArt', () => ({ default: ({ title }: { title: string }) => <span>{title}</span> }));
vi.mock('./ArtistAvatar', () => ({ default: ({ name }: { name: string }) => <span data-avatar={name} /> }));

const data = defaultMusicData as unknown as MusicDnaData;

function renderMap() {
  return render(
    <AppProvider>
      <EmotionalMap data={data} />
    </AppProvider>,
  );
}

describe('EmotionalMap primary workspace', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('places the complete responsive constellation before the engine summary', () => {
    renderMap();

    const workspace = screen.getByTestId('emotional-scatter-workspace');
    const engine = screen.getByTestId('emotional-engine-summary');
    const selector = screen.getByRole('group', { name: 'Emotional state selector' });

    expect(workspace.compareDocumentPosition(engine) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(workspace).toHaveClass('min-w-0');
    expect(screen.getByTestId('emotional-scatter-series')).toHaveAttribute('data-count', '14');
    expect(screen.getByTestId('scatter-responsive-container')).toHaveAttribute('data-min-width', '0');
    expect(within(workspace).getAllByRole('listitem')).toHaveLength(14);
    expect(within(selector).getAllByRole('button')).toHaveLength(8);
    within(selector).getAllByRole('button').forEach(button => {
      expect(button).not.toHaveClass('truncate');
      expect(button).toHaveClass('whitespace-normal');
    });
  });

  it('keeps chart geometry LTR when the surrounding museum is Hebrew RTL', async () => {
    window.localStorage.setItem('nml_lang', 'he');
    renderMap();

    expect(await screen.findByTestId('emotional-map')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('emotional-scatter-plot')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('emotional-scatter-plot')).toHaveClass('nova-data-ltr');
    expect(screen.getByText(/מוצגים · .* נותחו/)).toBeInTheDocument();
  });
});
