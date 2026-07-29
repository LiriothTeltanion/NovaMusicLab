import { cleanup, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { MusicDnaData } from '../types';
import { AppProvider } from '../context/AppContext';
import { ExperienceProvider } from '../context/ExperienceContext';
import RecentPulse from './RecentPulse';
import { fictionalWeeklyPulse } from './__fixtures__/recentPulse';

const archiveData = {
  top_artists: [
    { name: 'Neon Orchard', plays: 120, genre: 'Fictional wave', country: '—' },
  ],
  source_summary: {
    lastfm_plays: 1,
    spotify_plays: 1,
    youtube_plays: 0,
  },
} as unknown as MusicDnaData;

function renderPulse(
  depth: 'guided' | 'explore' | 'deep-dive',
  lang: 'en' | 'es' | 'he' = 'en',
) {
  window.localStorage.setItem('nml_lang', lang);
  window.localStorage.setItem('nml_experience_depth', depth);

  return render(
    <AppProvider>
      <ExperienceProvider>
        <RecentPulse data={archiveData} snapshot={fictionalWeeklyPulse} />
      </ExperienceProvider>
    </AppProvider>,
  );
}

describe('RecentPulse weekly summary', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('shows direct weekly counts and rankings in plain language in Explore', () => {
    renderPulse('explore');

    const summary = screen.getByTestId('weekly-pulse-summary');
    expect(within(summary).getByText('Your week on Last.fm')).toBeInTheDocument();
    expect(within(summary).getByText('84')).toBeInTheDocument();
    expect(within(summary).getByText('19')).toBeInTheDocument();
    expect(within(summary).getByText('52')).toBeInTheDocument();
    expect(within(summary).getByText('Not available')).toBeInTheDocument();
    expect(within(summary).getAllByText('Neon Orchard').length).toBeGreaterThan(0);
    expect(within(summary).getAllByText('Glass Comet').length).toBeGreaterThan(0);
    expect(within(summary).getByTestId('weekly-pulse-fingerprint')).toHaveTextContent(
      '19 artists across 84 listens',
    );
    expect(within(summary).getByText(/not a live account connection or a complete history/i))
      .toBeInTheDocument();
    expect(within(summary).queryByTestId('weekly-pulse-provenance')).not.toBeInTheDocument();
    expect(within(summary).queryByText('lastfm_api')).not.toBeInTheDocument();
    expect(within(summary).queryByText(/raw listening events/i)).not.toBeInTheDocument();
    expect(summary.querySelector('img')).toBeNull();
  });

  it('keeps the existing pulse unchanged when no weekly summary is supplied', () => {
    const { weekly_summary: _weeklySummary, ...snapshotWithoutWeek } = fictionalWeeklyPulse;

    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_experience_depth', 'explore');
    render(
      <AppProvider>
        <ExperienceProvider>
          <RecentPulse data={archiveData} snapshot={snapshotWithoutWeek} />
        </ExperienceProvider>
      </AppProvider>,
    );

    expect(screen.queryByTestId('weekly-pulse-summary')).not.toBeInTheDocument();
    expect(screen.getByText('Spotify · Dated snapshot')).toBeInTheDocument();
    expect(screen.getByText('Last.fm · Historical context')).toBeInTheDocument();
  });

  it('adds a short reading cue in Guided without exposing technical provenance', () => {
    renderPulse('guided');

    expect(screen.getByTestId('weekly-pulse-guidance')).toHaveTextContent(
      /one recent chapter.*does not replace your complete listening history/i,
    );
    expect(screen.queryByTestId('weekly-pulse-provenance')).not.toBeInTheDocument();
    expect(screen.queryByText('Source contract')).not.toBeInTheDocument();
  });

  it('reserves the source contract and full limitations for Deep Dive', () => {
    renderPulse('deep-dive');

    const provenance = screen.getByTestId('weekly-pulse-provenance');
    expect(within(provenance).getByText('Source and limitations')).toBeInTheDocument();
    expect(within(provenance).getByText('lastfm_api')).toBeInTheDocument();
    expect(within(provenance).getByText(/official API summary, not a live connection or raw listening events/i)).toBeInTheDocument();
    expect(within(provenance).getByText(/did not provide a dependable album total/i)).toBeInTheDocument();
    expect(within(provenance).getByText(/no totals are inferred from the rankings/i)).toBeInTheDocument();
  });

  it('localizes the weekly reading in Spanish', () => {
    renderPulse('guided', 'es');

    expect(screen.getByText('Tu semana en Last.fm')).toBeInTheDocument();
    expect(screen.getByText('Huella de la semana')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-pulse-guidance')).toHaveTextContent(
      /capítulo reciente.*no sustituye tu historial completo/i,
    );
  });

  it('localizes Hebrew and isolates dynamic artist and track names', async () => {
    renderPulse('guided', 'he');

    const summary = await screen.findByTestId('weekly-pulse-summary');
    expect(within(summary).getByText('השבוע שלך ב־Last.fm')).toBeInTheDocument();
    expect(within(summary).getByText('טביעת האצבע של השבוע')).toBeInTheDocument();
    expect(summary.querySelectorAll('bdi').length).toBeGreaterThan(4);
    expect(within(summary).queryByTestId('weekly-pulse-provenance')).not.toBeInTheDocument();
  });
});
