import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App, { resetRoomViewport, writeClipboardText } from './App';
import { parseDeepLink } from './utils/deepLinks';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

describe('room navigation focus', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
    Reflect.deleteProperty(window.navigator, 'clipboard');
    document.body.replaceChildren();
  });

  it('resets the page and focuses the resolved room heading without scrolling it away', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const main = document.createElement('main');
    const heading = document.createElement('h1');
    heading.textContent = 'The Listening Oracle';
    main.append(heading);
    document.body.append(main);

    resetRoomViewport(main);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(heading).toHaveFocus();
  });

  it('falls back when an embedded browser rejects the modern clipboard API', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    const execCommand = vi.fn(() => true);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    await writeClipboardText('https://nova.example/#/stats-pro');

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
    Reflect.deleteProperty(document, 'execCommand');
  });

  it('keeps the responsive shell shrinkable and removes collapsed sidebar groups from keyboard navigation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
    render(<App />);

    const cvLink = await screen.findByTestId('header-cv-link', {}, { timeout: 8000 });
    expect(cvLink).toHaveAttribute('href', '/cv/kevin-cusnir-cv-en.pdf');
    expect(cvLink).toHaveAttribute('target', '_blank');

    await user.click(await screen.findByRole('button', { name: /enter the sound museum/i }, { timeout: 8000 }));
    await waitFor(
      () => expect(document.getElementById('sidebar-group-trigger-listening')).toBeInTheDocument(),
      { timeout: 5000 },
    );
    const groupTrigger = document.getElementById('sidebar-group-trigger-listening') as HTMLButtonElement;
    const group = document.getElementById(groupTrigger.getAttribute('aria-controls')!);
    const shell = screen.getByTestId('museum-app-shell');
    const sidebar = screen.getByTestId('museum-sidebar');
    const main = screen.getByTestId('museum-room-main');

    expect(screen.getByTestId('museum-app-header')).toHaveClass('nova-app-header', 'flex-nowrap');
    expect(shell).toHaveClass('w-full', 'min-w-0');
    expect(sidebar).toHaveClass('nova-app-sidebar');
    expect(main).toHaveClass('min-w-0', 'flex-1');
    expect(main).not.toHaveClass('w-full');
    expect(main).toHaveAttribute('data-room-width', 'analytics');

    expect(groupTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(group).toHaveAttribute('inert');
    expect(group).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(groupTrigger);
    await waitFor(() => expect(groupTrigger).toHaveAttribute('aria-expanded', 'true'));
    expect(group).not.toHaveAttribute('inert');
    expect(group).toHaveAttribute('aria-hidden', 'false');
  }, 15_000);

  it('hydrates, navigates and copies canonical hash deep links', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
    window.history.replaceState(null, '', '/#/dashboard');

    render(<App />);

    const dashboardButtons = await screen.findAllByRole(
      'button',
      { name: /dashboard - overview/i },
      { timeout: 8000 },
    );
    await waitFor(() => expect(
      dashboardButtons.some(button => button.getAttribute('aria-current') === 'page'),
    ).toBe(true));

    await user.click(screen.getAllByRole('button', { name: /eras.*overview/i })[0]);
    await waitFor(() => expect(window.location.hash).toBe('#/eras'));

    window.history.replaceState(
      null,
      '',
      '/#/top?view=tracks&artist=Sigur+R%C3%B3s&track=sigur+r%C3%B3s%7C%7C%7CStar%C3%A1lfur',
    );
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    const topRooms = await screen.findAllByRole('button', { name: /top.*archive/i });
    await waitFor(() => expect(
      topRooms.some(button => button.getAttribute('aria-current') === 'page'),
    ).toBe(true));
    expect(screen.getByTestId('museum-room-main')).toHaveAttribute('data-room-width', 'explorer');
    expect(parseDeepLink(window.location.hash)).toMatchObject({
      tab: 'top',
      topSubTab: 'tracks',
      selectedArtistName: 'Sigur Rós',
      selectedTrackKey: 'sigur rós|||Starálfur',
      valid: true,
    });

    await user.click(screen.getByTestId('copy-deep-link-header'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Link copied to the clipboard');
  }, 20_000);
});
