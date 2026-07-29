const IMAGE_WIDTH_BUCKETS = [160, 240, 330, 500, 640, 960] as const;
const WIKIMEDIA_WIDTH_BUCKETS = [330, 500, 960] as const;

function imageWidthFor(
  renderedSize: number,
  buckets: readonly number[] = IMAGE_WIDTH_BUCKETS,
): number {
  const requested = Math.max(1, Math.ceil(renderedSize * 1.6));
  return buckets.find(width => width >= requested)
    ?? buckets[buckets.length - 1];
}

/**
 * Requests a right-sized sibling from image CDNs whose URL contract is already
 * present in the public artwork bundle. Unknown providers are returned intact.
 *
 * This is deliberately a URL-only transform: Nova neither proxies nor
 * redistributes remote artwork, and the original URL remains available as a
 * component-level fallback when a provider does not expose the requested size.
 */
export function optimizeRemoteImageUrl(url: string, renderedSize: number): string {
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const targetWidth = imageWidthFor(renderedSize);
  const host = parsed.hostname.toLowerCase();

  if (host === 'cdn-images.dzcdn.net' && parsed.pathname.startsWith('/images/')) {
    const deezerWidth = targetWidth <= 240 ? 250 : targetWidth <= 500 ? 500 : 1000;
    return url.replace(/\/\d+x\d+-/, `/${deezerWidth}x${deezerWidth}-`);
  }

  if (
    host === 'upload.wikimedia.org'
    && parsed.pathname.startsWith('/wikipedia/commons/thumb/')
  ) {
    const wikimediaWidth = imageWidthFor(renderedSize, WIKIMEDIA_WIDTH_BUCKETS);
    return url.replace(/\/\d+px-([^/?]+)(\?.*)?$/, `/${wikimediaWidth}px-$1$2`);
  }

  if (
    host === 'commons.wikimedia.org'
    && parsed.pathname.startsWith('/wiki/Special:FilePath/')
  ) {
    parsed.searchParams.set(
      'width',
      String(imageWidthFor(renderedSize, WIKIMEDIA_WIDTH_BUCKETS)),
    );
    return parsed.toString();
  }

  if (host === 'coverartarchive.org' && renderedSize <= 160) {
    return url.replace(/\/front-500(?=([?#]|$))/, '/front-250');
  }

  if (
    (host === 'mzstatic.com' || host.endsWith('.mzstatic.com'))
    && parsed.pathname.startsWith('/image/thumb/')
  ) {
    const appleWidth = targetWidth <= 240 ? 240 : targetWidth <= 500 ? 500 : 600;
    return url.replace(/\/\d+x\d+bb\.(jpg|png)$/i, `/${appleWidth}x${appleWidth}bb.$1`);
  }

  // The 00005174 Spotify profile-image family is the compact 160px asset.
  // Only request its larger sibling when the rendered portrait truly needs it.
  if (
    host === 'i.scdn.co'
    && targetWidth > 240
    && parsed.pathname.includes('ab67616100005174')
  ) {
    return url.replace('ab67616100005174', 'ab6761610000e5eb');
  }

  return url;
}
