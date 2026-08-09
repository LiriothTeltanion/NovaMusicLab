/**
 * Pure guards for rebuilding offline_artist_knowledge.json.
 *
 * The base builder owns MusicBrainz/Wikidata facts. Band-member relations are
 * added by a separate, slower MusicBrainz pass. A normal base rebuild must not
 * erase that reviewed enrichment, but it must also never attach a lineup to a
 * newly matched identity. These helpers keep that boundary explicit and
 * testable without making network requests or touching the real artifact.
 */

function exactArtistName(value) {
  return String(value ?? '').normalize('NFC').trim();
}

export function isEmptyKnowledgeValue(value) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Carries a lineup forward only when the exact archive name and MusicBrainz
 * identity are unchanged. A changed or missing MBID is a review boundary: the
 * old people are not copied, and the collapse guard below refuses the write.
 */
export function preserveBandMembersForStableIdentity(nextDatabase, previousDatabase) {
  const previousByName = new Map(
    (previousDatabase?.artists ?? []).map(artist => [exactArtistName(artist.name), artist]),
  );
  let preservedArtistCount = 0;

  for (const artist of nextDatabase?.artists ?? []) {
    if (!isEmptyKnowledgeValue(artist.bandMembers)) continue;
    const previous = previousByName.get(exactArtistName(artist.name));
    if (!previous || isEmptyKnowledgeValue(previous.bandMembers)) continue;

    const previousMbid = previous.musicbrainz?.id;
    const nextMbid = artist.musicbrainz?.id;
    if (!previousMbid || previousMbid !== nextMbid) continue;

    artist.bandMembers = previous.bandMembers.map(member => ({
      ...member,
      roles: [...(member.roles ?? [])],
    }));
    preservedArtistCount += 1;
  }

  return preservedArtistCount;
}

/**
 * Returns every artist row or non-empty top-level field that a rebuild would
 * erase. Checking only artists present in `nextDatabase` lets `--limit` or a
 * bare `--artist` invocation replace a full archive with a valid-looking
 * partial one, so row coverage is part of the same anti-collapse contract.
 */
export function findTopLevelEnrichmentRegressions(nextDatabase, previousDatabase) {
  const previousByName = new Map(
    (previousDatabase?.artists ?? []).map(artist => [exactArtistName(artist.name), artist]),
  );
  const nextByName = new Map(
    (nextDatabase?.artists ?? []).map(artist => [exactArtistName(artist.name), artist]),
  );
  const regressions = [];

  for (const [name, previous] of previousByName) {
    if (nextByName.has(name)) continue;
    regressions.push({ artist: previous.name, field: 'artistRow' });
  }

  for (const artist of nextDatabase?.artists ?? []) {
    const previous = previousByName.get(exactArtistName(artist.name));
    if (!previous) continue;

    for (const [field, previousValue] of Object.entries(previous)) {
      if (isEmptyKnowledgeValue(previousValue)) continue;
      if (!isEmptyKnowledgeValue(artist[field])) continue;
      regressions.push({ artist: artist.name, field });
    }
  }

  return regressions;
}
