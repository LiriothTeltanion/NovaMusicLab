import type { Lang } from './i18n';
import { pickLanguage } from './i18n';
import type { OfflineArtistBandMember, OfflineArtistKnowledge } from './offlineArtistKnowledge';

/**
 * Turns the verified facts already in the offline brain into something a
 * visitor can read.
 *
 * The dossier used to print those facts as loose chips - "Sheffield", "United
 * Kingdom", "17 albums with context", two member names - which states the data
 * without saying anything. Meanwhile `inception` and `lifeSpanBegin` were being
 * loaded and never rendered at all, so the one fact people always want first,
 * when the band started, was sitting unused in the file.
 *
 * Nothing here is invented or fetched. Every sentence is composed from a field
 * that came from MusicBrainz, Wikidata or the curated notes, and each chapter
 * carries the source it was built from, so a reader can tell a documented year
 * from an editorial claim. Where a fact is missing the chapter is omitted
 * rather than softened into a guess - a museum with a gap is honest, a museum
 * that fills gaps with plausible prose is not.
 */

export type ArtistStoryEvidence = 'musicbrainz' | 'wikidata' | 'curated' | 'archive';

export interface ArtistStoryChapter {
  id: 'origin' | 'lineup' | 'labels' | 'discography' | 'status';
  /** One short sentence, already localized. */
  text: string;
  evidence: ArtistStoryEvidence;
}

export interface ArtistLineupEntry {
  name: string;
  roles: string[];
  /** Localized tenure, e.g. "2004 – present" or "2004 – 2013". */
  tenure: string | null;
  current: boolean;
}

export interface ArtistStory {
  /** Where the act comes from, most specific place first. */
  origin: string | null;
  /** Four-digit year, when a source states one. */
  formedYear: number | null;
  endedYear: number | null;
  labels: string[];
  lineup: {
    current: ArtistLineupEntry[];
    former: ArtistLineupEntry[];
  };
  discography: {
    count: number;
    firstYear: number | null;
    latestYear: number | null;
  };
  chapters: ArtistStoryChapter[];
}

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

/**
 * Wikidata's formation place is usually the city, MusicBrainz's begin area is
 * usually the city too, and its `area` is the country. Preferring the narrower
 * one and appending the country reads the way people actually say it -
 * "Sheffield, United Kingdom" rather than just "United Kingdom".
 */
function resolveOrigin(knowledge: OfflineArtistKnowledge): string | null {
  const place = uniqueStrings([
    knowledge.wikidata?.formationPlaces?.[0],
    knowledge.musicbrainz?.beginArea,
    knowledge.curated?.origin,
  ])[0];
  const country = uniqueStrings([
    knowledge.musicbrainz?.area,
    knowledge.wikidata?.countries?.[0],
    knowledge.curated?.country,
    knowledge.archive?.country,
  ])[0];

  if (place && country && place.toLowerCase() !== country.toLowerCase()) {
    return `${place}, ${country}`;
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

export function buildArtistStory(
  knowledge: OfflineArtistKnowledge | undefined,
  lang: Lang,
): ArtistStory | null {
  if (!knowledge) return null;

  const origin = resolveOrigin(knowledge);
  const isGroup = isGroupAct(knowledge);
  // Only a group has a formation year. For a person the same fields hold a
  // birth date, which is a different fact and gets a different sentence.
  const formedYear = isGroup
    ? yearFrom(knowledge.wikidata?.inception)
      ?? yearFrom(knowledge.musicbrainz?.lifeSpanBegin)
      ?? yearFrom(knowledge.curated?.activeYears?.[0])
    : null;
  const bornYear = isGroup
    ? null
    : yearFrom(knowledge.wikidata?.birthDate) ?? yearFrom(knowledge.musicbrainz?.lifeSpanBegin);
  const endedYear = knowledge.musicbrainz?.ended ? yearFrom(knowledge.musicbrainz?.lifeSpanEnd) : null;

  const labels = uniqueStrings(knowledge.wikidata?.recordLabels ?? []);

  const members = (knowledge.bandMembers ?? []).map(member => toLineupEntry(member, lang));
  const current = members.filter(member => member.current);
  const former = members.filter(member => !member.current);

  const releaseYears = (knowledge.releaseGroups ?? [])
    .map(group => yearFrom(group.firstReleaseDate))
    .filter((year): year is number => year !== null)
    .sort((left, right) => left - right);

  const discography = {
    count: knowledge.releaseGroups?.length ?? 0,
    firstYear: releaseYears[0] ?? null,
    latestYear: releaseYears[releaseYears.length - 1] ?? null,
  };

  const chapters: ArtistStoryChapter[] = [];

  // ── Origin ────────────────────────────────────────────────────────────────
  if (origin || formedYear || bornYear) {
    let text: string;
    if (origin && formedYear) {
      text = pickLanguage(lang, {
        es: `Se formó en ${origin} en ${formedYear}.`,
        en: `Formed in ${origin} in ${formedYear}.`,
        he: `נוסדה ב${origin} בשנת ${formedYear}.`,
      });
    } else if (origin && bornYear) {
      text = pickLanguage(lang, {
        es: `Nació en ${origin} en ${bornYear}.`,
        en: `Born in ${origin} in ${bornYear}.`,
        he: `נולד ב${origin} בשנת ${bornYear}.`,
      });
    } else if (origin) {
      text = pickLanguage(lang, {
        es: `Procede de ${origin}.`,
        en: `Comes from ${origin}.`,
        he: `מגיע מ${origin}.`,
      });
    } else if (formedYear) {
      text = pickLanguage(lang, {
        es: `En activo desde ${formedYear}.`,
        en: `Active since ${formedYear}.`,
        he: `פעיל משנת ${formedYear}.`,
      });
    } else {
      text = pickLanguage(lang, {
        es: `Nació en ${bornYear}.`,
        en: `Born in ${bornYear}.`,
        he: `נולד בשנת ${bornYear}.`,
      });
    }

    chapters.push({
      id: 'origin',
      text: endSentence(text),
      evidence: knowledge.wikidata?.inception || knowledge.wikidata?.formationPlaces?.length
        ? 'wikidata'
        : 'musicbrainz',
    });
  }

  // ── Lineup ────────────────────────────────────────────────────────────────
  // A solo act credited as its own single "member" is not a lineup; saying so
  // would be noise on every rapper and singer-songwriter in the archive.
  const isSoloCredit = !isGroup && current.length <= 1 && former.length === 0;
  if (members.length && !isSoloCredit) {
    const parts: string[] = [];
    if (current.length) {
      parts.push(pickLanguage(lang, {
        es: `${current.length} ${current.length === 1 ? 'integrante actual' : 'integrantes actuales'}`,
        en: `${current.length} current ${current.length === 1 ? 'member' : 'members'}`,
        he: `${current.length} חברי הרכב נוכחיים`,
      }));
    }
    if (former.length) {
      parts.push(pickLanguage(lang, {
        es: `${former.length} ${former.length === 1 ? 'antiguo integrante' : 'antiguos integrantes'}`,
        en: `${former.length} former ${former.length === 1 ? 'member' : 'members'}`,
        he: `${former.length} חברי הרכב לשעבר`,
      }));
    }

    chapters.push({
      id: 'lineup',
      text: pickLanguage(lang, {
        es: `Formación documentada: ${joinList(parts, lang)}.`,
        en: `Documented lineup: ${joinList(parts, lang)}.`,
        he: `הרכב מתועד: ${joinList(parts, lang)}.`,
      }),
      evidence: 'musicbrainz',
    });
  }

  // ── Labels ────────────────────────────────────────────────────────────────
  if (labels.length) {
    chapters.push({
      id: 'labels',
      // endSentence, because a label name can already end in a full stop and
      // "Deathwish Inc.." is not a label.
      text: endSentence(pickLanguage(lang, {
        es: `Ha editado con ${joinList(labels.slice(0, 4), lang)}`,
        en: `Released through ${joinList(labels.slice(0, 4), lang)}`,
        he: `הוציא לאור דרך ${joinList(labels.slice(0, 4), lang)}`,
      })),
      evidence: 'wikidata',
    });
  }

  // ── Discography ───────────────────────────────────────────────────────────
  if (discography.count) {
    const span = discography.firstYear && discography.latestYear
      && discography.firstYear !== discography.latestYear
      ? pickLanguage(lang, {
        es: ` entre ${discography.firstYear} y ${discography.latestYear}`,
        en: ` between ${discography.firstYear} and ${discography.latestYear}`,
        he: ` בין ${discography.firstYear} ל־${discography.latestYear}`,
      })
      : discography.firstYear
        ? pickLanguage(lang, {
          es: ` en ${discography.firstYear}`,
          en: ` in ${discography.firstYear}`,
          he: ` בשנת ${discography.firstYear}`,
        })
        : '';

    chapters.push({
      id: 'discography',
      text: pickLanguage(lang, {
        es: `${discography.count} lanzamientos catalogados${span}.`,
        en: `${discography.count} catalogued releases${span}.`,
        he: `${discography.count} יציאות מקוטלגות${span}.`,
      }),
      evidence: 'musicbrainz',
    });
  }

  // ── Status ────────────────────────────────────────────────────────────────
  // Only stated when MusicBrainz actually says the act ended. Silence is not
  // evidence of activity, so an unknown status prints nothing.
  if (knowledge.musicbrainz?.ended) {
    chapters.push({
      id: 'status',
      text: endedYear
        ? pickLanguage(lang, {
          es: `Dejó de estar en activo en ${endedYear}.`,
          en: `No longer active as of ${endedYear}.`,
          he: `אינו פעיל עוד משנת ${endedYear}.`,
        })
        : pickLanguage(lang, {
          es: 'Ya no está en activo.',
          en: 'No longer active.',
          he: 'אינו פעיל עוד.',
        }),
      evidence: 'musicbrainz',
    });
  }

  if (!chapters.length) return null;

  return { origin, formedYear, endedYear, labels, lineup: { current, former }, discography, chapters };
}
