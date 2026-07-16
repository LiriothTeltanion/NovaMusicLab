import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import CulturalMap from './CulturalMap';

vi.mock('./InteractiveGlobe', () => ({
  default: ({ selectedCountry }: { selectedCountry: string | null }) => (
    <output data-testid="globe-selected-country">{selectedCountry ?? 'none'}</output>
  ),
}));

const data = musicData as unknown as MusicDnaData;

describe('CulturalMap responsive structure', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nml_lang', 'en');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('uses fluid auto-fit cards and defers the analytical split until xl', () => {
    render(
      <AppProvider>
        <CulturalMap data={data} />
      </AppProvider>,
    );

    const layout = screen.getByTestId('cultural-map');
    const countryGrid = screen.getByTestId('cultural-country-grid');
    const analysisGrid = screen.getByTestId('cultural-analysis-grid');
    const cards = screen.getAllByTestId('cultural-country-card');

    expect(layout).toHaveClass('min-w-0');
    expect(countryGrid).toHaveClass('min-w-0');
    expect(countryGrid.style.gridTemplateColumns).toBe(
      'repeat(auto-fit, minmax(min(100%, 166px), 1fr))',
    );
    expect(countryGrid).not.toHaveClass('grid-cols-2', 'md:grid-cols-3');
    expect(analysisGrid).toHaveClass(
      'grid-cols-1',
      'xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]',
    );
    expect(analysisGrid.className).not.toMatch(/(?:^|\s)lg:grid-cols/);
    cards.forEach(card => expect(card).toHaveClass('min-h-32', 'min-w-0', 'w-full'));
  });

  it('keeps every country card structurally stable while selection toggles', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <CulturalMap data={data} />
      </AppProvider>,
    );

    const countryGrid = screen.getByTestId('cultural-country-grid');
    const cards = screen.getAllByTestId('cultural-country-card');
    const firstCard = cards[0];
    const initialGridChildren = countryGrid.childElementCount;
    const initialCardChildren = firstCard.childElementCount;
    const countryName = firstCard.getAttribute('aria-label')?.split(' · ')[0] ?? '';

    expect(firstCard).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('globe-selected-country')).toHaveTextContent('none');

    await user.click(firstCard);

    expect(firstCard).toHaveAttribute('aria-pressed', 'true');
    expect(countryGrid.childElementCount).toBe(initialGridChildren);
    expect(firstCard.childElementCount).toBe(initialCardChildren);
    expect(screen.getByTestId('globe-selected-country')).toHaveTextContent(countryName);

    await user.click(firstCard);
    expect(firstCard).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('globe-selected-country')).toHaveTextContent('none');
  });

  it('derives visitor geography without leaking flagship roots, scenes or conclusions', () => {
    const visitorData = {
      ...data,
      core_metrics: { ...data.core_metrics, total_plays: 1_000 },
      artist_origin_countries: [
        { country: 'Japan', plays: 700 },
        { country: 'Australia', plays: 300 },
      ],
      countries: [{ country: 'JP', plays: 1_000 }],
    } satisfies MusicDnaData;

    render(
      <AppProvider>
        <CulturalMap data={visitorData} isPersonalArchive />
      </AppProvider>,
    );

    expect(screen.getByText('Map the music without inventing the listener.')).toBeInTheDocument();
    expect(screen.getByText('Artist-origin footprint')).toBeInTheDocument();
    expect(screen.getAllByText(/Japan/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Australia/).length).toBeGreaterThan(0);
    expect(screen.getByText(/not a claim about the listener’s nationality or personal identity/i)).toBeInTheDocument();
    expect(screen.getByText(/does not prove a song’s language/i)).toBeInTheDocument();
    expect(screen.queryByText(/Venezuelan roots/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Israeli experience/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nordic melancholic guitars/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Israeli Rock/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cyberpunk Darksynth/i)).not.toBeInTheDocument();
  });
});
