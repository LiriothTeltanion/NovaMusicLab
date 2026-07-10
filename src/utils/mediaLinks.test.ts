import { describe, expect, it } from 'vitest';
import { spotifyEmbedFromUrl, youtubeEmbedFromUrl } from './mediaLinks';

// Every failure path in these parsers returns undefined instead of throwing,
// so a regressed regex would degrade embeds silently - these tests are the
// only tripwire.

describe('spotifyEmbedFromUrl', () => {
  it('converts artist/album/track/playlist URLs to embed URLs', () => {
    expect(spotifyEmbedFromUrl('https://open.spotify.com/artist/1Ffb6ejR6Fe5IamqA5oRUF'))
      .toBe('https://open.spotify.com/embed/artist/1Ffb6ejR6Fe5IamqA5oRUF?utm_source=generator&theme=0');
    expect(spotifyEmbedFromUrl('https://open.spotify.com/track/abc123DEF456ghi789JKL0'))
      .toContain('/embed/track/abc123DEF456ghi789JKL0');
  });

  it('survives extra query params and locale prefixes in the path', () => {
    expect(spotifyEmbedFromUrl('https://open.spotify.com/artist/1Ffb6ejR6Fe5IamqA5oRUF?si=xyz&utm_medium=share'))
      .toContain('/embed/artist/1Ffb6ejR6Fe5IamqA5oRUF');
    expect(spotifyEmbedFromUrl('https://open.spotify.com/intl-es/artist/1Ffb6ejR6Fe5IamqA5oRUF'))
      .toContain('/embed/artist/1Ffb6ejR6Fe5IamqA5oRUF');
  });

  it('returns undefined for non-Spotify or malformed URLs', () => {
    expect(spotifyEmbedFromUrl(undefined)).toBeUndefined();
    expect(spotifyEmbedFromUrl('')).toBeUndefined();
    expect(spotifyEmbedFromUrl('https://example.com/artist/123')).toBeUndefined();
    expect(spotifyEmbedFromUrl('not a url at all')).toBeUndefined();
  });
});

describe('youtubeEmbedFromUrl', () => {
  it('extracts video ids from all supported URL shapes', () => {
    const expected = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0';
    expect(youtubeEmbedFromUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(expected);
    expect(youtubeEmbedFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(expected);
    expect(youtubeEmbedFromUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(expected);
    expect(youtubeEmbedFromUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(expected);
  });

  it('keeps working when extra query params surround the id', () => {
    expect(youtubeEmbedFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share'))
      .toContain('/embed/dQw4w9WgXcQ');
  });

  it('falls back to playlist embeds when there is no video id', () => {
    expect(youtubeEmbedFromUrl('https://www.youtube.com/playlist?list=PLabc123'))
      .toBe('https://www.youtube-nocookie.com/embed/videoseries?list=PLabc123&rel=0');
  });

  it('returns undefined for malformed input instead of throwing', () => {
    expect(youtubeEmbedFromUrl(undefined)).toBeUndefined();
    expect(youtubeEmbedFromUrl('')).toBeUndefined();
    expect(youtubeEmbedFromUrl('not a url')).toBeUndefined();
    expect(youtubeEmbedFromUrl('https://vimeo.com/12345')).toBeUndefined();
  });
});
