import type { Lang } from './i18n';
import { LANGUAGE_OPTIONS, pickLanguage } from './i18n';
import type { OfflineArtistBandMember, OfflineArtistKnowledge } from './offlineArtistKnowledge';

/**
 * The artist dossier used to say two unconnected things about the same act.
 *
 * One was a single grey paragraph of curated prose - "works like a backbone in
 * the archive... transformation energy, not just a favorite artist" - warm, but
 * touching none of the facts the app had already fetched. The other was a panel
 * of one-line chapters - formed here, N members, N releases - accurate, and
 * cold. A reader got an opinion and a datasheet, never a biography.
 *
 * This composes both into one reading: the documented facts first, so the
 * editorial claim that follows has something to stand on. Two registers still
 * exist, and the page keeps them visibly apart, because "MusicBrainz records a
 * formation year of 2004" and "this band is the archive's backbone" are not the
 * same kind of statement and should never be mistaken for each other.
 *
 * Nothing here is invented or fetched. Every documented sentence is built from
 * a field already in the offline brain, and a paragraph whose facts are missing
 * is dropped rather than hedged - a gap is honest, a plausible filler is not.
 */

export type BiographyEvidence = 'musicbrainz' | 'wikidata' | 'curated' | 'archive';

export interface BiographyParagraph {
  id: 'identity' | 'sound' | 'catalogue' | 'lineup' | 'editorial' | 'archive';
  /** Flowing prose, already localized. */
  text: string;
  /** Every source that contributed a fact, in the order they were used. */
  evidence: BiographyEvidence[];
  /** A database statement and a museum statement must not read alike. */
  voice: 'documented' | 'editorial';
}

export interface ArtistLineupEntry {
  name: string;
  roles: string[];
  /** Localized tenure, e.g. "2004 – present" or "2004 – 2013". */
  tenure: string | null;
  current: boolean;
}

export interface ArtistBiography {
  /** Compact identity strip: place, span, catalogue size. */
  lead: string[];
  paragraphs: BiographyParagraph[];
  lineup: {
    current: ArtistLineupEntry[];
    former: ArtistLineupEntry[];
    /** MusicBrainz says the act ended, so "current lineup" would be a lie. */
    ended: boolean;
  };
  /** Documented style tags, cleaned of the ones that describe no style. */
  styles: string[];
  /** Distinct sources behind the whole biography, for the header. */
  sources: BiographyEvidence[];
}

interface SourcedValue<T> {
  value: T;
  evidence: BiographyEvidence[];
}

// ── Fact resolution ─────────────────────────────────────────────────────────

/** Accepts "2004", "2004-05", "2004-05-03" and returns 2004. */
function yearFrom(value?: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{4})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  // Recorded music predates 1900, but a four-digit number outside this window
  // in a music database is a data error rather than a very old band.
  return year >= 1900 && year <= new Date().getFullYear() + 1 ? year : null;
}

/**
 * The archive writes a literal "Unknown" (and the catalogue an "Unclassified")
 * where it has no value, so a naive fallback chain prints "Comes from Unknown."
 * A placeholder is an absence, not a place.
 */
const PLACEHOLDER_VALUES = new Set(['unknown', 'unclassified', 'n/a', 'none', 'desconocido']);

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key) || PLACEHOLDER_VALUES.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function mergeEvidence(...groups: BiographyEvidence[][]): BiographyEvidence[] {
  return [...new Set(groups.flat())];
}

function firstSourcedString(
  candidates: Array<{ value?: string | null; evidence: BiographyEvidence }>,
): SourcedValue<string> | null {
  for (const candidate of candidates) {
    const [value] = uniqueStrings([candidate.value]);
    if (value) return { value, evidence: [candidate.evidence] };
  }
  return null;
}

function firstSourcedYear(
  candidates: Array<{ value?: string | null; evidence: BiographyEvidence }>,
): SourcedValue<number> | null {
  for (const candidate of candidates) {
    const year = yearFrom(candidate.value);
    if (year) return { value: year, evidence: [candidate.evidence] };
  }
  return null;
}

/**
 * Wikidata's formation place is usually the city, MusicBrainz's begin area is
 * usually the city too, and its `area` is the country. Preferring the narrower
 * one and appending the country reads the way people actually say it -
 * "Sheffield, United Kingdom" rather than just "United Kingdom".
 */
function resolveOrigin(
  knowledge: OfflineArtistKnowledge,
  localizedCountry?: string | null,
): SourcedValue<string> | null {
  const place = firstSourcedString([
    { value: knowledge.wikidata?.formationPlaces?.[0], evidence: 'wikidata' },
    { value: knowledge.musicbrainz?.beginArea, evidence: 'musicbrainz' },
    { value: knowledge.curated?.origin, evidence: 'curated' },
  ]);
  // MusicBrainz and Wikidata both answer in English, so a Spanish reader was
  // told a band comes from "United Kingdom". The curated profile carries the
  // translated country and the dossier already shows it, so it leads here.
  const country = firstSourcedString([
    { value: localizedCountry, evidence: 'curated' },
    { value: knowledge.musicbrainz?.area, evidence: 'musicbrainz' },
    { value: knowledge.wikidata?.countries?.[0], evidence: 'wikidata' },
    { value: knowledge.curated?.country, evidence: 'curated' },
    { value: knowledge.archive?.country, evidence: 'archive' },
  ]);

  if (place && country && place.value.toLowerCase() !== country.value.toLowerCase()) {
    return {
      value: `${place.value}, ${country.value}`,
      evidence: mergeEvidence(place.evidence, country.evidence),
    };
  }
  return place ?? country ?? null;
}

function formatTenure(member: OfflineArtistBandMember, lang: Lang): string | null {
  const begin = yearFrom(member.begin);
  const end = yearFrom(member.end);
  const present = pickLanguage(lang, { es: 'hoy', en: 'present', he: 'היום' });

  if (begin && end) return `${begin} – ${end}`;
  if (begin && member.current) return `${begin} – ${present}`;
  if (begin) return `${begin} –`;
  if (end) return `– ${end}`;
  return null;
}

function toLineupEntry(member: OfflineArtistBandMember, lang: Lang): ArtistLineupEntry {
  return {
    name: member.name,
    roles: uniqueStrings(member.roles ?? []),
    tenure: formatTenure(member, lang),
    current: Boolean(member.current),
  };
}

/** Joins with the language's own list conjunction rather than a bare comma. */
function joinList(items: string[], lang: Lang): string {
  if (items.length <= 1) return items[0] ?? '';
  const conjunction = pickLanguage(lang, { es: ' y ', en: ' and ', he: ' ו־' });
  return `${items.slice(0, -1).join(', ')}${conjunction}${items[items.length - 1]}`;
}

/**
 * Adds the full stop unless the sentence already ends in one. Label names carry
 * their own punctuation - "Deathwish Inc." printed as "Deathwish Inc.." until
 * this existed.
 */
function endSentence(text: string): string {
  return /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
}

/**
 * A Hebrew prefix letter glued straight onto a Latin word reads as one broken
 * token - "נוסדה בSheffield". Hebrew typography joins the two with a maqaf, the
 * same connector this file's list conjunction already uses. A place name that
 * is itself in Hebrew script takes the prefix directly, as it should.
 */
function hebrewPrefix(prefix: string, value: string): string {
  return /^[֐-׿]/.test(value.trim()) ? `${prefix}${value}` : `${prefix}־${value}`;
}

/**
 * MusicBrainz stores a person's birth date in the same lifeSpanBegin field a
 * group uses for its formation date, so reading it blindly turns a birthday
 * into a career start: Post Malone came out as "began in Syracuse in 1995",
 * which is the year he was born, not the year he started releasing music.
 */
function isGroupAct(knowledge: OfflineArtistKnowledge): boolean {
  const mbType = (knowledge.musicbrainz?.type ?? '').toLowerCase();
  if (mbType === 'person') return false;
  if (mbType === 'group' || mbType === 'orchestra' || mbType === 'choir') return true;
  return (knowledge.wikidata?.instanceOf ?? []).some(kind => /band|group|duo|ensemble/i.test(kind));
}

// ── Style tags ──────────────────────────────────────────────────────────────

/**
 * MusicBrainz tags are community free text, so the raw list arrives carrying
 * things that are not styles: languages ("english"), nationalities ("american",
 * and in one case the Spanish "estados unidos"), decades ("2010s"), listening
 * habits ("seen live") and moods ("melancholy", "hipster"). Printing those as
 * documented styles would make the museum claim something no source said.
 *
 * Matching is on the whole normalized tag, never a substring, so compounds keep
 * working: "american primitive" and "melancholic black metal" are real styles
 * and survive, while the bare "american" and "melancholy" do not.
 */
const NON_STYLE_TAGS = new Set([
  // Languages and nationalities.
  'english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'japanese',
  'korean', 'swedish', 'norwegian', 'finnish', 'danish', 'dutch', 'polish',
  'russian', 'american', 'british', 'canadian', 'australian', 'mexican',
  'brazilian', 'argentinian', 'icelandic', 'irish', 'scottish', 'welsh',
  // Places, in the spellings the tag dumps actually contain.
  'usa', 'uk', 'united states', 'united kingdom', 'estados unidos',
  'reino unido', 'europe', 'european', 'scandinavian', 'nordic', 'latin america',
  // Judgements and moods, which are the listener's, not the act's.
  'hipster', 'abstract', 'melancholy', 'melancholic', 'favorite', 'favourite',
  'favorites', 'awesome', 'cool', 'beautiful', 'sad', 'happy', 'chill', 'love',
  'seen live', 'overrated', 'underrated', 'good', 'great',
  // Descriptions of the act or the recording, not of a style.
  'band', 'group', 'duo', 'solo', 'male vocalists', 'female vocalists',
  'composer', 'producer', 'musician', 'artist', 'live', 'studio',
]);

/** "2010s", "80s" and "1990's" are eras, not genres. */
const DECADE_TAG = /^(19|20)?\d0'?s$/;

function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}']+/gu, ' ')
    .trim();
}

/**
 * MusicBrainz tags come already sorted by how many people voted for them, so
 * they lead. Wikidata genres are an unordered set and fill in behind, which is
 * why no sentence here claims the list is ranked.
 */
function resolveStyles(knowledge: OfflineArtistKnowledge): SourcedValue<string[]> {
  const seen = new Set<string>();
  const styles: string[] = [];
  const evidence: BiographyEvidence[] = [];

  for (const source of [
    { tags: knowledge.musicbrainz?.tags ?? [], evidence: 'musicbrainz' as const },
    { tags: knowledge.wikidata?.genres ?? [], evidence: 'wikidata' as const },
  ]) {
    let contributed = false;
    for (const tag of source.tags) {
      const normalized = normalizeTag(tag);
      if (!normalized || seen.has(normalized)) continue;
      if (NON_STYLE_TAGS.has(normalized) || DECADE_TAG.test(normalized)) continue;
      seen.add(normalized);
      styles.push(tag.trim());
      contributed = true;
    }
    if (contributed) evidence.push(source.evidence);
  }

  return { value: styles, evidence };
}

// ── Composition ─────────────────────────────────────────────────────────────

/** How many style tags and member names a sentence names before it summarizes. */
const STYLES_NAMED = 5;
const MEMBERS_NAMED = 6;
const LABELS_NAMED = 4;

function localeFor(lang: Lang): string {
  return LANGUAGE_OPTIONS.find(option => option.code === lang)?.locale ?? 'en-US';
}

export interface ArtistBiographyOptions {
  lang: Lang;
  /**
   * The curated paragraph from the enrichment file, already in `lang`. Passed
   * in rather than imported so this module stays clear of the 341 KB profile
   * JSON and of the room's lazy-loading boundaries.
   */
  editorial?: string | null;
  /** Falls back to the knowledge base's own spelling of the name. */
  displayName?: string;
  /**
   * The country in the reader's language. Both catalogues answer in English,
   * so without this a Spanish dossier says a band comes from "United Kingdom".
   */
  country?: string | null;
}

/**
 * The documented half. Split out because the curated half has to survive
 * without it: the offline brain covers the top 100 artists, while twelve
 * curated profiles belong to acts further down the ranking, and their dossiers
 * would otherwise lose their biography entirely.
 */
function documentedBiography(
  knowledge: OfflineArtistKnowledge,
  { lang, displayName, country }: ArtistBiographyOptions,
): Pick<ArtistBiography, 'lead' | 'paragraphs' | 'lineup' | 'styles'> {
  const name = displayName?.trim() || knowledge.name;
  const formatNumber = (value: number) => value.toLocaleString(localeFor(lang));

  const originFact = resolveOrigin(knowledge, country);
  const origin = originFact?.value ?? null;
  const isGroup = isGroupAct(knowledge);
  // Only a group has a formation year. For a person the same fields hold a
  // birth date, which is a different fact and gets a different sentence.
  const formedFact = isGroup
    ? firstSourcedYear([
      { value: knowledge.wikidata?.inception, evidence: 'wikidata' },
      { value: knowledge.musicbrainz?.lifeSpanBegin, evidence: 'musicbrainz' },
      { value: knowledge.curated?.activeYears?.[0], evidence: 'curated' },
    ])
    : null;
  const bornFact = isGroup
    ? null
    : firstSourcedYear([
      { value: knowledge.wikidata?.birthDate, evidence: 'wikidata' },
      { value: knowledge.musicbrainz?.lifeSpanBegin, evidence: 'musicbrainz' },
    ]);
  const formedYear = formedFact?.value ?? null;
  const bornYear = bornFact?.value ?? null;
  const ended = Boolean(knowledge.musicbrainz?.ended);
  const endedYear = ended ? yearFrom(knowledge.musicbrainz?.lifeSpanEnd) : null;

  const labels = uniqueStrings(knowledge.wikidata?.recordLabels ?? []);
  const styleFacts = resolveStyles(knowledge);
  const styles = styleFacts.value;

  // `bandMembers` is produced by the MusicBrainz relationship enrichment. A
  // detached/stale array without the matching artist identity has no source we
  // can disclose, so it must not escape through either prose or lineup columns.
  const allMembers = knowledge.musicbrainz?.id
    ? (knowledge.bandMembers ?? []).map(member => toLineupEntry(member, lang))
    : [];
  // A solo act credited as its own single "member" is not a lineup, and the
  // relation is often junk besides - Post Malone's one entry is a backing band
  // called The Fools For You, with no instrument attached. Dropping it here
  // rather than only in the sentence keeps the lineup columns empty too.
  const isSoloCredit = !isGroup
    && allMembers.filter(member => member.current).length <= 1
    && allMembers.every(member => member.current);
  const members = isSoloCredit ? [] : allMembers;
  // A band that ended has no current lineup, whatever the membership relations
  // say: MusicBrainz simply never wrote an end date for the last keyboardist,
  // and Type O Negative would otherwise be listed as still having one member.
  const current = ended ? [] : members.filter(member => member.current);
  const former = ended ? members : members.filter(member => !member.current);

  const datedReleases = (knowledge.releaseGroups ?? [])
    .map(group => ({ title: group.title, year: yearFrom(group.firstReleaseDate) }))
    .filter((group): group is { title: string; year: number } => group.year !== null)
    .sort((left, right) => left.year - right.year);

  const releaseCount = knowledge.releaseGroups?.length ?? 0;
  const earliest = datedReleases[0] ?? null;
  const latestYear = datedReleases[datedReleases.length - 1]?.year ?? null;

  const paragraphs: BiographyParagraph[] = [];

  // ── Identity ──────────────────────────────────────────────────────────────
  if (origin || formedYear || bornYear) {
    const sentences: string[] = [];

    if (origin && formedYear) {
      sentences.push(pickLanguage(lang, {
        es: `${name} se formó en ${origin} en ${formedYear}.`,
        en: `${name} formed in ${origin} in ${formedYear}.`,
        he: `${name} נוסדה ${hebrewPrefix('ב', origin)} בשנת ${formedYear}.`,
      }));
    } else if (origin && bornYear) {
      sentences.push(pickLanguage(lang, {
        es: `${name} nació en ${origin} en ${bornYear}.`,
        en: `${name} was born in ${origin} in ${bornYear}.`,
        he: `${name} נולד ${hebrewPrefix('ב', origin)} בשנת ${bornYear}.`,
      }));
    } else if (origin) {
      sentences.push(pickLanguage(lang, {
        es: `${name} procede de ${origin}.`,
        en: `${name} comes from ${origin}.`,
        he: `${name} מגיע ${hebrewPrefix('מ', origin)}.`,
      }));
    } else if (formedYear) {
      sentences.push(pickLanguage(lang, {
        es: `${name} está en activo desde ${formedYear}.`,
        en: `${name} has been active since ${formedYear}.`,
        he: `${name} פעיל משנת ${formedYear}.`,
      }));
    } else {
      sentences.push(pickLanguage(lang, {
        es: `${name} nació en ${bornYear}.`,
        en: `${name} was born in ${bornYear}.`,
        he: `${name} נולד בשנת ${bornYear}.`,
      }));
    }

    // Silence is not evidence of activity, so only a source that says the act
    // ended produces a status sentence.
    if (ended) {
      sentences.push(endedYear
        ? pickLanguage(lang, {
          es: `Dejó de estar en activo en ${endedYear}.`,
          en: `It stopped being active in ${endedYear}.`,
          he: `הפסיק את פעילותו בשנת ${endedYear}.`,
        })
        : pickLanguage(lang, {
          es: 'Ya no está en activo.',
          en: 'It is no longer active.',
          he: 'אינו פעיל עוד.',
        }));
    }

    paragraphs.push({
      id: 'identity',
      text: sentences.join(' '),
      evidence: mergeEvidence(
        originFact?.evidence ?? [],
        formedFact?.evidence ?? [],
        bornFact?.evidence ?? [],
        ended ? ['musicbrainz'] : [],
      ),
      voice: 'documented',
    });
  }

  // ── Sound ─────────────────────────────────────────────────────────────────
  // The tags were fetched long ago and never rendered: 18 documented styles for
  // Bring Me the Horizon were sitting in the file while the dossier printed the
  // one word the archive had guessed.
  if (styles.length) {
    const named = joinList(styles.slice(0, STYLES_NAMED), lang);
    paragraphs.push({
      id: 'sound',
      // "among them" rather than "the main ones": the list is source order, not
      // a ranking, and the sentence must not imply one.
      text: styles.length > STYLES_NAMED
        ? pickLanguage(lang, {
          es: `Las fuentes recogen ${styles.length} etiquetas de estilo, entre ellas ${named}.`,
          en: `The sources record ${styles.length} style tags, among them ${named}.`,
          he: `המקורות מתעדים ${styles.length} תגיות סגנון, ביניהן ${named}.`,
        })
        : pickLanguage(lang, {
          es: `Las fuentes recogen estos estilos: ${named}.`,
          en: `The sources record these styles: ${named}.`,
          he: `המקורות מתעדים את הסגנונות האלה: ${named}.`,
        }),
      evidence: styleFacts.evidence,
      voice: 'documented',
    });
  }

  // ── Catalogue ─────────────────────────────────────────────────────────────
  const releaseEvidence: BiographyEvidence[] = knowledge.musicbrainz?.id
    ? ['musicbrainz']
    : knowledge.curated
      ? ['curated']
      : [];
  if (releaseCount && releaseEvidence.length) {
    const sentences: string[] = [];
    const span = earliest && latestYear && earliest.year !== latestYear
      ? pickLanguage(lang, {
        es: ` entre ${earliest.year} y ${latestYear}`,
        en: ` between ${earliest.year} and ${latestYear}`,
        he: ` בין ${earliest.year} ל־${latestYear}`,
      })
      : earliest
        ? pickLanguage(lang, {
          es: ` en ${earliest.year}`,
          en: ` in ${earliest.year}`,
          he: ` בשנת ${earliest.year}`,
        })
        : '';

    sentences.push(releaseCount === 1
      ? pickLanguage(lang, {
        es: `El catálogo documentado reúne un solo lanzamiento${span}.`,
        en: `The documented catalogue holds a single release${span}.`,
        he: `הקטלוג המתועד כולל יציאה אחת${span}.`,
      })
      : pickLanguage(lang, {
        es: `El catálogo documentado reúne ${releaseCount} lanzamientos${span}.`,
        en: `The documented catalogue holds ${releaseCount} releases${span}.`,
        he: `הקטלוג המתועד כולל ${releaseCount} יציאות${span}.`,
      }));

    // The earliest release is named and the newest is not, on purpose: the
    // earliest is a stable fact, while the newest entry is often a reissue or a
    // live recording and would read as a milestone it is not.
    if (earliest) {
      sentences.push(pickLanguage(lang, {
        es: `El primero que consta es ${earliest.title} (${earliest.year}).`,
        en: `The earliest on record is ${earliest.title} (${earliest.year}).`,
        he: `המוקדם ביותר שמתועד הוא ${earliest.title} (${earliest.year}).`,
      }));
    }

    if (labels.length) {
      const named = joinList(labels.slice(0, LABELS_NAMED), lang);
      // Deafheaven has exactly one label, so a sentence hard-wired to the
      // plural read "The labels on record are Deathwish Inc."
      sentences.push(endSentence(labels.length === 1
        ? pickLanguage(lang, {
          es: `El sello que consta es ${named}`,
          en: `The label on record is ${named}`,
          he: `החברה שמתועדת היא ${named}`,
        })
        : pickLanguage(lang, {
          es: `Los sellos que constan son ${named}`,
          en: `The labels on record are ${named}`,
          he: `החברות שמתועדות הן ${named}`,
        })));
    }

    paragraphs.push({
      id: 'catalogue',
      text: sentences.join(' '),
      evidence: mergeEvidence(releaseEvidence, labels.length ? ['wikidata'] : []),
      voice: 'documented',
    });
  }

  // ── Lineup ────────────────────────────────────────────────────────────────
  if (members.length) {
    const sentences: string[] = [];

    if (current.length) {
      const named = joinList(current.slice(0, MEMBERS_NAMED).map(member => member.name), lang);
      sentences.push(current.length > MEMBERS_NAMED
        ? pickLanguage(lang, {
          es: `La formación actual tiene ${current.length} integrantes, entre ellos ${named}.`,
          en: `The current lineup has ${current.length} members, among them ${named}.`,
          he: `בהרכב הנוכחי ${current.length} חברים, ביניהם ${named}.`,
        })
        : pickLanguage(lang, {
          es: `La formación actual la componen ${named}.`,
          en: `The current lineup is ${named}.`,
          he: `ההרכב הנוכחי הוא ${named}.`,
        }));
    } else if (ended && former.length) {
      const named = joinList(former.slice(0, MEMBERS_NAMED).map(member => member.name), lang);
      sentences.push(former.length > MEMBERS_NAMED
        ? pickLanguage(lang, {
          es: `Su formación documentada reúne ${former.length} integrantes, entre ellos ${named}.`,
          en: `Its documented lineup holds ${former.length} members, among them ${named}.`,
          he: `ההרכב המתועד כולל ${former.length} חברים, ביניהם ${named}.`,
        })
        : pickLanguage(lang, {
          es: `Su formación documentada la componen ${named}.`,
          en: `Its documented lineup is ${named}.`,
          he: `ההרכב המתועד הוא ${named}.`,
        }));
    }

    if (current.length && former.length) {
      sentences.push(former.length === 1
        ? pickLanguage(lang, {
          es: 'Otra persona más pasó por el grupo.',
          en: 'One more person passed through the group.',
          he: 'עוד אדם אחד עבר בהרכב.',
        })
        : pickLanguage(lang, {
          es: `Otras ${former.length} personas pasaron por el grupo.`,
          en: `Another ${former.length} people passed through the group.`,
          he: `עוד ${former.length} אנשים עברו בהרכב.`,
        }));
    }

    if (sentences.length) {
      paragraphs.push({
        id: 'lineup',
        text: sentences.join(' '),
        evidence: ['musicbrainz'],
        voice: 'documented',
      });
    }
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  // The one fact no encyclopedia holds: what this act is worth across eleven
  // years of listening. It closes the biography, and only closes one - on its
  // own it is a statistic the dossier already shows in its evidence pills, not
  // a life story, so an act with nothing else documented does not get it.
  if (paragraphs.length && knowledge.archive?.plays > 0 && knowledge.archive?.rank > 0) {
    const { rank, plays } = knowledge.archive;
    paragraphs.push({
      id: 'archive',
      text: pickLanguage(lang, {
        es: `En tu archivo ocupa el puesto ${rank}, con ${formatNumber(plays)} reproducciones registradas.`,
        en: `In your archive it sits at number ${rank}, with ${formatNumber(plays)} recorded plays.`,
        he: `בארכיון שלך הוא במקום ${rank}, עם ${formatNumber(plays)} האזנות מתועדות.`,
      }),
      evidence: ['archive'],
      voice: 'documented',
    });
  }

  // ── Lead strip ────────────────────────────────────────────────────────────
  const lead: string[] = [];
  if (origin) lead.push(origin);
  if (formedYear) {
    lead.push(endedYear
      ? `${formedYear} – ${endedYear}`
      : pickLanguage(lang, {
        es: `${formedYear} – hoy`,
        en: `${formedYear} – present`,
        he: `${formedYear} – היום`,
      }));
  } else if (bornYear) {
    lead.push(String(bornYear));
  }
  if (releaseCount && releaseEvidence.length) {
    lead.push(releaseCount === 1
      ? pickLanguage(lang, { es: '1 lanzamiento', en: '1 release', he: 'יציאה אחת' })
      : pickLanguage(lang, {
        es: `${releaseCount} lanzamientos`,
        en: `${releaseCount} releases`,
        he: `${releaseCount} יציאות`,
      }));
  }

  return { lead, paragraphs, lineup: { current, former, ended }, styles };
}

export function buildArtistBiography(
  knowledge: OfflineArtistKnowledge | undefined,
  options: ArtistBiographyOptions,
): ArtistBiography | null {
  const documented = knowledge
    ? documentedBiography(knowledge, options)
    : { lead: [], paragraphs: [], lineup: { current: [], former: [], ended: false }, styles: [] };

  const paragraphs = [...documented.paragraphs];

  // The curated voice closes the reading. It comes last because everything
  // above it is what the claim rests on: an editorial line about a band's
  // reinvention means more once the reader has seen the years it spans.
  const editorial = options.editorial?.trim();
  if (editorial) {
    paragraphs.push({ id: 'editorial', text: editorial, evidence: ['curated'], voice: 'editorial' });
  }

  if (!paragraphs.length) return null;

  return {
    ...documented,
    paragraphs,
    sources: Array.from(new Set(paragraphs.flatMap(paragraph => paragraph.evidence))),
  };
}
