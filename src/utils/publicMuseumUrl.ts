export const CANONICAL_PUBLIC_MUSEUM_URL = 'https://liriothteltanion.github.io/NovaMusicLab/#/';

interface PublicLocation {
  hostname: string;
  origin: string;
  pathname: string;
  protocol: string;
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '127.0.0.1'
    || normalized === '0.0.0.0'
    || normalized === '::1';
}

/**
 * Sharing from Vite preview must never hand a friend a loopback URL. Public
 * HTTPS deployments retain their own pathname, while local/file previews use
 * the canonical GitHub Pages museum.
 */
export function resolvePublicMuseumUrl(location: PublicLocation): string {
  if (location.protocol !== 'https:' || isLocalHostname(location.hostname)) {
    return CANONICAL_PUBLIC_MUSEUM_URL;
  }

  return `${location.origin}${location.pathname}#/`;
}
