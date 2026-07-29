/**
 * @deprecated Legacy journey contract retained for additive preference
 * migration. Do not remove its storage key or reinterpret its room lists until
 * replacement preferences have been verified across existing browsers.
 */
export type ExpeditionJourneyId = 'quick' | 'full' | 'lab';

export const EXPEDITION_JOURNEY_STORAGE_KEY = 'nml_expedition_journey';

export const EXPEDITION_JOURNEY_ROOMS: Record<ExpeditionJourneyId, readonly string[]> = {
  quick: [
    'dashboard',
    'eras',
    'top',
    'personality',
    'emotions',
    'cultural',
    'artist',
    'insights',
    'report',
  ],
  full: [
    'dashboard',
    'aiassistant',
    'eras',
    'top',
    'timecapsule',
    'personality',
    'emotions',
    'cultural',
    'inner',
    'artist',
    'obsessions',
    'insights',
    'achievements',
    'wrapped',
    'pulse',
    'compare',
    'museums',
    'platforms',
    'quality',
    'statsdeep',
    'report',
    'upload',
  ],
  lab: [
    'aiassistant',
    'compare',
    'museums',
    'platforms',
    'quality',
    'statsdeep',
    'report',
    'upload',
  ],
} as const;

export function isExpeditionJourneyId(value: string | null): value is ExpeditionJourneyId {
  return value === 'quick' || value === 'full' || value === 'lab';
}

export function roomIdsForJourney(journey: ExpeditionJourneyId): readonly string[] {
  return EXPEDITION_JOURNEY_ROOMS[journey];
}

export function journeyContainsRoom(journey: ExpeditionJourneyId, roomId: string): boolean {
  return EXPEDITION_JOURNEY_ROOMS[journey].includes(roomId);
}
