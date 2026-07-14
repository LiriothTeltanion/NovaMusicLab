export const APP_TABS = [
  'hero',
  'dashboard',
  'eras',
  'top',
  'personality',
  'emotions',
  'obsessions',
  'cultural',
  'inner',
  'artist',
  'insights',
  'compare',
  'museums',
  'platforms',
  'quality',
  'statsdeep',
  'achievements',
  'timecapsule',
  'wrapped',
  'pulse',
  'report',
  'upload',
  'aiassistant',
] as const;

export type AppTab = (typeof APP_TABS)[number];
export type TopSubTab = 'artists' | 'albums' | 'tracks' | 'genres' | 'years';

export interface DeepLinkState {
  tab: AppTab;
  topSubTab: TopSubTab;
  selectedArtistName: string;
  selectedAlbumKey: string;
  selectedTrackKey: string;
}

export interface ParsedDeepLink extends DeepLinkState {
  valid: boolean;
}

export const DEFAULT_DEEP_LINK_STATE: DeepLinkState = {
  tab: 'hero',
  topSubTab: 'artists',
  selectedArtistName: '',
  selectedAlbumKey: '',
  selectedTrackKey: '',
};

/**
 * Public hash routes stay independent from internal component names. Hash
 * routing works on GitHub Pages without asking the server to resolve a nested
 * path on refresh.
 */
export const TAB_ROUTES: Readonly<Record<AppTab, string>> = {
  hero: '/',
  dashboard: '/dashboard',
  eras: '/eras',
  top: '/top',
  personality: '/personality',
  emotions: '/emotions',
  obsessions: '/obsessions',
  cultural: '/culture',
  inner: '/inner-world',
  artist: '/artist-identity',
  insights: '/insights',
  compare: '/spotify-vs-lastfm',
  museums: '/compare-museums',
  platforms: '/platforms',
  quality: '/data-quality',
  statsdeep: '/stats-pro',
  achievements: '/achievements',
  timecapsule: '/time-capsule',
  wrapped: '/wrapped',
  pulse: '/recent-pulse',
  report: '/report',
  upload: '/upload',
  aiassistant: '/assistant',
};

const ROUTE_TABS = new Map<string, AppTab>(
  Object.entries(TAB_ROUTES).map(([tab, route]) => [route, tab as AppTab]),
);

// Internal ids remain accepted as aliases so hand-written or early preview
// links canonicalize instead of failing. New links always use TAB_ROUTES.
APP_TABS.forEach(tab => ROUTE_TABS.set(`/${tab}`, tab));

const TOP_SUB_TABS = new Set<TopSubTab>(['artists', 'albums', 'tracks', 'genres', 'years']);

function normalizePath(pathname: string) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (withLeadingSlash === '/') return withLeadingSlash;
  return withLeadingSlash.replace(/\/+$/, '').toLowerCase();
}

function safeParam(params: URLSearchParams, key: string) {
  // Dossier keys are compact, but bounding hand-written URLs prevents a hash
  // from becoming an accidental unbounded state payload.
  return (params.get(key) ?? '').slice(0, 1_024);
}

export function parseDeepLink(hash: string): ParsedDeepLink {
  const raw = hash.trim().replace(/^#/, '');
  if (!raw) return { ...DEFAULT_DEEP_LINK_STATE, valid: true };

  try {
    const candidate = `/${raw.replace(/^\/+/, '')}`;
    const url = new URL(candidate, 'https://nova-music.local');
    const tab = ROUTE_TABS.get(normalizePath(url.pathname));
    if (!tab) return { ...DEFAULT_DEEP_LINK_STATE, valid: false };

    const requestedSubTab = url.searchParams.get('view');
    const topSubTab = requestedSubTab && TOP_SUB_TABS.has(requestedSubTab as TopSubTab)
      ? requestedSubTab as TopSubTab
      : DEFAULT_DEEP_LINK_STATE.topSubTab;

    return {
      tab,
      topSubTab,
      selectedArtistName: safeParam(url.searchParams, 'artist'),
      selectedAlbumKey: safeParam(url.searchParams, 'album'),
      selectedTrackKey: safeParam(url.searchParams, 'track'),
      valid: true,
    };
  } catch {
    return { ...DEFAULT_DEEP_LINK_STATE, valid: false };
  }
}

export function buildDeepLink(state: DeepLinkState) {
  const route = TAB_ROUTES[state.tab] ?? TAB_ROUTES.hero;
  const params = new URLSearchParams();

  // Dossier state belongs to the Top room. Keeping it out of unrelated rooms
  // avoids carrying three long, stale catalog keys through every museum URL.
  if (state.tab === 'top') {
    params.set('view', state.topSubTab);
    if (state.topSubTab !== 'genres' && state.topSubTab !== 'years') {
      if (state.selectedArtistName) params.set('artist', state.selectedArtistName);
      if (state.selectedAlbumKey) params.set('album', state.selectedAlbumKey);
      if (state.selectedTrackKey) params.set('track', state.selectedTrackKey);
    }
  }

  const query = params.toString();
  return `#${route}${query ? `?${query}` : ''}`;
}

export function buildShareUrl(
  location: Pick<Location, 'origin' | 'pathname' | 'search'>,
  state: DeepLinkState,
) {
  return `${location.origin}${location.pathname}${location.search}${buildDeepLink(state)}`;
}

export type DeepLinkHistoryAction = 'none' | 'push' | 'replace';

/**
 * Room changes create navigable history entries. Dossier/sub-tab changes
 * refine the current entry so browsing artists does not flood Back history.
 */
export function syncDeepLinkHistory(
  history: Pick<History, 'pushState' | 'replaceState'>,
  currentHash: string,
  previousTab: AppTab,
  state: DeepLinkState,
): DeepLinkHistoryAction {
  const nextHash = buildDeepLink(state);
  if (currentHash === nextHash) return 'none';

  if (previousTab !== state.tab) {
    history.pushState(null, '', nextHash);
    return 'push';
  }

  history.replaceState(null, '', nextHash);
  return 'replace';
}
