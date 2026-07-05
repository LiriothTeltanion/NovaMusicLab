import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YearlyErasTable from './YearlyErasTable';
import { AppProvider } from '../context/AppContext';
import type { YearlyEra } from '../types';

const eras: YearlyEra[] = [
  { year: 2020, plays: 100, unique_artists: 10, unique_tracks: 40, top_artist: 'Artista A', top_track: 'Track A', dominant_daypart: 'Night 18-23', era_label: 'Era A', era_desc: '', diversity_index: 12.5 },
  { year: 2021, plays: 300, unique_artists: 30, unique_tracks: 90, top_artist: 'Artista B', top_track: 'Track B', dominant_daypart: 'Morning 06-11', era_label: 'Era B', era_desc: '', diversity_index: 22.1 },
  { year: 2022, plays: 200, unique_artists: 20, unique_tracks: 60, top_artist: 'Artista C', top_track: 'Track C', dominant_daypart: 'Afternoon 12-17', era_label: 'Era C', era_desc: '', diversity_index: 17.3 },
];

function yearColumn(): number[] {
  return screen.getAllByRole('row').slice(1).map(row =>
    Number(within(row).getAllByRole('cell')[0].textContent)
  );
}

describe('YearlyErasTable', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders one row per era sorted by year ascending by default', () => {
    render(
      <AppProvider>
        <YearlyErasTable eras={eras} />
      </AppProvider>
    );
    expect(yearColumn()).toEqual([2020, 2021, 2022]);
  });

  it('sorts by plays descending when the plays header is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <YearlyErasTable eras={eras} />
      </AppProvider>
    );

    await user.click(screen.getByRole('button', { name: /Ordenar por Plays/i }));
    expect(yearColumn()).toEqual([2021, 2022, 2020]);

    // Second click flips direction.
    await user.click(screen.getByRole('button', { name: /Ordenar por Plays/i }));
    expect(yearColumn()).toEqual([2020, 2022, 2021]);
  });

  it('notifies the parent when a row is clicked', async () => {
    const user = userEvent.setup();
    const onSelectYear = vi.fn();
    render(
      <AppProvider>
        <YearlyErasTable eras={eras} selectedYear={2020} onSelectYear={onSelectYear} />
      </AppProvider>
    );

    await user.click(screen.getByText('Artista B'));
    expect(onSelectYear).toHaveBeenCalledWith(2021);
  });
});
