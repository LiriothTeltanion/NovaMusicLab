import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Map as MapIcon, X } from 'lucide-react';
import { directionFor, type Lang } from '../utils/i18n';

import './MuseumRoomNavigator.css';

export interface MuseumRoomItem {
  id: string;
  label: string;
  groupLabel: string;
  color: string;
  secondary: string;
  icon: ElementType;
  isChapter: boolean;
}

export interface MuseumRoomProgress {
  chapterIndex: number;
  chapterTotal: number;
  code: string;
  ratio: number;
}

interface RoomNavigatorProps {
  items: MuseumRoomItem[];
  activeId: string;
  lang: Lang;
  onNavigate: (id: string) => void;
}

const copy: Record<Lang, {
  chapter: string;
  utility: string;
  previous: string;
  next: string;
  openMap: string;
  closeMap: string;
  roomMap: string;
  active: string;
}> = {
  es: {
    chapter: 'Capítulo',
    utility: 'Acceso',
    previous: 'Sala anterior',
    next: 'Sala siguiente',
    openMap: 'Abrir mapa de salas',
    closeMap: 'Cerrar mapa de salas',
    roomMap: 'Mapa de salas',
    active: 'Sala activa',
  },
  en: {
    chapter: 'Chapter',
    utility: 'Access',
    previous: 'Previous room',
    next: 'Next room',
    openMap: 'Open room map',
    closeMap: 'Close room map',
    roomMap: 'Room map',
    active: 'Active room',
  },
  he: {
    chapter: 'פרק',
    utility: 'גישה',
    previous: 'החדר הקודם',
    next: 'החדר הבא',
    openMap: 'פתיחת מפת החדרים',
    closeMap: 'סגירת מפת החדרים',
    roomMap: 'מפת החדרים',
    active: 'החדר הפעיל',
  },
};

export function getMuseumRoomProgress(items: MuseumRoomItem[], activeId: string): MuseumRoomProgress {
  const chapters = items.filter(item => item.isChapter);
  const chapterIndex = chapters.findIndex(item => item.id === activeId);

  if (chapterIndex < 0) {
    return {
      chapterIndex,
      chapterTotal: chapters.length,
      code: 'UTIL',
      ratio: 1,
    };
  }

  return {
    chapterIndex,
    chapterTotal: chapters.length,
    code: `CH-${String(chapterIndex + 1).padStart(2, '0')}`,
    ratio: (chapterIndex + 1) / Math.max(chapters.length, 1),
  };
}

function RoomProgressText({ progress, lang }: { progress: MuseumRoomProgress; lang: Lang }) {
  if (progress.chapterIndex < 0) {
    return <>{copy[lang].utility}</>;
  }

  return (
    <>
      {copy[lang].chapter}{' '}
      <bdi dir="ltr">{progress.chapterIndex + 1} / {progress.chapterTotal}</bdi>
    </>
  );
}

/** A short, pointer-free chromatic cue that connects one museum room to the next. */
export function MuseumRoomTransition({ items, activeId }: Pick<RoomNavigatorProps, 'items' | 'activeId'>) {
  const reduceMotion = Boolean(useReducedMotion());
  const activeItem = items.find(item => item.id === activeId);
  const progress = getMuseumRoomProgress(items, activeId);

  if (!activeItem || reduceMotion) return null;

  const Icon = activeItem.icon;

  return (
    <div className="museum-room-transition" aria-hidden="true" data-testid="room-transition">
      <AnimatePresence initial={false}>
        <motion.div
          key={activeItem.id}
          className="museum-room-transition__wash"
          initial={{ opacity: 0, x: '-16%', scaleX: 0.72 }}
          animate={{ opacity: [0, 0.78, 0], x: ['-16%', '0%', '10%'], scaleX: [0.72, 1.04, 1.12] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.56, times: [0, 0.28, 1], ease: 'easeOut' }}
          style={{
            background: `linear-gradient(105deg, transparent 2%, ${activeItem.color}38 38%, ${activeItem.secondary}24 62%, transparent 96%)`,
          }}
        />
      </AnimatePresence>
      <AnimatePresence initial={false}>
        <motion.div
          key={`${activeItem.id}-sigil`}
          className="museum-room-transition__sigil"
          initial={{ opacity: 0, y: 7, scale: 0.94 }}
          animate={{ opacity: [0, 0.92, 0], y: [7, 0, -4], scale: [0.94, 1, 1.02] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.48, times: [0, 0.24, 1], ease: 'easeOut' }}
          style={{ color: activeItem.color, borderColor: `${activeItem.color}55` }}
        >
          <Icon className="h-3.5 w-3.5" />
          <span dir="ltr">{progress.code}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The same grouped room grid used by the mobile map overlay, reused by the desktop dropdown below. */
function RoomMapGrid({
  groupedItems,
  activeId,
  items,
  onNavigate,
}: {
  groupedItems: Array<[string, MuseumRoomItem[]]>;
  activeId: string;
  items: MuseumRoomItem[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="museum-mobile-map__groups">
      {groupedItems.map(([groupLabel, groupItems]) => (
        <section key={groupLabel}>
          <h2>{groupLabel}</h2>
          <div className="museum-mobile-map__grid">
            {groupItems.map(item => {
              const ItemIcon = item.icon;
              const active = item.id === activeId;
              const itemProgress = getMuseumRoomProgress(items, item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  style={{ '--item-color': item.color, '--item-secondary': item.secondary } as React.CSSProperties}
                >
                  <span className="museum-mobile-map__icon" aria-hidden="true">
                    <ItemIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="museum-mobile-map__code" dir="ltr">{itemProgress.code}</span>
                    <strong>{item.label}</strong>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function useGroupedRoomItems(items: MuseumRoomItem[]) {
  return useMemo(() => {
    const groups = new Map<string, MuseumRoomItem[]>();
    items.forEach(item => {
      const groupItems = groups.get(item.groupLabel) ?? [];
      groupItems.push(item);
      groups.set(item.groupLabel, groupItems);
    });
    return Array.from(groups.entries());
  }, [items]);
}

function useRoomMapFocus(
  open: boolean,
  close: () => void,
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  mapRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() => {
      const initialTarget = mapRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
        ?? mapRef.current?.querySelector<HTMLElement>('button');
      initialTarget?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, mapRef, open, triggerRef]);
}

/**
 * Desktop orientation rail: chapter code, current room and whole-museum
 * progress - same navigation the mobile dock offers (step to the previous/
 * next room, or jump anywhere via the grouped room map), just laid out for
 * a wide screen instead of a fixed bottom dock.
 */
export function MuseumRoomProgressRail({ items, activeId, lang, onNavigate }: RoomNavigatorProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [mapOpen, setMapOpen] = useState(false);
  const activeIndex = items.findIndex(item => item.id === activeId);
  const activeItem = items[activeIndex];
  const progress = getMuseumRoomProgress(items, activeId);
  const groupedItems = useGroupedRoomItems(items);
  const mapTriggerRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const previousActiveIdRef = useRef(activeId);

  const closeMap = useCallback(() => setMapOpen(false), []);
  const closeMapAndRestoreFocus = useCallback(() => {
    setMapOpen(false);
    window.requestAnimationFrame(() => mapTriggerRef.current?.focus({ preventScroll: true }));
  }, []);
  const navigateFromMap = useCallback((id: string) => {
    setMapOpen(false);
    onNavigate(id);
    window.requestAnimationFrame(() => mapTriggerRef.current?.focus({ preventScroll: true }));
  }, [onNavigate]);

  useRoomMapFocus(mapOpen, closeMap, mapTriggerRef, mapRef);

  useEffect(() => {
    const changed = previousActiveIdRef.current !== activeId;
    previousActiveIdRef.current = activeId;
    if (changed && mapOpen) closeMapAndRestoreFocus();
  }, [activeId, closeMapAndRestoreFocus, mapOpen]);

  if (!activeItem) return null;

  const Icon = activeItem.icon;
  const previousItem = activeIndex > 0 ? items[activeIndex - 1] : null;
  const nextItem = activeIndex < items.length - 1 ? items[activeIndex + 1] : null;
  const PreviousIcon = lang === 'he' ? ChevronRight : ChevronLeft;
  const NextIcon = lang === 'he' ? ChevronLeft : ChevronRight;

  return (
    <section
      className="museum-room-progress hidden md:block"
      style={{
        '--room-color': activeItem.color,
        '--room-secondary': activeItem.secondary,
        '--room-progress': `${progress.ratio * 100}%`,
      } as React.CSSProperties}
      aria-label={`${copy[lang].active}: ${activeItem.label}`}
      data-testid="room-progress"
      dir={directionFor(lang)}
    >
      <div className="museum-room-progress__row">
        <button
          type="button"
          className="museum-room-progress__step"
          onClick={() => previousItem && onNavigate(previousItem.id)}
          disabled={!previousItem}
          aria-label={previousItem ? `${copy[lang].previous}: ${previousItem.label}` : copy[lang].previous}
        >
          <PreviousIcon className="h-3.5 w-3.5" />
        </button>

        <button
          ref={mapTriggerRef}
          type="button"
          className="museum-room-progress__active"
          onClick={() => mapOpen ? closeMapAndRestoreFocus() : setMapOpen(true)}
          aria-expanded={mapOpen}
          aria-controls="desktop-room-map"
          aria-haspopup="dialog"
          aria-label={`${mapOpen ? copy[lang].closeMap : copy[lang].openMap}: ${activeItem.label}`}
        >
          <span className="museum-room-progress__icon" aria-hidden="true">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="museum-room-progress__code" dir="ltr">{progress.code}</span>
          <span className="museum-room-progress__divider" aria-hidden="true" />
          <span className="min-w-0">
            <span className="museum-room-progress__group">{activeItem.groupLabel}</span>
            <strong className="museum-room-progress__label">{activeItem.label}</strong>
          </span>
          <span className="museum-room-progress__track" aria-hidden="true">
            <span />
          </span>
          <span className="museum-room-progress__count">
            <RoomProgressText progress={progress} lang={lang} />
          </span>
          <MapIcon className="museum-room-progress__map-icon h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="museum-room-progress__step"
          onClick={() => nextItem && onNavigate(nextItem.id)}
          disabled={!nextItem}
          aria-label={nextItem ? `${copy[lang].next}: ${nextItem.label}` : copy[lang].next}
        >
          <NextIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {mapOpen && (
          <motion.section
            ref={mapRef}
            id="desktop-room-map"
            className="museum-room-map-desktop"
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
            aria-label={copy[lang].roomMap}
            role="dialog"
          >
            <RoomMapGrid groupedItems={groupedItems} items={items} activeId={activeId} onNavigate={navigateFromMap} />
          </motion.section>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Compact mobile room dock with previous/next controls and an on-demand room map. */
export function MobileMuseumRoomDock({ items, activeId, lang, onNavigate }: RoomNavigatorProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [mapOpen, setMapOpen] = useState(false);
  const activeIndex = items.findIndex(item => item.id === activeId);
  const activeItem = items[activeIndex];
  const progress = getMuseumRoomProgress(items, activeId);
  const groupedItems = useGroupedRoomItems(items);
  const mapTriggerRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const previousActiveIdRef = useRef(activeId);

  const closeMap = useCallback(() => setMapOpen(false), []);
  const closeMapAndRestoreFocus = useCallback(() => {
    setMapOpen(false);
    window.requestAnimationFrame(() => mapTriggerRef.current?.focus({ preventScroll: true }));
  }, []);
  const navigateFromMap = useCallback((id: string) => {
    setMapOpen(false);
    onNavigate(id);
    window.requestAnimationFrame(() => mapTriggerRef.current?.focus({ preventScroll: true }));
  }, [onNavigate]);

  useRoomMapFocus(mapOpen, closeMap, mapTriggerRef, mapRef);

  useEffect(() => {
    const changed = previousActiveIdRef.current !== activeId;
    previousActiveIdRef.current = activeId;
    if (changed && mapOpen) closeMapAndRestoreFocus();
  }, [activeId, closeMapAndRestoreFocus, mapOpen]);

  if (!activeItem) return null;

  const ActiveIcon = activeItem.icon;
  const previousItem = activeIndex > 0 ? items[activeIndex - 1] : null;
  const nextItem = activeIndex < items.length - 1 ? items[activeIndex + 1] : null;
  const PreviousIcon = lang === 'he' ? ChevronRight : ChevronLeft;
  const NextIcon = lang === 'he' ? ChevronLeft : ChevronRight;

  return (
    <div
      className="museum-mobile-navigation md:hidden"
      style={{
        '--room-color': activeItem.color,
        '--room-secondary': activeItem.secondary,
        '--room-progress': `${progress.ratio * 100}%`,
      } as React.CSSProperties}
      dir={directionFor(lang)}
    >
      <AnimatePresence>
        {mapOpen && (
          <motion.section
            ref={mapRef}
            id="mobile-room-map"
            className="museum-mobile-map"
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            aria-label={copy[lang].roomMap}
            role="dialog"
          >
            <header className="museum-mobile-map__header">
              <span>
                <span className="museum-mobile-map__eyebrow" dir="ltr">NOVA · {progress.code}</span>
                <strong>{copy[lang].roomMap}</strong>
              </span>
              <button type="button" onClick={closeMapAndRestoreFocus} aria-label={copy[lang].closeMap}>
                <X className="h-4 w-4" />
              </button>
            </header>

            <RoomMapGrid groupedItems={groupedItems} items={items} activeId={activeId} onNavigate={navigateFromMap} />
          </motion.section>
        )}
      </AnimatePresence>

      <nav className="museum-mobile-dock" aria-label={copy[lang].roomMap}>
        <button
          type="button"
          className="museum-mobile-dock__step"
          onClick={() => previousItem && onNavigate(previousItem.id)}
          disabled={!previousItem}
          aria-label={previousItem ? `${copy[lang].previous}: ${previousItem.label}` : copy[lang].previous}
        >
          <PreviousIcon className="h-5 w-5" />
        </button>

        <button
          ref={mapTriggerRef}
          type="button"
          className="museum-mobile-dock__active"
          onClick={() => mapOpen ? closeMapAndRestoreFocus() : setMapOpen(true)}
          aria-expanded={mapOpen}
          aria-controls="mobile-room-map"
          aria-haspopup="dialog"
          aria-label={`${mapOpen ? copy[lang].closeMap : copy[lang].openMap}: ${activeItem.label}`}
        >
          <span className="museum-mobile-dock__active-icon" aria-hidden="true">
            <ActiveIcon className="h-4 w-4" />
          </span>
          <span className="museum-mobile-dock__meta">
            <span><bdi dir="ltr">{progress.code}</bdi> · {activeItem.groupLabel}</span>
            <strong>{activeItem.label}</strong>
          </span>
          <MapIcon className="museum-mobile-dock__map-icon" aria-hidden="true" />
          <span className="museum-mobile-dock__progress" aria-hidden="true"><span /></span>
        </button>

        <button
          type="button"
          className="museum-mobile-dock__step"
          onClick={() => nextItem && onNavigate(nextItem.id)}
          disabled={!nextItem}
          aria-label={nextItem ? `${copy[lang].next}: ${nextItem.label}` : copy[lang].next}
        >
          <NextIcon className="h-5 w-5" />
        </button>
      </nav>
    </div>
  );
}
