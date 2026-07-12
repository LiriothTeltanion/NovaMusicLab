export interface CoreMetrics {
  total_plays: number;
  unique_artists: number;
  unique_tracks: number;
  unique_albums: number;
  listening_minutes: number;
  listening_hours: number;
  listening_days: number;
  active_days: number;
  max_year: number | string;
  match_rate_pct: number;
}

export type PlaySource = 'lastfm' | 'spotify' | 'youtube' | 'apple_music' | 'listenbrainz' | 'merged' | 'unknown';

export interface MonthlyActivity {
  year: number;
  month: number; // 0-11
  plays: number;
}

export interface PlatformPlay {
  platform: string;
  plays: number;
}

export interface SourceSummary {
  source_type: PlaySource;
  lastfm_plays: number;
  spotify_plays: number;
  youtube_plays: number;
  apple_music_plays: number;
  listenbrainz_plays: number;
  merged_plays: number;
  spotify_skips: number;
  spotify_skip_rate_pct: number;
  spotify_short_plays: number;
  spotify_short_play_rate_pct: number;
  overlap_unique_tracks: number;
  /** Same-listen events reported by two sources at once, collapsed to one during merge. */
  cross_source_duplicates?: number;
  source_note: string;
}

export interface ArtistKnowledgeMatch {
  name: string;
  plays: number;
  rank: number;
  matchedName?: string;
  mbid?: string;
  tags: string[];
  releaseGroupCount: number;
}

export type ArtistEnrichmentGap =
  | 'missing_profile'
  | 'missing_wikidata'
  | 'missing_description'
  | 'missing_member_or_role'
  | 'missing_website'
  | 'missing_image'
  | 'missing_releases'
  | 'curated_needs_catalog_match';

export type ArtistEnrichmentPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ArtistEnrichmentQueueItem {
  name: string;
  rank: number;
  plays: number;
  score: number;
  priority: ArtistEnrichmentPriority;
  profileStatus: 'missing' | 'curated' | 'matched';
  gaps: ArtistEnrichmentGap[];
  releaseGroupCount: number;
  hasWikidata: boolean;
  hasMembersOrRoles: boolean;
  hasOfficialLinks: boolean;
  hasImage: boolean;
}

export interface ArtistKnowledgeSummary {
  source: 'offline_artist_knowledge';
  generated_at: string | null;
  cache_artist_count: number;
  wikidata_profile_count: number;
  wikidata_description_count: number;
  wikidata_website_count: number;
  wikidata_image_count: number;
  total_artists: number;
  matched_artists: number;
  unmatched_artists: number;
  match_rate_pct: number;
  matched_plays: number;
  matched_play_rate_pct: number;
  top_matches: ArtistKnowledgeMatch[];
  top_missing: Array<{
    name: string;
    plays: number;
    rank: number;
  }>;
  enrichment_queue: ArtistEnrichmentQueueItem[];
}

export interface RecordsSummary {
  longest_streak_days: number;
  longest_streak_start?: string;
  longest_streak_end?: string;
  max_day_plays: number;
  max_day_date?: string;
  longest_session_minutes: number;
  longest_session_tracks: number;
  longest_session_start?: string;
  best_session_tracks: number;
  best_session_start?: string;
}

export interface TopArtist {
  name: string;
  plays: number;
  genre: string;
  country: string;
}

export interface TopTrack {
  artist: string;
  title: string;
  plays: number;
  genre: string;
}

export interface TopAlbum {
  artist: string;
  title: string;
  plays: number;
}

export interface TopGenre {
  name: string;
  plays: number;
}

export interface YearlyEra {
  year: number;
  plays: number;
  unique_artists: number;
  unique_tracks: number;
  top_artist: string;
  top_track: string;
  dominant_daypart: string;
  era_label: string;
  era_desc: string;
  diversity_index: number;
}

export interface Session {
  id: number;
  start: string;
  end: string;
  tracks_count: number;
  duration_min: number;
  top_artist: string;
  top_track: string;
  unique_artists: number;
}

export interface Obsession {
  artist: string;
  track: string;
  date: string;
  count: number;
}

export interface CountryPlay {
  country: string;
  plays: number;
}

export interface PersonalityTrait {
  score: number;
  evidence: string;
  artists: string[];
  positive: string;
  shadow: string;
  tip: string;
}

export interface PersonalityMatrix {
  sensibilidad_emocional: PersonalityTrait;
  nostalgia: PersonalityTrait;
  energia: PersonalityTrait;
  oscuridad_estetica: PersonalityTrait;
  creatividad: PersonalityTrait;
  rebeldia: PersonalityTrait;
  futurismo: PersonalityTrait;
}

export interface Archetype {
  name: string;
  desc: string;
  artists: string[];
  tracks: string[];
  color: string;
  aesthetic: string;
  strength: string;
  wound: string;
  advice: string;
}

export interface EpConcept {
  title: string;
  description: string;
  tracklist: string[];
}

export interface ArtistProfile {
  alias: string;
  sound: string;
  tempo: string;
  influences: string[];
  aesthetic: string;
  ep_concept: EpConcept;
  live_show: string;
}

export interface MusicDnaData {
  project: string;
  generated_at: string;
  core_metrics: CoreMetrics;
  top_artists: TopArtist[];
  top_tracks: TopTrack[];
  top_albums: TopAlbum[];
  top_genres: TopGenre[];
  yearly_eras: YearlyEra[];
  sessions: Session[];
  obsessions: Obsession[];
  /**
   * Resolved artist home countries weighted from every counted play in the
   * archive. Plays without a known artist origin are omitted so consumers can
   * report coverage honestly against `core_metrics.total_plays`.
   *
   * This is intentionally separate from `countries`, which records where the
   * listener was connected from (for example, Spotify's `conn_country`). The
   * field is optional so saved archives compiled before this aggregate was
   * introduced remain importable.
   */
  artist_origin_countries?: CountryPlay[];
  countries: CountryPlay[];
  heatmap: number[][]; // 24x7 matrix
  daily_plays?: Record<string, number>;
  monthly_activity?: MonthlyActivity[];
  platform_breakdown?: PlatformPlay[];
  source_summary?: SourceSummary;
  knowledge_summary?: ArtistKnowledgeSummary;
  records?: RecordsSummary;
  /**
   * These three are no longer written by the parser - Personality Radar,
   * Artist Identity, Museum Poster and Hero Section derive them live from
   * top_artists/top_tracks via identityEngine.ts instead, so the content
   * reflects whichever archive is actually loaded. Kept optional only so
   * datasets saved to IndexedDB before this change still deserialize.
   */
  personality_matrix?: PersonalityMatrix;
  archetypes?: Archetype[];
  artist_profile?: ArtistProfile;
}
