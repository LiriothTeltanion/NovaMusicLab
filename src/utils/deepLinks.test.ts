import { describe, expect, it, vi } from 'vitest';

import {
  APP_TABS,
  DEFAULT_DEEP_LINK_STATE,
  TAB_ROUTES,
  buildDeepLink,
  buildShareUrl,
  parseDeepLink,
  syncDeepLinkHistory,
  type DeepLinkState,
} from './deepLinks';

describe('deep links', () => {
  it('gives every room a unique friendly route and round-trips every tab', () => {
    expect(new Set(Object.values(TAB_ROUTES)).size).toBe(APP_TABS.length);

    APP_TABS.forEach(tab => {
      const hash = buildDeepLink({ ...DEFAULT_DEEP_LINK_STATE, tab });
      const parsed = parseDeepLink(hash);

      expect(parsed.valid).toBe(true);
      expect(parsed.tab).toBe(tab);
      expect(buildDeepLink(parsed)).toBe(hash);
    });
  });

  it('preserves the Top view and unicode dossier keys through parse/build', () => {
    const state: DeepLinkState = {
      tab: 'top',
      topSubTab: 'tracks',
      selectedArtistName: 'Sigur Rós',
      selectedAlbumKey: 'sigur rós|||Ágætis byrjun',
      selectedTrackKey: 'bring me the horizon|||Drown #1',
    };

    const hash = buildDeepLink(state);
    const parsed = parseDeepLink(hash);

    expect(hash).toContain('#/top?view=tracks');
    expect(parsed).toMatchObject({ ...state, valid: true });
    expect(buildDeepLink(parsed)).toBe(hash);
  });

  it('keeps dossier query state scoped to the Top room', () => {
    expect(buildDeepLink({
      tab: 'dashboard',
      topSubTab: 'albums',
      selectedArtistName: 'Deafheaven',
      selectedAlbumKey: 'deafheaven|||Sunbather',
      selectedTrackKey: 'deafheaven|||Dream House',
    })).toBe('#/dashboard');
  });

  it('shares the archive-wide genre and year views without stale dossier keys', () => {
    const staleDossier = {
      ...DEFAULT_DEEP_LINK_STATE,
      tab: 'top' as const,
      selectedArtistName: 'Deafheaven',
      selectedAlbumKey: 'deafheaven|||Sunbather',
      selectedTrackKey: 'deafheaven|||Dream House',
    };

    expect(buildDeepLink({ ...staleDossier, topSubTab: 'genres' })).toBe('#/top?view=genres');
    expect(buildDeepLink({ ...staleDossier, topSubTab: 'years' })).toBe('#/top?view=years');
    expect(parseDeepLink('#/top?view=years')).toMatchObject({ tab: 'top', topSubTab: 'years', valid: true });
  });

  it('canonicalizes internal aliases and safely falls back on invalid hashes', () => {
    const alias = parseDeepLink('#statsdeep');
    expect(alias).toMatchObject({ tab: 'statsdeep', valid: true });
    expect(buildDeepLink(alias)).toBe('#/stats-pro');

    expect(parseDeepLink('#/does-not-exist?artist=Injected')).toEqual({
      ...DEFAULT_DEEP_LINK_STATE,
      valid: false,
    });
    expect(parseDeepLink('#//example.com/dashboard')).toEqual({
      ...DEFAULT_DEEP_LINK_STATE,
      valid: false,
    });
  });

  it('retains a GitHub Pages base path when building the copied URL', () => {
    expect(buildShareUrl({
      origin: 'https://lirioth.github.io',
      pathname: '/nova-music-dashboard/',
      search: '?preview=1',
    }, {
      ...DEFAULT_DEEP_LINK_STATE,
      tab: 'quality',
    })).toBe('https://lirioth.github.io/nova-music-dashboard/?preview=1#/data-quality');
  });

  it('pushes room changes, replaces selection changes and skips canonical state', () => {
    const history = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    } as unknown as Pick<History, 'pushState' | 'replaceState'>;
    const topState: DeepLinkState = {
      ...DEFAULT_DEEP_LINK_STATE,
      tab: 'top',
      topSubTab: 'artists',
      selectedArtistName: 'Deafheaven',
    };

    expect(syncDeepLinkHistory(history, '#/dashboard', 'dashboard', topState)).toBe('push');
    expect(history.pushState).toHaveBeenCalledWith(null, '', buildDeepLink(topState));

    const nextSelection = { ...topState, selectedArtistName: 'Sigur Rós' };
    expect(syncDeepLinkHistory(history, buildDeepLink(topState), 'top', nextSelection)).toBe('replace');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', buildDeepLink(nextSelection));

    expect(syncDeepLinkHistory(history, buildDeepLink(nextSelection), 'top', nextSelection)).toBe('none');
    expect(history.pushState).toHaveBeenCalledTimes(1);
    expect(history.replaceState).toHaveBeenCalledTimes(1);
  });
});
