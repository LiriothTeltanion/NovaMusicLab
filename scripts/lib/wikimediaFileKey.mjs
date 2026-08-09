/**
 * Canonical identity for a Wikimedia Commons image, regardless of URL shape.
 *
 * Commons serves the same file through two unrelated-looking addresses:
 *   commons.wikimedia.org/wiki/Special:FilePath/Foo_Bar.jpg?width=800
 *   upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Foo_Bar.jpg/960px-Foo_Bar.jpg
 * The gallery scripts reach Commons through different APIs and so collect
 * different shapes, and a string comparison sees two photos where there is one.
 *
 * This lived only inside dedupe_artist_gallery.mjs, described there as "a
 * one-off cleanup, not something normal runs depend on". The 2026-08 refresh
 * proved otherwise: teaching build_artist_gallery.mjs to merge instead of
 * replace immediately recreated 17 of these, because its own duplicate check
 * compared raw strings. Shared here so the builder cannot make work for the
 * cleaner.
 */
export function wikimediaFileKey(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === 'commons.wikimedia.org'
      && parsed.pathname.startsWith('/wiki/Special:FilePath/')) {
      const name = decodeURIComponent(parsed.pathname.replace('/wiki/Special:FilePath/', ''));
      return name.replace(/_/g, ' ').toLowerCase();
    }

    if (parsed.hostname === 'upload.wikimedia.org') {
      const segments = parsed.pathname.split('/').filter(Boolean);
      const filename = decodeURIComponent(segments[segments.length - 1] ?? '');
      // Thumbnails prefix the size: 960px-Foo_Bar.jpg is Foo_Bar.jpg.
      return filename.replace(/^\d+px-/, '').replace(/_/g, ' ').toLowerCase();
    }
  } catch { /* not a URL we can canonicalize; fall through */ }

  return url;
}
