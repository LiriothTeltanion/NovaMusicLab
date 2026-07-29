import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import compiledData from '../data/music_dna_compiled.json';
import offlineKnowledgeData from '../data/offline_artist_knowledge.json';
import type { MusicDnaData } from '../types';
import { AppProvider } from '../context/AppContext';
import { ExperienceProvider } from '../context/ExperienceContext';
import DataQualityCenter from './DataQualityCenter';

const baseData = compiledData as unknown as MusicDnaData;
const offlineKnowledge = offlineKnowledgeData as unknown as {
  artists: Array<{
    name: string;
    archive: { plays: number; genre: string; country: string };
  }>;
};
const data: MusicDnaData = {
  ...baseData,
  generated_at: '2026-07-13T17:55:27.497Z',
  top_artists: offlineKnowledge.artists.map(artist => ({
    name: artist.name,
    plays: artist.archive.plays,
    genre: artist.archive.genre,
    country: artist.archive.country,
  })),
  daily_plays: {
    '2015-03-01': 1,
    '2026-07-03': 1,
  },
  knowledge_summary: {
    ...baseData.knowledge_summary!,
    matched_artists: 1,
    unmatched_artists: 99,
    wikidata_profile_count: 1,
  },
};

function renderQuality(depth: 'guided' | 'explore' | 'deep-dive' = 'explore') {
  window.localStorage.setItem('nml_lang', 'en');
  window.localStorage.setItem('nml_experience_depth', depth);
  return render(
    <AppProvider>
      <ExperienceProvider>
        <DataQualityCenter data={data} />
      </ExperienceProvider>
    </AppProvider>,
  );
}

describe('DataQualityCenter trust sources', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('uses the current offline archive instead of the stale embedded summary', () => {
    renderQuality('deep-dive');

    const recognizedLabel = screen.getByText('Artists recognized');
    expect(within(recognizedLabel.parentElement as HTMLElement).getByText('100/100'))
      .toBeInTheDocument();
    expect(screen.getByText('78 Wikidata profiles')).toBeInTheDocument();
    expect(screen.queryByText('80 Wikidata profiles')).not.toBeInTheDocument();
  });

  it('surfaces the exact observed period and analysis timezone', () => {
    renderQuality('deep-dive');

    expect(screen.getByText(/Mar 1, 2015.*Jul 3, 2026.*Asia\/Jerusalem/i))
      .toBeInTheDocument();
  });

  it('answers three human questions in Explore and hides cache jargon', () => {
    renderQuality('explore');

    const summary = screen.getByTestId('data-quality-friendly-summary');
    expect(within(summary).getByText('What did Nova read?')).toBeInTheDocument();
    expect(within(summary).getByText('What is still incomplete?')).toBeInTheDocument();
    expect(within(summary).getByText('What is interpreted?')).toBeInTheDocument();
    expect(screen.queryByText(/Wikidata profiles/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Asia\/Jerusalem/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Artists recognized')).not.toBeInTheDocument();
  });
});
