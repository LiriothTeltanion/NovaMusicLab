import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import ArtistLeaderboard, { type ArtistLeaderboardEntry } from './ArtistLeaderboard';

const artists: ArtistLeaderboardEntry[] = Array.from({ length: 12 }, (_, index) => ({
  name: `Artist ${index + 1}`,
  plays: 1_200 - index * 75,
  genre: index === 0 ? 'Progressive Metal / Atmospheric Post-Hardcore' : `Genre ${index + 1}`,
  moodColor: index % 2 === 0 ? '#00f2fe' : '#f72585',
}));

const copy = {
  listLabel: 'Top 10 artists',
  empty: 'No artist data is available yet.',
  plays: 'plays',
  archiveShare: 'of the archive',
  openArtist: (rank: number, name: string) => `Open rank ${rank}: ${name}`,
};

function renderLeaderboard(
  entries: ArtistLeaderboardEntry[],
  onArtistOpen = vi.fn(),
) {
  render(
    <AppProvider>
      <ArtistLeaderboard
        artists={entries}
        totalArchivePlays={20_000}
        locale="en-US"
        summary={`Top ${Math.min(entries.length, 10)} of ${entries.length}`}
        copy={copy}
        accentColor="#00f2fe"
        onArtistOpen={onArtistOpen}
      />
    </AppProvider>,
  );

  return onArtistOpen;
}

describe('ArtistLeaderboard', () => {
  afterEach(() => cleanup());

  it('renders one responsive semantic list with exactly the ordered top 10', () => {
    renderLeaderboard(artists);

    const leaderboard = screen.getByTestId('artist-leaderboard');
    const rows = within(leaderboard).getAllByTestId('artist-leaderboard-row');

    expect(rows).toHaveLength(10);
    expect(rows.map(row => row.dataset.rank)).toEqual(
      Array.from({ length: 10 }, (_, index) => String(index + 1)),
    );
    expect(rows.map(row => row.dataset.artist)).toEqual(
      artists.slice(0, 10).map(artist => artist.name),
    );
    expect(screen.queryByText('Artist 11')).not.toBeInTheDocument();
    expect(leaderboard.className).not.toMatch(/(?:^|:)hidden/);
  });

  it('opens the requested dossier with native Enter and Space keyboard activation', async () => {
    const user = userEvent.setup();
    const onArtistOpen = renderLeaderboard(artists);
    const first = screen.getByRole('button', { name: /open rank 1: artist 1/i });
    const second = screen.getByRole('button', { name: /open rank 2: artist 2/i });

    first.focus();
    await user.keyboard('{Enter}');
    second.focus();
    await user.keyboard(' ');

    expect(onArtistOpen).toHaveBeenNthCalledWith(1, 'Artist 1');
    expect(onArtistOpen).toHaveBeenNthCalledWith(2, 'Artist 2');
  });

  it('uses a localized empty state instead of rendering an empty chart', () => {
    renderLeaderboard([]);

    expect(screen.getByRole('status')).toHaveTextContent(copy.empty);
    expect(screen.queryByRole('list', { name: copy.listLabel })).not.toBeInTheDocument();
  });
});
