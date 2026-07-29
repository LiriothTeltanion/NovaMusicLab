import type { PulseSnapshot } from '../../utils/recentPulseSnapshot';

/**
 * Invented names and counts only. This fixture never mirrors a real profile,
 * account identifier, Last.fm image or production Recent Pulse value.
 */
export const fictionalWeeklyPulse: PulseSnapshot = {
  synced_at: '2026-04-14',
  source: 'fictional_test_snapshot',
  top_artists: [
    { name: 'Neon Orchard', image: '' },
    { name: 'Paper Satellites', image: '' },
  ],
  top_tracks: [
    { title: 'Glass Comet', artist: 'Neon Orchard', image: '' },
  ],
  recent_tracks: [
    { title: 'Quiet Circuit', artist: 'Paper Satellites', image: '' },
  ],
  weekly_summary: {
    captured_at: '2026-04-14T18:30:00Z',
    period_start: '2026-04-07',
    period_end: '2026-04-13',
    source: 'lastfm_api',
    counts: {
      scrobbles: 84,
      artists: 19,
      tracks: 52,
      albums: null,
    },
    top_artists: [
      { name: 'Neon Orchard', scrobbles: 18 },
      { name: 'Paper Satellites', scrobbles: 12 },
      { name: 'Velvet Geometry', scrobbles: 9 },
    ],
    top_tracks: [
      { title: 'Glass Comet', artist: 'Neon Orchard', scrobbles: 7 },
      { title: 'Quiet Circuit', artist: 'Paper Satellites', scrobbles: 5 },
      { title: 'Second Sunrise', artist: 'Velvet Geometry', scrobbles: 4 },
    ],
    limitations: [
      'point_in_time_capture',
      'official_api_snapshot',
      'not_complete_history',
      'album_count_unavailable',
      'rankings_may_change',
    ],
  },
};
