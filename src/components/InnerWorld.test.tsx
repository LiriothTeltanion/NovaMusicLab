import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import InnerWorld from './InnerWorld';

const data = musicData as unknown as MusicDnaData;

describe('InnerWorld Hebrew and RTL surfaces', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('localizes identity cards and keeps mixed-language music names intact', async () => {
    window.localStorage.setItem('nml_lang', 'he');
    render(
      <AppProvider>
        <InnerWorld data={data} />
      </AppProvider>
    );

    expect(await screen.findByRole('button', { name: 'זהות אמנותית' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('⚔️ פנטזיה אפלה')).toBeInTheDocument();
    expect(screen.getByText('💔 אהבה שאבדה')).toBeInTheDocument();
    expect(screen.getByText('Love Who Loves You Back')).toBeInTheDocument();
    expect(screen.getByText('Tokio Hotel', { exact: false })).toBeInTheDocument();
  });

  it('exposes a keyboard-focusable Hebrew constellation with LTR geometry', async () => {
    window.localStorage.setItem('nml_lang', 'he');
    render(
      <AppProvider>
        <InnerWorld data={data} />
      </AppProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'מפת הז׳אנרים' }));

    expect(screen.getByRole('heading', { level: 3, name: 'קונסטלציית הז׳אנרים' })).toBeInTheDocument();
    const constellation = screen.getByRole('list', { name: 'מפה אינטראקטיבית של הז׳אנרים המובילים שלך' });
    expect(constellation).toHaveClass('nova-data-ltr');

    const stars = screen.getAllByRole('listitem');
    expect(stars.length).toBeGreaterThan(0);
    expect(stars[0]).toHaveAttribute('tabindex', '0');
    expect(stars[0]).toHaveAccessibleName(/השמעות/);
  });

  it('hides the authored flagship identity for a visitor archive', () => {
    window.localStorage.setItem('nml_lang', 'en');
    render(
      <AppProvider>
        <InnerWorld data={data} isPersonalArchive />
      </AppProvider>,
    );

    expect(screen.getByTestId('visitor-inner-world')).toHaveTextContent('Archive-derived constellation');
    expect(screen.getByRole('heading', { level: 3, name: 'The Genre Constellation' })).toBeInTheDocument();
    expect(screen.queryByText('Love Who Loves You Back')).not.toBeInTheDocument();
    expect(screen.queryByText('Tokio Hotel', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText('Own music production with metalcore and synthwave roots')).not.toBeInTheDocument();
  });
});
