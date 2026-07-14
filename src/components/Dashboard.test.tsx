import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import Dashboard from './Dashboard';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import { buildGenreDistribution } from '../utils/chartIntegrity';

const data = musicData as unknown as MusicDnaData;

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders successfully with real fixture data', () => {
    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    // "Personal Records" / "Récords Personales" heading should always be present
    // regardless of language, confirming the component rendered without throwing.
    expect(
      screen.getByText(/personal records|récords personales/i)
    ).toBeInTheDocument();
  });

  it('shows English KPI labels when nml_lang is set to "en"', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    expect(screen.getByText('Total Plays')).toBeInTheDocument();
    expect(screen.getByText('Hours Listened')).toBeInTheDocument();
  });

  it('shows Spanish KPI labels when nml_lang is set to "es"', () => {
    localStorage.setItem('nml_lang', 'es');

    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    expect(screen.getByText('Plays Totales')).toBeInTheDocument();
    expect(screen.getByText('Horas Escuchadas')).toBeInTheDocument();
  });

  it('localizes synthetic genre buckets and heatmap units in Hebrew', async () => {
    localStorage.setItem('nml_lang', 'he');
    const genreFixture = {
      ...data,
      core_metrics: { ...data.core_metrics, total_plays: 100 },
      top_genres: [
        { name: 'Unclassified', plays: 30 },
        { name: 'Metalcore', plays: 15 },
        { name: 'Post-Hardcore', plays: 10 },
        { name: 'Alternative', plays: 9 },
        { name: 'Hard Rock', plays: 8 },
        { name: 'Israeli Rock', plays: 7 },
        { name: 'Death Metal', plays: 6 },
        { name: 'Ambient / Lo-Fi', plays: 5 },
        { name: 'Pop / Indie', plays: 4 },
        { name: 'Folk Metal', plays: 6 },
      ],
    } as MusicDnaData;

    render(
      <AppProvider>
        <Dashboard data={genreFixture} />
      </AppProvider>
    );

    const layout = await screen.findByTestId('dashboard-layout');

    expect(layout).toHaveTextContent('לא מסווג');
    expect(layout).toHaveTextContent('אחר');
    expect(screen.queryByText('Unclassified')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /פתיחת מעבדת הז׳אנרים לסיווג/ }))
      .toHaveClass('min-h-11');
    expect(screen.getByTestId('dashboard-mobile-heatmap').querySelector('[title]'))
      .toHaveAttribute('title', expect.stringContaining('השמעות'));
  });

  it('exposes the editorial protagonist and analytical chapters accessibly', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    expect(
      screen.getByRole('region', { name: 'A life measured in music' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open .+ in top artists/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /listening intensity by year/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Taste architecture' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Time signature' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The long arc' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Personal milestones' })).toBeInTheDocument();

    const tasteHeading = screen.getByRole('heading', { name: 'Taste architecture' });
    const supportingHeading = screen.getByRole('heading', { name: 'Supporting signals' });
    expect(
      tasteHeading.compareDocumentPosition(supportingHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('provides purpose-built responsive ranking, heatmap and metric layouts', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    const layout = screen.getByTestId('dashboard-layout');
    expect(layout).toHaveClass('min-w-0', 'overflow-x-clip');

    const ranking = screen.getByTestId('artist-leaderboard');
    const rankingRows = within(ranking).getAllByTestId('artist-leaderboard-row');
    const rankingButtons = within(ranking).getAllByRole('button');
    expect(rankingRows).toHaveLength(10);
    expect(rankingButtons).toHaveLength(10);
    expect(ranking).not.toHaveClass('hidden', 'md:hidden');
    expect(rankingRows.map(row => row.dataset.artist)).toEqual(
      data.top_artists.slice(0, 10).map(artist => artist.name)
    );
    rankingButtons.forEach(button => expect(button).toHaveClass('min-h-[68px]'));

    const genreLegend = screen.getByTestId('dashboard-genre-legend');
    const expectedGenreRows = buildGenreDistribution(
      data.top_genres,
      data.core_metrics.total_plays,
      8,
    ).rows;
    expect(genreLegend).not.toHaveClass('max-h-40', 'overflow-y-auto');
    expect(genreLegend.children).toHaveLength(expectedGenreRows.length);
    expect(expectedGenreRows).toHaveLength(9);

    const mobileHeatmap = screen.getByTestId('dashboard-mobile-heatmap');
    expect(mobileHeatmap).toHaveClass('sm:hidden', 'min-w-0');
    expect(mobileHeatmap).toHaveAttribute('role', 'img');
    expect(mobileHeatmap.querySelectorAll('[title]')).toHaveLength(7 * 24);
    expect(screen.getByTestId('dashboard-desktop-heatmap')).toHaveClass('hidden', 'sm:block', 'overflow-x-auto');

    expect(screen.getByTestId('dashboard-supporting-grid')).toHaveClass('grid-cols-2', 'sm:grid-cols-3');
    expect(screen.getByTestId('dashboard-advanced-grid')).toHaveClass('grid-cols-1', 'min-[380px]:grid-cols-2');
    expect(screen.getByTestId('dashboard-record-grid')).toHaveClass('grid-cols-1', 'min-[380px]:grid-cols-2');
    expect(screen.getByTestId('dashboard-total-pulse')).toHaveClass(
      'min-[380px]:grid-cols-[minmax(0,1fr)_minmax(6.5rem,0.42fr)]'
    );
  });

  it('stacks the annual pulse when a large archive count would crowd the metric', () => {
    const largeArchive = {
      ...data,
      core_metrics: {
        ...data.core_metrics,
        total_plays: 1_000_000,
      },
    } as MusicDnaData;

    render(
      <AppProvider>
        <Dashboard data={largeArchive} />
      </AppProvider>
    );

    expect(screen.getByTestId('dashboard-total-pulse')).not.toHaveClass(
      'min-[380px]:grid-cols-[minmax(0,1fr)_minmax(6.5rem,0.42fr)]'
    );
  });

  it('uses the real Top N and provides a useful empty state', () => {
    localStorage.setItem('nml_lang', 'en');
    const sparseArchive = {
      ...data,
      top_artists: data.top_artists.slice(0, 3),
    } as MusicDnaData;

    const { rerender } = render(
      <AppProvider>
        <Dashboard data={sparseArchive} />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { name: 'Top 3 All-Time Artists' })).toBeInTheDocument();
    expect(screen.getAllByTestId('artist-leaderboard-row')).toHaveLength(3);
    expect(screen.getByText(/top 3 of 3/i)).toBeInTheDocument();

    rerender(
      <AppProvider>
        <Dashboard data={{ ...data, top_artists: [] } as MusicDnaData} />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { name: 'Top artists' })).toBeInTheDocument();
    expect(screen.getByTestId('artist-leaderboard-empty')).toHaveTextContent(
      'Your archive does not contain enough artist data'
    );
  });
});
