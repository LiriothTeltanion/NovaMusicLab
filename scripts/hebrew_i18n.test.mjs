import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function walkLocalized(value, pathParts = [], failures = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkLocalized(item, [...pathParts, String(index)], failures));
    return failures;
  }
  if (!value || typeof value !== 'object') return failures;

  if (Object.hasOwn(value, 'es') && Object.hasOwn(value, 'en')) {
    if (!Object.hasOwn(value, 'he')) failures.push(pathParts.join('.'));
  }
  Object.entries(value).forEach(([key, child]) => walkLocalized(child, [...pathParts, key], failures));
  return failures;
}

function pathsContainingKey(value, expectedKey, pathParts = [], paths = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => pathsContainingKey(item, expectedKey, [...pathParts, String(index)], paths));
    return paths;
  }
  if (!value || typeof value !== 'object') return paths;
  if (Object.hasOwn(value, expectedKey)) paths.push([...pathParts, expectedKey].join('.'));
  Object.entries(value).forEach(([key, child]) => {
    pathsContainingKey(child, expectedKey, [...pathParts, key], paths);
  });
  return paths;
}

function mergeArtistEnrichmentHebrew(artists, overlay) {
  expect(overlay.map(profile => profile.name)).toEqual(artists.map(profile => profile.name));

  return artists.map((artist, index) => {
    const hebrew = overlay[index];
    expect(hebrew.key_albums.map(album => album.title))
      .toEqual(artist.key_albums.map(album => album.title));
    return {
      ...artist,
      origin: { ...artist.origin, he: hebrew.origin },
      country: { ...artist.country, he: hebrew.country },
      status: { ...artist.status, he: hebrew.status },
      bio: { ...artist.bio, he: hebrew.bio },
      archive_role: { ...artist.archive_role, he: hebrew.archive_role },
      sound_evolution: { ...artist.sound_evolution, he: hebrew.sound_evolution },
      why_it_matters: { ...artist.why_it_matters, he: hebrew.why_it_matters },
      signature_moods: { ...artist.signature_moods, he: hebrew.signature_moods },
      key_albums: artist.key_albums.map((album, albumIndex) => ({
        ...album,
        description: {
          ...album.description,
          he: hebrew.key_albums[albumIndex].description,
        },
      })),
    };
  });
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [fullPath] : [];
  });
}

function stringLeaves(value, leaves = []) {
  if (typeof value === 'string') leaves.push(value);
  else if (Array.isArray(value)) value.forEach(item => stringLeaves(item, leaves));
  else if (value && typeof value === 'object') {
    Object.values(value).forEach(item => stringLeaves(item, leaves));
  }
  return leaves;
}

function missingProperTerms(artists) {
  const failures = [];
  for (const artist of artists) {
    const properTerms = [
      artist.name,
      ...(artist.aliases ?? []),
      ...(artist.key_albums ?? []).map(album => album.title),
    ].filter(term => typeof term === 'string' && term.length >= 3);

    const visit = (value, pathParts = []) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, [...pathParts, String(index)]));
        return;
      }
      if (!value || typeof value !== 'object') return;
      if (Object.hasOwn(value, 'en') && Object.hasOwn(value, 'he')) {
        const english = stringLeaves(value.en);
        const hebrew = stringLeaves(value.he).join('\n');
        for (const term of properTerms) {
          if (english.some(text => text.includes(term)) && !hebrew.includes(term)) {
            failures.push(`${artist.name}:${pathParts.join('.')}:${term}`);
          }
        }
      }
      Object.entries(value).forEach(([key, child]) => {
        if (key !== 'he') visit(child, [...pathParts, key]);
      });
    };
    visit(artist);
  }
  return failures;
}

describe('Hebrew localization integrity', () => {
  it('keeps the generated central catalog free of unresolved placeholders', () => {
    const catalog = fs.readFileSync(path.join(root, 'src/i18n/heStrings.ts'), 'utf8');
    expect(catalog).toMatch(/[\u0590-\u05FF]/);
    expect(catalog).not.toMatch(/NOVA_(?:VAR|ITEM|PROPER)|NOVAKEEP\d+TOKEN/i);
  });

  it('keeps Hebrew complete in a separate artist-enrichment overlay', () => {
    const enrichment = JSON.parse(fs.readFileSync(path.join(root, 'src/data/artist_enrichment.json'), 'utf8'));
    const hebrewOverlay = JSON.parse(
      fs.readFileSync(path.join(root, 'src/data/artist_enrichment_he.json'), 'utf8'),
    );
    const merged = mergeArtistEnrichmentHebrew(enrichment, hebrewOverlay);

    expect(pathsContainingKey(enrichment, 'he')).toEqual([]);
    expect(walkLocalized(merged)).toEqual([]);
    expect(JSON.stringify(hebrewOverlay)).toMatch(/[\u0590-\u05FF]/);
    expect(missingProperTerms(merged)).toEqual([]);
  });

  it('does not leave binary English-or-Spanish selectors in runtime components', () => {
    const componentRoot = path.join(root, 'src/components');
    const offenders = sourceFiles(componentRoot).flatMap(filePath => {
      const source = fs.readFileSync(filePath, 'utf8');
      return /lang\s*===\s*['"](?:en|es)['"]|const\s+(?:L|isEn)\s*=/.test(source)
        ? [path.relative(root, filePath)]
        : [];
    });
    expect(offenders).toEqual([]);
  });
});
