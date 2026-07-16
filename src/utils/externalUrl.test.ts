import { describe, expect, it } from 'vitest';

import { externalUrlProvider, isBandcampSearchUrl, toSafeExternalUrl } from './externalUrl';

describe('external URL boundaries', () => {
  it('recognizes only exact provider hosts or their real subdomains', () => {
    expect(externalUrlProvider('https://en.wikipedia.org/wiki/Music')).toBe('wikipedia');
    expect(externalUrlProvider('https://open.spotify.com/artist/123')).toBe('spotify');
    expect(externalUrlProvider('https://artist.bandcamp.com/album/nova')).toBe('bandcamp');
    expect(externalUrlProvider('https://youtu.be/example')).toBe('youtube');

    expect(externalUrlProvider('https://evilwikipedia.org/wiki/Music')).toBe('other');
    expect(externalUrlProvider('https://wikipedia.org.attacker.example/wiki/Music')).toBe('other');
    expect(externalUrlProvider('https://spotify.com.attacker.example/artist/123')).toBe('other');
  });

  it('allows credential-free HTTPS links and rejects unsafe schemes or credentials', () => {
    expect(toSafeExternalUrl('https://example.com/music')).toBe('https://example.com/music');
    expect(toSafeExternalUrl('http://example.com/music')).toBeNull();
    expect(toSafeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(toSafeExternalUrl('https://user:secret@localhost/music')).toBeNull();
    expect(toSafeExternalUrl('not a URL')).toBeNull();
  });

  it('identifies the canonical Bandcamp search path without substring matching', () => {
    expect(isBandcampSearchUrl('https://bandcamp.com/search?q=Nova')).toBe(true);
    expect(isBandcampSearchUrl('https://artist.bandcamp.com/search/?q=Nova')).toBe(true);
    expect(isBandcampSearchUrl('https://bandcamp.com/searching?q=Nova')).toBe(false);
    expect(isBandcampSearchUrl('https://bandcamp.com.attacker.example/search?q=Nova')).toBe(false);
  });
});
