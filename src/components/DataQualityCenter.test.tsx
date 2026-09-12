import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import compiledData from '../data/music_dna_compiled.json';
import offlineKnowledgeData from '../data/offline_artist_knowledge.json';
import publicDatasetManifest from '../data/public_dataset_manifest.json';
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
  generated_at: '2026-08-06T21:44:39.498Z',
  snapshot_freshness: {
    observedFrom: '2015-03-01',
    observedThrough: '2026-08-06',
    datasetGeneratedAt: '2026-08-06T21:44:39.498Z',
    enrichmentGeneratedAt: '2026-07-29T00:00:00.000Z',
    recentPulseSyncedAt: '2026-07-02',
    liveConnection: false,
  },
  top_artists: offlineKnowledge.artists.map(artist => ({
    name: artist.name,
    plays: artist.archive.plays,
    genre: artist.archive.genre,
    country: artist.archive.country,
  })),
  daily_plays: {
    '2015-03-01': 1,
    '2026-08-06': 1,
  },
  knowledge_summary: {
    ...baseData.knowledge_summary!,
    matched_artists: 1,
    unmatched_artists: 99,
    wikidata_profile_count: 1,
  },
};

function renderQuality(
  depth: 'guided' | 'explore' | 'deep-dive' = 'explore',
  useBundledGenreCatalog = false,
) {
  window.localStorage.setItem('nml_lang', 'en');
  window.localStorage.setItem('nml_experience_depth', depth);
  return render(
    <AppProvider>
      <ExperienceProvider>
        <DataQualityCenter data={data} useBundledGenreCatalog={useBundledGenreCatalog} />
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
    // 79 after the 2026-08 refresh, up from 78. The negative assertion is the
    // point of this test and stays: 80 is the figure frozen into the dataset's
    // legacy embedded summary, so seeing it would mean the room had gone back
    // to reading the stale copy instead of the live offline archive.
    expect(screen.getByText('79 Wikidata profiles')).toBeInTheDocument();
    expect(screen.queryByText('80 Wikidata profiles')).not.toBeInTheDocument();
  });

  it('surfaces the exact observed period and analysis timezone', () => {
    renderQuality('deep-dive');

    expect(screen.getByText(/Mar 1, 2015.*Aug 6, 2026.*Asia\/Jerusalem/i))
      .toBeInTheDocument();
  });

  it('separates archive, enrichment and pulse freshness without implying a live connection', () => {
    renderQuality('explore', true);

    const freshness = screen.getByTestId('snapshot-freshness');
    expect(within(freshness).getByText('Snapshot freshness')).toBeInTheDocument();
    expect(freshness).toHaveTextContent(/Mar 1, 2015.*Aug 6, 2026/);
    expect(freshness).toHaveTextContent(/Archive generated.*Aug 7, 2026/);
    expect(freshness).toHaveTextContent(/Artist enrichment.*Jul 29, 2026/);
    expect(freshness).toHaveTextContent(/Recent Pulse synced.*Jul 2, 2026/);
    expect(freshness).toHaveTextContent('Dated snapshots · no live connection');
    expect(freshness).toHaveTextContent(
      `${publicDatasetManifest.catalogIdentity.catalogEntryCount.toLocaleString('en-US')} exact artist-name catalog entries`,
    );
    expect(freshness).toHaveTextContent(
      `${publicDatasetManifest.catalogIdentity.knownNormalizedVariantGroups.toLocaleString('en-US')} known normalized name-variant groups`,
    );
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
