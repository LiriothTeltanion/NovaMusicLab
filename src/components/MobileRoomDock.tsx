import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Map as MapIcon, X } from "lucide-react";
import { directionFor } from "../utils/i18n";

import {
  copy,
  getMuseumRoomProgress,
  RoomMapGrid,
  useGroupedRoomItems,
  useRoomMapFocus,
  type RoomNavigatorProps,
} from "./MuseumRoomNavigator";

/**
 * Room-to-room navigation on a phone, in its own module so the landing shell
 * never carries it.
 *
 * The entry budget guards what a visitor pays before anything is on screen, and
 * this dock is by definition not part of that: it only renders once they leave
 * the hero, and only below the md breakpoint. Mounting it from inside
 * MuseumRoomNavigator put its code in the entry chunk - three kilobytes every
 * desktop visitor downloads and never renders - and pushed that chunk three
 * kilobytes over budget. App.tsx loads this lazily instead.
 *
 * Previous/next controls, the active room, and an on-demand room map.
 */
export default function MobileRoomDock({ items, activeId, lang, onNavigate }: RoomNavigatorProps) {
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
      <AnimatePresence
        onExitComplete={() => {
          if (!mapOpen) mapTriggerRef.current?.focus({ preventScroll: true });
        }}
      >
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
