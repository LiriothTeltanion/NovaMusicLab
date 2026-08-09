import { BookOpen, Quote, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { pickLanguage } from '../utils/i18n';
import { buildArtistBiography } from '../utils/artistBiography';
import type { ArtistLineupEntry, BiographyEvidence } from '../utils/artistBiography';
import type { OfflineArtistKnowledge } from '../utils/offlineArtistKnowledge';

interface ArtistBiographyProps {
  knowledge?: OfflineArtistKnowledge;
  /** The curated paragraph for this artist, already in the active language. */
  editorial?: string | null;
  displayName?: string;
  /** The country in the reader's language; both catalogues answer in English. */
  country?: string | null;
  /** Shown when an artist has neither verified facts nor a curated paragraph. */
  fallback?: string;
}

/**
 * One biography instead of two half-biographies.
 *
 * What the dossier showed before was a bare grey paragraph of curated prose,
 * with no heading and no source, followed much further down by a separate panel
 * of one-line facts. The reader met the museum's opinion of a band before
 * meeting the band.
 *
 * Here the documented facts open the reading and the curated voice answers
 * them, under a divider that says out loud which register is which. That
 * divider is the only ornament in the component and it earns its place: it
 * marks the line between what a database recorded and what the museum thinks,
 * which is a distinction this app is not willing to blur.
 */
export default function ArtistBiography({
  knowledge,
  editorial,
  displayName,
  country,
  fallback,
}: ArtistBiographyProps) {
  const { lang, tc } = useApp();
  const biography = useMemo(
    () => buildArtistBiography(knowledge, { lang, editorial, displayName, country }),
    [knowledge, lang, editorial, displayName, country],
  );

  const copy = pickLanguage(lang, {
    es: {
      title: 'Biografía',
      museumSays: 'Lo que dice el museo',
      currentLineup: 'Formación actual',
      documentedLineup: 'Formación documentada',
      formerMembers: 'Pasaron por la banda',
      noRole: 'rol sin documentar',
      moreMembers: (count: number) => `y ${count} más`,
      hint: 'Los párrafos con fuente están compuestos a partir de datos verificados; lo que no consta no se escribe.',
    },
    en: {
      title: 'Biography',
      museumSays: 'What the museum says',
      currentLineup: 'Current lineup',
      documentedLineup: 'Documented lineup',
      formerMembers: 'Passed through the band',
      noRole: 'role undocumented',
      moreMembers: (count: number) => `and ${count} more`,
      hint: 'Sourced paragraphs are composed from verified data; anything unrecorded is left unsaid.',
    },
    he: {
      title: 'ביוגרפיה',
      museumSays: 'מה שהמוזיאון אומר',
      currentLineup: 'ההרכב הנוכחי',
      documentedLineup: 'ההרכב המתועד',
      formerMembers: 'עברו בהרכב',
      noRole: 'תפקיד לא מתועד',
      moreMembers: (count: number) => `ועוד ${count}`,
      hint: 'הפסקאות עם מקור מורכבות מנתונים מאומתים; מה שלא תועד פשוט לא נכתב.',
    },
  });

  const evidenceLabel: Record<BiographyEvidence, string> = {
    musicbrainz: 'MusicBrainz',
    wikidata: 'Wikidata',
    curated: pickLanguage(lang, { es: 'Museo', en: 'Museum', he: 'מוזיאון' }),
    archive: pickLanguage(lang, { es: 'Tu archivo', en: 'Your archive', he: 'הארכיון שלך' }),
  };

  // An artist deep in the ranking can have no verified facts and no curated
  // paragraph. Saying so plainly beats an empty space where a biography was
  // promised, and beats writing one from nothing.
  if (!biography) {
    return fallback ? <p className="type-body text-gray-400">{fallback}</p> : null;
  }

  // Former members are capped: Nine Inch Nails alone has 27, and a wall of
  // names buries the current lineup that most readers came for.
  const FORMER_SHOWN = 8;
  const hiddenFormer = Math.max(0, biography.lineup.former.length - FORMER_SHOWN);
  const documented = biography.paragraphs.filter(paragraph => paragraph.voice === 'documented');
  const museum = biography.paragraphs.filter(paragraph => paragraph.voice === 'editorial');

  const renderMember = (member: ArtistLineupEntry, accent: string) => (
    <li
      key={`${member.name}-${member.tenure ?? 'na'}`}
      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
    >
      <span className="font-semibold text-gray-200">{member.name}</span>
      <span className="text-xs text-gray-500">
        {member.roles.length ? member.roles.join(' · ') : copy.noRole}
      </span>
      {member.tenure ? (
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: accent }}
          // Tenure is a range of years; keeping it LTR stops it reversing in
          // Hebrew, where "2004 – 2013" would otherwise read back to front.
          dir="ltr"
        >
          {member.tenure}
        </span>
      ) : null}
    </li>
  );

  return (
    <section
      className="nova-surface nova-surface--analysis rounded-3xl p-4 md:p-6"
      data-testid="artist-biography"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" style={{ color: tc.c1 }} aria-hidden="true" />
          <h3 className="type-kicker" style={{ color: tc.c1 }}>{copy.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {biography.sources.map(source => (
            <span
              key={source}
              className="rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
              style={{ color: tc.c3, borderColor: `${tc.c3}30`, backgroundColor: `${tc.c3}10` }}
            >
              {evidenceLabel[source]}
            </span>
          ))}
        </div>
      </div>

      {biography.lead.length > 0 && (
        <p
          className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-widest"
          style={{ color: tc.c2 }}
        >
          {biography.lead.map((item, index) => (
            <span key={item} className="flex items-center gap-2">
              {index > 0 && <span className="text-gray-600" aria-hidden="true">·</span>}
              <span className="tabular-nums">{item}</span>
            </span>
          ))}
        </p>
      )}

      {/* A single column at a comfortable measure. The dossier around this is
          all grids and chips, so the one place meant to be read is the one
          place that gets a reading width. */}
      <div className="mt-4 max-w-[68ch] space-y-3">
        {documented.map(paragraph => (
          <p key={paragraph.id} className="type-body text-gray-300">
            {paragraph.text}
            <span className="ms-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-gray-600">
              {paragraph.evidence.map(source => evidenceLabel[source]).join(' · ')}
            </span>
          </p>
        ))}
      </div>

      {museum.length > 0 && (
        <div className="mt-6 max-w-[68ch]">
          <div className="flex items-center gap-3">
            <Quote className="h-3.5 w-3.5 shrink-0" style={{ color: tc.c4 }} aria-hidden="true" />
            <span className="type-kicker whitespace-nowrap" style={{ color: tc.c4 }}>
              {copy.museumSays}
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: `${tc.c4}30` }} aria-hidden="true" />
          </div>
          {museum.map(paragraph => (
            <p key={paragraph.id} className="type-body-lg mt-3 text-gray-100">
              {paragraph.text}
            </p>
          ))}
        </div>
      )}

      {(biography.lineup.current.length > 0 || biography.lineup.former.length > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {biography.lineup.current.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-3.5 w-3.5" style={{ color: tc.c2 }} aria-hidden="true" />
                <p className="type-kicker" style={{ color: tc.c2 }}>{copy.currentLineup}</p>
              </div>
              <ul className="space-y-1.5">
                {biography.lineup.current.map(member => renderMember(member, tc.c2))}
              </ul>
            </div>
          )}

          {biography.lineup.former.length > 0 && (
            <div>
              <p className="type-kicker mb-2 text-gray-500">
                {/* An act that ended has no "former" members to speak of - every
                    name in it is simply who was in it. */}
                {biography.lineup.ended ? copy.documentedLineup : copy.formerMembers}
              </p>
              <ul className="space-y-1.5">
                {biography.lineup.former.slice(0, FORMER_SHOWN).map(member => renderMember(member, tc.c4))}
              </ul>
              {hiddenFormer > 0 && (
                <p className="mt-1.5 text-xs text-gray-600">{copy.moreMembers(hiddenFormer)}</p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-5 max-w-[68ch] text-xs leading-relaxed text-gray-500">{copy.hint}</p>
    </section>
  );
}
