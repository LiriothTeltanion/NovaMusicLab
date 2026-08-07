import { BookOpen, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { pickLanguage } from '../utils/i18n';
import { buildArtistStory } from '../utils/artistStory';
import type { ArtistLineupEntry, ArtistStoryEvidence } from '../utils/artistStory';
import type { OfflineArtistKnowledge } from '../utils/offlineArtistKnowledge';

interface ArtistStoryPanelProps {
  knowledge?: OfflineArtistKnowledge;
}

/**
 * The narrative half of the dossier: where an act came from, who has been in
 * it, and over what span.
 *
 * The room already had a "verified background" block, but it printed the same
 * facts as loose chips - a city, a country, "17 albums with context", two
 * member names - which shows the data without telling anyone anything. It also
 * dropped the roles and the years each person was in the band, which is the
 * part that turns a list of names into a history.
 *
 * Every line here is composed from MusicBrainz, Wikidata or the curated notes,
 * and each carries the source that produced it. Nothing is written when the
 * fact is absent: a missing formation year prints no sentence rather than a
 * hedge.
 */
export default function ArtistStoryPanel({ knowledge }: ArtistStoryPanelProps) {
  const { lang, tc } = useApp();
  const story = useMemo(() => buildArtistStory(knowledge, lang), [knowledge, lang]);

  const copy = pickLanguage(lang, {
    es: {
      title: '📖 Historia del artista',
      hint: 'Compuesta a partir de hechos verificados. Cada frase indica de dónde sale, y lo que no consta no se escribe.',
      currentLineup: 'Formación actual',
      formerMembers: 'Pasaron por la banda',
      noRole: 'rol sin documentar',
      moreMembers: (count: number) => `y ${count} más`,
    },
    en: {
      title: '📖 Artist story',
      hint: 'Composed from verified facts. Every line names its source, and anything unrecorded is left unsaid.',
      currentLineup: 'Current lineup',
      formerMembers: 'Passed through the band',
      noRole: 'role undocumented',
      moreMembers: (count: number) => `and ${count} more`,
    },
    he: {
      title: '📖 סיפור האמן',
      hint: 'מורכב מעובדות מאומתות. כל שורה מציינת את מקורה, ומה שלא תועד פשוט לא נכתב.',
      currentLineup: 'ההרכב הנוכחי',
      formerMembers: 'עברו בהרכב',
      noRole: 'תפקיד לא מתועד',
      moreMembers: (count: number) => `ועוד ${count}`,
    },
  });

  const evidenceLabel: Record<ArtistStoryEvidence, string> = {
    musicbrainz: 'MusicBrainz',
    wikidata: 'Wikidata',
    curated: pickLanguage(lang, { es: 'Curado', en: 'Curated', he: 'בעריכה' }),
    archive: pickLanguage(lang, { es: 'Archivo', en: 'Archive', he: 'ארכיון' }),
  };

  if (!story) return null;

  // Former members are capped: Nine Inch Nails alone has 27, and a wall of
  // names buries the current lineup that most readers came for.
  const FORMER_SHOWN = 8;
  const hiddenFormer = Math.max(0, story.lineup.former.length - FORMER_SHOWN);

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
    <section className="rounded-2xl border border-white/8 bg-black/20 p-4" data-testid="artist-story-panel">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4" style={{ color: tc.c1 }} aria-hidden="true" />
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: tc.c1 }}>
          {copy.title}
        </h3>
      </div>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-500">{copy.hint}</p>

      <ul className="mt-4 space-y-2">
        {story.chapters.map(chapter => (
          <li key={chapter.id} className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm leading-relaxed text-gray-200">{chapter.text}</span>
            <span
              className="rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
              style={{ color: tc.c3, borderColor: `${tc.c3}30`, backgroundColor: `${tc.c3}10` }}
            >
              {evidenceLabel[chapter.evidence]}
            </span>
          </li>
        ))}
      </ul>

      {(story.lineup.current.length > 0 || story.lineup.former.length > 0) && (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {story.lineup.current.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-3.5 w-3.5" style={{ color: tc.c2 }} aria-hidden="true" />
                <p className="font-mono text-[10px] font-black uppercase tracking-widest" style={{ color: tc.c2 }}>
                  {copy.currentLineup}
                </p>
              </div>
              <ul className="space-y-1.5">
                {story.lineup.current.map(member => renderMember(member, tc.c2))}
              </ul>
            </div>
          )}

          {story.lineup.former.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-widest text-gray-500">
                {copy.formerMembers}
              </p>
              <ul className="space-y-1.5">
                {story.lineup.former.slice(0, FORMER_SHOWN).map(member => renderMember(member, tc.c4))}
              </ul>
              {hiddenFormer > 0 && (
                <p className="mt-1.5 text-xs text-gray-600">{copy.moreMembers(hiddenFormer)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
