import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { ExperienceProvider } from '../context/ExperienceContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import { buildSourceReconciliation } from '../utils/chartIntegrity';
import SpotifyVsLastfm from './SpotifyVsLastfm';

const data = musicData as unknown as MusicDnaData;
const dataWithMusicBee: MusicDnaData = {
  ...data,
  musicbee_snapshot: {
    schema_version: 1,
    source: 'musicbee_itunes_xml',
    library_item_count: 2,
    track_count: 2,
    duplicate_item_count: 0,
    artist_count: 1,
    album_count: 1,
    played_track_count: 1,
    rated_track_count: 1,
    total_play_count: 7,
    total_skip_count: 1,
    latest_played_at: '2026-07-20T18:00:00.000Z',
    tracks: [],
    artists: [],
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

function renderObservatory(
  depth: 'guided' | 'explore' | 'deep-dive' = 'explore',
  sourceData = data,
) {
  localStorage.setItem('nml_experience_depth', depth);
  return render(
    <AppProvider>
      <ExperienceProvider>
        <SpotifyVsLastfm data={sourceData} />
      </ExperienceProvider>
    </AppProvider>,
  );
}

describe('SpotifyVsLastfm integrity view', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows an exact source bridge instead of a scaled yearly series', () => {
    localStorage.setItem('nml_lang', 'en');
    renderObservatory('deep-dive');

    const waterfall = screen.getByTestId('source-reconciliation-waterfall');
    const reconciliation = buildSourceReconciliation(data.source_summary!);
    expect(waterfall).toHaveTextContent(reconciliation.rawEvents.toLocaleString('en-US'));
    expect(waterfall).toHaveTextContent(reconciliation.shortEvents.toLocaleString('en-US'));
    expect(waterfall).toHaveTextContent(reconciliation.duplicateEvents.toLocaleString('en-US'));
    expect(waterfall).toHaveTextContent(reconciliation.finalListens.toLocaleString('en-US'));
    expect(screen.getByText(/reconcile exactly|visible .+-event adjustment/i)).toBeInTheDocument();
    expect(screen.queryByText(/plays by year/i)).not.toBeInTheDocument();
  });

  it('labels the capability matrix as a format guide without synthetic scores', () => {
    localStorage.setItem('nml_lang', 'en');
    renderObservatory('deep-dive');

    expect(screen.getByText('Capability guide by export format')).toBeInTheDocument();
    expect(screen.getByText(/does not claim that every optional field was present/i)).toBeInTheDocument();
    expect(screen.getByText(/parser\/format guide/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('source-capability-matrix')).queryByText('95')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('source-capability-matrix')).queryByText('Playlist context')).not.toBeInTheDocument();
  });

  it('keeps all five supported sources visible without inventing missing counts', () => {
    localStorage.setItem('nml_lang', 'en');
    renderObservatory();

    const ecosystem = screen.getByTestId('source-ecosystem');
    expect(within(ecosystem).getByText('Last.fm')).toBeInTheDocument();
    expect(within(ecosystem).getByText('Spotify')).toBeInTheDocument();
    expect(within(ecosystem).getByText('YouTube')).toBeInTheDocument();
    expect(within(ecosystem).getByText('Apple Music')).toBeInTheDocument();
    expect(within(ecosystem).getByText('ListenBrainz')).toBeInTheDocument();
    expect(within(screen.getByTestId('source-provider-apple_music')).getByText('Not in this archive')).toBeInTheDocument();
    expect(within(screen.getByTestId('source-provider-listenbrainz')).getByText('Not in this archive')).toBeInTheDocument();
    expect(within(screen.getByTestId('source-provider-apple_music')).getByText('—')).toBeInTheDocument();
    expect(within(screen.getByTestId('source-provider-listenbrainz')).getByText('—')).toBeInTheDocument();
  });

  it('leads with plain language and reserves reconciliation tools for Deep Dive', () => {
    localStorage.setItem('nml_lang', 'en');
    renderObservatory('explore');

    expect(screen.getByText('Where your listening history comes from')).toBeInTheDocument();
    const reconciliation = buildSourceReconciliation(data.source_summary!);
    const friendlySummary = screen.getByTestId('source-friendly-summary');
    expect(friendlySummary).toHaveTextContent(reconciliation.rawEvents.toLocaleString('en-US'));
    expect(friendlySummary).toHaveTextContent(reconciliation.finalListens.toLocaleString('en-US'));
    expect(friendlySummary).toHaveTextContent(
      reconciliation.adjustment === 0
        ? /imported records became .* counted listens/i
        : /kept .* counted listens from .* imported records.*archive rules in Deep Dive/i,
    );
    expect(screen.queryByTestId('source-reconciliation-waterfall')).not.toBeInTheDocument();
    expect(screen.queryByTestId('source-capability-matrix')).not.toBeInTheDocument();
  });

  it('shows MusicBee as a separate library layer, never as an event source', () => {
    localStorage.setItem('nml_lang', 'en');
    renderObservatory('explore', dataWithMusicBee);

    expect(screen.getByTestId('musicbee-library-layer')).toHaveTextContent(
      'Your MusicBee library is connected',
    );
    expect(screen.getByTestId('musicbee-library-layer')).toHaveTextContent(
      /own library view.*does not count the same listening activity twice/i,
    );
    expect(within(screen.getByTestId('source-ecosystem')).queryByText('MusicBee')).not.toBeInTheDocument();
    expect(screen.queryByText('Technical limits')).not.toBeInTheDocument();
  });

  it('reveals MusicBee counters and limits only in Deep Dive', () => {
    localStorage.setItem('nml_lang', 'en');
    renderObservatory('deep-dive', dataWithMusicBee);

    const layer = screen.getByTestId('musicbee-library-layer');
    expect(within(layer).getByText('MusicBee Play Count')).toBeInTheDocument();
    expect(within(layer).getByText('Technical limits')).toBeInTheDocument();
    expect(layer).toHaveTextContent(/never added to Spotify, Last\.fm, sessions or the source chart/i);
    expect(within(screen.getByTestId('source-capability-matrix')).queryByText('MusicBee')).not.toBeInTheDocument();
  });
});
