/**
 * Report band-member photo coverage for the top-100 artists.
 *
 * Coverage is measured the way the UI actually resolves a face
 * (src/components/ArtistAvatar.tsx: MEMBER_ENRICHMENT[key]?.photo || MEMBER_IMAGES[key]),
 * so this number is what a visitor sees rather than what the data files claim.
 *
 * Usage:
 *   node scripts/report_member_coverage.mjs            # human summary
 *   node scripts/report_member_coverage.mjs --json     # machine output
 *   node scripts/report_member_coverage.mjs --gaps     # list every member still missing a photo
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mediaKey } from './lib/commonsPortraits.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8'));

const knowledge = read('src', 'data', 'offline_artist_knowledge.json');
const compiled = read('src', 'data', 'music_dna_compiled.json');
const memberImages = read('src', 'data', 'member_images.json');
const memberEnrichment = read('src', 'data', 'member_enrichment.json');

const TOP_ARTIST_LIMIT = 100;
const topRank = new Map(
  compiled.top_artists
    .slice(0, TOP_ARTIST_LIMIT)
    .map((artist, index) => [mediaKey(artist.name), index + 1]),
);

/** Mirrors ArtistAvatar's resolution order exactly. */
function hasPhoto(name) {
  const key = mediaKey(name);
  return Boolean(memberEnrichment[key]?.photo || memberImages[key]);
}

const bands = [];
const allCurrent = new Set();
const coveredCurrent = new Set();
const gaps = [];

for (const artist of knowledge.artists) {
  const rank = topRank.get(mediaKey(artist.name));
  if (!rank) continue;

  const members = artist.bandMembers ?? [];
  const current = members.filter((member) => member.current);

  for (const member of current) {
    allCurrent.add(mediaKey(member.name));
    if (hasPhoto(member.name)) coveredCurrent.add(mediaKey(member.name));
    else gaps.push({ band: artist.name, rank, member: member.name, roles: member.roles ?? [] });
  }

  // An artist with no lineup is not a gap: solo acts legitimately have none.
  // Reporting them as "0% covered" would invent a problem.
  if (!members.length) {
    bands.push({ rank, band: artist.name, lineup: 'none', current: 0, covered: 0 });
    continue;
  }

  const covered = current.filter((member) => hasPhoto(member.name)).length;
  bands.push({
    rank,
    band: artist.name,
    lineup: current.length ? 'current' : 'former-only',
    current: current.length,
    covered,
    state: !current.length ? 'no-current-members'
      : covered === current.length ? 'complete'
        : covered === 0 ? 'empty' : 'partial',
  });
}

const withCurrent = bands.filter((band) => band.current > 0);
const complete = withCurrent.filter((band) => band.state === 'complete');
const partial = withCurrent.filter((band) => band.state === 'partial');
const empty = withCurrent.filter((band) => band.state === 'empty');
const noLineup = bands.filter((band) => band.lineup === 'none');

const pct = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0);

const summary = {
  topArtistLimit: TOP_ARTIST_LIMIT,
  distinctCurrentMembers: allCurrent.size,
  distinctCurrentWithPhoto: coveredCurrent.size,
  currentMemberCoveragePct: pct(coveredCurrent.size, allCurrent.size),
  bandsWithCurrentLineup: withCurrent.length,
  bandsComplete: complete.length,
  bandsPartial: partial.length,
  bandsEmpty: empty.length,
  bandsWithoutLineup: noLineup.length,
  // Two different counts, deliberately both reported: a person who plays in two
  // bands is one missing PERSON but two missing lineup SLOTS. Conflating them
  // overstates the work left by about 6%.
  distinctPeopleStillMissing: allCurrent.size - coveredCurrent.size,
  lineupSlotsStillMissing: gaps.length,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ summary, bands, gaps }, null, 2));
} else {
  console.log('Band-member photo coverage (top %d artists)\n', TOP_ARTIST_LIMIT);
  console.log(`  distinct current members : ${summary.distinctCurrentMembers}`);
  console.log(
    `  ...with a photo          : ${summary.distinctCurrentWithPhoto}`
    + ` (${summary.currentMemberCoveragePct}%)`,
  );
  console.log(
    `  still missing            : ${summary.distinctPeopleStillMissing} people`
    + ` (${summary.lineupSlotsStillMissing} lineup slots)\n`,
  );
  console.log(`  bands with a current lineup : ${summary.bandsWithCurrentLineup}`);
  console.log(`    complete  : ${summary.bandsComplete}`);
  console.log(`    partial   : ${summary.bandsPartial}`);
  console.log(`    none yet  : ${summary.bandsEmpty}`);
  console.log(`  bands with no lineup data   : ${summary.bandsWithoutLineup} (solo acts included)`);

  if (process.argv.includes('--gaps')) {
    console.log('\nMembers still missing a photo:');
    for (const gap of gaps.sort((a, b) => a.rank - b.rank)) {
      console.log(`  #${String(gap.rank).padStart(3)} ${gap.band} — ${gap.member}`);
    }
  }
}
