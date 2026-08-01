import { describe, expect, it } from 'vitest';
import {
  CANONICAL_PUBLIC_MUSEUM_URL,
  resolvePublicMuseumUrl,
} from './publicMuseumUrl';

describe('resolvePublicMuseumUrl', () => {
  it.each([
    ['localhost', 'http:', 'http://localhost:5173'],
    ['127.0.0.1', 'http:', 'http://127.0.0.1:4173'],
    ['::1', 'http:', 'http://[::1]:4173'],
  ])('never shares the %s preview host', (hostname, protocol, origin) => {
    expect(resolvePublicMuseumUrl({
      hostname,
      protocol,
      origin,
      pathname: '/NovaMusicLab/',
    })).toBe(CANONICAL_PUBLIC_MUSEUM_URL);
  });

  it('keeps the active public HTTPS deployment path', () => {
    expect(resolvePublicMuseumUrl({
      hostname: 'museum.example',
      protocol: 'https:',
      origin: 'https://museum.example',
      pathname: '/nova/',
    })).toBe('https://museum.example/nova/#/');
  });
});
