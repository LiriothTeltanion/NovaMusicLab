import type { Lang } from './i18n';

export const GENRE_FAMILY_IDS = [
  'Metalcore',
  'Post-Hardcore',
  'Post-Metal / Blackgaze',
  'Synthwave / Darksynth',
  'Pop Punk / Emo',
  'Emo Rap / Trap',
  'Folk Metal',
  'Power / Speed Metal',
  'Alt-Metal',
  'Hard Rock',
  'Progressive Metal',
  'Ambient / Lo-Fi',
  'Death Metal',
  'Pop / Indie',
  'Israeli Rock',
  'Hip-Hop / Rap',
  'Heavy Metal',
  'Alternative Rock',
  // Added so the archive stops pretending everything outside its metal core is
  // "Alternative". A quarter of the curated artists carried a precise genre -
  // Reggaeton, K-Pop, Gothic Metal, EDM, Corridos - and had it thrown away for
  // want of a family to land in.
  'Progressive Rock',
  'Rock',
  'Punk / New Wave',
  'Black Metal',
  'Symphonic / Gothic Metal',
  'Gothic / Industrial',
  'Post-Rock',
  'Electronic / EDM',
  'R&B / Soul',
  'Jazz',
  'Classical / Orchestral',
  'Folk / Country',
  'Latin',
  'K-Pop / J-Pop',
  // Added with the Deezer second source, whose coarse vocabulary had no home
  // here: film and game music, and the regional catalogues the archive only
  // brushes against.
  'Soundtrack / Score',
  'World / Regional',
  'Alternative',
  'Unclassified',
] as const;

export type GenreFamilyId = typeof GENRE_FAMILY_IDS[number];

interface GenreFamilyDefinition {
  id: GenreFamilyId;
  labels: Record<Lang, string>;
  secondaryTags: readonly string[];
}

export const GENRE_FAMILIES: readonly GenreFamilyDefinition[] = [
  {
    id: 'Metalcore',
    labels: { es: 'Metalcore', en: 'Metalcore', he: 'מטאלקור' },
    secondaryTags: ['Progressive Metalcore', 'Melodic Metalcore', 'Electronicore', 'Deathcore'],
  },
  {
    id: 'Post-Hardcore',
    labels: { es: 'Post-hardcore', en: 'Post-Hardcore', he: 'פוסט־הארדקור' },
    secondaryTags: ['Emo', 'Melodic Hardcore', 'Screamo', 'Hardcore Punk'],
  },
  {
    id: 'Post-Metal / Blackgaze',
    labels: { es: 'Post-metal / Blackgaze', en: 'Post-Metal / Blackgaze', he: 'פוסט־מטאל / בלאקגייז' },
    secondaryTags: ['Blackgaze', 'Post-Metal', 'Shoegaze', 'Doomgaze'],
  },
  {
    id: 'Synthwave / Darksynth',
    labels: { es: 'Synthwave / Darksynth', en: 'Synthwave / Darksynth', he: 'סינת׳ווייב / דארקסינת׳' },
    secondaryTags: ['Synthwave', 'Darksynth', 'Retrowave', 'Dreamwave'],
  },
  {
    id: 'Pop Punk / Emo',
    labels: { es: 'Pop punk / Emo', en: 'Pop Punk / Emo', he: 'פופ־פאנק / אימו' },
    secondaryTags: ['Pop Punk', 'Emo', 'Emo Pop', 'Punk Rock'],
  },
  {
    id: 'Emo Rap / Trap',
    labels: { es: 'Emo rap / Trap', en: 'Emo Rap / Trap', he: 'אימו־ראפ / טראפ' },
    secondaryTags: ['Emo Rap', 'Trap', 'Melodic Trap', 'Pop Rap'],
  },
  {
    id: 'Folk Metal',
    labels: { es: 'Folk metal', en: 'Folk Metal', he: 'פולק מטאל' },
    secondaryTags: ['Folk Metal', 'Medieval Folk', 'Celtic Metal', 'Oriental Metal'],
  },
  {
    id: 'Power / Speed Metal',
    labels: { es: 'Power / Speed metal', en: 'Power / Speed Metal', he: 'פאוור / ספיד מטאל' },
    secondaryTags: ['Power Metal', 'Speed Metal', 'Thrash Metal', 'Symphonic Metal'],
  },
  {
    id: 'Alt-Metal',
    labels: { es: 'Metal alternativo', en: 'Alt-Metal', he: 'מטאל אלטרנטיבי' },
    secondaryTags: ['Alternative Metal', 'Nu Metal', 'Industrial Metal', 'Rap Metal'],
  },
  {
    id: 'Hard Rock',
    labels: { es: 'Hard rock', en: 'Hard Rock', he: 'הארד רוק' },
    secondaryTags: ['Hard Rock', 'Glam Metal', 'AOR', 'Sleaze Rock'],
  },
  {
    id: 'Progressive Metal',
    labels: { es: 'Metal progresivo', en: 'Progressive Metal', he: 'מטאל מתקדם' },
    secondaryTags: ['Progressive Metal', 'Djent', 'Math Rock', 'Progressive Rock'],
  },
  {
    id: 'Ambient / Lo-Fi',
    labels: { es: 'Ambient / Lo-fi', en: 'Ambient / Lo-Fi', he: 'אמביינט / לו־פיי' },
    secondaryTags: ['Ambient', 'Lo-Fi', 'Dream Pop', 'Downtempo'],
  },
  {
    id: 'Death Metal',
    labels: { es: 'Death metal', en: 'Death Metal', he: 'דת׳ מטאל' },
    secondaryTags: ['Death Metal', 'Melodic Death Metal', 'Death-Doom Metal', 'Technical Death Metal'],
  },
  {
    id: 'Pop / Indie',
    labels: { es: 'Pop / Indie', en: 'Pop / Indie', he: 'פופ / אינדי' },
    secondaryTags: ['Indie Pop', 'Synth-Pop', 'Indie Rock', 'Art Pop'],
  },
  {
    id: 'Israeli Rock',
    labels: { es: 'Rock israelí', en: 'Israeli Rock', he: 'רוק ישראלי' },
    secondaryTags: ['Israeli Rock', 'Hebrew Rock', 'Mizrahi Rock', 'Israeli Alternative'],
  },
  {
    id: 'Hip-Hop / Rap',
    labels: { es: 'Hip-hop / Rap', en: 'Hip-Hop / Rap', he: 'היפ־הופ / ראפ' },
    secondaryTags: ['Hip-Hop', 'Rap', 'Contemporary R&B', 'Alternative Hip-Hop'],
  },
  {
    id: 'Heavy Metal',
    labels: { es: 'Heavy metal', en: 'Heavy Metal', he: 'הבי מטאל' },
    secondaryTags: ['Heavy Metal', 'Doom Metal', 'Gothic Metal', 'NWOBHM'],
  },
  {
    id: 'Alternative Rock',
    labels: { es: 'Rock alternativo', en: 'Alternative Rock', he: 'רוק אלטרנטיבי' },
    secondaryTags: ['Alternative Rock', 'Indie Rock', 'Grunge', 'Art Rock'],
  },
  {
    id: 'Progressive Rock',
    labels: { es: 'Rock progresivo', en: 'Progressive Rock', he: 'רוק מתקדם' },
    secondaryTags: ['Progressive Rock', 'Art Rock', 'Symphonic Rock', 'Krautrock'],
  },
  {
    id: 'Rock',
    labels: { es: 'Rock', en: 'Rock', he: 'רוק' },
    secondaryTags: ['Rock', 'Classic Rock', 'Blues Rock', 'Garage Rock'],
  },
  {
    id: 'Punk / New Wave',
    labels: { es: 'Punk / New wave', en: 'Punk / New Wave', he: 'פאנק / ניו וייב' },
    secondaryTags: ['Punk Rock', 'Post-Punk', 'New Wave', 'Ska'],
  },
  {
    id: 'Black Metal',
    labels: { es: 'Black metal', en: 'Black Metal', he: 'בלאק מטאל' },
    secondaryTags: ['Black Metal', 'Atmospheric Black Metal', 'Melodic Black Metal', 'Depressive Black Metal'],
  },
  {
    id: 'Symphonic / Gothic Metal',
    labels: { es: 'Metal sinfónico / gótico', en: 'Symphonic / Gothic Metal', he: 'מטאל סימפוני / גותי' },
    secondaryTags: ['Symphonic Metal', 'Gothic Metal', 'Doom Metal', 'Sludge Metal'],
  },
  {
    id: 'Gothic / Industrial',
    labels: { es: 'Gótico / industrial', en: 'Gothic / Industrial', he: 'גותי / תעשייתי' },
    secondaryTags: ['Gothic Rock', 'Industrial', 'Darkwave', 'EBM'],
  },
  {
    id: 'Post-Rock',
    labels: { es: 'Post-rock', en: 'Post-Rock', he: 'פוסט־רוק' },
    secondaryTags: ['Post-Rock', 'Instrumental Rock', 'Cinematic Rock', 'Math Rock'],
  },
  {
    id: 'Electronic / EDM',
    labels: { es: 'Electrónica / EDM', en: 'Electronic / EDM', he: 'אלקטרונית / EDM' },
    secondaryTags: ['House', 'Techno', 'Trance', 'Drum and Bass'],
  },
  {
    id: 'R&B / Soul',
    labels: { es: 'R&B / Soul', en: 'R&B / Soul', he: 'אר־אנד־בי / סול' },
    secondaryTags: ['Contemporary R&B', 'Neo Soul', 'Funk', 'Motown'],
  },
  {
    id: 'Jazz',
    labels: { es: 'Jazz', en: 'Jazz', he: 'ג׳אז' },
    secondaryTags: ['Jazz', 'Spiritual Jazz', 'Dark Jazz', 'Bebop'],
  },
  {
    id: 'Classical / Orchestral',
    labels: { es: 'Clásica / orquestal', en: 'Classical / Orchestral', he: 'קלאסית / תזמורתית' },
    secondaryTags: ['Classical', 'Modern Classical', 'Orchestral', 'Baroque'],
  },
  {
    id: 'Folk / Country',
    labels: { es: 'Folk / Country', en: 'Folk / Country', he: 'פולק / קאנטרי' },
    secondaryTags: ['Folk', 'Contemporary Folk', 'Country', 'Singer-Songwriter'],
  },
  {
    id: 'Latin',
    labels: { es: 'Latino', en: 'Latin', he: 'לטינית' },
    secondaryTags: ['Reggaeton', 'Latin Pop', 'Flamenco', 'Regional Mexican'],
  },
  {
    id: 'K-Pop / J-Pop',
    labels: { es: 'K-pop / J-pop', en: 'K-Pop / J-Pop', he: 'קיי־פופ / ג׳יי־פופ' },
    secondaryTags: ['K-Pop', 'J-Pop', 'J-Rock', 'Visual Kei'],
  },
  {
    id: 'Soundtrack / Score',
    labels: { es: 'Banda sonora', en: 'Soundtrack / Score', he: 'פסקול' },
    secondaryTags: ['Film Score', 'Video Game Music', 'Orchestral Score', 'Cinematic'],
  },
  {
    id: 'World / Regional',
    labels: { es: 'Mundo / Regional', en: 'World / Regional', he: 'עולם / אזורי' },
    secondaryTags: ['African Music', 'Asian Music', 'Indian Music', 'Reggae'],
  },
  {
    id: 'Alternative',
    labels: { es: 'Alternativo', en: 'Alternative', he: 'אלטרנטיבי' },
    secondaryTags: ['Experimental', 'Electronic', 'Singer-Songwriter', 'Other'],
  },
  {
    id: 'Unclassified',
    labels: { es: 'Sin clasificar', en: 'Unclassified', he: 'לא מסווג' },
    secondaryTags: [],
  },
] as const;

const FAMILY_BY_ID = new Map(GENRE_FAMILIES.map(family => [family.id, family]));
const FAMILY_ID_BY_NORMALIZED = new Map(
  GENRE_FAMILY_IDS.map(id => [id.normalize('NFC').trim().toLocaleLowerCase('en-US'), id]),
);

export function isGenreFamily(value: string): value is GenreFamilyId {
  return FAMILY_BY_ID.has(value as GenreFamilyId);
}

export function canonicalGenreFamily(value: string | null | undefined): GenreFamilyId {
  const normalized = (value ?? '').normalize('NFC').trim().toLocaleLowerCase('en-US');
  return FAMILY_ID_BY_NORMALIZED.get(normalized) ?? 'Unclassified';
}

export function genreFamilyLabel(family: string, lang: Lang): string {
  return FAMILY_BY_ID.get(canonicalGenreFamily(family))?.labels[lang] ?? family;
}

export function secondaryTagsForFamily(family: string): readonly string[] {
  return FAMILY_BY_ID.get(canonicalGenreFamily(family))?.secondaryTags ?? [];
}

export function sanitizeSecondaryTags(family: string, tags: readonly string[]): string[] {
  const allowed = new Map(
    secondaryTagsForFamily(family).map(tag => [tag.normalize('NFC').toLocaleLowerCase('en-US'), tag]),
  );
  const seen = new Set<string>();

  return tags.flatMap(tag => {
    const key = tag.normalize('NFC').trim().toLocaleLowerCase('en-US');
    const canonical = allowed.get(key);
    if (!canonical || seen.has(key)) return [];
    seen.add(key);
    return [canonical];
  });
}

export const MAX_ARTIST_GENRE_TAGS = 12;
export const MAX_ARTIST_GENRE_TAG_LENGTH = 80;

/**
 * Sanitizes an extensible, user-authored genre list without pretending the
 * current in-app vocabulary is exhaustive. Genre Lab supplies canonical
 * vocabulary labels, while portable archives may retain a future genre that
 * was added after this application build.
 */
export function sanitizeGenreTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!tag
      || tag.length > MAX_ARTIST_GENRE_TAG_LENGTH
      || /[\p{Cc}\p{Cf}]/u.test(tag)) continue;
    const key = tag.toLocaleLowerCase('en-US');
    if (seen.has(key)) continue;
    seen.add(key);
    sanitized.push(tag);
    if (sanitized.length === MAX_ARTIST_GENRE_TAGS) break;
  }

  return sanitized;
}

export function genreSearchText(family: GenreFamilyDefinition, lang: Lang): string {
  return [family.id, family.labels[lang], ...family.secondaryTags]
    .join(' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase(lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : 'en-US');
}
