import { Database, HardDrive, LockKeyhole, RadioTower } from 'lucide-react';

import type { MusicDnaData } from '../../types';
import { directionFor, localeFor, pickLanguage, type Lang } from '../../utils/i18n';

interface ArchiveCapsuleProps {
  data: MusicDnaData;
  isPersonalArchive: boolean;
  isPersisted: boolean;
  lang: Lang;
  savedAt: string | null;
  sourceLabel: string | null;
  onOpenArchive: () => void;
}

function formatArchiveDate(value: string | null, lang: Lang, unavailable: string): string {
  if (!value) return unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unavailable;

  return date.toLocaleDateString(localeFor(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function sourceName(data: MusicDnaData, sourceLabel: string | null, fallback: string, merged: string): string {
  if (sourceLabel?.trim()) return sourceLabel.trim();
  const source = data.source_summary?.source_type;
  if (!source || source === 'unknown') return fallback;
  if (source === 'apple_music') return 'Apple Music';
  if (source === 'listenbrainz') return 'ListenBrainz';
  if (source === 'lastfm') return 'Last.fm';
  if (source === 'youtube') return 'YouTube';
  if (source === 'spotify') return 'Spotify';
  return merged;
}

export default function ArchiveCapsule({
  data,
  isPersonalArchive,
  isPersisted,
  lang,
  savedAt,
  sourceLabel,
  onOpenArchive,
}: ArchiveCapsuleProps) {
  const copy = pickLanguage(lang, {
    en: {
      label: 'Active archive capsule',
      mode: 'Mode',
      source: 'Source',
      date: 'Date',
      privacy: 'Privacy',
      state: 'Local state',
      flagship: 'Flagship exhibition',
      personal: 'My museum',
      bundled: 'Bundled',
      saved: 'Saved',
      tabOnly: 'Tab only',
      local: 'Local only',
      publicBundle: 'Reviewed public bundle',
      publicShort: 'Public',
      localShort: 'Local',
      curated: 'Curated bundle',
      merged: 'Merged archive',
      unavailable: 'Unavailable',
      open: 'Open archive controls',
    },
    es: {
      label: 'Cápsula del archivo activo',
      mode: 'Modo',
      source: 'Fuente',
      date: 'Fecha',
      privacy: 'Privacidad',
      state: 'Estado local',
      flagship: 'Exposición principal',
      personal: 'Mi museo',
      bundled: 'Incluido',
      saved: 'Guardado',
      tabOnly: 'Solo pestaña',
      local: 'Solo local',
      publicBundle: 'Paquete público revisado',
      publicShort: 'Público',
      localShort: 'Local',
      curated: 'Paquete curado',
      merged: 'Archivo combinado',
      unavailable: 'No disponible',
      open: 'Abrir controles del archivo',
    },
    he: {
      label: 'קפסולת הארכיון הפעיל',
      mode: 'מצב',
      source: 'מקור',
      date: 'תאריך',
      privacy: 'פרטיות',
      state: 'מצב מקומי',
      flagship: 'תערוכת הדגל',
      personal: 'המוזיאון שלי',
      bundled: 'כלול באפליקציה',
      saved: 'שמור',
      tabOnly: 'בכרטיסייה בלבד',
      local: 'מקומי בלבד',
      publicBundle: 'חבילה ציבורית שנבדקה',
      publicShort: 'ציבורי',
      localShort: 'מקומי',
      curated: 'חבילה אוצרותית',
      merged: 'ארכיון משולב',
      unavailable: 'לא זמין',
      open: 'פתיחת פקדי הארכיון',
    },
  });
  const archiveDate = formatArchiveDate(savedAt ?? data.generated_at, lang, copy.unavailable);
  const localState = isPersonalArchive ? (isPersisted ? copy.saved : copy.tabOnly) : copy.bundled;
  const privacyState = isPersonalArchive ? copy.local : copy.publicBundle;
  const archiveSource = sourceName(data, sourceLabel, copy.curated, copy.merged);
  const modeState = isPersonalArchive ? copy.personal : copy.flagship;
  const accessibleSummary = `${copy.open}. ${copy.mode}: ${modeState}. ${copy.source}: ${archiveSource}. ${copy.date}: ${archiveDate}. ${copy.privacy}: ${privacyState}. ${copy.state}: ${localState}.`;

  return (
    <button
      type="button"
      className="archive-capsule"
      onClick={onOpenArchive}
      aria-label={accessibleSummary}
      title={accessibleSummary}
      dir={directionFor(lang)}
      data-testid="archive-capsule"
      data-archive-mode={isPersonalArchive ? 'personal' : 'flagship'}
      data-persisted={isPersisted ? 'true' : 'false'}
    >
      <span className="archive-capsule__signal" aria-hidden="true">
        <RadioTower className="h-4 w-4" />
      </span>
      <span className="archive-capsule__details" aria-hidden="true">
        <span className="archive-capsule__detail">
          <span className="archive-capsule__term"><Database className="h-3 w-3" />{copy.mode}</span>
          <span className="archive-capsule__value">{modeState}</span>
        </span>
        <span className="archive-capsule__detail">
          <span className="archive-capsule__term">{copy.source}</span>
          <span className="archive-capsule__value">{archiveSource}</span>
        </span>
        <span className="archive-capsule__detail">
          <span className="archive-capsule__term">{copy.date}</span>
          <span className="archive-capsule__value"><bdi dir="ltr">{archiveDate}</bdi></span>
        </span>
        <span className="archive-capsule__detail">
          <span className="archive-capsule__term"><LockKeyhole className="h-3 w-3" />{copy.privacy}</span>
          <span className="archive-capsule__value">{privacyState}</span>
        </span>
        <span className="archive-capsule__detail">
          <span className="archive-capsule__term"><HardDrive className="h-3 w-3" />{copy.state}</span>
          <span className="archive-capsule__value">{localState}</span>
        </span>
      </span>
      <span className="archive-capsule__compact-status" data-testid="archive-compact-status" aria-hidden="true">
        <strong>{isPersonalArchive ? copy.localShort : copy.publicShort}</strong>
        <small>{localState}</small>
      </span>
    </button>
  );
}
