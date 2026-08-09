function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer; received ${JSON.stringify(value)}`);
  }
  return value;
}

export function buildSocialPreviewFacts(shareMetrics, publicManifest) {
  const plays = positiveInteger(shareMetrics?.plays, 'share metrics plays');
  const tracks = positiveInteger(shareMetrics?.tracks, 'share metrics tracks');
  const catalogEntries = positiveInteger(shareMetrics?.artists, 'share metrics artists');
  const manifestEntries = positiveInteger(
    publicManifest?.catalogIdentity?.catalogEntryCount,
    'public manifest catalog entries',
  );

  if (catalogEntries !== manifestEntries) {
    throw new Error(
      `Share metrics report ${catalogEntries} artist entries, but the public manifest reports ${manifestEntries}`,
    );
  }

  const observedThrough = publicManifest?.snapshotFreshness?.observedThrough;
  if (typeof observedThrough !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(observedThrough)) {
    throw new Error(`public manifest observedThrough is invalid: ${JSON.stringify(observedThrough)}`);
  }

  return {
    catalogEntryLabel: catalogEntries.toLocaleString('en-US'),
    metricsLabel: `${plays.toLocaleString('en-US')} plays · ${tracks.toLocaleString('en-US')} tracks · ${catalogEntries.toLocaleString('en-US')} catalog entries`,
    observedThroughLabel: new Date(`${observedThrough}T12:00:00Z`)
      .toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
      .toLocaleUpperCase('en-US'),
  };
}
