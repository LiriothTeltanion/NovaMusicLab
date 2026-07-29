import { describe, expect, it } from 'vitest';
import { optimizeRemoteImageUrl } from './remoteImage';

describe('optimizeRemoteImageUrl', () => {
  it('shrinks Deezer portraits used by compact dashboard avatars', () => {
    expect(optimizeRemoteImageUrl(
      'https://cdn-images.dzcdn.net/images/artist/hash/1000x1000-000000-80-0-0.jpg',
      44,
    )).toContain('/250x250-');
  });

  it('right-sizes Wikimedia thumbnails while preserving their identity', () => {
    expect(optimizeRemoteImageUrl(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/photo.jpg/960px-photo.jpg',
      92,
    )).toContain('/330px-photo.jpg');
  });

  it('uses the compact Cover Art Archive sibling for museum cards', () => {
    expect(optimizeRemoteImageUrl(
      'https://coverartarchive.org/release/example/front-500',
      96,
    )).toBe('https://coverartarchive.org/release/example/front-250');
  });

  it('keeps compact Spotify profile art compact', () => {
    const url = 'https://i.scdn.co/image/ab67616100005174example';
    expect(optimizeRemoteImageUrl(url, 72)).toBe(url);
    expect(optimizeRemoteImageUrl(url, 320)).toContain('ab6761610000e5eb');
  });

  it('leaves unknown providers unchanged', () => {
    const url = 'https://images.example.test/artist.jpg';
    expect(optimizeRemoteImageUrl(url, 48)).toBe(url);
  });
});
