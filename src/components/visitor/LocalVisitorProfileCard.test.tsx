import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LocalVisitorProfileCard from './LocalVisitorProfileCard';

afterEach(cleanup);

describe('LocalVisitorProfileCard', () => {
  it('explains that the name is local and optional', () => {
    render(
      <LocalVisitorProfileCard
        displayName=""
        isPersonalArchive={false}
        lang="en"
        onDisplayNameChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/no account required/i)).toBeInTheDocument();
    expect(screen.getByText(/not a login, a public username or a password/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /museum name/i })).toBeInTheDocument();
  });

  it('preserves spaces while typing and normalizes the visitor label on blur', () => {
    const onDisplayNameChange = vi.fn();
    render(
      <LocalVisitorProfileCard
        displayName=""
        isPersonalArchive
        lang="es"
        onDisplayNameChange={onDisplayNameChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: /nombre del museo/i });
    fireEvent.change(input, {
      target: { value: '  Danny Muse  ' },
    });
    expect(input).toHaveValue('  Danny Muse  ');
    expect(onDisplayNameChange).toHaveBeenLastCalledWith('  Danny Muse  ');

    fireEvent.blur(input);

    expect(input).toHaveValue('Danny Muse');
    expect(onDisplayNameChange).toHaveBeenLastCalledWith('Danny Muse');
  });

  it('does not claim durable storage when the browser blocks it', () => {
    render(
      <LocalVisitorProfileCard
        displayName="Danny"
        isPersonalArchive
        lang="en"
        onDisplayNameChange={vi.fn()}
        storageAvailable={false}
      />,
    );

    expect(screen.getByText(/active in this tab only/i)).toBeInTheDocument();
    expect(screen.queryByText('Saved only on this device')).not.toBeInTheDocument();
  });
});
