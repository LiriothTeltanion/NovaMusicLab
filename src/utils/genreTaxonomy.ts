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

export function genreSearchText(family: GenreFamilyDefinition, lang: Lang): string {
  return [family.id, family.labels[lang], ...family.secondaryTags]
    .join(' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase(lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : 'en-US');
}
