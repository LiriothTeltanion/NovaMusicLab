import { useEffect, useId, useRef, useState } from 'react';
import {
  ChevronDown,
  Database,
  HardDrive,
  LockKeyhole,
  RadioTower,
  Settings2,
} from 'lucide-react';

import { CURRENT_NOVA_VERSION } from '../../releases/currentRelease';
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
  version?: string;
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
  version = CURRENT_NOVA_VERSION,
}: ArchiveCapsuleProps) {
  const [open, setOpen] = useState(false);
  const panelId = `archive-snapshot-${useId().replace(/:/g, '')}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copy = pickLanguage(lang, {
    en: {
      label: 'Active archive snapshot',
      mode: 'Mode',
      source: 'Source',
      date: 'Date',
      privacy: 'Privacy',
      state: 'Local state',
      version: 'Current version',
      flagship: 'Flagship exhibition',
      personal: 'My museum',
      bundled: 'Bundled',
      saved: 'Saved',
      tabOnly: 'Tab only',
      local: 'Local only',
      publicBundle: 'Reviewed public bundle',
      publicShort: 'Public archive',
      localShort: 'Local archive',
      curated: 'Curated bundle',
      merged: 'Merged archive',
      unavailable: 'Unavailable',
      open: 'Show version and archive details',
      close: 'Hide version and archive details',
      manage: 'Manage archive',
    },
    es: {
      label: 'Snapshot del archivo activo',
      mode: 'Modo',
      source: 'Fuente',
      date: 'Fecha',
      privacy: 'Privacidad',
      state: 'Estado local',
      version: 'Versión actual',
      flagship: 'Exposición principal',
      personal: 'Mi museo',
      bundled: 'Incluido',
      saved: 'Guardado',
      tabOnly: 'Solo pestaña',
      local: 'Solo local',
      publicBundle: 'Paquete público revisado',
      publicShort: 'Archivo público',
      localShort: 'Archivo local',
      curated: 'Paquete curado',
      merged: 'Archivo combinado',
      unavailable: 'No disponible',
      open: 'Mostrar versión y detalles del archivo',
      close: 'Ocultar versión y detalles del archivo',
      manage: 'Administrar archivo',
    },
    he: {
      label: 'תמונת מצב של הארכיון הפעיל',
      mode: 'מצב',
      source: 'מקור',
      date: 'תאריך',
      privacy: 'פרטיות',
      state: 'מצב מקומי',
      version: 'גרסה נוכחית',
      flagship: 'תערוכת הדגל',
      personal: 'המוזיאון שלי',
      bundled: 'כלול באפליקציה',
      saved: 'שמור',
      tabOnly: 'בכרטיסייה בלבד',
      local: 'מקומי בלבד',
      publicBundle: 'חבילה ציבורית שנבדקה',
      publicShort: 'ארכיון ציבורי',
      localShort: 'ארכיון מקומי',
      curated: 'חבילה אוצרותית',
      merged: 'ארכיון משולב',
      unavailable: 'לא זמין',
      open: 'הצגת הגרסה ופרטי הארכיון',
      close: 'הסתרת הגרסה ופרטי הארכיון',
      manage: 'ניהול הארכיון',
    },
  });
  const archiveDate = formatArchiveDate(savedAt ?? data.generated_at, lang, copy.unavailable);
  const localState = isPersonalArchive ? (isPersisted ? copy.saved : copy.tabOnly) : copy.bundled;
  const privacyState = isPersonalArchive ? copy.local : copy.publicBundle;
  const archiveSource = sourceName(data, sourceLabel, copy.curated, copy.merged);
  const modeState = isPersonalArchive ? copy.personal : copy.flagship;
  const accessibleSummary = `${copy.version}: ${version}. ${copy.mode}: ${modeState}. ${copy.source}: ${archiveSource}. ${copy.date}: ${archiveDate}. ${copy.privacy}: ${privacyState}. ${copy.state}: ${localState}.`;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="archive-capsule-shell"
      data-testid="archive-capsule"
      data-archive-mode={isPersonalArchive ? 'personal' : 'flagship'}
      data-persisted={isPersisted ? 'true' : 'false'}
      dir={directionFor(lang)}
    >
      <button
        ref={triggerRef}
        type="button"
        className="archive-capsule"
        onClick={() => setOpen(value => !value)}
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={`${open ? copy.close : copy.open}. ${accessibleSummary}`}
        title={accessibleSummary}
        data-testid="archive-capsule-trigger"
      >
        <span className="archive-capsule__signal" aria-hidden="true">
          <RadioTower className="h-4 w-4" />
        </span>
        <span className="archive-capsule__compact-status" data-testid="archive-compact-status" aria-hidden="true">
          <strong dir="ltr">v{version}</strong>
          <small>{isPersonalArchive ? copy.localShort : copy.publicShort}</small>
        </span>
        <ChevronDown
          className="archive-capsule__chevron h-4 w-4"
          data-open={open ? 'true' : 'false'}
          aria-hidden="true"
        />
      </button>

      {open && (
        <section
          id={panelId}
          className="archive-capsule__panel"
          aria-label={copy.label}
          data-testid="archive-capsule-panel"
        >
          <dl className="archive-capsule__details">
            <div className="archive-capsule__detail">
              <dt className="archive-capsule__term">{copy.version}</dt>
              <dd className="archive-capsule__value" dir="ltr">v{version}</dd>
            </div>
            <div className="archive-capsule__detail">
              <dt className="archive-capsule__term"><Database className="h-3 w-3" />{copy.mode}</dt>
              <dd className="archive-capsule__value">{modeState}</dd>
            </div>
            <div className="archive-capsule__detail">
              <dt className="archive-capsule__term">{copy.source}</dt>
              <dd className="archive-capsule__value">{archiveSource}</dd>
            </div>
            <div className="archive-capsule__detail">
              <dt className="archive-capsule__term">{copy.date}</dt>
              <dd className="archive-capsule__value"><bdi dir="ltr">{archiveDate}</bdi></dd>
            </div>
            <div className="archive-capsule__detail">
              <dt className="archive-capsule__term"><LockKeyhole className="h-3 w-3" />{copy.privacy}</dt>
              <dd className="archive-capsule__value">{privacyState}</dd>
            </div>
            <div className="archive-capsule__detail">
              <dt className="archive-capsule__term"><HardDrive className="h-3 w-3" />{copy.state}</dt>
              <dd className="archive-capsule__value">{localState}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="archive-capsule__manage"
            onClick={() => {
              setOpen(false);
              onOpenArchive();
            }}
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            {copy.manage}
          </button>
        </section>
      )}
    </div>
  );
}
