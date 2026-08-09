import { describe, expect, it } from 'vitest';

import {
  findTopLevelEnrichmentRegressions,
  preserveBandMembersForStableIdentity,
} from './lib/offlineKnowledgePipeline.mjs';

const member = {
  name: 'Member One',
  roles: ['guitar'],
  begin: '2004',
  end: null,
  current: true,
};

function database(artist) {
  return { artists: [artist] };
}

describe('offline knowledge rebuild pipeline', () => {
  it('preserves post-processed members when the exact MusicBrainz identity is stable', () => {
    const previous = database({
      name: 'Band',
      musicbrainz: { id: 'stable-mbid' },
      wikidata: { id: 'Q1' },
      bandMembers: [member],
    });
    const next = database({
      name: 'Band',
      musicbrainz: { id: 'stable-mbid' },
      wikidata: { id: 'Q1' },
    });

    expect(preserveBandMembersForStableIdentity(next, previous)).toBe(1);
    expect(next.artists[0].bandMembers).toEqual([member]);
    expect(next.artists[0].bandMembers).not.toBe(previous.artists[0].bandMembers);
    expect(findTopLevelEnrichmentRegressions(next, previous)).toEqual([]);
  });

  it('never copies a lineup across an identity change and keeps the guard strict', () => {
    const previous = database({
      name: 'Ambiguous Band',
      musicbrainz: { id: 'old-mbid' },
      bandMembers: [member],
    });
    const next = database({
      name: 'Ambiguous Band',
      musicbrainz: { id: 'new-mbid' },
    });

    expect(preserveBandMembersForStableIdentity(next, previous)).toBe(0);
    expect(next.artists[0].bandMembers).toBeUndefined();
    expect(findTopLevelEnrichmentRegressions(next, previous))
      .toContainEqual({ artist: 'Ambiguous Band', field: 'bandMembers' });
  });

  it('does not overwrite a freshly enriched lineup or hide another collapsed field', () => {
    const previous = database({
      name: 'Band',
      musicbrainz: { id: 'stable-mbid' },
      wikidata: { id: 'Q1' },
      bandMembers: [member],
    });
    const replacement = { ...member, name: 'New Member' };
    const next = database({
      name: 'Band',
      musicbrainz: { id: 'stable-mbid' },
      bandMembers: [replacement],
    });

    expect(preserveBandMembersForStableIdentity(next, previous)).toBe(0);
    expect(next.artists[0].bandMembers).toEqual([replacement]);
    expect(findTopLevelEnrichmentRegressions(next, previous))
      .toContainEqual({ artist: 'Band', field: 'wikidata' });
  });

  it('rejects a partial rebuild that drops a previous artist row', () => {
    const previous = {
      artists: [
        { name: 'Artist A', musicbrainz: { id: 'a' } },
        { name: 'Artist B', musicbrainz: { id: 'b' } },
      ],
    };
    const partial = {
      artists: [{ name: 'Artist A', musicbrainz: { id: 'a' } }],
    };

    expect(findTopLevelEnrichmentRegressions(partial, previous))
      .toContainEqual({ artist: 'Artist B', field: 'artistRow' });
  });

  it('accepts a merge-shaped rebuild that retains every previous artist row', () => {
    const previous = {
      artists: [
        { name: 'Artist A', musicbrainz: { id: 'a' } },
        { name: 'Artist B', musicbrainz: { id: 'b' } },
      ],
    };
    const merged = {
      artists: [
        { name: 'Artist A', musicbrainz: { id: 'a' } },
        { name: 'Artist B', musicbrainz: { id: 'b' } },
      ],
    };

    expect(findTopLevelEnrichmentRegressions(merged, previous)).toEqual([]);
  });
});
