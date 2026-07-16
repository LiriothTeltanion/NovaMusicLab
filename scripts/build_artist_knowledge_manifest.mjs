import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fingerprintSourceFiles } from './lib/sourceFingerprint.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILES = [
  'src/data/offline_artist_knowledge.json',
  'src/data/artist_images.json',
  'src/data/artist_gallery.json',
];
const outputRelativePath = 'src/data/artist_knowledge_manifest.json';
const metadataOutputRelativePath = 'src/data/artist_knowledge_manifest_meta.json';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function normalizeName(value) {
  return String(value ?? '').normalize('NFC').trim().toLowerCase();
}

function uniqueText(values) {
  const seen = new Set();
  const result = [];
  for (const value of values.flat(Infinity)) {
    const text = String(value ?? '').normalize('NFC').trim();
    const key = text.toLocaleLowerCase('en-US');
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function stableHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sourceFingerprint() {
  return fingerprintSourceFiles(root, SOURCE_FILES);
}

function providerFor(url, legacySource) {
  const host = new URL(url).hostname.toLowerCase();
  if (host === 'upload.wikimedia.org' || host === 'commons.wikimedia.org') return 'wikimedia-commons';
  if (host === 'scdn.co' || host.endsWith('.scdn.co') || legacySource === 'spotify') return 'spotify';
  if (host === 'dzcdn.net' || host.endsWith('.dzcdn.net') || legacySource === 'deezer') return 'deezer';
  if (host === 'wikipedia.org' || host.endsWith('.wikipedia.org') || legacySource === 'wikipedia') return 'wikipedia';
  return 'other';
}

function sourcePageFor(url, provider) {
  if (provider !== 'wikimedia-commons') return url;
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    let fileName = decodeURIComponent(segments.at(-1) ?? '').replace(/^\d+px-/, '');
    if (parsed.hostname === 'commons.wikimedia.org' && parsed.pathname.includes('/Special:FilePath/')) {
      fileName = decodeURIComponent(parsed.pathname.split('/Special:FilePath/')[1] ?? '');
    }
    return fileName
      ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`
      : url;
  } catch {
    return url;
  }
}

function dimensionsFor(url) {
  const widthMatch = url.match(/\/(\d+)px-[^/]+$/);
  return {
    width: widthMatch ? Number(widthMatch[1]) : null,
    height: null,
    aspectRatio: null,
  };
}

function licenseFor(provider) {
  if (provider === 'spotify' || provider === 'deezer') {
    return { status: 'restricted', id: null, name: 'Provider-controlled media', url: null };
  }
  return { status: 'unverified', id: null, name: null, url: null };
}

function attributionFor(provider, sourceUrl) {
  const labels = {
    'wikimedia-commons': 'Wikimedia Commons',
    wikipedia: 'Wikipedia',
    spotify: 'Spotify',
    deezer: 'Deezer',
    other: 'Original media source',
  };
  return {
    required: provider === 'wikimedia-commons' || provider === 'wikipedia',
    creator: null,
    label: labels[provider] ?? 'Original media source',
    url: sourceUrl,
  };
}

function cachePolicyFor() {
  return {
    strategy: 'remote-browser',
    maxAgeDays: null,
    privacyImpact: 'third-party-request',
  };
}

function visualAssetsForArtist(artist, primaryImages, galleries) {
  const artistKey = normalizeName(artist.name);
  const entityId = `artist:${artist.normalizedName || artistKey}`;
  const primary = primaryImages[artistKey];
  const combined = [
    ...(primary?.thumb ? [{ url: primary.thumb, source: primary.source, primary: true }] : []),
    ...(galleries[artistKey] ?? []).map(photo => ({ ...photo, primary: photo.url === primary?.thumb })),
  ];
  const seen = new Set();
  const assets = [];

  for (const candidate of combined) {
    if (!candidate.url || seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    const provider = providerFor(candidate.url, candidate.source);
    const sourceUrl = sourcePageFor(candidate.url, provider);
    assets.push({
      id: `visual:${stableHash(`${entityId}\0${candidate.url}`).slice(0, 24)}`,
      entityId,
      kind: 'image',
      role: candidate.primary ? 'primary' : 'gallery',
      url: candidate.url,
      provider,
      sourceUrl,
      license: licenseFor(provider),
      attribution: attributionFor(provider, sourceUrl),
      verifiedAt: null,
      dimensions: dimensionsFor(candidate.url),
      focalPoint: { x: 0.5, y: 0.42, source: 'default' },
      cachePolicy: cachePolicyFor(),
      contentHash: null,
      status: 'review',
    });
  }
  return assets;
}

function provenanceForArtist(artist) {
  const sources = [{
    provider: 'archive',
    sourceId: null,
    sourceUrl: 'https://github.com/LiriothTeltanion/NovaMusicLab/blob/main/src/data/music_dna_compiled.json',
    verifiedAt: null,
    confidence: 'curated',
  }];

  if (artist.musicbrainz?.id) {
    sources.push({
      provider: 'musicbrainz',
      sourceId: artist.musicbrainz.id,
      sourceUrl: `https://musicbrainz.org/artist/${artist.musicbrainz.id}`,
      verifiedAt: null,
      confidence: Number(artist.musicbrainz.score) >= 95 ? 'verified' : 'matched',
    });
  }
  if (artist.wikidata?.id) {
    sources.push({
      provider: 'wikidata',
      sourceId: artist.wikidata.id,
      sourceUrl: `https://www.wikidata.org/wiki/${artist.wikidata.id}`,
      verifiedAt: null,
      confidence: 'matched',
    });
  }
  for (const url of artist.curated?.sourceUrls ?? []) {
    if (!String(url).startsWith('https://')) continue;
    sources.push({
      provider: 'curated',
      sourceId: null,
      sourceUrl: url,
      verifiedAt: null,
      confidence: 'curated',
    });
  }
  return sources;
}

const knowledge = readJson(SOURCE_FILES[0]);
const primaryImages = readJson(SOURCE_FILES[1]);
const galleries = readJson(SOURCE_FILES[2]);
const generatedAt = new Date(knowledge.meta?.generatedAt ?? knowledge.meta?.generated_at ?? 0).toISOString();
const visualAssets = knowledge.artists.flatMap(artist => visualAssetsForArtist(artist, primaryImages, galleries));
const assetsByArtist = new Map();
for (const asset of visualAssets) {
  const list = assetsByArtist.get(asset.entityId) ?? [];
  list.push(asset.id);
  assetsByArtist.set(asset.entityId, list);
}

const artists = knowledge.artists.map(artist => {
  const normalizedName = artist.normalizedName || normalizeName(artist.name);
  const id = `artist:${normalizedName}`;
  return {
    id,
    name: artist.name,
    normalizedName,
    sortName: artist.musicbrainz?.sortName ?? artist.name,
    artistType: artist.musicbrainz?.type ?? null,
    aliases: uniqueText(artist.musicbrainz?.aliases ?? []),
    externalIds: {
      musicbrainz: artist.musicbrainz?.id ?? null,
      wikidata: artist.wikidata?.id ?? null,
      isnis: uniqueText(artist.musicbrainz?.isnis ?? []),
    },
    countries: uniqueText([
      artist.archive?.country,
      artist.musicbrainz?.country,
      artist.musicbrainz?.area,
      artist.wikidata?.countries ?? [],
    ]),
    genres: uniqueText([
      artist.archive?.genre,
      artist.musicbrainz?.tags ?? [],
      artist.wikidata?.genres ?? [],
    ]),
    areas: uniqueText([
      artist.musicbrainz?.area,
      artist.musicbrainz?.beginArea,
      artist.wikidata?.countries ?? [],
      artist.wikidata?.formationPlaces ?? [],
    ]),
    description: artist.wikidata?.description && artist.wikidata?.id
      ? {
          text: artist.wikidata.description,
          language: 'en',
          provider: 'wikidata',
          sourceUrl: `https://www.wikidata.org/wiki/${artist.wikidata.id}`,
        }
      : null,
    activeRange: {
      begin: artist.musicbrainz?.lifeSpanBegin ?? artist.wikidata?.inception ?? null,
      end: artist.musicbrainz?.lifeSpanEnd ?? null,
      ended: typeof artist.musicbrainz?.ended === 'boolean' ? artist.musicbrainz.ended : null,
    },
    members: (artist.bandMembers ?? []).map(member => ({
      name: member.name,
      roles: uniqueText(member.roles ?? []),
      current: Boolean(member.current),
    })),
    releases: (artist.releaseGroups ?? []).map(release => ({
      id: release.id,
      title: release.title,
      primaryType: release.primaryType ?? null,
      firstReleaseDate: release.firstReleaseDate || null,
      provider: String(release.id).startsWith('curated-') ? 'curated' : 'musicbrainz',
    })),
    officialUrls: uniqueText(artist.wikidata?.officialWebsites ?? [])
      .filter(url => String(url).startsWith('https://')),
    provenance: provenanceForArtist(artist),
    visualAssetIds: assetsByArtist.get(id) ?? [],
    updatedAt: generatedAt,
  };
});

const manifest = {
  meta: {
    schemaVersion: 1,
    generatedAt,
    sourceFingerprint: sourceFingerprint(),
    sourceFiles: SOURCE_FILES,
    artistCount: artists.length,
    visualAssetCount: visualAssets.length,
    assetsAwaitingLicenseReview: visualAssets.filter(asset => asset.license.status === 'unverified').length,
  },
  artists,
  visualAssets,
};

const outputPath = path.join(root, outputRelativePath);
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
const metadataOutputPath = path.join(root, metadataOutputRelativePath);
fs.writeFileSync(metadataOutputPath, `${JSON.stringify(manifest.meta, null, 2)}\n`);
process.stdout.write(
  `Artist knowledge manifest v${manifest.meta.schemaVersion}: `
  + `${artists.length} artists, ${visualAssets.length} assets, `
  + `${manifest.meta.assetsAwaitingLicenseReview} awaiting license review.\n`,
);
