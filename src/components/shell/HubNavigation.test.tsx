import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HubNavigation from './HubNavigation';

describe('HubNavigation', () => {
  afterEach(cleanup);

  it('exposes the five durable destinations and navigates from buttons or the compact selector', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<HubNavigation activeHub="home" lang="en" onSelect={onSelect} />);

    expect(screen.getByRole('navigation', { name: 'Museum map' })).toHaveAttribute(
      'data-testid',
      'museum-map-dock',
    );
    expect(screen.getByText('Quick route')).toBeInTheDocument();
    expect(screen.getByText('Current hub')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'Atlas' }));
    expect(onSelect).toHaveBeenCalledWith('atlas');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose a museum hub' }), 'lab');
    expect(onSelect).toHaveBeenCalledWith('lab');
  });

  it('keeps Hebrew navigation right-to-left with localized labels', () => {
    render(<HubNavigation activeHub="stories" lang="he" onSelect={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: 'מפת המוזיאון' })).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('מסלול מהיר')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'סיפורים' })).toHaveAttribute('aria-current', 'page');
  });

  it('embeds the hub map in the title bar while the expedition console owns the second sticky row', () => {
    const dockCss = readFileSync('src/components/shell/HubNavigation.css', 'utf8');
    const consoleCss = readFileSync('src/components/shell/ExpeditionConsole.css', 'utf8');
    const shellCss = readFileSync('src/index.css', 'utf8');

    expect(dockCss).not.toMatch(/position:\s*sticky/);
    expect(consoleCss).toMatch(/position:\s*sticky/);
    expect(consoleCss).toMatch(/inset-block-start:\s*var\(--nova-app-header-height\)/);
    expect(shellCss).toMatch(/inset-block-start:\s*var\(--nova-sticky-shell-height\)/);
    expect(shellCss).toMatch(/max-block-size:\s*calc\(100dvh - var\(--nova-sticky-shell-height\)\)/);
  });
});
