import { useEffect, useState } from 'react';

/**
 * Reactive, SSR-safe media query state.
 *
 * State deliberately starts from the supplied fallback so server rendering
 * never reaches for `window`. In the browser, the effect synchronizes the real
 * query and also supports Safari's legacy MediaQueryList listener pair.
 */
export function useMediaQuery(query: string, serverFallback = false) {
  const [matches, setMatches] = useState(serverFallback);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, [query]);

  return matches;
}
