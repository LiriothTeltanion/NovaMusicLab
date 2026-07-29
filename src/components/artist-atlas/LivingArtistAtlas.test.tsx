import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../../context/AppContext';
import { ExperienceProvider } from '../../context/ExperienceContext';
import mockData from '../../data/music_dna_mock.json';
import type { MusicDnaData } from '../../types';
import LivingArtistAtlas from './LivingArtistAtlas';

vi.mock('../MediaEmbedHub', () => ({
  default: ({ profile }: { profile: { artistName: string } }) => (
    <div data-testid="official-media-hub">{profile.artistName}</div>
  ),
}));

const data = mockData as unknown as MusicDnaData;
const dataWithMusicBee: MusicDnaData = {
  ...data,
  musicbee_snapshot: {
    schema_version: 1,
    source: 'musicbee_itunes_xml',
    library_item_count: 3,
    track_count: 3,
    duplicate_item_count: 0,
    artist_count: 1,
    album_count: 1,
    played_track_count: 3,
    rated_track_count: 1,
    total_play_count: 42,
    total_skip_count: 2,
    latest_played_at: '2026-07-20T18:00:00.000Z',
    tracks: [],
    artists: [{
      name: data.top_artists[0].name,
      track_count: 3,
      album_count: 1,
      total_play_count: 42,
      total_skip_count: 2,
      last_played_at: '2026-07-20T18:00:00.000Z',
      genres: ['Metal'],
    }],
    albums: [],
    capabilities: {
      catalog: true,
      aggregate_play_counts: true,
      last_played: true,
      exact_event_timeline: false,
      sessions: false,
    },
    limitations: ['aggregate_counts_not_timeline'],
  },
};

function renderAtlas(
  language: 'en' | 'es' | 'he' = 'en',
  value: MusicDnaData = data,
  depth: 'guided' | 'explore' | 'deep-dive' = 'explore',
) {
  localStorage.setItem('nml_lang', language);
  localStorage.setItem('nml_experience_depth', depth);
  return render(
    <AppProvider>
      <ExperienceProvider>
        <LivingArtistAtlas data={value} />
      </ExperienceProvider>
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
    const { container } = renderAtlas('en');
    const artistRail = container.querySelector<HTMLElement>('.artist-atlas__rail');
    const artistHero = container.querySelector<HTMLElement>('.artist-atlas__hero');
    const mediaGate = container.querySelector<HTMLElement>('.artist-atlas__media-gate');

    expect(artistRail).not.toBeNull();
    expect(artistHero).not.toBeNull();
    expect(mediaGate).not.toBeNull();
    if (!artistRail || !artistHero || !mediaGate) return;

    expect(screen.getByRole('heading', { name: 'Artist territories', level: 2 })).toBeInTheDocument();
    expect(within(artistHero).getByRole('heading', { name: 'Bring Me the Horizon', level: 3 })).toBeInTheDocument();
    expect(within(artistHero).getByTestId('artist-factual-intro')).toHaveTextContent(/listening history.*rank #1/i);
    expect(await within(artistHero).findByText(
      'A Nova editorial reading based on the active listening history; it does not replace an external biography.',
    )).toBeInTheDocument();
    expect(screen.queryByTestId('official-media-hub')).not.toBeInTheDocument();

    await user.click(within(artistRail).getByRole('button', { name: /Deafheaven/i }));

    expect(within(artistHero).getByRole('heading', { name: 'Deafheaven', level: 3 })).toBeInTheDocument();
    expect(screen.getAllByText('In Blur').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Infinite Granite').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('official-media-hub')).not.toBeInTheDocument();

    await user.click(within(mediaGate).getByRole('button', { name: 'Load official media' }));
    expect(await screen.findByTestId('official-media-hub')).toHaveTextContent('Deafheaven');
    expect(within(mediaGate).getByRole('button', { name: 'Close media portal' })).toHaveFocus();

    await user.click(within(mediaGate).getByRole('button', { name: 'Close media portal' }));
    expect(within(mediaGate).getByRole('button', { name: 'Load official media' })).toHaveFocus();
  });

  it('loads the evidence manifest only when the provenance panel is opened', async () => {
    const user = userEvent.setup();
    renderAtlas('en');

    expect(screen.queryByText('Knowledge sources')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /View sources/i }));

    expect(await screen.findByText('Knowledge sources')).toBeInTheDocument();
    expect(screen.getByText(/linked assets/)).toBeInTheDocument();
    expect(screen.getAllByText(/License review pending|Provider-restricted use/).length).toBeGreaterThan(0);
  });

  it('requires fresh media consent and resets evidence when the artist changes', async () => {
    const user = userEvent.setup();
    renderAtlas('en');

    await user.click(screen.getByRole('button', { name: 'Load official media' }));
    expect(await screen.findByTestId('official-media-hub')).toHaveTextContent('Bring Me the Horizon');

    await user.click(screen.getByRole('button', { name: /View sources/i }));
    expect(await screen.findByText('Knowledge sources')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Deafheaven/i }));

    expect(screen.queryByTestId('official-media-hub')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load official media' })).toBeInTheDocument();
    expect(screen.queryByText('Knowledge sources')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View sources/i })).toHaveAttribute('aria-expanded', 'false');
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

    expect(screen.getByText('Original visual created in the app')).toBeInTheDocument();
    expect(screen.getByText(/No verified gallery exists for this identity/)).toBeInTheDocument();
    expect(screen.getByTestId('artist-factual-intro')).toHaveTextContent(/Uncatalogued Signal.*rank #1.*12 plays/i);
    expect(screen.getByText('The active archive has no aggregated tracks for this artist.')).toBeInTheDocument();
    expect(screen.getByText('The active archive has no aggregated albums for this artist.')).toBeInTheDocument();
    expect(screen.getByText('The offline catalog has no documented releases for this artist.')).toBeInTheDocument();
  });

  it('does not reuse flagship editorial claims for a visitor archive', () => {
    const visitorData: MusicDnaData = {
      ...data,
      narrative_scope: undefined,
      project: 'Visitor archive',
    };

    renderAtlas('en', visitorData);

    expect(screen.getByTestId('artist-factual-intro')).toHaveTextContent(/listening history.*rank #1/i);
    expect(screen.queryByText(
      'A Nova editorial reading based on the active listening history; it does not replace an external biography.',
    )).not.toBeInTheDocument();
    expect(screen.getByText(/No verified editorial biography exists for this identity yet/)).toBeInTheDocument();
  });

  it('uses Hebrew copy and an RTL atlas boundary', async () => {
    const { container } = renderAtlas('he');

    expect(await screen.findByRole('heading', { name: 'מרחבי אמנים', level: 2 })).toBeInTheDocument();
    expect(container.querySelector('.artist-atlas')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('בקרת פרטיות')).toBeInTheDocument();
  });

  it('keeps the sourced external description for Deep Dive', () => {
    renderAtlas('en', data, 'deep-dive');

    expect(screen.getByText('Documented profile')).toBeInTheDocument();
    expect(screen.getByText(/Description from (Wikidata|.+)/)).toBeInTheDocument();
    expect(screen.getByText('Evidence and provenance')).toBeInTheDocument();
  });

  it('shows simple artist-level MusicBee context without merging its counters', () => {
    renderAtlas('en', dataWithMusicBee, 'explore');

    const context = screen.getByTestId('artist-musicbee-context');
    expect(context).toHaveTextContent('Also found in MusicBee');
    expect(context).toHaveTextContent('3 tracks and 1 albums');
    expect(context).toHaveTextContent(/stays separate.*not counted twice/i);
    expect(screen.queryByText('MusicBee Play Count')).not.toBeInTheDocument();
  });

  it('reveals artist-level MusicBee counters in Deep Dive', () => {
    renderAtlas('en', dataWithMusicBee, 'deep-dive');

    const context = screen.getByTestId('artist-musicbee-context');
    expect(context).toHaveTextContent('MusicBee Play Count');
    expect(context).toHaveTextContent('42');
    expect(context).toHaveTextContent('Last played in MusicBee');
    expect(context).toHaveTextContent(/not added to the timeline, sessions or Spotify\/Last\.fm totals/i);
  });
});
