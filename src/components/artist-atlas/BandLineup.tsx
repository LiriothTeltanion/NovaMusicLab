import { useState } from 'react';
import { Users, X } from 'lucide-react';

import ArtistAvatar from '../ArtistAvatar';
import memberEnrichment from '../../data/member_enrichment.json';
import { getBandsForMember, type OfflineArtistBandMember } from '../../utils/offlineArtistKnowledge';
import type { ArtistAtlasCopy } from './atlasCopy';

interface MemberEnrichmentEntry {
  name?: string;
  // Wikidata leaves these null when the fact is genuinely unknown, so the
  // nullability is meaningful data rather than a gap in the type.
  photo?: string | null;
  birthDate?: string | null;
  age?: number | null;
}

const MEMBER_ENRICHMENT = memberEnrichment as Record<string, MemberEnrichmentEntry>;

/** Same normalization the image maps are written with (see ArtistAvatar). */
function enrichmentKey(name: string) {
  return name.normalize('NFC').trim().toLowerCase();
}

function yearsLabel(member: OfflineArtistBandMember, copy: ArtistAtlasCopy) {
  if (!member.begin) return member.current ? copy.lineupCurrent : copy.lineupFormer;
  const from = member.begin.slice(0, 4);
  return member.current
    ? copy.lineupSince(from)
    : copy.lineupSpan(from, (member.end ?? '').slice(0, 4));
}

interface BandLineupProps {
  band: string;
  members: OfflineArtistBandMember[];
  copy: ArtistAtlasCopy;
  accent: string;
}

/**
 * The band behind the archive entry. Members are documented facts from
 * MusicBrainz/Wikidata, so a member without a free portrait shows an initials
 * monogram rather than a stand-in face - the same honesty rule the rest of the
 * Atlas follows for artwork.
 */
export default function BandLineup({ band, members, copy, accent }: BandLineupProps) {
  const [openMember, setOpenMember] = useState<string | null>(null);

  if (!members.length) return null;

  const current = members.filter(member => member.current);
  const former = members.filter(member => !member.current);
  const selected = members.find(member => member.name === openMember) ?? null;

  return (
    <section className="artist-atlas__lineup" aria-labelledby="artist-atlas-lineup-title">
      <div className="artist-atlas__subheading">
        <Users className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
        <h4 id="artist-atlas-lineup-title">{copy.lineupTitle}</h4>
      </div>
      <p className="artist-atlas__lineup-subtitle">{copy.lineupSubtitle}</p>

      <ul className="artist-atlas__lineup-grid">
        {current.map(member => {
          const enrichment = MEMBER_ENRICHMENT[enrichmentKey(member.name)];
          const roles = member.roles?.length ? member.roles.join(' · ') : copy.lineupRolesUnknown;
          return (
            <li key={member.name}>
              <button
                type="button"
                className="artist-atlas__lineup-card"
                aria-label={`${copy.memberOpenHint}: ${member.name}`}
                aria-expanded={openMember === member.name}
                onClick={() => setOpenMember(openMember === member.name ? null : member.name)}
              >
                <ArtistAvatar name={member.name} size={44} tooltip={false} />
                <span className="artist-atlas__lineup-identity">
                  <span className="artist-atlas__lineup-name"><bdi dir="auto">{member.name}</bdi></span>
                  <span className="artist-atlas__lineup-roles"><bdi dir="auto">{roles}</bdi></span>
                  <span className="artist-atlas__lineup-years">
                    {yearsLabel(member, copy)}
                    {enrichment?.age ? ` · ${copy.memberAge(enrichment.age)}` : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {former.length > 0 && (
        <details className="artist-atlas__lineup-former">
          <summary>{copy.lineupFormerCount(former.length)}</summary>
          <ul>
            {former.map(member => (
              <li key={member.name}>
                <button
                  type="button"
                  aria-label={`${copy.memberOpenHint}: ${member.name}`}
                  onClick={() => setOpenMember(openMember === member.name ? null : member.name)}
                >
                  <bdi dir="auto">{member.name}</bdi>
                  <span>{yearsLabel(member, copy)}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {selected && (
        <MemberCard
          member={selected}
          band={band}
          copy={copy}
          accent={accent}
          onClose={() => setOpenMember(null)}
        />
      )}
    </section>
  );
}

interface MemberCardProps {
  member: OfflineArtistBandMember;
  band: string;
  copy: ArtistAtlasCopy;
  accent: string;
  onClose: () => void;
}

function MemberCard({ member, band, copy, accent, onClose }: MemberCardProps) {
  const enrichment = MEMBER_ENRICHMENT[enrichmentKey(member.name)];
  const hasPortrait = Boolean(enrichment?.photo);
  // Other bands in the archive that list the same person - the reason a member
  // is worth clicking at all.
  const otherBands = getBandsForMember(member.name).filter(entry => entry.band !== band);

  return (
    <div className="artist-atlas__member-card" role="group" aria-label={member.name}>
      <button
        type="button"
        className="artist-atlas__member-close"
        onClick={onClose}
        aria-label={copy.memberClose}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="artist-atlas__member-head">
        <ArtistAvatar name={member.name} size={72} tooltip={false} />
        <div>
          <p className="artist-atlas__member-name"><bdi dir="auto">{member.name}</bdi></p>
          <p className="artist-atlas__member-meta">
            {member.roles?.length ? member.roles.join(' · ') : copy.lineupRolesUnknown}
          </p>
          <p className="artist-atlas__member-meta">
            {yearsLabel(member, copy)}
            {enrichment?.age ? ` · ${copy.memberAge(enrichment.age)}` : ''}
          </p>
          {!hasPortrait && (
            <p className="artist-atlas__member-note">{copy.lineupNoPhoto}</p>
          )}
        </div>
      </div>

      <div className="artist-atlas__member-bands">
        <p className="artist-atlas__member-bands-title" style={{ color: accent }}>
          {copy.memberAlsoIn}
        </p>
        {otherBands.length ? (
          <ul>
            {otherBands.map(entry => (
              <li key={`${entry.band}-${entry.begin ?? 'x'}`}>
                <bdi dir="auto">{entry.band}</bdi>
                <span>
                  {entry.current ? copy.lineupCurrent : copy.lineupFormer}
                  {entry.roles.length ? ` · ${entry.roles.join(' · ')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="artist-atlas__muted-state">{copy.memberAlsoInEmpty}</p>
        )}
      </div>
    </div>
  );
}
