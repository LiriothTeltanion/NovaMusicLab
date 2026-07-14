import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import compiledData from '../data/music_dna_compiled.json';
import offlineKnowledgeData from '../data/offline_artist_knowledge.json';
import type { MusicDnaData } from '../types';
import { AppProvider } from '../context/AppContext';
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

describe('DataQualityCenter trust sources', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('uses the current offline archive instead of the stale embedded summary', () => {
    window.localStorage.setItem('nml_lang', 'en');
    render(
      <AppProvider>
        <DataQualityCenter data={data} />
      </AppProvider>,
    );

    const recognizedLabel = screen.getByText('Artists recognized');
    expect(within(recognizedLabel.parentElement as HTMLElement).getByText('100/100'))
      .toBeInTheDocument();
    expect(screen.getByText('78 Wikidata profiles')).toBeInTheDocument();
    expect(screen.queryByText('80 Wikidata profiles')).not.toBeInTheDocument();
  });

  it('surfaces the exact observed period and analysis timezone', () => {
    window.localStorage.setItem('nml_lang', 'en');
    render(
      <AppProvider>
        <DataQualityCenter data={data} />
      </AppProvider>,
    );

    expect(screen.getByText(/Mar 1, 2015.*Jul 3, 2026.*Asia\/Jerusalem/i))
      .toBeInTheDocument();
  });
});
