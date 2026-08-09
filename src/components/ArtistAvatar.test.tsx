import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import ArtistAvatar, { getArtistPrimaryImageUrl, getOpenKnowledgeArtistImageUrl } from './ArtistAvatar';
import { ensureArtistPhotoMap } from './artistPhotoMap';

function avatar(name: string) {
  return (
    <AppProvider>
      <ArtistAvatar name={name} size={64} tooltip={false} />
    </AppProvider>
  );
}

describe('ArtistAvatar', () => {
  it('exposes only reviewed Wikimedia-hosted primary portraits', () => {
    expect(getOpenKnowledgeArtistImageUrl('Bring Me the Horizon', 96))
      .toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    expect(getOpenKnowledgeArtistImageUrl('TesseracT', 96)).toBeNull();
    expect(getOpenKnowledgeArtistImageUrl('Rain City Drive', 96)).toBeNull();
    expect(getOpenKnowledgeArtistImageUrl('Unknown Artist', 96)).toBeNull();
  });

  it('keeps licensed portraits reachable through real punctuation and diacritics', async () => {
    expect(getOpenKnowledgeArtistImageUrl('H.E.A.T', 96))
      .toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    expect(getOpenKnowledgeArtistImageUrl('nothing,nowhere.', 96))
      .toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    // The diacritics half now checks the wide portrait index rather than the
    // curated open-licence set. Sigur Ros proved it from that set until the
    // 2026-08 refresh dropped them out of the top 100 - the open-licence index
    // is derived from it, and no decomposable name survives in there. The wide
    // index still carries 102 of them, so this is checked where the accented
    // names actually live. Not a formality: a macOS export writes the name
    // decomposed, and that is a different string from the composed key unless
    // the lookup normalises first.
    ensureArtistPhotoMap();
    await waitFor(() => {
      expect(getArtistPrimaryImageUrl('Sigur R\u00f3s', 96)).not.toBeNull();
    });
    expect(getArtistPrimaryImageUrl('Sigur Ro\u0301s', 96))
      .toBe(getArtistPrimaryImageUrl('Sigur R\u00f3s', 96));
  });

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

  it('removes a redundant portrait name when adjacent copy already labels the artist', () => {
    const view = render(
      <AppProvider>
        <button type="button">
          <ArtistAvatar name="Bring Me the Horizon" size={40} tooltip={false} decorative />
          <span>Bring Me the Horizon</span>
        </button>
      </AppProvider>,
    );

    const button = view.getByRole('button', { name: 'Bring Me the Horizon' });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('img')).toHaveAttribute('alt', '');
  });
});
