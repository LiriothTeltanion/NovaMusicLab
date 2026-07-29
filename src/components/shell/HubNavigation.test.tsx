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

    expect(screen.getByRole('navigation', { name: 'Museum hubs' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'Atlas' }));
    expect(onSelect).toHaveBeenCalledWith('atlas');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose a museum hub' }), 'lab');
    expect(onSelect).toHaveBeenCalledWith('lab');
  });

  it('keeps Hebrew navigation right-to-left with localized labels', () => {
    render(<HubNavigation activeHub="stories" lang="he" onSelect={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: 'מרכזי המוזיאון' })).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('button', { name: 'סיפורים' })).toHaveAttribute('aria-current', 'page');
  });
});
