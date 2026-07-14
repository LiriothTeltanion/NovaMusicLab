import { useRef, useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import MobileDetailDrawer from './MobileDetailDrawer';

function Harness() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div id="root">
      <button
        key={open ? 'selected-trigger' : 'ranking-trigger'}
        ref={triggerRef}
        type="button"
        aria-label="Open profile"
        onClick={() => setOpen(true)}
      >
        Open profile
      </button>
      <MobileDetailDrawer
        open={open}
        title="Artist dossier"
        closeLabel="Back to ranking"
        onClose={() => setOpen(false)}
        returnFocusTarget={triggerRef.current}
      >
        <a href="#details">Profile details</a>
      </MobileDetailDrawer>
    </div>
  );
}

describe('MobileDetailDrawer', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('moves focus inside, closes with Escape and restores the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open profile' });

    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Artist dossier' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Back to ranking' })).toHaveFocus());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open profile' })).toHaveFocus());
  });

  it('localizes the drawer eyebrow and mirrors the back icon in Hebrew', async () => {
    localStorage.setItem('nml_lang', 'he');
    const user = userEvent.setup();
    render(<AppProvider><Harness /></AppProvider>);

    await user.click(await screen.findByRole('button', { name: 'Open profile' }));

    expect(await screen.findByText(/פרטי NOVA/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to ranking' }).querySelector('svg'))
      .toHaveClass('nova-mirror-rtl');
  });
});
