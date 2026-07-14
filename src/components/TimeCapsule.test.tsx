import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import TimeCapsule from './TimeCapsule';

const data = defaultMusicData as unknown as MusicDnaData;

describe('TimeCapsule accessibility', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('exposes dossier and Spotify actions as separate interactive controls', () => {
    const { container } = render(
      <AppProvider>
        <TimeCapsule data={data} />
      </AppProvider>
    );

    expect(screen.getAllByRole('button', { name: /in All-Time Top/i }).length).toBeGreaterThan(0);
    const spotifyLink = screen.getAllByRole('link', { name: /opens in a new tab/i })[0];
    expect(spotifyLink).toHaveAttribute('target', '_blank');
    expect(spotifyLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(container.querySelector('button a, a button, [role="button"] a')).toBeNull();
  });
});
