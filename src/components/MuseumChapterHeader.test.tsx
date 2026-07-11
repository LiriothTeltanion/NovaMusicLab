import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import musicData from '../data/music_dna_mock.json';
import type { MusicDnaData } from '../types';
import MuseumChapterHeader, { MUSEUM_CHAPTER_TABS } from './MuseumChapterHeader';

const data = musicData as unknown as MusicDnaData;

describe('MuseumChapterHeader', () => {
  afterEach(cleanup);

  it('turns the active room and real archive values into a cinematic prelude', () => {
    render(<MuseumChapterHeader activeTab="dashboard" data={data} lang="es" />);

    const chapter = screen.getByTestId('museum-chapter');
    expect(chapter).toHaveAttribute('data-chapter', 'dashboard');
    expect(chapter).toHaveAttribute('data-motif', 'atlas');
    expect(screen.getByRole('heading', { name: 'Sala de Control', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(data.core_metrics.total_plays.toLocaleString('es-ES'))).not.toHaveLength(0);
    expect(screen.getByText(data.core_metrics.unique_artists.toLocaleString('es-ES'))).toBeInTheDocument();
  });

  it('changes its language, palette identity and data focus with the active chapter', () => {
    const { rerender } = render(<MuseumChapterHeader activeTab="dashboard" data={data} lang="en" />);

    rerender(<MuseumChapterHeader activeTab="eras" data={data} lang="en" />);

    const chapter = screen.getByTestId('museum-chapter');
    const years = data.yearly_eras.map(era => era.year);
    const expectedRange = `${Math.min(...years)}—${Math.max(...years)}`;
    expect(chapter).toHaveAttribute('data-chapter', 'eras');
    expect(chapter).toHaveAttribute('data-motif', 'timeline');
    expect(screen.getByRole('heading', { name: 'The Era Archive', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(expectedRange)).not.toHaveLength(0);
  });

  it('uses artist origins for the cultural room and never listener-location telemetry', () => {
    const legacyData: MusicDnaData = {
      ...data,
      artist_origin_countries: undefined,
      countries: [{ country: 'Listenerland', plays: data.core_metrics.total_plays }],
      top_artists: [{ ...data.top_artists[0], country: 'Artistland', plays: 99 }],
    };

    render(<MuseumChapterHeader activeTab="cultural" data={legacyData} lang="en" />);

    expect(screen.getByText('Artistland')).toBeInTheDocument();
    expect(screen.queryByText('Listenerland')).not.toBeInTheDocument();
  });

  it('keeps every museum room visually distinct and leaves hero/upload unduplicated', () => {
    const motifs = new Set<string>();
    const { rerender } = render(<MuseumChapterHeader activeTab={MUSEUM_CHAPTER_TABS[0]} data={data} lang="es" />);

    MUSEUM_CHAPTER_TABS.forEach(tab => {
      rerender(<MuseumChapterHeader activeTab={tab} data={data} lang="es" />);
      motifs.add(screen.getByTestId('museum-chapter').dataset.motif ?? '');
    });

    expect(motifs.size).toBe(MUSEUM_CHAPTER_TABS.length);

    rerender(<MuseumChapterHeader activeTab="hero" data={data} lang="es" />);
    expect(screen.queryByTestId('museum-chapter')).not.toBeInTheDocument();

    rerender(<MuseumChapterHeader activeTab="upload" data={data} lang="es" />);
    expect(screen.queryByTestId('museum-chapter')).not.toBeInTheDocument();
  });
});
