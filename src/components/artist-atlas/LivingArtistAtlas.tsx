import React, { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Disc3,
  ExternalLink,
  Globe2,
  Headphones,
  Library,
  ListMusic,
  LoaderCircle,
  MapPin,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  buildArtistMoodProfile,
  buildEmotionalMapEngineProfile,
  EMOTIONAL_MOOD_TAXONOMY,
} from '../../engines/emotionalEngine';
import { useExperienceDepth } from '../../context/ExperienceContext';
import type { MusicDnaData, TopAlbum, TopTrack } from '../../types';
import { normalizeGenre } from '../../utils/analytics';
import {
  getArchiveNeighbors,
  getDocumentedArtistConnections,
} from '../../utils/artistConnections';
import type { ArtistEnrichment } from '../../utils/artistEnrichment';
import { getArtistGallery } from '../../utils/artistGallery';
import { canonicalArtistName } from '../../utils/artistIdentity';
import { normalizeCatalogName } from '../../utils/catalogName';
import { genreFamilyLabel } from '../../utils/genreTaxonomy';
import { localeFor } from '../../utils/i18n';
import {
  buildArtistMediaProfile,
  getWikipediaUrl,
} from '../../utils/mediaLinks';
import { getOfflineArtistKnowledge } from '../../utils/offlineArtistKnowledge';
import { useApp } from '../../context/AppContext';
import ArtistAvatar from '../ArtistAvatar';
import BrandIcon from '../BrandIcon';
import CoverArt from '../CoverArt';
import ArtistEvidencePanel from './ArtistEvidencePanel';
import ArtistGenreProfile from './ArtistGenreProfile';
import ArtistMediaStage from './ArtistMediaStage';
import BandLineup from './BandLineup';
import { getArtistAtlasCopy } from './atlasCopy';
import './artistAtlas.css';

const MediaEmbedHub = lazy(() => import('../MediaEmbedHub'));

let artistEnrichmentModulePromise: Promise<typeof import('../../utils/artistEnrichment')> | undefined;

function loadFlagshipArtistEnrichment() {
  if (!artistEnrichmentModulePromise) {
    artistEnrichmentModulePromise = import('../../utils/artistEnrichment').catch(error => {
      artistEnrichmentModulePromise = undefined;
      throw error;
    });
  }
  return artistEnrichmentModulePromise;
}

interface LivingArtistAtlasProps {
  data: MusicDnaData;
}

function sameArtist(left: string, right: string) {
  return normalizeCatalogName(canonicalArtistName(left)) === normalizeCatalogName(canonicalArtistName(right));
}

function releaseYear(date?: string) {
  return date?.match(/^\d{4}/)?.[0];
}

function findArchiveAlbum(releaseTitle: string, albums: TopAlbum[]) {
  const releaseKey = normalizeCatalogName(releaseTitle);
  return albums.find(album => normalizeCatalogName(album.title) === releaseKey);
}

function TrackCard({ track, rank, playsLabel, locale }: { track: TopTrack; rank: number; playsLabel: string; locale: string }) {
  return (
    <article className="artist-atlas__catalog-card">
      <CoverArt artist={track.artist} title={track.title} kind="track" size={68} />
      <div className="artist-atlas__catalog-copy">
        <span className="artist-atlas__catalog-rank nova-number-ltr" dir="ltr">#{rank}</span>
        <h4><bdi dir="auto">{track.title}</bdi></h4>
        <p><bdi dir="auto">{track.genre}</bdi></p>
        <strong className="nova-number-ltr" dir="ltr">{track.plays.toLocaleString(locale)} {playsLabel}</strong>
      </div>
    </article>
  );
}

function AlbumCard({ album, rank, playsLabel, locale }: { album: TopAlbum; rank: number; playsLabel: string; locale: string }) {
  return (
    <article className="artist-atlas__catalog-card">
      <CoverArt artist={album.artist} title={album.title} kind="album" size={68} />
      <div className="artist-atlas__catalog-copy">
        <span className="artist-atlas__catalog-rank nova-number-ltr" dir="ltr">#{rank}</span>
        <h4><bdi dir="auto">{album.title}</bdi></h4>
        <p><bdi dir="auto">{album.artist}</bdi></p>
        <strong className="nova-number-ltr" dir="ltr">{album.plays.toLocaleString(locale)} {playsLabel}</strong>
      </div>
    </article>
  );
}

export default function LivingArtistAtlas({ data }: LivingArtistAtlasProps) {
  const {
    lang,
    tc,
    selectedArtistName,
    setSelectedArtistName,
  } = useApp();
  const experienceDepth = useExperienceDepth();
  const copy = getArtistAtlasCopy(lang, experienceDepth);
  const [selectedName, setSelectedName] = useState(() => (
    data.top_artists.find(artist => sameArtist(artist.name, selectedArtistName))?.name
      ?? data.top_artists[0]?.name
      ?? ''
  ));
  const [mediaOpenForArtist, setMediaOpenForArtist] = useState<string | null>(null);
  const [artistQuery, setArtistQuery] = useState('');
  const [editorialResult, setEditorialResult] = useState<{
    artistName: string;
    profile: ArtistEnrichment | undefined;
  } | null>(null);
  const loadMediaButtonRef = useRef<HTMLButtonElement>(null);
  const closeMediaButtonRef = useRef<HTMLButtonElement>(null);
  const pendingMediaFocusRef = useRef<'load' | 'close' | null>(null);
  const locale = localeFor(lang);

  useEffect(() => {
    if (!data.top_artists.some(artist => sameArtist(artist.name, selectedName))) {
      const fallbackName = data.top_artists[0]?.name ?? '';
      setSelectedName(fallbackName);
      setSelectedArtistName(fallbackName);
    }
  }, [data.top_artists, selectedName, setSelectedArtistName]);

  useEffect(() => {
    if (!selectedArtistName || sameArtist(selectedArtistName, selectedName)) return;
    const requestedArtist = data.top_artists.find(artist => sameArtist(artist.name, selectedArtistName));
    if (requestedArtist) setSelectedName(requestedArtist.name);
  }, [data.top_artists, selectedArtistName, selectedName]);

  const selectArtist = useCallback((artistName: string) => {
    setSelectedName(artistName);
    setSelectedArtistName(artistName);
  }, [setSelectedArtistName]);

  useEffect(() => {
    setArtistQuery('');
  }, [selectedName]);

  const selectedIndex = Math.max(0, data.top_artists.findIndex(artist => sameArtist(artist.name, selectedName)));
  const selectedArtist = data.top_artists[selectedIndex];
  const featuredArtists = data.top_artists.slice(0, 10);
  const matchingArtists = useMemo(() => {
    const query = normalizeCatalogName(artistQuery);
    return query
      ? data.top_artists.filter(artist => normalizeCatalogName(artist.name).includes(query))
      : data.top_artists;
  }, [artistQuery, data.top_artists]);

  const fallbackMood = useMemo(
    () => buildEmotionalMapEngineProfile(data.top_artists, 24).dominantMood.key,
    [data.top_artists],
  );
  const mediaOpen = Boolean(selectedArtist && mediaOpenForArtist === selectedArtist.name);

  useEffect(() => {
    let active = true;

    if (data.narrative_scope !== 'flagship' || !selectedArtist) {
      return undefined;
    }

    const artistName = selectedArtist.name;
    void loadFlagshipArtistEnrichment()
      .then(module => {
        if (!active) return;
        setEditorialResult({
          artistName,
          profile: module.getArtistEnrichment(artistName),
        });
      })
      .catch(() => {
        if (!active) return;
        setEditorialResult({ artistName, profile: undefined });
      });

    return () => {
      active = false;
    };
  }, [data.narrative_scope, selectedArtist]);

  useLayoutEffect(() => {
    const pendingFocus = pendingMediaFocusRef.current;
    if (!pendingFocus) return;

    pendingMediaFocusRef.current = null;
    const target = pendingFocus === 'close' ? closeMediaButtonRef.current : loadMediaButtonRef.current;
    target?.focus({ preventScroll: true });
  }, [mediaOpen]);

  if (!selectedArtist) {
    return (
      <section className="artist-atlas artist-atlas__empty" aria-labelledby="artist-atlas-title">
        <Sparkles className="h-8 w-8" style={{ color: tc.c1 }} />
        <h2 id="artist-atlas-title">{copy.title}</h2>
        <p>{copy.noBiography}</p>
      </section>
    );
  }

  const artistTracks = data.top_tracks.filter(track => sameArtist(track.artist, selectedArtist.name));
  const artistAlbums = data.top_albums.filter(album => sameArtist(album.artist, selectedArtist.name));
  const knowledge = getOfflineArtistKnowledge(selectedArtist.name);
  const editorialProfile = data.narrative_scope === 'flagship'
    && editorialResult
    && sameArtist(editorialResult.artistName, selectedArtist.name)
    ? editorialResult.profile
    : undefined;
  const gallery = getArtistGallery(selectedArtist.name);
  const musicBeeArtist = data.musicbee_snapshot?.artists.find(artist => (
    sameArtist(artist.name, selectedArtist.name)
  ));
  const mediaProfile = buildArtistMediaProfile(selectedArtist.name, artistTracks[0], artistAlbums[0]);
  const biography = knowledge?.curated?.description ?? knowledge?.wikidata?.description;
  const biographyProvider = knowledge?.curated?.description ? knowledge.curated.sourceName : 'Wikidata';
  const wikipediaUrl = getWikipediaUrl(mediaProfile.curated, lang);
  const officialSite = mediaProfile.curated?.officialSiteUrl ?? knowledge?.wikidata?.officialWebsites?.[0];
  const share = data.core_metrics.total_plays
    ? (selectedArtist.plays / data.core_metrics.total_plays) * 100
    : 0;
  const releases = knowledge?.releaseGroups ?? [];
  const areas = [knowledge?.musicbrainz?.area, knowledge?.musicbrainz?.beginArea, ...(knowledge?.wikidata?.formationPlaces ?? [])]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  const activeYears = knowledge?.curated?.activeYears?.join(' · ')
    ?? [knowledge?.musicbrainz?.lifeSpanBegin, knowledge?.musicbrainz?.lifeSpanEnd]
      .filter(Boolean)
      .join(' — ');
  // Full lineup (current + former) drives the BandLineup section; the flat name
  // list is only the fallback for artists with no MusicBrainz member relations.
  const lineup = knowledge?.bandMembers ?? [];
  const members = knowledge?.bandMembers?.filter(member => member.current).map(member => member.name)
    ?? knowledge?.wikidata?.members
    ?? [];
  const artistMood = buildArtistMoodProfile(selectedArtist);
  const emotionalLabel = EMOTIONAL_MOOD_TAXONOMY[artistMood.moodKey].shortLabel[lang];
  const hasVerifiedMedia = mediaProfile.spotify.verified || mediaProfile.youtube.verified;
  const localizedGenre = genreFamilyLabel(normalizeGenre(selectedArtist.genre), lang);
  const knownPlace = areas[0]
    ?? (!['unknown', 'unavailable'].includes(selectedArtist.country.toLowerCase())
      ? selectedArtist.country
      : undefined);
  const documentedConnections = getDocumentedArtistConnections(data, selectedArtist.name);
  const archiveNeighbors = getArchiveNeighbors(
    data,
    selectedArtist.name,
    documentedConnections.map(connection => connection.artist.name),
  );

  const metrics = [
    { icon: Headphones, label: copy.archivePlays, value: selectedArtist.plays.toLocaleString(locale), color: tc.c1 },
    { icon: Activity, label: copy.archiveShare, value: `${share.toLocaleString(locale, { maximumFractionDigits: 1 })}%`, color: tc.c2 },
    { icon: ListMusic, label: copy.knownTracks, value: artistTracks.length.toLocaleString(locale), color: tc.c3 },
    { icon: Disc3, label: copy.knownAlbums, value: artistAlbums.length.toLocaleString(locale), color: tc.c4 },
  ];

  return (
    <section className="artist-atlas" dir={lang === 'he' ? 'rtl' : 'ltr'} aria-labelledby="artist-atlas-title">
      <div className="artist-atlas__masthead">
        <div>
          <p className="artist-atlas__eyebrow" style={{ color: tc.c1 }}>{copy.eyebrow}</p>
          <h2 id="artist-atlas-title">{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="artist-atlas__search">
          <label htmlFor="artist-atlas-search">{copy.browseAll}</label>
          <span>
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              id="artist-atlas-search"
              type="search"
              value={artistQuery}
              onChange={event => setArtistQuery(event.target.value)}
              placeholder={copy.chooseArtist}
              autoComplete="off"
            />
          </span>
          {artistQuery ? (
            <div className="artist-atlas__search-results">
              {matchingArtists.slice(0, 8).map(artist => (
                <button
                  key={artist.name}
                  type="button"
                  onClick={() => selectArtist(artist.name)}
                >
                  <ArtistAvatar name={artist.name} size={28} tooltip={false} />
                  <span><bdi dir="auto">{artist.name}</bdi></span>
                  <small className="nova-number-ltr" dir="ltr">#{data.top_artists.indexOf(artist) + 1}</small>
                </button>
              ))}
              {matchingArtists.length === 0 ? <p>{copy.unavailable}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="artist-atlas__rail-block">
        <p>{copy.featuredArtists}</p>
        <ul className="artist-atlas__rail" aria-label={copy.featuredArtists}>
          {featuredArtists.map((artist, index) => {
            const active = sameArtist(artist.name, selectedArtist.name);
            return (
              <li key={artist.name}>
                <button
                  type="button"
                  onClick={() => selectArtist(artist.name)}
                  aria-pressed={active}
                  className="artist-atlas__rail-item"
                  style={active ? { borderColor: `${tc.c1}80`, backgroundColor: `${tc.c1}16` } : undefined}
                >
                  <ArtistAvatar name={artist.name} size={38} tooltip={false} priority={index < 3} />
                  <span>
                    <strong><bdi dir="auto">{artist.name}</bdi></strong>
                    <small className="nova-number-ltr" dir="ltr">#{index + 1} · {artist.plays.toLocaleString(locale)}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <article className="artist-atlas__hero nova-on-dark">
        <div className="artist-atlas__hero-copy">
          <div className="artist-atlas__hero-badges">
            <span style={{ color: tc.c1, borderColor: `${tc.c1}45`, backgroundColor: `${tc.c1}15` }}>
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.rank(selectedIndex + 1)}
            </span>
            <span>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {knowledge ? copy.documentedProfile : copy.archiveOnly}
            </span>
          </div>
          <p className="artist-atlas__signal-label">{copy.archiveSignal}</p>
          <h3><bdi dir="auto">{selectedArtist.name}</bdi></h3>
          <div className="artist-atlas__identity-line">
            <span>{copy.genreFamily}: <bdi dir="auto">{localizedGenre}</bdi></span>
            <span><MapPin className="h-3.5 w-3.5" aria-hidden="true" /><bdi dir="auto">{selectedArtist.country}</bdi></span>
          </div>

          <div className="artist-atlas__metrics">
            {metrics.map(({ icon: Icon, label, value, color }) => (
              <div key={label}>
                <Icon className="h-4 w-4" style={{ color }} aria-hidden="true" />
                <span>{label}</span>
                <strong className="nova-number-ltr" dir="ltr">{value}</strong>
              </div>
            ))}
          </div>

          <div className="artist-atlas__bio">
            <div>
              <BookOpen className="h-4 w-4" style={{ color: tc.c2 }} aria-hidden="true" />
              <span>{copy.editorialStory}</span>
            </div>
            <p data-testid="artist-factual-intro">
              {copy.artistIntro(
                selectedArtist.name,
                localizedGenre,
                selectedIndex + 1,
                selectedArtist.plays.toLocaleString(locale),
                knownPlace,
              )}
            </p>
            {editorialProfile ? (
              <>
                <p>{editorialProfile.bio[lang]}</p>
                {experienceDepth === 'guided' ? (
                  <p>
                    <strong>{copy.whyItMatters}: </strong>
                    {editorialProfile.why_it_matters[lang]}
                  </p>
                ) : null}
                <small>{copy.editorialStoryNote}</small>
              </>
            ) : <small>{copy.noBiography}</small>}
          </div>

          {experienceDepth === 'deep-dive' ? (
            <div className="artist-atlas__bio artist-atlas__bio--source">
              <div>
                <Library className="h-4 w-4" style={{ color: tc.c3 }} aria-hidden="true" />
                <span>{copy.archiveBiography}</span>
              </div>
              <p>{biography ?? copy.noBiography}</p>
              {biography ? <small>{copy.biographySource(biographyProvider)}</small> : null}
            </div>
          ) : null}

          {officialSite || wikipediaUrl ? (
            <div className="artist-atlas__official-links">
              {officialSite ? (
                <a href={officialSite} target="_blank" rel="noreferrer">
                  <Globe2 className="h-4 w-4" />{copy.officialSite}<ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {wikipediaUrl ? (
                <a href={wikipediaUrl} target="_blank" rel="noreferrer">
                  <Library className="h-4 w-4" />{copy.wikipedia}<ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <ArtistMediaStage
          artistName={selectedArtist.name}
          photos={gallery}
          fallbackMood={fallbackMood}
          copy={copy}
          accent={tc.c1}
        />
      </article>

      {musicBeeArtist ? (
        <section
          data-testid="artist-musicbee-context"
          className="artist-atlas__chapter artist-atlas__musicbee"
          aria-labelledby="artist-atlas-musicbee"
        >
          <div className="artist-atlas__musicbee-heading">
            <span className="artist-atlas__musicbee-icon" aria-hidden="true">
              <BrandIcon name="musicbee" size={24} />
            </span>
            <div>
              <p className="artist-atlas__eyebrow">{copy.musicBeeEyebrow}</p>
              <h3 id="artist-atlas-musicbee">{copy.musicBeeTitle}</h3>
              <p>{copy.musicBeeBody(
                musicBeeArtist.track_count.toLocaleString(locale),
                musicBeeArtist.album_count.toLocaleString(locale),
              )}</p>
            </div>
          </div>
          <dl className="artist-atlas__musicbee-metrics">
            <div>
              <dt>{copy.musicBeeTracks}</dt>
              <dd className="nova-number-ltr" dir="ltr">{musicBeeArtist.track_count.toLocaleString(locale)}</dd>
            </div>
            <div>
              <dt>{copy.musicBeeAlbums}</dt>
              <dd className="nova-number-ltr" dir="ltr">{musicBeeArtist.album_count.toLocaleString(locale)}</dd>
            </div>
            {experienceDepth === 'deep-dive' ? (
              <>
                <div>
                  <dt>{copy.musicBeePlayCount}</dt>
                  <dd className="nova-number-ltr" dir="ltr">
                    {data.musicbee_snapshot?.capabilities.aggregate_play_counts
                      ? musicBeeArtist.total_play_count.toLocaleString(locale)
                      : copy.unavailable}
                  </dd>
                </div>
                <div>
                  <dt>{copy.musicBeeLastPlayed}</dt>
                  <dd>
                    {data.musicbee_snapshot?.capabilities.last_played
                      ? musicBeeArtist.last_played_at
                        ? new Date(musicBeeArtist.last_played_at).toLocaleDateString(locale)
                        : copy.musicBeeNoLastPlayed
                      : copy.unavailable}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
          <p className="artist-atlas__musicbee-boundary">{copy.musicBeeBoundary}</p>
        </section>
      ) : null}

      {(documentedConnections.length > 0 || archiveNeighbors.length > 0) ? (
        <section className="artist-atlas__chapter artist-atlas__connections" aria-labelledby="artist-atlas-connections">
          <div className="artist-atlas__chapter-heading">
            <div>
              <p className="artist-atlas__eyebrow" style={{ color: tc.c4 }}>{copy.connectionsTitle}</p>
              <h3 id="artist-atlas-connections"><bdi dir="auto">{selectedArtist.name}</bdi></h3>
              <p>{copy.connectionsSubtitle}</p>
            </div>
          </div>

          <div className="artist-atlas__connections-grid">
            {documentedConnections.length ? (
              <div className="artist-atlas__connection-group" data-testid="documented-artist-connections">
                <h4>{copy.documentedConnections}</h4>
                <div className="artist-atlas__connection-list">
                  {documentedConnections.map(connection => {
                    const reason = connection.kind === 'same-identity'
                      ? copy.sameIdentityConnection
                      : copy.sharedMemberConnection(connection.sharedMembers.join(' · '));
                    return (
                      <button
                        key={`${connection.kind}-${connection.artist.name}`}
                        type="button"
                        onClick={() => selectArtist(connection.artist.name)}
                      >
                        <ArtistAvatar name={connection.artist.name} size={44} tooltip={false} />
                        <span>
                          <strong><bdi dir="auto">{connection.artist.name}</bdi></strong>
                          <small>{reason}</small>
                        </span>
                        <ChevronRight className="nova-mirror-rtl h-4 w-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {archiveNeighbors.length ? (
              <div className="artist-atlas__connection-group" data-testid="archive-artist-neighbors">
                <h4>{copy.archiveNeighbors}</h4>
                <p>{copy.archiveNeighborsNote}</p>
                <div className="artist-atlas__connection-list">
                  {archiveNeighbors.map(neighbor => {
                    const reason = neighbor.sharedGenres.length
                      ? copy.sharedStyleConnection(neighbor.sharedGenres.slice(0, 3).join(' · '))
                      : copy.sharedPlaceConnection(selectedArtist.country);
                    return (
                      <button
                        key={neighbor.artist.name}
                        type="button"
                        onClick={() => selectArtist(neighbor.artist.name)}
                      >
                        <ArtistAvatar name={neighbor.artist.name} size={44} tooltip={false} />
                        <span>
                          <strong><bdi dir="auto">{neighbor.artist.name}</bdi></strong>
                          <small>{reason}</small>
                        </span>
                        <ChevronRight className="nova-mirror-rtl h-4 w-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="artist-atlas__chapter" aria-labelledby="artist-atlas-footprint">
        <div className="artist-atlas__chapter-heading">
          <div>
            <p className="artist-atlas__eyebrow" style={{ color: tc.c2 }}>{copy.archiveFootprint}</p>
            <h3 id="artist-atlas-footprint"><bdi dir="auto">{selectedArtist.name}</bdi></h3>
            <p>{copy.archiveFootprintBody}</p>
          </div>
        </div>

        <div className="artist-atlas__footprint-grid">
          <div className="artist-atlas__collection">
            <div className="artist-atlas__subheading">
              <ListMusic className="h-4 w-4" style={{ color: tc.c1 }} />
              <h4>{copy.topTracks}</h4>
            </div>
            {artistTracks.length ? (
              <div className="artist-atlas__catalog-list">
                {artistTracks.slice(0, 4).map((track, index) => (
                  <TrackCard key={`${track.artist}-${track.title}`} track={track} rank={index + 1} playsLabel={copy.plays} locale={locale} />
                ))}
              </div>
            ) : <p className="artist-atlas__muted-state">{copy.noTracks}</p>}
          </div>

          <div className="artist-atlas__collection">
            <div className="artist-atlas__subheading">
              <Disc3 className="h-4 w-4" style={{ color: tc.c2 }} />
              <h4>{copy.topAlbums}</h4>
            </div>
            {artistAlbums.length ? (
              <div className="artist-atlas__catalog-list">
                {artistAlbums.slice(0, 4).map((album, index) => (
                  <AlbumCard key={`${album.artist}-${album.title}`} album={album} rank={index + 1} playsLabel={copy.plays} locale={locale} />
                ))}
              </div>
            ) : <p className="artist-atlas__muted-state">{copy.noAlbums}</p>}
          </div>

          <aside className="artist-atlas__profile-signals">
            <div className="artist-atlas__subheading">
              <Sparkles className="h-4 w-4" style={{ color: tc.c3 }} />
              <h4>{copy.profileSignals}</h4>
            </div>
            <dl>
              <div>
                <dt><MapPin className="h-4 w-4" />{copy.areas}</dt>
                <dd>{areas.length ? areas.join(' · ') : copy.unavailable}</dd>
              </div>
              <div>
                <dt><CalendarDays className="h-4 w-4" />{copy.activeYears}</dt>
                <dd><bdi dir={activeYears ? 'ltr' : 'auto'}>{activeYears || copy.unavailable}</bdi></dd>
              </div>
              {/* The lineup gets its own section below with photos and roles.
                * This row stays only for artists MusicBrainz has no member
                * relations for, where a Wikidata name list is all we have. */}
              {!lineup.length && (
                <div>
                  <dt><Users className="h-4 w-4" />{copy.members}</dt>
                  <dd>{members.length ? members.slice(0, 5).join(' · ') : copy.unavailable}</dd>
                </div>
              )}
            </dl>
            <ArtistGenreProfile
              artistName={selectedArtist.name}
              fallbackFamily={selectedArtist.genre}
              emotionalLabel={emotionalLabel}
              copy={copy}
              lang={lang}
            />

            <BandLineup
              band={selectedArtist.name}
              members={lineup}
              copy={copy}
              accent={tc.c3}
            />
          </aside>
        </div>
      </section>

      <section className="artist-atlas__chapter" aria-labelledby="artist-atlas-discography">
        <div className="artist-atlas__chapter-heading artist-atlas__chapter-heading--inline">
          <div>
            <p className="artist-atlas__eyebrow" style={{ color: tc.c3 }}>{copy.discography}</p>
            <h3 id="artist-atlas-discography">{copy.releasesKnown(releases.length)}</h3>
            <p>{copy.discographyBody}</p>
          </div>
          <Disc3 className="artist-atlas__chapter-icon" style={{ color: tc.c3 }} aria-hidden="true" />
        </div>
        {releases.length ? (
          <div
            className="artist-atlas__release-shelf"
            role="region"
            aria-label={copy.discography}
            tabIndex={0}
          >
            {releases.slice(-8).reverse().map(release => {
              const archiveAlbum = findArchiveAlbum(release.title, artistAlbums);
              return (
                <article key={release.id} className="artist-atlas__release-card">
                  <CoverArt artist={selectedArtist.name} title={release.title} kind="album" size={132} />
                  <div>
                    <span>{release.primaryType || copy.releaseTypeFallback}</span>
                    <h4><bdi dir="auto">{release.title}</bdi></h4>
                    {releaseYear(release.firstReleaseDate) ? (
                      <p className="nova-number-ltr" dir="ltr">{releaseYear(release.firstReleaseDate)}</p>
                    ) : (
                      <p>{copy.dateUnavailable}</p>
                    )}
                    {archiveAlbum ? <strong className="nova-number-ltr" dir="ltr">{archiveAlbum.plays.toLocaleString(locale)} {copy.plays}</strong> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className="artist-atlas__muted-state">{copy.noReleases}</p>}
      </section>

      <section className="artist-atlas__media-gate" aria-labelledby="artist-atlas-media">
        <div className="artist-atlas__media-heading">
          <span className="artist-atlas__icon-box" style={{ color: tc.c2, borderColor: `${tc.c2}45`, backgroundColor: `${tc.c2}15` }}>
            <Headphones className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="artist-atlas__eyebrow" style={{ color: tc.c2 }}>{copy.mediaTitle}</p>
            <h3 id="artist-atlas-media"><bdi dir="auto">{selectedArtist.name}</bdi></h3>
            <p>{copy.mediaSubtitle}</p>
          </div>
          <span className="artist-atlas__media-status" style={{ color: hasVerifiedMedia ? '#4ade80' : tc.c2 }}>
            <BadgeCheck className="h-4 w-4" />
            {hasVerifiedMedia ? copy.verifiedMedia : copy.searchFallback}
          </span>
        </div>

        {!mediaOpen ? (
          <div className="artist-atlas__privacy-gate">
            <ShieldCheck className="h-6 w-6" style={{ color: tc.c1 }} aria-hidden="true" />
            <div>
              <h4>{copy.mediaPrivacyTitle}</h4>
              <p>{copy.mediaPrivacyBody}</p>
            </div>
            <button
              ref={loadMediaButtonRef}
              type="button"
              onClick={() => {
                pendingMediaFocusRef.current = 'close';
                setMediaOpenForArtist(selectedArtist.name);
              }}
              style={{ color: tc.c1, borderColor: `${tc.c1}55`, backgroundColor: `${tc.c1}12` }}
            >
              {copy.loadMedia}<ChevronRight className="nova-mirror-rtl h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="artist-atlas__media-loaded">
            <button
              ref={closeMediaButtonRef}
              type="button"
              onClick={() => {
                pendingMediaFocusRef.current = 'load';
                setMediaOpenForArtist(null);
              }}
              className="artist-atlas__close-media"
            >
              {copy.hideMedia}
            </button>
            <Suspense fallback={(
              <div className="artist-atlas__state-row">
                <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" style={{ color: tc.c2 }} />
                <p>{copy.loadingMedia}</p>
              </div>
            )}>
              <MediaEmbedHub key={selectedArtist.name} profile={mediaProfile} />
            </Suspense>
          </div>
        )}
      </section>

      <ArtistEvidencePanel key={selectedArtist.name} artistName={selectedArtist.name} copy={copy} lang={lang} accent={tc.c1} />
    </section>
  );
}
