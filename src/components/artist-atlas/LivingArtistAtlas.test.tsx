import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../../context/AppContext';
import mockData from '../../data/music_dna_mock.json';
import type { MusicDnaData } from '../../types';
import LivingArtistAtlas from './LivingArtistAtlas';

vi.mock('../MediaEmbedHub', () => ({
  default: ({ profile }: { profile: { artistName: string } }) => (
    <div data-testid="official-media-hub">{profile.artistName}</div>
  ),
}));

const data = mockData as unknown as MusicDnaData;

function renderAtlas(language: 'en' | 'es' | 'he' = 'en', value: MusicDnaData = data) {
  localStorage.setItem('nml_lang', language);
  return render(
    <AppProvider>
      <LivingArtistAtlas data={value} />
    </AppProvider>,
  );
}

describe('LivingArtistAtlas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.lang = 'es';
    document.documentElement.dir = 'ltr';
    delete document.documentElement.dataset.language;
  });

  it('switches artist territory and keeps third-party players behind explicit consent', async () => {
    const user = userEvent.setup();
    renderAtlas('en');

    expect(screen.getByRole('heading', { name: 'Artist territories', level: 2 })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Bring Me the Horizon', level: 3 }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('official-media-hub')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Deafheaven/i }));

    expect(screen.getAllByRole('heading', { name: 'Deafheaven', level: 3 }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('In Blur').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Infinite Granite').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('official-media-hub')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load official media' }));
    expect(await screen.findByTestId('official-media-hub')).toHaveTextContent('Deafheaven');
    expect(screen.getByRole('button', { name: 'Close media portal' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Close media portal' }));
    expect(screen.getByRole('button', { name: 'Load official media' })).toHaveFocus();
  });

  it('loads the evidence manifest only when the provenance panel is opened', async () => {
    const user = userEvent.setup();
    renderAtlas('en');

    expect(screen.queryByText('Knowledge sources')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Open evidence/i }));

    expect(await screen.findByText('Knowledge sources')).toBeInTheDocument();
    expect(screen.getByText(/linked assets/)).toBeInTheDocument();
    expect(screen.getAllByText(/License review pending|Provider-restricted use/).length).toBeGreaterThan(0);
  });

  it('requires fresh media consent and resets evidence when the artist changes', async () => {
    const user = userEvent.setup();
    renderAtlas('en');

    await user.click(screen.getByRole('button', { name: 'Load official media' }));
    expect(await screen.findByTestId('official-media-hub')).toHaveTextContent('Bring Me the Horizon');

    await user.click(screen.getByRole('button', { name: /Open evidence/i }));
    expect(await screen.findByText('Knowledge sources')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Deafheaven/i }));

    expect(screen.queryByTestId('official-media-hub')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load official media' })).toBeInTheDocument();
    expect(screen.queryByText('Knowledge sources')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open evidence/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows honest generated and catalog fallbacks for an unknown artist', () => {
    const sparseData: MusicDnaData = {
      ...data,
      top_artists: [{ name: 'Uncatalogued Signal', plays: 12, genre: 'Unclassified', country: 'Unknown' }],
      top_tracks: [],
      top_albums: [],
      core_metrics: { ...data.core_metrics, total_plays: 12 },
    };

    renderAtlas('en', sparseData);

    expect(screen.getByText('Local generative cartography')).toBeInTheDocument();
    expect(screen.getByText(/No verified gallery exists for this identity/)).toBeInTheDocument();
    expect(screen.getByText('The active archive has no aggregated tracks for this artist.')).toBeInTheDocument();
    expect(screen.getByText('The active archive has no aggregated albums for this artist.')).toBeInTheDocument();
    expect(screen.getByText('The offline catalog has no documented releases for this artist.')).toBeInTheDocument();
  });

  it('uses Hebrew copy and an RTL atlas boundary', async () => {
    const { container } = renderAtlas('he');

    expect(await screen.findByRole('heading', { name: 'מרחבי אמנים', level: 2 })).toBeInTheDocument();
    expect(container.querySelector('.artist-atlas')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('בקרת פרטיות')).toBeInTheDocument();
  });
});
