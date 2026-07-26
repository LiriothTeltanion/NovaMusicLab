import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity, LayoutDashboard } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import musicData from '../../data/music_dna_mock.json';
import type { MusicDnaData } from '../../types';
import ExpeditionConsole from './ExpeditionConsole';
import { journeyContainsRoom, roomIdsForJourney } from './expeditionJourney';

const data = musicData as unknown as MusicDnaData;
const rooms = [
  { id: 'dashboard', label: 'Dashboard', groupLabel: 'Overview', color: '#22d3ee', icon: LayoutDashboard },
  { id: 'quality', label: 'Data Quality', groupLabel: 'Data', color: '#2dd4bf', icon: Activity },
];

function renderConsole(overrides: Partial<React.ComponentProps<typeof ExpeditionConsole>> = {}) {
  const props: React.ComponentProps<typeof ExpeditionConsole> = {
    activeJourney: 'full',
    activeRoomId: 'dashboard',
    data,
    isPersonalArchive: false,
    isPersisted: false,
    lang: 'en',
    rooms,
    savedAt: null,
    sourceLabel: null,
    onNavigate: vi.fn(),
    onOpenArchive: vi.fn(),
    onSelectJourney: vi.fn(),
    ...overrides,
  };
  return { ...render(<ExpeditionConsole {...props} />), props };
}

describe('ExpeditionConsole', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('keeps each journey scoped to a real ordered route', () => {
    expect(roomIdsForJourney('quick')).toEqual(expect.arrayContaining(['dashboard', 'artist', 'report']));
    expect(journeyContainsRoom('quick', 'quality')).toBe(false);
    expect(journeyContainsRoom('lab', 'quality')).toBe(true);
    expect(journeyContainsRoom('full', 'upload')).toBe(true);
  });

  it('shows archive mode, source, date, privacy and local state from real archive metadata', async () => {
    const user = userEvent.setup();
    const onOpenArchive = vi.fn();
    renderConsole({
      isPersonalArchive: true,
      isPersisted: true,
      savedAt: '2026-07-20T08:30:00.000Z',
      sourceLabel: 'Spotify export',
      onOpenArchive,
    });

    const capsule = screen.getByTestId('archive-capsule');
    expect(capsule).toHaveAttribute('data-archive-mode', 'personal');
    expect(capsule).toHaveAttribute('data-persisted', 'true');
    expect(capsule).toHaveTextContent('My museum');
    expect(capsule).toHaveTextContent('Spotify export');
    expect(capsule).toHaveTextContent('Local only');
    expect(capsule).toHaveTextContent('Saved');
    expect(capsule).toHaveAccessibleName(/Privacy: Local only\. Local state: Saved\./);
    expect(screen.getByTestId('archive-compact-status')).toHaveTextContent('LocalSaved');

    await user.click(capsule);
    expect(onOpenArchive).toHaveBeenCalledTimes(1);
  });

  it('describes the bundled flagship as a reviewed public bundle', () => {
    renderConsole();

    const capsule = screen.getByTestId('archive-capsule');
    expect(capsule).toHaveAttribute('data-archive-mode', 'flagship');
    expect(capsule).toHaveTextContent('Flagship exhibition');
    expect(capsule).toHaveTextContent('Reviewed public bundle');
    expect(capsule).toHaveTextContent('Bundled');
    expect(capsule).toHaveAccessibleName(/Privacy: Reviewed public bundle\. Local state: Bundled\./);
    expect(screen.getByTestId('archive-compact-status')).toHaveTextContent('PublicBundled');
    expect(capsule.querySelector('dl')).not.toBeInTheDocument();
    expect(capsule.querySelectorAll('.archive-capsule__detail')).toHaveLength(5);
  });

  it('keeps compact journey labels available for narrow layouts', () => {
    renderConsole();

    expect(screen.getByRole('button', { name: 'Quick Tour' })).toHaveTextContent('Quick');
    expect(screen.getByRole('button', { name: 'Full Museum' })).toHaveTextContent('Museum');
    expect(screen.getByRole('button', { name: 'Lab Tools' })).toHaveTextContent('Lab');
  });

  it('opens with Ctrl+K, filters rooms and completes navigation with Enter', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderConsole({ onNavigate });

    await user.keyboard('{Control>}k{/Control}');
    const dialog = screen.getByRole('dialog', { name: 'Nova Command' });
    expect(dialog).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: /search rooms and tools/i });
    await waitFor(() => expect(input).toHaveFocus());
    await user.type(input, 'quality{Enter}');

    expect(onNavigate).toHaveBeenCalledWith('quality');
    expect(screen.queryByRole('dialog', { name: 'Nova Command' })).not.toBeInTheDocument();
  });

  it('closes on Escape, restores focus and exposes all journeys as functional actions', async () => {
    const user = userEvent.setup();
    const onSelectJourney = vi.fn();
    renderConsole({ onSelectJourney });

    const trigger = screen.getByRole('button', { name: /open command palette/i });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Start Quick Tour' }));
    expect(onSelectJourney).toHaveBeenCalledWith('quick');

    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('restores command-trigger focus when the current room is selected again', async () => {
    const user = userEvent.setup();
    renderConsole();

    const trigger = screen.getByRole('button', { name: /open command palette/i });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: /DashboardOverviewCurrent room/i }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps the console and archive evidence RTL in Hebrew', () => {
    renderConsole({ lang: 'he' });

    expect(screen.getByTestId('journey-switcher')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('archive-capsule')).toHaveAttribute('dir', 'rtl');
  });
});
