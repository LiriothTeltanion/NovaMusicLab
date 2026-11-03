import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import OnThisDay from './OnThisDay';

const base = musicData as unknown as MusicDnaData;
const NOW = new Date(2025, 10, 3, 12, 0, 0);

function synthetic(overrides: Partial<MusicDnaData> = {}): MusicDnaData {
  return {
    ...base,
    snapshot_freshness: {
      observedFrom: '2019-01-01',
      observedThrough: '2025-11-03',
      datasetGeneratedAt: '2025-11-04T00:00:00.000Z',
      enrichmentGeneratedAt: null,
      recentPulseSyncedAt: null,
      liveConnection: false,
    },
    daily_plays: { '2019-11-03': 7, '2021-11-03': 21, '2021-11-04': 3, '2025-11-03': 2 },
    obsessions: [{ artist: 'Synthetic Loop Band', track: 'Echo Chamber', date: '2021-11-03', count: 14 }],
    ...overrides,
  };
}

function renderRoom(data: MusicDnaData) {
  return render(
    <AppProvider>
      <OnThisDay data={data} now={NOW} />
    </AppProvider>,
  );
}

describe('OnThisDay room', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nml_lang', 'en');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('reads the selected date year by year with observed zeros', () => {
    renderRoom(synthetic());

    expect(screen.getByRole('heading', { level: 2, name: 'November 3' })).toBeInTheDocument();
    const years = within(screen.getByTestId('on-this-day-years'));
    expect(years.getByText(/30 plays across 7 years/)).toBeInTheDocument();
    expect(years.getByText(/Loudest year: 2021/)).toBeInTheDocument();
    expect(years.getAllByText('silent')).toHaveLength(4);
    expect(within(screen.getByTestId('on-this-day-loops')).getByText('Echo Chamber')).toBeInTheDocument();
  });

  it('renders first listens as unavailable when the archive does not carry them', () => {
    const { artist_first_listens: _omitted, ...withoutFirstListens } = synthetic();
    renderRoom(withoutFirstListens as MusicDnaData);

    const section = within(screen.getByTestId('on-this-day-first-listens'));
    expect(section.getByText('First-listen dates are not part of this archive yet.')).toBeInTheDocument();
    expect(screen.getByTestId('on-this-day-first-listens').querySelector('[data-evidence="unavailable"]')).not.toBeNull();
    expect(section.queryByRole('button')).toBeNull();
  });

  it('lists derived first listens and steps to other days from the keyboard', async () => {
    const user = userEvent.setup();
    renderRoom(synthetic({
      artist_first_listens: [
        { name: 'Synthetic Discovery', first_date: '2019-11-03', plays: 42 },
        { name: 'Tomorrow Band', first_date: '2022-11-04', plays: 5 },
      ],
    }));

    const section = within(screen.getByTestId('on-this-day-first-listens'));
    expect(section.getByRole('button', { name: 'Open Synthetic Discovery in the Atlas' })).toBeInTheDocument();
    expect(section.getByText(/First played in 2019 · 6 years ago/)).toBeInTheDocument();
    expect(section.getByText('42 plays since')).toBeInTheDocument();

    const todayButton = screen.getByRole('button', { name: 'Today' });
    expect(todayButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next day' }));
    expect(screen.getByRole('heading', { level: 2, name: 'November 4' })).toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Open Tomorrow Band in the Atlas' })).toBeInTheDocument();
    expect(todayButton).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(screen.getByRole('heading', { level: 2, name: 'November 2' })).toBeInTheDocument();
    expect(section.getByText('Coming up this week')).toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Open Synthetic Discovery in the Atlas' })).toBeInTheDocument();
  });

  it('states that day-level plays are unavailable instead of inventing zeros', () => {
    const { daily_plays: _omitted, ...withoutDaily } = synthetic();
    renderRoom(withoutDaily as MusicDnaData);

    expect(screen.getByText(/has no day-level plays/)).toBeInTheDocument();
  });

  it('speaks Spanish and Hebrew with the right direction', async () => {
    localStorage.setItem('nml_lang', 'es');
    renderRoom(synthetic());
    expect(screen.getByRole('heading', { level: 2, name: '3 de noviembre' })).toBeInTheDocument();
    expect(screen.getByText('Esta fecha, año por año')).toBeInTheDocument();
    cleanup();

    localStorage.setItem('nml_lang', 'he');
    renderRoom(synthetic());
    expect(await screen.findByText('התאריך הזה, שנה אחר שנה')).toBeInTheDocument();
    expect(screen.getByTestId('on-this-day-room')).toHaveAttribute('dir', 'rtl');
  });
});
