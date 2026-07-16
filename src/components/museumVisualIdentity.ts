/**
 * Living Sonic Cartography — the single visual identity registry used by the
 * navigation rail, chapter preludes and the ambient museum renderer.
 *
 * Data colors remain owned by charts and source adapters. These palettes are
 * decorative room identities and must never imply provenance or confidence.
 */

export type MuseumRoomFamily = 'portal' | 'archive' | 'identity' | 'observatory' | 'signal' | 'finale';

export type MuseumChapterTab =
  | 'dashboard'
  | 'aiassistant'
  | 'eras'
  | 'top'
  | 'timecapsule'
  | 'personality'
  | 'emotions'
  | 'cultural'
  | 'inner'
  | 'artist'
  | 'obsessions'
  | 'insights'
  | 'achievements'
  | 'wrapped'
  | 'pulse'
  | 'compare'
  | 'museums'
  | 'platforms'
  | 'quality'
  | 'statsdeep'
  | 'report';

export type MuseumVisualId = MuseumChapterTab | 'hero' | 'upload';

export type MuseumChapterMotif =
  | 'atlas'
  | 'neural'
  | 'timeline'
  | 'crown'
  | 'hourglass'
  | 'orbit'
  | 'wave'
  | 'globe'
  | 'prism'
  | 'star'
  | 'spiral'
  | 'anomaly'
  | 'medal'
  | 'burst'
  | 'signal'
  | 'bridge'
  | 'constellation'
  | 'devices'
  | 'shield'
  | 'spectrum'
  | 'archive';

export type NavIconMotif =
  | 'grid'
  | 'timeline'
  | 'crown'
  | 'pulse'
  | 'orbit'
  | 'spiral'
  | 'globe'
  | 'palette'
  | 'spark'
  | 'stack'
  | 'alert';

export type MotionMode = 'expressive' | 'calm' | 'static';

export const MOTION_MODES = Object.freeze(['expressive', 'calm', 'static'] as const);
export const MOTION_STORAGE_KEY = 'nml_motion_mode';
export const DEFAULT_MOTION_MODE: MotionMode = 'calm';

export interface MuseumVisualIdentity {
  family: MuseumRoomFamily;
  palette: readonly [string, string, string];
  chapterMotif: MuseumChapterMotif;
  navMotif: NavIconMotif;
  background: {
    density: number;
    amplitude: number;
    tempo: number;
    angle: number;
    particleCount: number;
    particleIntensity: 'subtle' | 'medium';
  };
}

export const MUSEUM_VISUAL_IDENTITY: Record<MuseumVisualId, MuseumVisualIdentity> = {
  hero:         { family: 'portal',      palette: ['#2de2e6', '#8b5cf6', '#ec4899'], chapterMotif: 'orbit',         navMotif: 'orbit',    background: { density: 0.40, amplitude: 24, tempo: 44, angle: 12,  particleCount: 20, particleIntensity: 'subtle' } },
  dashboard:    { family: 'observatory', palette: ['#22d3ee', '#818cf8', '#f472b6'], chapterMotif: 'atlas',         navMotif: 'grid',     background: { density: 0.46, amplitude: 20, tempo: 42, angle: -6,  particleCount: 18, particleIntensity: 'subtle' } },
  aiassistant:  { family: 'signal',      palette: ['#a78bfa', '#f72585', '#22d3ee'], chapterMotif: 'neural',        navMotif: 'orbit',    background: { density: 0.48, amplitude: 26, tempo: 40, angle: -12, particleCount: 18, particleIntensity: 'subtle' } },
  eras:         { family: 'archive',     palette: ['#60a5fa', '#f59e0b', '#f472b6'], chapterMotif: 'timeline',      navMotif: 'timeline', background: { density: 0.42, amplitude: 16, tempo: 48, angle: 0,   particleCount: 14, particleIntensity: 'subtle' } },
  top:          { family: 'archive',     palette: ['#facc15', '#f97316', '#ef4444'], chapterMotif: 'crown',         navMotif: 'crown',    background: { density: 0.52, amplitude: 26, tempo: 38, angle: 10,  particleCount: 18, particleIntensity: 'subtle' } },
  timecapsule:  { family: 'archive',     palette: ['#818cf8', '#f472b6', '#38bdf8'], chapterMotif: 'hourglass',     navMotif: 'timeline', background: { density: 0.40, amplitude: 18, tempo: 50, angle: -4,  particleCount: 14, particleIntensity: 'subtle' } },
  personality:  { family: 'identity',    palette: ['#a78bfa', '#22d3ee', '#f0abfc'], chapterMotif: 'orbit',         navMotif: 'orbit',    background: { density: 0.40, amplitude: 28, tempo: 52, angle: -16, particleCount: 16, particleIntensity: 'subtle' } },
  emotions:     { family: 'identity',    palette: ['#fb7185', '#f0abfc', '#818cf8'], chapterMotif: 'wave',          navMotif: 'pulse',    background: { density: 0.56, amplitude: 34, tempo: 42, angle: 18,  particleCount: 20, particleIntensity: 'subtle' } },
  cultural:     { family: 'identity',    palette: ['#34d399', '#38bdf8', '#fbbf24'], chapterMotif: 'globe',         navMotif: 'globe',    background: { density: 0.42, amplitude: 20, tempo: 50, angle: 8,   particleCount: 14, particleIntensity: 'subtle' } },
  inner:        { family: 'identity',    palette: ['#f472b6', '#8b5cf6', '#22d3ee'], chapterMotif: 'prism',         navMotif: 'palette',  background: { density: 0.54, amplitude: 36, tempo: 54, angle: -12, particleCount: 18, particleIntensity: 'subtle' } },
  artist:       { family: 'identity',    palette: ['#fbbf24', '#22d3ee', '#f472b6'], chapterMotif: 'star',          navMotif: 'spark',    background: { density: 0.50, amplitude: 30, tempo: 46, angle: 14,  particleCount: 18, particleIntensity: 'subtle' } },
  obsessions:   { family: 'signal',      palette: ['#fb923c', '#ef4444', '#facc15'], chapterMotif: 'spiral',        navMotif: 'spiral',   background: { density: 0.62, amplitude: 38, tempo: 34, angle: -20, particleCount: 20, particleIntensity: 'subtle' } },
  insights:     { family: 'signal',      palette: ['#f43f5e', '#f97316', '#a78bfa'], chapterMotif: 'anomaly',       navMotif: 'alert',    background: { density: 0.58, amplitude: 28, tempo: 38, angle: -8,  particleCount: 18, particleIntensity: 'subtle' } },
  achievements: { family: 'finale',      palette: ['#f59e0b', '#facc15', '#fb7185'], chapterMotif: 'medal',         navMotif: 'crown',    background: { density: 0.52, amplitude: 28, tempo: 42, angle: 14,  particleCount: 18, particleIntensity: 'subtle' } },
  wrapped:      { family: 'finale',      palette: ['#ec4899', '#facc15', '#8b5cf6'], chapterMotif: 'burst',         navMotif: 'spark',    background: { density: 0.60, amplitude: 36, tempo: 36, angle: 18,  particleCount: 20, particleIntensity: 'medium' } },
  pulse:        { family: 'signal',      palette: ['#22d3ee', '#10b981', '#818cf8'], chapterMotif: 'signal',        navMotif: 'pulse',    background: { density: 0.64, amplitude: 40, tempo: 32, angle: -10, particleCount: 20, particleIntensity: 'medium' } },
  compare:      { family: 'observatory', palette: ['#1DB954', '#e8334a', '#38bdf8'], chapterMotif: 'bridge',        navMotif: 'orbit',    background: { density: 0.46, amplitude: 22, tempo: 44, angle: 4,   particleCount: 16, particleIntensity: 'subtle' } },
  museums:      { family: 'observatory', palette: ['#84cc16', '#0ea5e9', '#f472b6'], chapterMotif: 'constellation', navMotif: 'orbit',    background: { density: 0.48, amplitude: 24, tempo: 46, angle: 7,   particleCount: 16, particleIntensity: 'subtle' } },
  platforms:    { family: 'observatory', palette: ['#38bdf8', '#10b981', '#f59e0b'], chapterMotif: 'devices',       navMotif: 'grid',     background: { density: 0.42, amplitude: 20, tempo: 48, angle: -2,  particleCount: 14, particleIntensity: 'subtle' } },
  quality:      { family: 'observatory', palette: ['#2dd4bf', '#60a5fa', '#a78bfa'], chapterMotif: 'shield',        navMotif: 'grid',     background: { density: 0.34, amplitude: 14, tempo: 56, angle: 0,   particleCount: 12, particleIntensity: 'subtle' } },
  statsdeep:    { family: 'observatory', palette: ['#38bdf8', '#a78bfa', '#f472b6'], chapterMotif: 'spectrum',      navMotif: 'pulse',    background: { density: 0.52, amplitude: 24, tempo: 44, angle: 7,   particleCount: 16, particleIntensity: 'subtle' } },
  report:       { family: 'finale',      palette: ['#c084fc', '#60a5fa', '#fbbf24'], chapterMotif: 'archive',       navMotif: 'stack',    background: { density: 0.36, amplitude: 18, tempo: 58, angle: 5,   particleCount: 12, particleIntensity: 'subtle' } },
  upload:       { family: 'portal',      palette: ['#10b981', '#facc15', '#22d3ee'], chapterMotif: 'archive',       navMotif: 'orbit',    background: { density: 0.30, amplitude: 14, tempo: 58, angle: -3,  particleCount: 10, particleIntensity: 'subtle' } },
};

export const MUSEUM_CHAPTER_TABS = Object.freeze(
  Object.keys(MUSEUM_VISUAL_IDENTITY).filter(
    (id): id is MuseumChapterTab => id !== 'hero' && id !== 'upload',
  ),
);

export function museumVisualFor(id: string): MuseumVisualIdentity {
  return MUSEUM_VISUAL_IDENTITY[id as MuseumVisualId] ?? MUSEUM_VISUAL_IDENTITY.dashboard;
}

export function isMotionMode(value: string | null): value is MotionMode {
  return value !== null && MOTION_MODES.includes(value as MotionMode);
}
