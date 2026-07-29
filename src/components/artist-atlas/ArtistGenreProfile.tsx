import { useEffect, useId, useMemo, useState } from 'react';
import { BadgeCheck, Sparkles, Tags } from 'lucide-react';
import {
  loadGenreKnowledge,
  resolveArtistGenreKnowledge,
  type GenreKnowledgeBundle,
} from '../../genres/genreKnowledge';
import {
  canonicalGenreFamily,
  genreFamilyLabel,
  MAX_ARTIST_GENRE_TAGS,
} from '../../utils/genreTaxonomy';
import type { Lang } from '../../utils/i18n';
import type { ArtistAtlasCopy } from './atlasCopy';

interface ArtistGenreProfileProps {
  artistName: string;
  fallbackFamily: string;
  emotionalLabel: string;
  copy: ArtistAtlasCopy;
  lang: Lang;
}

export default function ArtistGenreProfile({
  artistName,
  fallbackFamily,
  emotionalLabel,
  copy,
  lang,
}: ArtistGenreProfileProps) {
  const headingId = useId();
  const [bundle, setBundle] = useState<GenreKnowledgeBundle | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void loadGenreKnowledge()
      .then(value => {
        if (active) setBundle(value);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const resolved = useMemo(
    () => bundle ? resolveArtistGenreKnowledge(bundle, artistName) : null,
    [artistName, bundle],
  );
  const familyId = resolved?.chartFamilyId ?? canonicalGenreFamily(fallbackFamily);
  const family = genreFamilyLabel(familyId, lang);
  const accepted = resolved?.accepted.slice(0, MAX_ARTIST_GENRE_TAGS) ?? [];
  const candidates = resolved?.candidates.slice(0, MAX_ARTIST_GENRE_TAGS) ?? [];
  const hiddenCandidateCount = Math.max(0, (resolved?.candidates.length ?? 0) - candidates.length);
  const status = !bundle
    ? loadFailed ? copy.unavailable : copy.genreKnowledgeLoading
    : accepted.length
      ? copy.genreStatusDocumented
      : candidates.length
        ? copy.genreStatusSuggested
        : copy.genreStatusUnclassified;
  const statusKind = !bundle
    ? 'pending'
    : accepted.length
      ? 'documented'
      : candidates.length
        ? 'suggested'
        : 'unclassified';

  return (
    <section
      className="artist-atlas__genre-profile"
      aria-labelledby={headingId}
      data-genre-status={statusKind}
      data-testid="artist-genre-profile"
    >
      <div className="artist-atlas__genre-heading">
        <div>
          <Tags className="h-4 w-4" aria-hidden="true" />
          <h5 id={headingId}>{copy.genres}</h5>
        </div>
        <span className="artist-atlas__genre-status">
          {accepted.length ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {status}
        </span>
      </div>

      <dl className="artist-atlas__genre-family">
        <div>
          <dt>{copy.genreFamily}</dt>
          <dd><bdi dir="auto">{family}</bdi></dd>
        </div>
      </dl>

      {!bundle && !loadFailed ? (
        <p className="artist-atlas__genre-state" role="status">{copy.genreKnowledgeLoading}</p>
      ) : null}
      {loadFailed ? (
        <p className="artist-atlas__genre-state" role="status">{copy.genreKnowledgeUnavailable}</p>
      ) : null}

      {accepted.length ? (
        <div className="artist-atlas__genre-group">
          <p>{copy.documentedGenres}</p>
          <div className="artist-atlas__tag-cloud artist-atlas__tag-cloud--accepted">
            {accepted.map(({ assertion, term }) => (
              <span key={assertion.id}><bdi dir="auto">{term.canonicalName}</bdi></span>
            ))}
          </div>
        </div>
      ) : null}

      {candidates.length ? (
        <div className="artist-atlas__genre-group">
          <p>{copy.suggestedGenres}</p>
          <div className="artist-atlas__tag-cloud artist-atlas__tag-cloud--candidate">
            {candidates.map(({ assertion, term }) => (
              <span key={assertion.id}><bdi dir="auto">{term.canonicalName}</bdi></span>
            ))}
          </div>
          <small>{copy.suggestedGenresNote}</small>
          {hiddenCandidateCount ? (
            <small className="artist-atlas__genre-more">
              {copy.moreGenreSuggestions(hiddenCandidateCount)}
            </small>
          ) : null}
        </div>
      ) : null}

      {bundle && !accepted.length && !candidates.length ? (
        <p className="artist-atlas__genre-state">{copy.genreUnclassified}</p>
      ) : null}

      <div className="artist-atlas__emotional-layer">
        <div>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <p>{copy.emotionalReading}</p>
        </div>
        <span><bdi dir="auto">{emotionalLabel}</bdi></span>
        <small>{copy.emotionalReadingNote}</small>
      </div>
    </section>
  );
}
