import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import HiddenInsights from './HiddenInsights';

vi.mock('./ArtistAvatar', () => ({
  default: ({ name }: { name: string }) => <span data-avatar={name} />,
}));

const data = musicData as unknown as MusicDnaData;

function renderInsights(lang: 'en' | 'es' | 'he' = 'en') {
  window.localStorage.setItem('nml_lang', lang);
  return render(
    <AppProvider>
      <HiddenInsights data={data} />
    </AppProvider>,
  );
}

describe('HiddenInsights interpretive boundaries', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('reports timing and ranking observations without claiming emotional regulation', () => {
    renderInsights();

    expect(screen.getByRole('note')).toHaveAccessibleName(
      'Creative archive reading · not a psychological assessment',
    );
    expect(screen.getByText('Late-night listening pattern')).toBeInTheDocument();
    expect(screen.getByText('Long-running tracks in the ranking')).toBeInTheDocument();
    expect(screen.getByText(/timing and count signals only/i)).toHaveTextContent(
      /do not establish emotional regulation, sleep, mood or reasons for listening/i,
    );
    expect(screen.queryByText('Nocturnal Emotional Regulation')).not.toBeInTheDocument();
    expect(screen.queryByText(/stabilizing habit|emotional anchors/i)).not.toBeInTheDocument();
  });

  it.each([
    ['es', 'Patrón de escucha nocturna', /señales de horario y conteo/i],
    ['he', 'דפוס האזנה בשעות הלילה', /אותות של זמן וספירה בלבד/i],
  ] as const)('keeps the timing-only explanation in %s', async (lang, heading, body) => {
    renderInsights(lang);

    expect(await screen.findByText(heading)).toBeInTheDocument();
    expect(screen.getByText(body)).toBeInTheDocument();
  });
});
