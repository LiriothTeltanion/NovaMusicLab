import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';

function avatar(name: string) {
  return (
    <AppProvider>
      <ArtistAvatar name={name} size={64} tooltip={false} />
    </AppProvider>
  );
}

describe('ArtistAvatar', () => {
  it('resets a failed media chain when the selected artist changes', async () => {
    const { rerender } = render(avatar('Bring Me the Horizon'));

    fireEvent.error(screen.getByRole('img', { name: 'Bring Me the Horizon' }));
    fireEvent.error(screen.getByRole('img', { name: 'Bring Me the Horizon' }));
    fireEvent.error(screen.getByRole('img', { name: 'Bring Me the Horizon' }));

    rerender(avatar('Deafheaven'));

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Deafheaven' })).toHaveAttribute('src');
    });
  });

  it('does not send a page referrer with remote artist media', () => {
    render(avatar('Bring Me the Horizon'));
    expect(screen.getByRole('img', { name: 'Bring Me the Horizon' })).toHaveAttribute(
      'referrerpolicy',
      'no-referrer',
    );
  });
});
