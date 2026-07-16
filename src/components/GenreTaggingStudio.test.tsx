import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import compiledData from '../data/music_dna_compiled.json';
import type { ArtistGenreCatalogEntry, GenreAssignment, MusicDnaData } from '../types';
import { AppProvider } from '../context/AppContext';
import GenreTaggingStudio from './GenreTaggingStudio';

const catalog: ArtistGenreCatalogEntry[] = [
  {
    artistKey: 'Unknown Artist',
    name: 'Unknown Artist',
    plays: 100,
    automaticGenre: 'Unclassified',
    automaticFamily: 'Unclassified',
    country: 'Unknown',
    source: 'unclassified',
  },
  {
    artistKey: 'Broad Artist',
    name: 'Broad Artist',
    plays: 60,
    automaticGenre: 'Alternative',
    automaticFamily: 'Alternative',
    country: 'Unknown',
    source: 'catalog',
  },
  {
    artistKey: 'Known Artist',
    name: 'Known Artist',
    plays: 40,
    automaticGenre: 'Post-Hardcore / Emo',
    automaticFamily: 'Post-Hardcore',
    country: 'United States',
    source: 'catalog',
  },
];

const data: MusicDnaData = {
  ...(compiledData as unknown as MusicDnaData),
  core_metrics: {
    ...(compiledData as unknown as MusicDnaData).core_metrics,
    total_plays: 200,
    unique_artists: 3,
  },
  top_artists: catalog.map(entry => ({
    name: entry.name,
    plays: entry.plays,
    genre: entry.automaticGenre,
    country: entry.country,
  })),
  top_genres: [
    { name: 'Unclassified', plays: 100 },
    { name: 'Alternative', plays: 60 },
    { name: 'Post-Hardcore', plays: 40 },
  ],
  artist_genre_catalog: catalog,
};

function renderStudio(
  assignments: GenreAssignment[] = [],
  onAssignmentsChange = vi.fn(),
) {
  return render(
    <AppProvider>
      <GenreTaggingStudio
        data={data}
        assignments={assignments}
        useBundledCatalog={false}
        onAssignmentsChange={onAssignmentsChange}
      />
    </AppProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('GenreTaggingStudio', () => {
  it('shows the impact-ranked review queue and saves a primary family with secondary tags', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    const onAssignmentsChange = vi.fn();
    renderStudio([], onAssignmentsChange);

    expect(screen.getByRole('heading', { name: '🧬 Genre Lab' })).toBeInTheDocument();
    const list = screen.getByTestId('genre-candidate-list');
    expect(within(list).getAllByRole('button')).toHaveLength(2);
    expect(within(list).getAllByRole('button')[0]).toHaveTextContent('Unknown Artist');

    await user.selectOptions(screen.getByLabelText('Primary genre family'), 'Metalcore');
    await user.click(screen.getByRole('button', { name: 'Melodic Metalcore' }));
    await user.click(screen.getByRole('button', { name: 'Save local correction' }));

    expect(onAssignmentsChange).toHaveBeenCalledTimes(1);
    expect(onAssignmentsChange.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        artistKey: 'Unknown Artist',
        artistName: 'Unknown Artist',
        family: 'Metalcore',
        tags: ['Melodic Metalcore'],
      }),
    ]);
    expect(onAssignmentsChange.mock.calls[0][1]).toBe(catalog);
    expect(screen.getByRole('status')).toHaveTextContent('Unknown Artist was classified');
  });

  it('searches accent-insensitively, filters corrections and restores automatic metadata', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    const assignment: GenreAssignment = {
      artistKey: 'Unknown Artist',
      artistName: 'Unknown Artist',
      family: 'Metalcore',
      tags: ['Electronicore'],
      updatedAt: '2026-07-14T10:00:00.000Z',
    };
    const onAssignmentsChange = vi.fn();
    renderStudio([assignment], onAssignmentsChange);

    await user.click(screen.getByRole('button', { name: 'My corrections' }));
    await user.type(screen.getByLabelText('Search artists'), 'unknown');
    expect(await screen.findByRole('group', { name: 'Unknown Artist' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore automatic genre' }));

    expect(onAssignmentsChange).toHaveBeenCalledWith([], catalog);
    expect(screen.getByRole('status')).toHaveTextContent('returned to its automatic classification');
  });

  it('renders complete Hebrew controls without leaking the English unclassified label', async () => {
    window.localStorage.setItem('nml_lang', 'he');
    renderStudio();

    expect(await screen.findByRole(
      'heading',
      { name: '🧬 מעבדת ז׳אנרים' },
      { timeout: 5_000 },
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'לא מסווג' })).toBeInTheDocument();
    expect(await screen.findByLabelText('משפחת ז׳אנר ראשית')).toBeInTheDocument();
    expect(screen.queryByText('Unclassified')).not.toBeInTheDocument();
  });
});
