/* eslint-disable no-console -- maintenance CLI reports generation progress */
/**
 * Generates the Hebrew translation object from the canonical English UI tree.
 *
 * This script is deliberately not part of `npm run verify`: the generated
 * TypeScript file is committed and the app remains fully local/offline. Run it
 * only when English copy changes, then review the Hebrew diff with a human.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'src/context/AppContext.tsx');
const OUTPUT_PATH = path.join(ROOT, 'src/i18n/heStrings.ts');
const CACHE_PATH = path.join(ROOT, 'scripts/hebrew-ui.cache.json');
const ARTIST_ENRICHMENT_PATH = path.join(ROOT, 'src/data/artist_enrichment.json');
const ARTIST_ENRICHMENT_HE_PATH = path.join(ROOT, 'src/data/artist_enrichment_he.json');
const LOCALIZED_TS_PATHS = [
  'src/components/EmotionalMap.tsx',
  'src/components/TopHistorico.tsx',
  'src/components/MediaEmbedHub.tsx',
  'src/engines/emotionalEngine.ts',
  'src/engines/moodCore.ts',
].map(relativePath => path.join(ROOT, relativePath));
const BATCH_SEPARATOR = '\n<<<NOVA_ITEM_9F4A>>>\n';
const TEMPLATE_TOKEN = index => `<<<NOVA_VAR_${index}_9F4A>>>`;
let protectedTerms = [
  'Nova Music Lab', 'Spotify', 'Last.fm', 'YouTube', 'Apple Music',
  'ListenBrainz', 'MusicBrainz', 'Wikidata',
];

const EXACT_GLOSSARY = new Map(Object.entries({
  'Your Musical Universe': 'היקום המוזיקלי שלך',
  'Load Data': 'טעינת נתונים',
  'Loading module': 'המודול נטען',
  'Preparing visuals, data and emotional engine.': 'מכינים את התצוגות, הנתונים והמנוע הרגשי.',
  'Go to the Nova Music Lab home': 'מעבר לדף הבית של Nova Music Lab',
  'Open theme selector': 'פתיחת בורר ערכת הנושא',
  'Load music data files': 'טעינת קובצי נתוני מוזיקה',
  'Dashboard': 'לוח הבקרה',
  'Listening': 'האזנה',
  'AI Assistant': 'עוזר AI',
  'Musical Eras': 'תקופות מוזיקליות',
  'All-Time Top': 'המובילים בכל הזמנים',
  'Personality': 'אישיות',
  'Emotional Map': 'מפה רגשית',
  'Obsessions': 'אובססיות',
  'Cultural DNA': 'דנ״א תרבותי',
  'Inner World': 'עולם פנימי',
  'If I Were an Artist': 'אילו הייתי אמן',
  'Hidden Insights': 'תובנות נסתרות',
  'Platforms': 'פלטפורמות',
  'Data Quality': 'איכות הנתונים',
  'Achievements': 'הישגים',
  'Time Capsule': 'קפסולת זמן',
  'Annual Wrapped': 'סיכום שנתי',
  'Year Wrapped': 'סיכום שנתי',
  'Current Pulse': 'הדופק הנוכחי',
  'Final Essay': 'המסה המסכמת',
  'Upload Files': 'העלאת קבצים',
  'Total Plays': 'סך ההשמעות',
  'Listening Hours': 'שעות האזנה',
  'Unique Artists': 'אמנים ייחודיים',
  'Active Days': 'ימי פעילות',
  'Best Year': 'השנה המובילה',
  'Average / Day': 'ממוצע ליום',
  'Night Listening': 'האזנה לילית',
  'Peak Hour': 'שעת השיא',
  'Unique Tracks': 'שירים ייחודיים',
  'Unique Albums': 'אלבומים ייחודיים',
  'Personal Records': 'שיאים אישיים',
  'Longest streak': 'הרצף הארוך ביותר',
  'Max in one day': 'השיא ביום אחד',
  'Longest session': 'סשן ההאזנה הארוך ביותר',
  'Best session': 'סשן ההאזנה המוביל',
  'Whole archive': 'כל הארכיון',
  'Plays': 'השמעות',
  'plays': 'השמעות',
  'Scrobbles': 'סקראבלים',
  'scrobbles': 'סקראבלים',
  'Verified scrobbles': 'סקראבלים מאומתים',
  'Artists': 'אמנים',
  'artists': 'אמנים',
  'Tracks': 'שירים',
  'tracks': 'שירים',
  'Albums': 'אלבומים',
  'albums': 'אלבומים',
  'Genres': 'ז׳אנרים',
  'Years': 'שנים',
  'Other': 'אחר',
  'Unclassified': 'ללא סיווג',
  'Exact': 'מדויק',
  'Estimated': 'משוער',
  'Year to date': 'מתחילת השנה',
  'Copy link': 'העתקת קישור',
  'Link copied': 'הקישור הועתק',
  'Close': 'סגירה',
  'Back': 'חזרה',
  'Next': 'הבא',
  'Previous': 'הקודם',
  'Search': 'חיפוש',
  'No data': 'אין נתונים',
  'Not available': 'לא זמין',
  'Recently played': 'הושמע לאחרונה',
  'Reopen the welcome tour': 'פתיחת סיור ההיכרות מחדש',
  '<<<NOVA_VAR_0_9F4A>>> plays': '<<<NOVA_VAR_0_9F4A>>> השמעות',
  'To activate the chart, upload Spotify Extended Streaming History JSON. The app will read platform, ms_played, skipped and conn_country locally in the browser without sending your history to servers.':
    'כדי להפעיל את התרשים, יש להעלות קובץ Spotify Extended Streaming History בפורמט JSON. האפליקציה תקרא את השדות platform, ms_played, skipped ו-conn_country באופן מקומי בדפדפן, בלי לשלוח את היסטוריית ההאזנה לשרתים.',
}));

function unwrap(node) {
  let current = node;
  while (current && (
    ts.isAsExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isParenthesizedExpression(current)
  )) current = current.expression;
  return current;
}

function findEnglishTree(sourceFile) {
  let result;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === 'STRINGS') {
      const tree = unwrap(node.initializer);
      if (ts.isObjectLiteralExpression(tree)) {
        const english = tree.properties.find(property => property.name?.getText(sourceFile) === 'en');
        result = unwrap(english?.initializer);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!result || !ts.isObjectLiteralExpression(result)) {
    throw new Error('Could not locate STRINGS.en in AppContext.tsx');
  }
  return result;
}

function isPropertyName(node) {
  return Boolean(node.parent && 'name' in node.parent && node.parent.name === node);
}

function isCodeLiteral(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (isPropertyName(node)) return true;
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true;
  if (ts.isCaseClause(parent)) return true;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
  if (ts.isBinaryExpression(parent)) {
    const comparisonKinds = new Set([
      ts.SyntaxKind.EqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ]);
    if (comparisonKinds.has(parent.operatorToken.kind)) return true;
  }
  if (ts.isCallExpression(parent)) {
    const callee = parent.expression.getText();
    if (/toLocale(?:String|DateString|TimeString)$/.test(callee)) return true;
  }
  return false;
}

function templateDescriptor(node, sourceFile) {
  const expressions = [];
  let text = node.head.text;
  node.templateSpans.forEach((span, index) => {
    expressions.push(span.expression.getText(sourceFile));
    text += TEMPLATE_TOKEN(index) + span.literal.text;
  });
  return { text, expressions };
}

function collectCandidates(root, sourceFile) {
  const candidates = [];
  const visit = node => {
    if (ts.isTemplateExpression(node)) {
      const descriptor = templateDescriptor(node, sourceFile);
      candidates.push({ kind: 'template', node, ...descriptor });
      node.templateSpans.forEach(span => visit(span.expression));
      return;
    }
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isCodeLiteral(node)) candidates.push({ kind: 'string', node, text: node.text });
      return;
    }
    if (ts.isStringLiteral(node)) {
      if (!isCodeLiteral(node)) candidates.push({ kind: 'string', node, text: node.text });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return candidates;
}

function polishHebrew(text) {
  return text
    .replace(/<+NOVA_VAR_(\d+)_9F4A>+/g, '<<<NOVA_VAR_$1_9F4A>>>')
    .replaceAll('הצגות', 'השמעות')
    .replaceAll('מחזות', 'השמעות')
    .replaceAll('משחקים', 'השמעות')
    .replaceAll('מקשיבה', 'האזנה')
    .replaceAll('לוח מחוונים', 'לוח הבקרה')
    .replaceAll('לוח המחוונים', 'לוח הבקרה')
    .replaceAll('קשקושים', 'סקראבלים')
    .replaceAll('קשקוש', 'סקראבל')
    .replaceAll('רשימת השמעה', 'פלייליסט')
    .replaceAll('מצב רוח', 'מצב רגשי')
    .replaceAll('שנה עד היום', 'מתחילת השנה')
    .replaceAll('השנה עד היום', 'מתחילת השנה')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function protectTerms(text) {
  let protectedText = text;
  protectedTerms.forEach((term, index) => {
    const wholeTerm = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, 'gu');
    protectedText = protectedText.replace(wholeTerm, `NOVAKEEP${index}TOKEN`);
  });
  return protectedText;
}

function restoreTerms(text) {
  return text.replace(/NOVAKEEP\s*(\d+)\s*TOKEN/gi, (_match, rawIndex) => (
    protectedTerms[Number(rawIndex)] ?? _match
  ));
}

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function requestTranslation(items) {
  const joined = items.map(protectTerms).join(BATCH_SEPARATOR);
  const endpoint = new URL('https://translate.googleapis.com/translate_a/single');
  endpoint.searchParams.set('client', 'gtx');
  endpoint.searchParams.set('sl', 'en');
  endpoint.searchParams.set('tl', 'he');
  endpoint.searchParams.set('dt', 't');
  endpoint.searchParams.set('q', joined);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Translation request failed: HTTP ${response.status}`);
  const payload = await response.json();
  const translated = payload[0].map(part => part[0]).join('');
  const split = translated.split(BATCH_SEPARATOR);
  if (split.length !== items.length) {
    if (items.length === 1) return [polishHebrew(restoreTerms(translated))];
    const fallback = [];
    for (const item of items) fallback.push(...await requestTranslation([item]));
    return fallback;
  }
  return split.map(item => polishHebrew(restoreTerms(item)));
}

function makeBatches(items, maxChars = 3_800) {
  const batches = [];
  let current = [];
  let size = 0;
  for (const item of items) {
    const nextSize = size + item.length + BATCH_SEPARATOR.length;
    if (current.length && nextSize > maxChars) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.length + BATCH_SEPARATOR.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateAll(texts) {
  const cache = await readCache();
  for (const [english, hebrew] of EXACT_GLOSSARY) cache[english] = hebrew;
  for (const [english, hebrew] of Object.entries(cache)) {
    const lostProtectedTerm = protectedTerms.some(term => english.includes(term) && !hebrew.includes(term));
    if (lostProtectedTerm && !EXACT_GLOSSARY.has(english)) delete cache[english];
  }
  const pending = [...new Set(texts)].filter(text => text.trim() && !cache[text]);
  const batches = makeBatches(pending);
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const translated = await requestTranslation(batch);
    batch.forEach((english, itemIndex) => { cache[english] = translated[itemIndex]; });
    await fs.writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
    process.stdout.write(`Translated Hebrew UI batch ${index + 1}/${batches.length}\r`);
  }
  if (batches.length) process.stdout.write('\n');
  return cache;
}

function collectStringLeaves(value, target) {
  if (typeof value === 'string') {
    if (value.trim()) target.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectStringLeaves(item, target));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectStringLeaves(item, target));
  }
}

function collectLocalizedJsonEnglish(value, target) {
  if (Array.isArray(value)) {
    value.forEach(item => collectLocalizedJsonEnglish(item, target));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Object.hasOwn(value, 'es') && Object.hasOwn(value, 'en')) {
    collectStringLeaves(value.en, target);
  }
  Object.values(value).forEach(item => collectLocalizedJsonEnglish(item, target));
}

function translateJsonValue(value, cache) {
  if (typeof value === 'string') return polishHebrew(cache[value] ?? value);
  if (Array.isArray(value)) return value.map(item => translateJsonValue(item, cache));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateJsonValue(item, cache)]));
  }
  return value;
}

function buildArtistEnrichmentHebrewOverlay(artists, cache) {
  return artists.map(artist => ({
    name: artist.name,
    origin: translateJsonValue(artist.origin.en, cache),
    country: translateJsonValue(artist.country.en, cache),
    status: translateJsonValue(artist.status.en, cache),
    bio: translateJsonValue(artist.bio.en, cache),
    archive_role: translateJsonValue(artist.archive_role.en, cache),
    sound_evolution: translateJsonValue(artist.sound_evolution.en, cache),
    why_it_matters: translateJsonValue(artist.why_it_matters.en, cache),
    signature_moods: translateJsonValue(artist.signature_moods.en, cache),
    key_albums: artist.key_albums.map(album => ({
      title: album.title,
      description: translateJsonValue(album.description.en, cache),
    })),
  }));
}

async function translateLocalizedJsonFiles() {
  const artists = JSON.parse(await fs.readFile(ARTIST_ENRICHMENT_PATH, 'utf8'));
  const englishTexts = [];
  collectLocalizedJsonEnglish(artists, englishTexts);
  const cache = await translateAll(englishTexts);
  const overlay = buildArtistEnrichmentHebrewOverlay(artists, cache);
  await fs.writeFile(ARTIST_ENRICHMENT_HE_PATH, `${JSON.stringify(overlay, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote Hebrew artist overlay ${path.relative(ROOT, ARTIST_ENRICHMENT_HE_PATH)} `
    + `(${englishTexts.length} text leaves).`,
  );
}

function propertyNamed(object, name, sourceFile) {
  return object.properties.find(property => {
    if (!property.name) return false;
    if (ts.isIdentifier(property.name)) return property.name.text === name;
    if (ts.isStringLiteral(property.name)) return property.name.text === name;
    return property.name.getText(sourceFile) === name;
  });
}

function findOutermostLocalizedObjects(sourceFile) {
  const objects = [];
  const visit = node => {
    if (ts.isObjectLiteralExpression(node)) {
      const spanish = propertyNamed(node, 'es', sourceFile);
      const english = propertyNamed(node, 'en', sourceFile);
      const hebrew = propertyNamed(node, 'he', sourceFile);
      if (spanish && english && ts.isPropertyAssignment(english)) {
        objects.push({
          object: node,
          english,
          hebrew: hebrew && ts.isPropertyAssignment(hebrew) ? hebrew : undefined,
        });
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return objects;
}

function indentationAt(source, position) {
  const lineStart = source.lastIndexOf('\n', position - 1) + 1;
  return source.slice(lineStart, position).match(/^\s*/)?.[0] ?? '';
}

async function translateLocalizedTypeScriptFiles() {
  for (const filePath of LOCALIZED_TS_PATHS) {
    const source = await fs.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const localizedObjects = findOutermostLocalizedObjects(sourceFile);
    if (!localizedObjects.length) continue;
    const candidates = localizedObjects.flatMap(({ english }) => (
      collectCandidates(english.initializer, sourceFile)
    ));
    const cache = await translateAll(candidates.map(candidate => candidate.text));
    const changes = localizedObjects.map(({ english, hebrew }) => {
      const translated = renderNode(english.initializer, sourceFile, cache);
      if (hebrew) {
        return {
          start: hebrew.initializer.getStart(sourceFile),
          end: hebrew.initializer.getEnd(),
          value: translated,
        };
      }
      let position = english.getEnd();
      while (/\s/.test(source[position] ?? '')) position += 1;
      const hasComma = source[position] === ',';
      if (hasComma) position += 1;
      const indent = indentationAt(source, english.getStart(sourceFile));
      return {
        start: position,
        end: position,
        value: `${hasComma ? '' : ','}\n${indent}he: ${translated},`,
      };
    }).sort((a, b) => b.start - a.start);
    let output = source;
    for (const change of changes) {
      output = output.slice(0, change.start) + change.value + output.slice(change.end);
    }
    await fs.writeFile(filePath, output, 'utf8');
    console.log(`Added Hebrew to ${path.relative(ROOT, filePath)} (${localizedObjects.length} locale objects).`);
  }
}

function escapeTemplateText(text) {
  return text.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
}

function renderCandidate(candidate, translated, sourceFile, cache) {
  const polished = polishHebrew(translated);
  if (candidate.kind === 'string') return JSON.stringify(polished);
  let body = escapeTemplateText(polished);
  candidate.node.templateSpans.forEach((span, index) => {
    const renderedExpression = renderNode(span.expression, sourceFile, cache);
    const tokenPattern = new RegExp(`<+NOVA_VAR_${index}_9F4A>+`, 'g');
    body = body.replace(tokenPattern, `\${${renderedExpression}}`);
  });
  return `\`${body}\``;
}

function renderNode(node, sourceFile, cache) {
  if (ts.isTemplateExpression(node)) {
    const candidate = { kind: 'template', node, ...templateDescriptor(node, sourceFile) };
    return renderCandidate(candidate, cache[candidate.text] ?? candidate.text, sourceFile, cache);
  }
  if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isCodeLiteral(node)) {
    return JSON.stringify(polishHebrew(cache[node.text] ?? node.text));
  }

  const start = node.getStart(sourceFile);
  let output = sourceFile.text.slice(start, node.getEnd());
  const replacements = [];
  node.forEachChild(child => {
    const original = sourceFile.text.slice(child.getStart(sourceFile), child.getEnd());
    const rendered = renderNode(child, sourceFile, cache);
    if (rendered !== original) {
      replacements.push({
        start: child.getStart(sourceFile) - start,
        end: child.getEnd() - start,
        value: rendered,
      });
    }
  });
  replacements.sort((a, b) => b.start - a.start);
  for (const replacement of replacements) {
    output = output.slice(0, replacement.start) + replacement.value + output.slice(replacement.end);
  }
  return output;
}

async function main() {
  const centralOnly = process.argv.includes('--central-only');
  const jsonOnly = process.argv.includes('--json-only');
  const compiledData = JSON.parse(await fs.readFile(
    path.join(ROOT, 'src/data/music_dna_compiled.json'),
    'utf8',
  ));
  const artistEnrichment = JSON.parse(await fs.readFile(
    ARTIST_ENRICHMENT_PATH,
    'utf8',
  ));
  protectedTerms = [...new Set([
    ...protectedTerms,
    ...(compiledData.top_artists ?? []).map(artist => artist.name),
    ...(compiledData.top_tracks ?? []).map(track => track.title),
    ...(compiledData.top_albums ?? []).map(album => album.title),
    ...artistEnrichment.flatMap(artist => [
      artist.name,
      ...(artist.aliases ?? []),
      ...(artist.key_albums ?? []).map(album => album.title),
    ]),
  ])].filter(Boolean).sort((a, b) => b.length - a.length);
  if (jsonOnly) {
    await translateLocalizedJsonFiles();
    return;
  }
  const source = await fs.readFile(SOURCE_PATH, 'utf8');
  const sourceFile = ts.createSourceFile(
    SOURCE_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const englishTree = findEnglishTree(sourceFile);
  const candidates = collectCandidates(englishTree, sourceFile);
  const cache = await translateAll(candidates.map(candidate => candidate.text));
  const output = renderNode(englishTree, sourceFile, cache);

  const banner = `/* eslint-disable */\n/**\n * Generated Hebrew UI copy. Review after regeneration.\n * Source: STRINGS.en in AppContext.tsx\n */\n`;
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${banner}export const HE_STRINGS = ${output} as const;\n`, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)} with ${candidates.length} translated nodes.`);
  if (!centralOnly) {
    await translateLocalizedJsonFiles();
    await translateLocalizedTypeScriptFiles();
  }
}

await main();
