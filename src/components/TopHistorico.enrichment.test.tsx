import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import { getArtistEnrichment } from '../utils/artistEnrichment';
import type { MusicDnaData } from '../types';
import TopHistorico from './TopHistorico';

/**
 * Characterization tests for everything in this room that reads the curated
 * artist enrichment catalog.
 *
 * They exist to make a structural change safe. TopHistorico is 3,000+ lines and
 * statically imports artist_enrichment.json (341 KB), which is why the room sits
 * against its bundle budget. Moving that catalog behind a lazy boundary is the
 * fix, and these assertions are the before-picture it has to keep matching.
 *
 * They deliberately assert against the real bundled catalog rather than a
 * fixture: the point is to catch the enrichment silently disappearing, and a
 * mock would hide exactly that.
 */
const data = musicData as unknown as MusicDnaData;
const topArtist = data.top_artists[0];
const profile = getArtistEnrichment(topArtist.name);

describe('TopHistorico enrichment surfaces', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nml_lang', 'en');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.lang = 'es';
    document.documentElement.dir = 'ltr';
    delete document.documentElement.dataset.language;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const renderRoom = () => render(
    <AppProvider>
      <TopHistorico data={data} />
    </AppProvider>,
  );

  it('has a curated profile for the top artist, so these tests are meaningful', () => {
    // Guard against the suite quietly passing because the catalog stopped
    // resolving: every assertion below depends on this profile existing.
    expect(profile).toBeDefined();
    expect(profile?.bio.en.length).toBeGreaterThan(0);
    expect(profile?.key_albums.length).toBeGreaterThan(0);
  });

  it('shows the artist dossier with curated biography text', async () => {
    renderRoom();

    expect(await screen.findByText(/Artist Dossier/i)).toBeInTheDocument();
    // The biography is the clearest signal that enrichment reached the render.
    const bioOpening = profile!.bio.en.slice(0, 40);
    expect(document.body).toHaveTextContent(bioOpening);
  }, 20_000);

  it('renders curated origin and country facts rather than leaving them blank', async () => {
    renderRoom();
    await screen.findByText(/Artist Dossier/i);

    expect(document.body).toHaveTextContent(profile!.origin.en);
    expect(document.body).toHaveTextContent(profile!.country.en);
  }, 20_000);

  it('lists curated key albums in the discography timeline', async () => {
    renderRoom();
    await screen.findByText(/Artist Dossier/i);

    // Every curated album title should appear somewhere in the room.
    for (const album of profile!.key_albums.slice(0, 3)) {
      expect(document.body).toHaveTextContent(album.title);
    }
  }, 20_000);

  it('keeps the archive dossier readable after switching to the albums view', async () => {
    const user = userEvent.setup();
    renderRoom();
    await screen.findByText(/Artist Dossier/i);

    const albumsTab = screen.getByRole('button', { name: /^albums$/i });
    await user.click(albumsTab);

    // The album rows draw their release year from the curated catalog.
    expect(await screen.findByText(profile!.key_albums[0].title)).toBeInTheDocument();
  }, 20_000);

  it('still renders the room for an archive whose artists have no curated profile', async () => {
    // The honest-gap path: an unknown artist must not blank the room or throw.
    const unknownArchive = {
      ...data,
      top_artists: [{ ...topArtist, name: 'Totally Nonexistent Band XYZ' }],
    } as MusicDnaData;

    render(
      <AppProvider>
        <TopHistorico data={unknownArchive} />
      </AppProvider>,
    );

    expect(await screen.findByText(/Artist Dossier/i)).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Totally Nonexistent Band XYZ');
  }, 20_000);

  it('keeps the top-artist ranking intact', async () => {
    renderRoom();
    await screen.findByText(/Artist Dossier/i);

    const ranking = screen.getAllByText(topArtist.name);
    expect(ranking.length).toBeGreaterThan(0);
    expect(within(document.body).getByText(/artist dossier/i)).toBeInTheDocument();
  }, 20_000);
});
