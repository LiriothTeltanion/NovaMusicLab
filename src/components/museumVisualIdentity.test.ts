import { describe, expect, it } from 'vitest';

import {
  MUSEUM_CHAPTER_TABS,
  MUSEUM_VISUAL_IDENTITY,
  MOTION_MODES,
  museumVisualFor,
} from './museumVisualIdentity';

describe('Living Sonic Cartography registry', () => {
  it('defines one complete visual identity for every museum chapter', () => {
    expect(MUSEUM_CHAPTER_TABS).toHaveLength(21);

    MUSEUM_CHAPTER_TABS.forEach(id => {
      const visual = MUSEUM_VISUAL_IDENTITY[id];
      expect(visual.palette).toHaveLength(3);
      expect(visual.background.particleCount).toBeLessThanOrEqual(20);
      expect(visual.background.tempo).toBeGreaterThanOrEqual(30);
    });
  });

  it('keeps the three explicit motion tiers and a safe visual fallback', () => {
    expect(MOTION_MODES).toEqual(['expressive', 'calm', 'static']);
    expect(museumVisualFor('not-a-room')).toBe(MUSEUM_VISUAL_IDENTITY.dashboard);
  });
});
