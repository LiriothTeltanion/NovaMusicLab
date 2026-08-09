import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARTIST_ATLAS_COPY } from './atlasCopy';
import ArtistMediaStage from './ArtistMediaStage';

vi.mock('../MoodArtCanvas', () => ({
  default: () => <div data-testid="mood-art-fallback" aria-hidden="true" />,
}));

function renderStage(artistName: string) {
  return render(
    <ArtistMediaStage
      artistName={artistName}
      photos={[]}
      fallbackMood="energia"
      copy={ARTIST_ATLAS_COPY.en}
      accent="#22d3ee"
    />,
  );
}

describe('ArtistMediaStage portrait fallbacks', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses the reviewed open-knowledge portrait when no gallery exists', () => {
    renderStage('Bring Me the Horizon');

    const portrait = screen.getByRole('img', { name: 'Bring Me the Horizon' });
    expect(portrait).toHaveAttribute('src', expect.stringContaining('upload.wikimedia.org'));
    expect(portrait).toHaveAttribute('referrerpolicy', 'no-referrer');

    fireEvent.load(portrait);
    expect(screen.getByText('Remote artwork · wikimedia')).toBeInTheDocument();
    expect(screen.queryByText(/No verified gallery exists/)).not.toBeInTheDocument();
  });

  it('loads an existing long-tail portrait index entry without fetching new metadata', async () => {
    renderStage('Arizona Zervas');

    const portrait = await screen.findByRole(
      'img',
      { name: 'Arizona Zervas' },
      { timeout: 8_000 },
    );
    expect(portrait).toHaveAttribute('src', expect.stringContaining('cdn-images.dzcdn.net'));
    expect(portrait).toHaveAttribute('referrerpolicy', 'no-referrer');

    fireEvent.load(portrait);
    expect(screen.getByText('Remote artwork · deezer')).toBeInTheDocument();
    expect(screen.queryByText(/No verified gallery exists/)).not.toBeInTheDocument();
  }, 10_000);

  it('returns to the honest generated state after every available portrait variant fails', async () => {
    renderStage('Arizona Zervas');

    const optimized = await screen.findByRole(
      'img',
      { name: 'Arizona Zervas' },
      { timeout: 8_000 },
    );
    fireEvent.error(optimized);

    // Some providers already expose the requested size, so optimized and
    // original can be the same URL. If they differ, fail the original too;
    // either way the stage must eventually settle on its honest local canvas.
    const original = screen.queryByRole('img', { name: 'Arizona Zervas' });
    if (original) fireEvent.error(original);

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: 'Arizona Zervas' })).not.toBeInTheDocument();
    });
    expect(screen.getByText(ARTIST_ATLAS_COPY.en.generatedFallback)).toBeInTheDocument();
    expect(screen.getByText(/No verified gallery exists/)).toBeInTheDocument();
  }, 10_000);
});
