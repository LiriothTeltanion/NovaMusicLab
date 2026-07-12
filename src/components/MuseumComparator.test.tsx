import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MuseumComparator from './MuseumComparator';
import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';

const primary = defaultMusicData as unknown as MusicDnaData;

describe('MuseumComparator', () => {
  // Assertions below are Spanish copy - pin the language explicitly instead
  // of relying on whatever the app's default language happens to be.
  beforeEach(() => {
    window.localStorage.setItem('nml_lang', 'es');
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('shows the upload placeholder before a second museum is loaded', () => {
    render(
      <AppProvider>
        <MuseumComparator data={primary} primaryLabel="Museo de prueba" />
      </AppProvider>
    );

    expect(screen.getByText('Museo de prueba')).toBeInTheDocument();
    expect(screen.getByText('Sube un segundo museo')).toBeInTheDocument();
    expect(screen.queryByText('Overlap de Artistas')).toBeNull();
  });

  it('computes and renders the comparison once a second CSV is uploaded', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <MuseumComparator data={primary} primaryLabel="Museo de prueba" />
      </AppProvider>
    );

    // "Bring Me the Horizon" is the primary dataset's top artist, so this row
    // guarantees at least one shared artist for the overlap section.
    const csv = [
      `Bring Me the Horizon,Album,Track One,01 Jan 2026 10:00`,
      `Brand New Artist,Album,Track Two,01 Jan 2026 11:00`,
    ].join('\n');
    const file = new File([csv], 'lastfm-export.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => expect(screen.getByText('Overlap de Artistas')).toBeInTheDocument());
    expect(screen.getByText('Moods Enfrentados')).toBeInTheDocument();
    expect(screen.getByText('Métricas Lado a Lado')).toBeInTheDocument();
    expect(screen.getByText(/1 artistas aparecen en ambos museos/)).toBeInTheDocument();
  });

  it('clears the second museum and returns to the placeholder', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <MuseumComparator data={primary} primaryLabel="Museo de prueba" />
      </AppProvider>
    );

    const csv = 'Bring Me the Horizon,Album,Track One,01 Jan 2026 10:00';
    const file = new File([csv], 'lastfm-export.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByText('Overlap de Artistas')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Quitar museo B' }));

    expect(screen.getByText('Sube un segundo museo')).toBeInTheDocument();
    expect(screen.queryByText('Overlap de Artistas')).toBeNull();
  });
});
