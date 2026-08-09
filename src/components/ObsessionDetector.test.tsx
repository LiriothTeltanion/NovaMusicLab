import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import mockData from '../data/music_dna_mock.json';
import type { MusicDnaData } from '../types';
import ObsessionDetector from './ObsessionDetector';

vi.mock('../audio/sonicFeedback', () => ({
  playMuseumSound: vi.fn(),
}));

vi.mock('./ArtistAvatar', () => ({
  default: ({ name }: { name: string }) => <span data-testid="artist-avatar">{name}</span>,
}));

vi.mock('./CoverArt', () => ({
  default: ({ title }: { title: string }) => <span data-testid="cover-art">{title}</span>,
}));

const baseData = mockData as unknown as MusicDnaData;
const testData: MusicDnaData = {
  ...baseData,
  obsessions: [
    { artist: 'Artist One', track: 'Signal One', date: '2025-01-01', count: 4 },
    { artist: 'Artist Two', track: 'Signal Two', date: '2025-02-03', count: 9 },
    { artist: 'Artist Three', track: 'Signal Three', date: '2025-03-04', count: 6 },
  ],
  sessions: [{
    id: 77,
    start: '2025-04-05T18:30:00.000Z',
    end: '2025-04-05T20:38:00.000Z',
    tracks_count: 42,
    duration_min: 128,
    top_artist: 'Artist Two',
    top_track: 'Signal Two',
    unique_artists: 7,
  }],
};

function ContextProbe() {
  const context = useApp();
  return (
    <output
      data-testid="context-probe"
      data-tab={context.activeTab}
      data-artist={context.selectedArtistName}
      data-track={context.selectedTrackKey}
      data-subtab={context.topSubTab}
    />
  );
}

function renderRoom(language: 'en' | 'es' | 'he' = 'en', data: MusicDnaData = testData) {
  localStorage.setItem('nml_lang', language);
  return render(
    <AppProvider>
      <ObsessionDetector data={data} />
      <ContextProbe />
    </AppProvider>,
  );
}

describe('ObsessionDetector', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '#/obsessions');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.lang = 'es';
    document.documentElement.dir = 'ltr';
    delete document.documentElement.dataset.language;
  });

  it('promotes the strongest loop and offers separate track and Atlas actions', async () => {
    const user = userEvent.setup();
    renderRoom();

    const spotlight = screen.getByTestId('obsession-spotlight');
    expect(screen.getByText(/This measures the observed pattern; emotional meaning is a possible interpretation, not a fact/i)).toBeInTheDocument();
    expect(screen.queryByText(/Reveals moments of emotional obsession/i)).not.toBeInTheDocument();
    expect(within(spotlight).getByRole('heading', { name: 'Signal Two', level: 3 })).toBeInTheDocument();
    expect(within(spotlight).getByText('9×')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('button', { name: 'Open Signal One by Artist One in Tracks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Signal Three by Artist Three in Tracks' })).toBeInTheDocument();

    await user.click(within(spotlight).getByRole('button', {
      name: 'Open Signal Two by Artist Two in Tracks',
    }));
    expect(screen.getByTestId('context-probe')).toHaveAttribute('data-tab', 'top');
    expect(screen.getByTestId('context-probe')).toHaveAttribute('data-artist', 'Artist Two');
    expect(screen.getByTestId('context-probe')).toHaveAttribute('data-track', 'artist two|||signal two');
    expect(screen.getByTestId('context-probe')).toHaveAttribute('data-subtab', 'tracks');

    await user.click(within(spotlight).getByRole('button', {
      name: "Open Artist Two's territory in the Atlas",
    }));
    expect(screen.getByTestId('context-probe')).toHaveAttribute('data-tab', 'artist');
    expect(screen.getByTestId('context-probe')).toHaveAttribute('data-artist', 'Artist Two');
  });

  it.each([
    ['es', 'Pico de repetición · un solo día', 'Abrir canción', 'ltr'],
    ['he', 'שיא החזרה · יום אחד', 'פתיחת השיר', 'rtl'],
  ] as const)('keeps the %s experience localized and bidi-safe', async (language, eyebrow, action, direction) => {
    renderRoom(language);

    const room = await screen.findByTestId('obsession-room');
    const spotlight = await screen.findByTestId('obsession-spotlight');
    expect(room).toHaveAttribute('dir', direction);
    expect(within(spotlight).getByText(eyebrow)).toBeInTheDocument();
    expect(within(spotlight).getByText(action)).toBeInTheDocument();
    expect(
      within(spotlight).getByRole('heading', { name: 'Signal Two', level: 3 }).querySelector('bdi'),
    ).toHaveAttribute('dir', 'auto');
    expect(within(spotlight).getByText('9×')).toHaveAttribute('dir', 'ltr');
  }, 15_000);

  it('shows honest empty states for archives without loops or sessions', () => {
    renderRoom('en', { ...testData, obsessions: [], sessions: [] });

    expect(screen.queryByTestId('obsession-spotlight')).not.toBeInTheDocument();
    expect(screen.getByText('No same-day loop reached the detection threshold in this archive.')).toBeInTheDocument();
    expect(screen.getByText('This archive does not contain a detectable listening marathon yet.')).toBeInTheDocument();
  });
});
