import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity, LayoutDashboard } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import musicData from '../../data/music_dna_mock.json';
import { ExperienceProvider } from '../../context/ExperienceContext';
import type { MusicDnaData } from '../../types';
import ExpeditionConsole from './ExpeditionConsole';

const data = musicData as unknown as MusicDnaData;
const rooms = [
  { id: 'dashboard', label: 'Dashboard', groupLabel: 'Home', color: '#22d3ee', icon: LayoutDashboard },
  { id: 'quality', label: 'Data Quality', groupLabel: 'Data Lab', color: '#2dd4bf', icon: Activity },
];
const roomItems = rooms.map(room => ({
  ...room,
  secondary: room.color,
  isChapter: true,
}));

function renderConsole(overrides: Partial<React.ComponentProps<typeof ExpeditionConsole>> = {}) {
  const props: React.ComponentProps<typeof ExpeditionConsole> = {
    activeRoomId: 'dashboard',
    data,
    isPersonalArchive: false,
    isPersisted: false,
    lang: 'en',
    roomItems,
    rooms,
    savedAt: null,
    sourceLabel: null,
    onNavigate: vi.fn(),
    onOpenArchive: vi.fn(),
    ...overrides,
  };
  return {
    ...render(
      <ExperienceProvider>
        <ExpeditionConsole {...props} />
      </ExperienceProvider>,
    ),
    props,
  };
}

describe('ExpeditionConsole', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('reveals version and archive evidence from a compact disclosure', async () => {
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
    const trigger = screen.getByTestId('archive-capsule-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAccessibleName(/Current version: 1\.6\.0.*Privacy: Local only\. Local state: Saved\./);
    expect(screen.getByTestId('archive-compact-status')).toHaveTextContent('v1.6.0Local archive');
    expect(screen.queryByTestId('archive-capsule-panel')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByTestId('archive-capsule-panel');
    expect(panel).toHaveTextContent('My museum');
    expect(panel).toHaveTextContent('Spotify export');
    expect(panel).toHaveTextContent('Local only');
    expect(panel).toHaveTextContent('Saved');

    await user.click(screen.getByRole('button', { name: 'Manage archive' }));
    expect(onOpenArchive).toHaveBeenCalledTimes(1);
  });

  it('describes the bundled flagship and closes the disclosure with Escape', async () => {
    const user = userEvent.setup();
    renderConsole();

    const capsule = screen.getByTestId('archive-capsule');
    expect(capsule).toHaveAttribute('data-archive-mode', 'flagship');
    const trigger = screen.getByTestId('archive-capsule-trigger');
    expect(trigger).toHaveAccessibleName(/Privacy: Reviewed public bundle\. Local state: Bundled\./);
    expect(screen.getByTestId('archive-compact-status')).toHaveTextContent('v1.6.0Public archive');

    await user.click(trigger);
    const panel = screen.getByTestId('archive-capsule-panel');
    expect(panel).toHaveTextContent('Flagship exhibition');
    expect(panel).toHaveTextContent('Reviewed public bundle');
    expect(panel).toHaveTextContent('Bundled');
    expect(panel).toHaveTextContent('Archive generated');
    expect(panel).toHaveTextContent('Dated snapshots · no live connection');
    expect(panel.querySelectorAll('.archive-capsule__detail')).toHaveLength(8);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByTestId('archive-capsule-panel')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('shows separate listening, enrichment and pulse dates for a reviewed snapshot', async () => {
    const user = userEvent.setup();
    renderConsole({
      data: {
        ...data,
        snapshot_freshness: {
          observedFrom: '2015-03-01',
          observedThrough: '2026-08-06',
          datasetGeneratedAt: data.generated_at,
          enrichmentGeneratedAt: '2026-07-29T00:00:00.000Z',
          recentPulseSyncedAt: '2026-07-02',
          liveConnection: false,
        },
      },
    });

    await user.click(screen.getByTestId('archive-capsule-trigger'));
    const panel = screen.getByTestId('archive-capsule-panel');
    expect(panel).toHaveTextContent(/Listening observed.*Mar 1, 2015.*Aug 6, 2026/);
    expect(panel).toHaveTextContent(/Artist enrichment.*Jul 29, 2026/);
    expect(panel).toHaveTextContent(/Recent Pulse synced.*Jul 2, 2026/);
    expect(panel).toHaveTextContent('Dated snapshots · no live connection');
  });

  it('keeps compact journey labels available for narrow layouts', () => {
    renderConsole();

    expect(screen.getByRole('button', { name: 'Guided' })).toHaveTextContent('Guided');
    expect(screen.getByRole('button', { name: 'Explore' })).toHaveTextContent('Explore');
    expect(screen.getByRole('button', { name: 'Deep Dive' })).toHaveTextContent('Details');
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

  it('keeps search collapsed to a labelled magnifier until its searchable dialog opens', async () => {
    const user = userEvent.setup();
    renderConsole();

    const trigger = screen.getByTestId('command-palette-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('textbox', { name: /search rooms and tools/i })).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const input = await screen.findByRole('textbox', { name: /search rooms and tools/i });
    await waitFor(() => expect(input).toHaveFocus());

    const backgroundControl = document.createElement('button');
    document.body.append(backgroundControl);
    backgroundControl.focus();
    expect(input).toHaveFocus();
  });

  it('places the all-room navigator in the console and exposes its grouped map', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderConsole({ onNavigate });

    const navigator = screen.getByTestId('room-progress');
    expect(screen.getByTestId('expedition-console')).toContainElement(navigator);
    await user.click(screen.getByRole('button', { name: 'Open room map: Dashboard' }));
    expect(screen.getByRole('dialog', { name: 'Room map' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Data Quality' }));
    expect(onNavigate).toHaveBeenCalledWith('quality');
  });

  it('closes on Escape, restores focus and exposes every depth as a functional action', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('nml_experience_depth', 'explore');
    renderConsole();

    const trigger = screen.getByRole('button', { name: /open command palette/i });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Use Guided' }));
    await waitFor(() => expect(window.localStorage.getItem('nml_experience_depth')).toBe('guided'));

    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('restores command-trigger focus when the current room is selected again', async () => {
    const user = userEvent.setup();
    renderConsole();

    const trigger = screen.getByRole('button', { name: /open command palette/i });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: /DashboardHomeCurrent room/i }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps the console and archive evidence RTL in Hebrew', () => {
    renderConsole({ lang: 'he' });

    expect(screen.getByTestId('experience-switcher')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('archive-capsule')).toHaveAttribute('dir', 'rtl');
  });
});
