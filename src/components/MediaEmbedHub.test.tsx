import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import type { ArtistMediaProfile } from '../utils/mediaLinks';
import MediaEmbedHub from './MediaEmbedHub';

const profile: ArtistMediaProfile = {
  artistName: 'Bring Me the Horizon',
  curated: {
    artist: 'Bring Me the Horizon',
    wikipediaEnUrl: 'https://en.wikipedia.org/wiki/Bring_Me_the_Horizon',
  },
  spotify: {
    externalUrl: 'https://open.spotify.com/artist/example',
    embedUrl: 'https://open.spotify.com/embed/artist/example',
    verified: true,
  },
  youtube: {
    externalUrl: 'https://www.youtube.com/results?search_query=Bring+Me+the+Horizon',
    verified: false,
  },
  actions: [
    {
      label: 'Top track',
      url: 'https://open.spotify.com/track/example',
      provider: 'spotify',
      kind: 'track',
    },
    {
      label: 'Live',
      url: 'https://www.youtube.com/results?search_query=Bring+Me+the+Horizon+live',
      provider: 'youtube',
      kind: 'live',
    },
  ],
};

describe('MediaEmbedHub Hebrew localization', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nml_lang', 'he');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.lang = 'es';
    document.documentElement.dir = 'ltr';
    delete document.documentElement.dataset.language;
  });

  it('uses idiomatic Hebrew, preserves brands and isolates the artist name', async () => {
    render(
      <AppProvider>
        <MediaEmbedHub profile={profile} />
      </AppProvider>,
    );

    expect(await screen.findByText('תחנת האזנה חוקית')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('מצב המקורות')).toBeInTheDocument();
    expect(screen.getByText('חיפוש חוקי')).toBeInTheDocument();
    expect(screen.getByText(profile.artistName)).toHaveAttribute('dir', 'auto');
    expect(screen.getByTitle(`${profile.artistName} — נגן רשמי של Spotify`)).toHaveAttribute(
      'src',
      profile.spotify.embedUrl,
    );
    expect(screen.getByText('שיר מוביל')).toBeInTheDocument();
    expect(screen.getByText('הופעה חיה')).toBeInTheDocument();
    expect(screen.getByText('ביוגרפיה')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /פתיחת שיר מוביל של Bring Me the Horizon ב־Spotify/ })).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/example',
    );
    expect(screen.getByRole('link', { name: /פתיחת ביוגרפיה של Bring Me the Horizon ב־Wikipedia/ })).toHaveAttribute(
      'href',
      profile.curated?.wikipediaEnUrl,
    );
  });
});
