import { describe, expect, it } from 'vitest';
import { fictionalWeeklyPulse } from '../components/__fixtures__/recentPulse';
import {
  isWeeklyPulseSummary,
  resolveWeeklyPulseSummary,
  type WeeklyPulseSummary,
} from './recentPulseSnapshot';

const validSummary = fictionalWeeklyPulse.weekly_summary as WeeklyPulseSummary;

describe('Recent Pulse weekly schema', () => {
  it('accepts the bounded, account-free weekly fixture', () => {
    expect(isWeeklyPulseSummary(validSummary)).toBe(true);
    expect(resolveWeeklyPulseSummary(fictionalWeeklyPulse)).toEqual(validSummary);
  });

  it('rejects unknown account and image fields instead of silently publishing them', () => {
    expect(isWeeklyPulseSummary({
      ...validSummary,
      account: 'fictional-user',
    })).toBe(false);

    expect(isWeeklyPulseSummary({
      ...validSummary,
      top_artists: [
        {
          ...validSummary.top_artists[0],
          image: 'https://example.invalid/artist.jpg',
        },
      ],
    })).toBe(false);
  });

  it('rejects impossible periods, negative counts and unsupported source labels', () => {
    expect(isWeeklyPulseSummary({
      ...validSummary,
      period_start: '2026-04-14',
      period_end: '2026-04-07',
    })).toBe(false);

    expect(isWeeklyPulseSummary({
      ...validSummary,
      counts: {
        ...validSummary.counts,
        scrobbles: -1,
      },
    })).toBe(false);

    expect(isWeeklyPulseSummary({
      ...validSummary,
      source: 'live_lastfm_session',
    })).toBe(false);
  });

  it('rejects contradictory totals, duplicate rankings and incomplete public provenance', () => {
    expect(isWeeklyPulseSummary({
      ...validSummary,
      top_artists: [{ name: 'Neon Orchard', scrobbles: 85 }],
    })).toBe(false);

    expect(isWeeklyPulseSummary({
      ...validSummary,
      top_tracks: [
        validSummary.top_tracks[0],
        { ...validSummary.top_tracks[0], title: ' glass comet ' },
      ],
    })).toBe(false);

    expect(isWeeklyPulseSummary({
      ...validSummary,
      limitations: validSummary.limitations.filter(
        limitation => limitation !== 'official_api_snapshot',
      ),
    })).toBe(false);
  });

  it('fails closed when an optional weekly summary is malformed', () => {
    expect(resolveWeeklyPulseSummary({
      ...fictionalWeeklyPulse,
      weekly_summary: {
        ...validSummary,
        captured_at: 'not-a-date',
      },
    })).toBeNull();
  });
});
