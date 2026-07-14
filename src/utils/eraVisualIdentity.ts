import type { YearlyEra } from '../types';
import { localeFor, type Lang } from './i18n';
import { hashSeed } from './seededRandom';

export type EraMotif = 'orbit' | 'waveform' | 'prism' | 'grid';

export interface EraPalette {
  primary: string;
  secondary: string;
  accent: string;
  primarySoft: string;
  secondarySoft: string;
  deep: string;
}

export type LocalizedSignal = Record<Lang, string>;

export interface EraVisualIdentity {
  palette: EraPalette;
  motif: EraMotif;
  texture: string;
  /** Relative listening volume compared with the busiest era in this archive. */
  intensity: number;
  /** Archive pulse: relative volume weighted with repeat pressure, not audio BPM. */
  energy: number;
  exploration: number;
  fixation: number;
  mood: LocalizedSignal;
  energyBand: LocalizedSignal;
  serial: string;
}

const MOTIFS: EraMotif[] = ['orbit', 'waveform', 'prism', 'grid'];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function normalizedHue(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

type DaypartKey = 'morning' | 'afternoon' | 'lateNight' | 'night' | 'unknown';

function classifyDaypart(daypart: string): DaypartKey {
  const normalized = daypart.toLocaleLowerCase(localeFor('he'));
  // Check late night before morning/night because the Hebrew phrase
  // "לפנות בוקר" contains the word for morning and English "late night"
  // contains night.
  if (
    normalized.includes('madrugada')
    || normalized.includes('late night')
    || normalized.includes('לפנות בוקר')
    || normalized.includes('השעות הקטנות')
  ) return 'lateNight';
  if (normalized.includes('mañana') || normalized.includes('morning') || normalized.includes('בוקר')) return 'morning';
  if (normalized.includes('tarde') || normalized.includes('afternoon') || normalized.includes('אחר הצהריים')) return 'afternoon';
  if (
    normalized.includes('noche')
    || normalized.includes('night')
    || normalized.includes('לילה')
    || normalized.includes('ערב')
  ) return 'night';
  return 'unknown';
}

function daypartHue(daypart: string) {
  const daypartKey = classifyDaypart(daypart);
  if (daypartKey === 'morning') return 34;
  if (daypartKey === 'afternoon') return 184;
  if (daypartKey === 'lateNight') return 226;
  if (daypartKey === 'night') return 286;
  return 198;
}

function buildMood(daypart: string, exploration: number): LocalizedSignal {
  const daypartKey = classifyDaypart(daypart);
  const timeMood: LocalizedSignal = daypartKey === 'morning'
    ? { es: 'Amanecer eléctrico', en: 'Electric dawn', he: 'שחר חשמלי' }
    : daypartKey === 'afternoon'
      ? { es: 'Horizonte solar', en: 'Solar horizon', he: 'אופק שמשי' }
      : daypartKey === 'lateNight'
        ? { es: 'Deriva liminal', en: 'Liminal drift', he: 'שיטוט על הסף' }
        : { es: 'Voltaje nocturno', en: 'Nocturnal voltage', he: 'מתח לילי' };

  const listeningMode: LocalizedSignal = exploration >= 42
    ? { es: 'exploración abierta', en: 'open exploration', he: 'חקירה פתוחה' }
    : exploration <= 26
      ? { es: 'órbita obsesiva', en: 'obsessive orbit', he: 'מסלול אובססיבי' }
      : { es: 'foco expansivo', en: 'expansive focus', he: 'מיקוד מתרחב' };

  return {
    es: `${timeMood.es} · ${listeningMode.es}`,
    en: `${timeMood.en} · ${listeningMode.en}`,
    he: `${timeMood.he} · ${listeningMode.he}`,
  };
}

function buildEnergyBand(energy: number): LocalizedSignal {
  if (energy >= 80) return { es: 'Pico monumental', en: 'Monumental peak', he: 'שיא מונומנטלי' };
  if (energy >= 62) return { es: 'Alto voltaje', en: 'High voltage', he: 'מתח גבוה' };
  if (energy >= 44) return { es: 'Corriente sostenida', en: 'Sustained current', he: 'זרם מתמשך' };
  return { es: 'Resplandor íntimo', en: 'Intimate afterglow', he: 'זוהר אינטימי' };
}

function buildTexture(motif: EraMotif, hue: number, secondaryHue: number) {
  const primaryLine = `hsl(${hue} 92% 64% / 0.12)`;
  const secondaryLine = `hsl(${secondaryHue} 88% 62% / 0.09)`;

  switch (motif) {
    case 'orbit':
      return [
        `radial-gradient(circle at 76% 24%, transparent 0 12%, ${primaryLine} 12.2% 12.7%, transparent 13% 20%, ${secondaryLine} 20.2% 20.6%, transparent 21%)`,
        `radial-gradient(circle at 16% 88%, ${secondaryLine} 0 1px, transparent 2px)`,
      ].join(', ');
    case 'waveform':
      return [
        `repeating-linear-gradient(90deg, transparent 0 18px, ${primaryLine} 19px, transparent 20px 38px)`,
        `linear-gradient(18deg, transparent 34%, ${secondaryLine} 35%, transparent 36% 64%, ${primaryLine} 65%, transparent 66%)`,
      ].join(', ');
    case 'prism':
      return [
        `conic-gradient(from 218deg at 78% 24%, transparent 0 18%, ${primaryLine} 18.5% 20%, transparent 20.5% 42%, ${secondaryLine} 42.5% 44%, transparent 44.5%)`,
        `linear-gradient(132deg, transparent 44%, ${primaryLine} 44.5% 45%, transparent 45.5%)`,
      ].join(', ');
    case 'grid':
      return [
        `linear-gradient(${primaryLine} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${secondaryLine} 1px, transparent 1px)`,
      ].join(', ');
  }
}

/**
 * Builds a stable, data-derived art direction for one yearly era. The output
 * intentionally uses listening metadata only: "energy" means archive pulse,
 * never an unsupported claim about a track's acoustic properties.
 */
export function deriveEraVisualIdentity(era: YearlyEra, maxPlays: number): EraVisualIdentity {
  const seed = hashSeed(`${era.year}|${era.top_artist}|${era.top_track}`);
  const exploration = clamp(Math.round(era.diversity_index));
  const fixation = 100 - exploration;
  const intensity = maxPlays > 0 ? clamp(Math.round((era.plays / maxPlays) * 100)) : 0;
  const energy = clamp(Math.round(intensity * 0.82 + fixation * 0.18));
  const hue = normalizedHue(daypartHue(era.dominant_daypart) + ((era.year - 2015) * 17) + (seed % 53) - 26);
  const secondaryHue = normalizedHue(hue + 82 + exploration * 0.7);
  const accentHue = normalizedHue(hue + 168);
  const motif = MOTIFS[seed % MOTIFS.length];

  return {
    palette: {
      primary: `hsl(${hue} 92% 64%)`,
      secondary: `hsl(${secondaryHue} 88% 62%)`,
      accent: `hsl(${accentHue} 90% 68%)`,
      primarySoft: `hsl(${hue} 92% 64% / 0.18)`,
      secondarySoft: `hsl(${secondaryHue} 88% 62% / 0.14)`,
      deep: `hsl(${normalizedHue(hue + 8)} 58% 5%)`,
    },
    motif,
    texture: buildTexture(motif, hue, secondaryHue),
    intensity,
    energy,
    exploration,
    fixation,
    mood: buildMood(era.dominant_daypart, exploration),
    energyBand: buildEnergyBand(energy),
    serial: `${String(era.year).slice(-2)}.${String(seed % 1000).padStart(3, '0')}`,
  };
}
