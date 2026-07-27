// Builds the media-enrichment progress dashboard.
//
// Reads the live data files and writes a self-contained HTML page so the
// coverage numbers can be looked at directly instead of being read out of a
// terminal. Nothing here fetches anything - it only measures what is on disk.
//
//   node scripts/build_media_progress.mjs
//   -> scripts/media_progress.json   (machine readable)
//   -> scripts/media_progress.html   (open this in a browser)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const knowledge = read('offline_artist_knowledge.json');
const compiled = read('music_dna_compiled.json');
const albumImages = read('album_images.json');
const trackImages = read('track_images.json');
const memberImages = read('member_images.json');
const memberEnrichment = read('member_enrichment.json');

const norm = s => (s || '').normalize('NFC').trim().toLowerCase();
const artKey = (artist, title) => `${norm(artist)}|||${norm(title)}`;
const hasPortrait = key => Boolean(memberImages[key] || memberEnrichment[key]?.photo);
const hasArt = (artist, title) => Boolean(albumImages[artKey(artist, title)] || trackImages[artKey(artist, title)]);

const rankOf = {};
compiled.top_artists.forEach((a, i) => { rankOf[norm(a.name)] = i + 1; });

const bands = knowledge.artists.map(artist => {
  const current = (artist.bandMembers ?? []).filter(m => m.current);
  const members = current.map(m => ({
    name: m.name,
    roles: (m.roles ?? []).slice(0, 2),
    photo: hasPortrait(norm(m.name)),
  }));
  return {
    name: artist.name,
    rank: rankOf[norm(artist.name)] ?? 999,
    plays: artist.archive?.plays ?? 0,
    total: members.length,
    withPhoto: members.filter(m => m.photo).length,
    members,
  };
}).sort((a, b) => a.rank - b.rank);

const distinct = new Set();
const distinctWithPhoto = new Set();
for (const band of bands) {
  for (const m of band.members) {
    const key = norm(m.name);
    distinct.add(key);
    if (m.photo) distinctWithPhoto.add(key);
  }
}

let releaseGroups = 0;
let releaseGroupsWithArt = 0;
for (const artist of knowledge.artists) {
  for (const rg of artist.releaseGroups ?? []) {
    releaseGroups++;
    if (hasArt(artist.name, rg.title)) releaseGroupsWithArt++;
  }
}

const withLineupCount = bands.filter(b => b.total > 0).length;
const data = {
  generatedAt: new Date().toISOString(),
  members: {
    distinct: distinct.size,
    withPhoto: distinctWithPhoto.size,
    bandsWithLineup: withLineupCount,
    complete: bands.filter(b => b.total > 0 && b.withPhoto === b.total).length,
    partial: bands.filter(b => b.total > 0 && b.withPhoto > 0 && b.withPhoto < b.total).length,
    none: bands.filter(b => b.total > 0 && b.withPhoto === 0).length,
    noLineup: bands.filter(b => b.total === 0).length,
  },
  albums: { releaseGroups, withArt: releaseGroupsWithArt },
  obsessions: {
    total: compiled.obsessions.length,
    withArt: compiled.obsessions.filter(o => hasArt(o.artist, o.track)).length,
  },
  eras: {
    total: compiled.yearly_eras.length,
    withArt: compiled.yearly_eras.filter(e => hasArt(e.top_artist, e.top_track)).length,
  },
  maps: {
    albumImages: Object.keys(albumImages).length,
    trackImages: Object.keys(trackImages).length,
    memberImages: Object.keys(memberImages).length,
  },
  bands,
};

fs.writeFileSync(path.join(ROOT, 'scripts', 'media_progress.json'), JSON.stringify(data, null, 1) + '\n');

/* ---------------------------------------------------------------- HTML ---- */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const m = data.members;

const withLineup = bands.filter(b => b.total > 0)
  .sort((a, b) => (a.withPhoto / a.total) - (b.withPhoto / b.total) || a.rank - b.rank);
const noLineup = bands.filter(b => b.total === 0).sort((a, b) => a.rank - b.rank);

const stateOf = b => (b.withPhoto === b.total ? 'done' : b.withPhoto > 0 ? 'part' : 'none');
const stateLabel = { done: 'complete', part: 'partial', none: 'no photos' };

const meter = (label, got, total, hint) => `
  <div class="meter">
    <div class="meter__head">
      <span class="meter__label">${esc(label)}</span>
      <span class="meter__figure"><b>${got}</b><span class="meter__of">/${total}</span></span>
    </div>
    <div class="bar" role="img" aria-label="${pct(got, total)} percent">
      <span class="bar__fill" style="width:${pct(got, total)}%"></span>
    </div>
    <div class="meter__foot"><span class="meter__pct">${pct(got, total)}%</span><span>${esc(hint)}</span></div>
  </div>`;

const row = b => `
  <tr>
    <td class="num">${b.rank === 999 ? '—' : b.rank}</td>
    <td class="band">${esc(b.name)}</td>
    <td class="num">${b.plays.toLocaleString('en-US')}</td>
    <td class="num">${b.withPhoto}<span class="of">/${b.total}</span></td>
    <td class="cov">
      <span class="minibar"><span class="minibar__fill" style="width:${pct(b.withPhoto, b.total)}%"></span></span>
      <span class="chip chip--${stateOf(b)}">${stateLabel[stateOf(b)]}</span>
    </td>
    <td class="who">${b.members.map(x =>
      `<span class="p ${x.photo ? 'p--yes' : 'p--no'}" title="${esc(x.roles.join(' · ') || 'role unknown')}">${esc(x.name)}</span>`
    ).join('')}</td>
  </tr>`;

const html = `<title>Nova Music Lab — enrichment progress</title>
<style>
:root{
  --ink:#12161c;--ink-2:#4a5462;--ink-3:#79838f;--ground:#f4f6f7;--panel:#fff;--line:#dde3e7;
  --accent:#0e7c86;--accent-soft:#0e7c8618;--done:#0f766e;--part:#a1620a;--none:#a13b3b;
  --done-bg:#0f766e1a;--part-bg:#a1620a1a;--none-bg:#a13b3b1a;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  --sans:"Segoe UI Variable Text","Segoe UI",Inter,system-ui,-apple-system,sans-serif;
}
@media (prefers-color-scheme:dark){:root{
  --ink:#e8edf2;--ink-2:#9aa7b4;--ink-3:#6c7885;--ground:#0b0f14;--panel:#121820;--line:#232d38;
  --accent:#4dd7e4;--accent-soft:#4dd7e41f;--done:#42d6b5;--part:#e0a33c;--none:#e06d6d;
  --done-bg:#42d6b520;--part-bg:#e0a33c20;--none-bg:#e06d6d20;}}
:root[data-theme="light"]{--ink:#12161c;--ink-2:#4a5462;--ink-3:#79838f;--ground:#f4f6f7;--panel:#fff;
  --line:#dde3e7;--accent:#0e7c86;--accent-soft:#0e7c8618;--done:#0f766e;--part:#a1620a;--none:#a13b3b;
  --done-bg:#0f766e1a;--part-bg:#a1620a1a;--none-bg:#a13b3b1a;}
:root[data-theme="dark"]{--ink:#e8edf2;--ink-2:#9aa7b4;--ink-3:#6c7885;--ground:#0b0f14;--panel:#121820;
  --line:#232d38;--accent:#4dd7e4;--accent-soft:#4dd7e41f;--done:#42d6b5;--part:#e0a33c;--none:#e06d6d;
  --done-bg:#42d6b520;--part-bg:#e0a33c20;--none-bg:#e06d6d20;}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);line-height:1.5;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:clamp(1.5rem,4vw,3.5rem) clamp(1rem,3vw,2rem) 5rem}
header{border-bottom:2px solid var(--ink);padding-bottom:1.1rem;margin-bottom:2rem}
.eyebrow{font-family:var(--mono);font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin:0 0 .5rem}
h1{font-size:clamp(1.6rem,3.6vw,2.5rem);line-height:1.1;margin:0 0 .45rem;letter-spacing:-.02em;text-wrap:balance;font-weight:650}
.sub{margin:0;color:var(--ink-2);max-width:62ch}
.stamp{font-family:var(--mono);font-size:.72rem;color:var(--ink-3);margin-top:.7rem}
.meters{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));margin-bottom:2.4rem}
.meter{background:var(--panel);border:1px solid var(--line);border-radius:.7rem;padding:1rem 1.1rem}
.meter__head{display:flex;justify-content:space-between;align-items:baseline;gap:1rem}
.meter__label{font-size:.8rem;color:var(--ink-2);font-weight:600}
.meter__figure{font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.meter__figure b{font-size:1.5rem;font-weight:700}
.meter__of{color:var(--ink-3);font-size:.85rem}
.bar{height:7px;border-radius:99px;background:var(--accent-soft);margin:.7rem 0 .5rem;overflow:hidden}
.bar__fill{display:block;height:100%;background:var(--accent);border-radius:99px}
.meter__foot{display:flex;justify-content:space-between;gap:.6rem;font-size:.73rem;color:var(--ink-3)}
.meter__pct{font-family:var(--mono);color:var(--ink-2);font-weight:700}
h2{font-size:1.05rem;margin:2.4rem 0 .3rem;letter-spacing:-.01em}
.note{margin:0 0 1rem;color:var(--ink-2);font-size:.88rem;max-width:70ch}
.legend{display:flex;flex-wrap:wrap;gap:.45rem;margin:0 0 1rem}
.scroller{overflow-x:auto;border:1px solid var(--line);border-radius:.7rem;background:var(--panel)}
table{border-collapse:collapse;width:100%;min-width:56rem}
th,td{padding:.6rem .7rem;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:.68rem;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);font-family:var(--mono);font-weight:700;position:sticky;top:0;background:var(--panel);z-index:1}
tbody tr:last-child td{border-bottom:0}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink-2)}
.num .of{color:var(--ink-3)}
.band{font-weight:640;min-width:11rem}
.cov{white-space:nowrap}
.minibar{display:inline-block;width:56px;height:6px;border-radius:99px;background:var(--accent-soft);overflow:hidden;vertical-align:middle;margin-right:.5rem}
.minibar__fill{display:block;height:100%;background:var(--accent)}
.chip{display:inline-block;font-family:var(--mono);font-size:.63rem;letter-spacing:.08em;text-transform:uppercase;padding:.16rem .42rem;border-radius:.3rem;font-weight:700}
.chip--done{color:var(--done);background:var(--done-bg)}
.chip--part{color:var(--part);background:var(--part-bg)}
.chip--none{color:var(--none);background:var(--none-bg)}
.who{display:flex;flex-wrap:wrap;gap:.28rem;max-width:30rem}
.p{font-size:.72rem;padding:.13rem .4rem;border-radius:.3rem;border:1px solid var(--line)}
.p--yes{color:var(--done);border-color:color-mix(in srgb,var(--done) 40%,transparent);background:var(--done-bg)}
.p--no{color:var(--ink-3)}
.pill-list{display:flex;flex-wrap:wrap;gap:.35rem;margin:0}
.pill{font-family:var(--mono);font-size:.72rem;color:var(--ink-2);border:1px solid var(--line);border-radius:.3rem;padding:.2rem .45rem;background:var(--panel)}
footer{margin-top:2.6rem;padding-top:1.1rem;border-top:1px solid var(--line);color:var(--ink-3);font-size:.8rem}
code{font-family:var(--mono);font-size:.85em;background:var(--accent-soft);padding:.08em .35em;border-radius:.25em}
</style>

<div class="wrap">
<header>
  <p class="eyebrow">Nova Music Lab · enrichment ledger</p>
  <h1>Media coverage</h1>
  <p class="sub">What the archive can actually show: band-member portraits, discography covers and
  track art. Rebuild with <code>node scripts/build_media_progress.mjs</code>.</p>
  <p class="stamp">Generated ${esc(data.generatedAt.replace('T', ' ').slice(0, 16))} UTC ·
  ${data.maps.albumImages} album keys · ${data.maps.trackImages} track keys · ${data.maps.memberImages} member keys</p>
</header>

<div class="meters">
  ${meter('Members with a portrait', m.withPhoto, m.distinct, 'distinct current members')}
  ${meter('Bands fully covered', m.complete, m.bandsWithLineup, `${m.partial} partial · ${m.none} none yet`)}
  ${meter('Discography covers', data.albums.withArt, data.albums.releaseGroups, 'release groups with real art')}
  ${meter('Obsession tracks', data.obsessions.withArt, data.obsessions.total, 'obsession loop room')}
</div>

<h2>Where the work is</h2>
<p class="note">Sorted worst-first — this is the queue. Green names already have a portrait; grey
ones do not. Hover a name to see the instrument.</p>
<div class="legend pill-list">
  <span class="chip chip--done">complete</span>
  <span class="chip chip--part">partial</span>
  <span class="chip chip--none">no photos</span>
</div>
<div class="scroller">
<table>
  <thead><tr><th>#</th><th>Band</th><th>Plays</th><th>Photos</th><th>Coverage</th><th>Current lineup</th></tr></thead>
  <tbody>${withLineup.map(row).join('')}</tbody>
</table>
</div>

<h2>No lineup data — ${noLineup.length} artists</h2>
<p class="note">Solo acts legitimately have no lineup. The rest need a MusicBrainz relationship
pass before their members can be looked for at all.</p>
<div class="pill-list">${noLineup.map(b => `<span class="pill">${esc(b.name)}</span>`).join('')}</div>

<footer>
  <strong>Honest limit:</strong> ${m.distinct - m.withPhoto} people still have no portrait because
  no free-licensed photo of them exists in Wikidata or Wikimedia Commons — most of them have no
  Wikidata entity at all. Those slots show an initials avatar, never an invented or borrowed face.
</footer>
</div>
`;

const htmlPath = path.join(ROOT, 'scripts', 'media_progress.html');
fs.writeFileSync(htmlPath, html);

console.log('Media coverage');
console.log(`  members with portrait : ${m.withPhoto}/${m.distinct} (${pct(m.withPhoto, m.distinct)}%)`);
console.log(`  bands complete        : ${m.complete}/${m.bandsWithLineup}`);
console.log(`  discography covers    : ${data.albums.withArt}/${data.albums.releaseGroups} (${pct(data.albums.withArt, data.albums.releaseGroups)}%)`);
console.log(`  obsession tracks      : ${data.obsessions.withArt}/${data.obsessions.total}`);
console.log(`  eras top tracks       : ${data.eras.withArt}/${data.eras.total}`);
console.log(`\n  open: ${htmlPath}`);
