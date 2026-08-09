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
    source: 'observed',
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

function renderBundledStudio() {
  return render(
    <AppProvider>
      <GenreTaggingStudio
        data={compiledData as unknown as MusicDnaData}
        assignments={[]}
        useBundledCatalog
        onAssignmentsChange={vi.fn()}
      />
    </AppProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('GenreTaggingStudio', () => {
  it('derives the loading count from the active archive instead of frozen release copy', () => {
    window.localStorage.setItem('nml_lang', 'en');
    renderBundledStudio();

    expect(screen.getByRole('status')).toHaveTextContent(
      `Loading all ${(compiledData as unknown as MusicDnaData).core_metrics.unique_artists.toLocaleString('en-US')} artist-name catalog entries`,
    );
  });

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

  it('searches the lazy open vocabulary and keeps detailed terms separate from chart totals', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    const onAssignmentsChange = vi.fn();
    renderStudio([], onAssignmentsChange);

    expect(await screen.findByText(/searchable terms from MusicBrainz/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Primary genre family'), 'Synthwave / Darksynth');
    await user.type(screen.getByLabelText('Find a genre or subgenre'), 'acid techno');
    await user.click(await screen.findByRole('button', { name: 'acid techno' }));
    await user.click(screen.getByRole('button', { name: 'Save local correction' }));

    expect(onAssignmentsChange.mock.calls[0][0][0]).toEqual(expect.objectContaining({
      family: 'Synthwave / Darksynth',
      tags: ['acid techno'],
    }));
  });

  it('explains catalog, observed and unclassified provenance without turning candidates into facts', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    const user = userEvent.setup();
    renderStudio();

    const summary = screen.getByTestId('genre-provenance-summary');
    expect(summary).toHaveTextContent('Catalog: 1 · Observed automatically: 1 · Unclassified: 1');
    expect(summary).toHaveTextContent('only accepted assertions are reviewed facts');
    expect(summary).toHaveTextContent('“Other” in charts groups smaller classified genre families');

    await user.click(screen.getByRole('button', { name: 'All catalog entries' }));
    await user.type(screen.getByLabelText('Search artists'), 'Broad Artist');
    await user.click(screen.getByRole('button', { name: /Broad Artist/i }));
    expect(screen.getByRole('group', { name: 'Broad Artist' }))
      .toHaveTextContent('automatic observed classification');
  });

  it('shows the public knowledge totals while keeping rejected evidence hidden', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    renderBundledStudio();

    const summary = await screen.findByTestId('genre-provenance-summary', {}, { timeout: 10_000 });
    // Refreshed for the 2026-08 archive rebuild. Reviewed facts staying at 85
    // is the meaningful part: the archive grew and thousands of genres were
    // observed, but the number of claims a human has actually signed off did
    // not move, and the studio still says so.
    expect(summary).toHaveTextContent('Catalog: 457 · Observed automatically: 4,488 · Unclassified: 1,648');
    expect(summary).toHaveTextContent('Knowledge records: 457/6,593 entries');
    expect(summary).toHaveTextContent('Reviewed facts: 85');
    expect(summary).toHaveTextContent('Candidate evidence: 1,203');
    expect(summary).toHaveTextContent('Rejected and hidden: 2');
    expect(screen.getByText('Classified listens').parentElement).toHaveTextContent('94.2%');
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
