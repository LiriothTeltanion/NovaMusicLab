import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ElementType, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { Command, CornerDownLeft, Search, X } from 'lucide-react';

import { useExperience } from '../../context/ExperienceContext';
import { directionFor, pickLanguage, type Lang } from '../../utils/i18n';
import type { ExperienceDepth } from './museumNavigation';

export interface CommandRoomItem {
  id: string;
  label: string;
  groupLabel: string;
  icon: ElementType;
  color: string;
}

interface CommandPaletteProps {
  activeRoomId: string;
  isOpen: boolean;
  items: CommandRoomItem[];
  lang: Lang;
  onClose: () => void;
  onNavigate: (id: string) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function CommandPalette({
  activeRoomId,
  isOpen,
  items,
  lang,
  onClose,
  onNavigate,
  returnFocusRef,
}: CommandPaletteProps) {
  const { setExperienceDepth } = useExperience();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listId = `nova-command-results-${useId().replace(/:/g, '')}`;
  const copy = pickLanguage(lang, {
    en: {
      title: 'Nova Command',
      subtitle: 'Jump to a room or change how much detail you see',
      placeholder: 'Search rooms and tools…',
      close: 'Close command palette',
      results: 'Museum rooms',
      journeys: 'Experience depth',
      empty: 'No room matches this signal.',
      open: 'Open command palette',
      guided: 'Use Guided',
      explore: 'Use Explore',
      deep: 'Use Deep Dive',
      current: 'Current room',
      shortcut: 'to open',
    },
    es: {
      title: 'Comando Nova',
      subtitle: 'Salta a una sala o cambia cuánto detalle quieres ver',
      placeholder: 'Buscar salas y herramientas…',
      close: 'Cerrar paleta de comandos',
      results: 'Salas del museo',
      journeys: 'Nivel de experiencia',
      empty: 'Ninguna sala coincide con esta señal.',
      open: 'Abrir paleta de comandos',
      guided: 'Usar Guiado',
      explore: 'Usar Explorar',
      deep: 'Usar A fondo',
      current: 'Sala actual',
      shortcut: 'para abrir',
    },
    he: {
      title: 'פקודת Nova',
      subtitle: 'מעבר לחדר או שינוי רמת הפירוט',
      placeholder: 'חיפוש חדרים וכלים…',
      close: 'סגירת לוח הפקודות',
      results: 'חדרי המוזיאון',
      journeys: 'עומק החוויה',
      empty: 'אין חדר שתואם לאות הזה.',
      open: 'פתיחת לוח הפקודות',
      guided: 'מצב מודרך',
      explore: 'מצב חקירה',
      deep: 'צלילה לעומק',
      current: 'החדר הנוכחי',
      shortcut: 'לפתיחה',
    },
  });
  const normalizedQuery = normalizeSearch(query);
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter(item => normalizeSearch(`${item.label} ${item.groupLabel}`).includes(normalizedQuery));
  }, [items, normalizedQuery]);
  const closeAndRestoreFocus = useCallback(() => {
    onClose();
    window.requestAnimationFrame(() => returnFocusRef.current?.focus({ preventScroll: true }));
  }, [onClose, returnFocusRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const keepFocusInDialog = (event: FocusEvent) => {
      if (dialogRef.current?.contains(event.target as Node)) return;
      inputRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener('focusin', keepFocusInDialog);
    inputRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener('focusin', keepFocusInDialog);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAndRestoreFocus();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAndRestoreFocus, isOpen]);

  if (!isOpen) return null;

  const chooseRoom = (id: string) => {
    onNavigate(id);
    if (id === activeRoomId) {
      closeAndRestoreFocus();
    } else {
      onClose();
    }
  };
  const chooseExperienceDepth = (depth: ExperienceDepth) => {
    setExperienceDepth(depth);
    closeAndRestoreFocus();
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || filteredItems.length === 0) return;
    event.preventDefault();
    chooseRoom(filteredItems[0].id);
  };

  return (
    <div
      className="nova-command-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) closeAndRestoreFocus();
      }}
      data-testid="command-palette"
    >
      <div
        ref={dialogRef}
        className="nova-command"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${listId}-title`}
        aria-describedby={`${listId}-subtitle`}
        dir={directionFor(lang)}
      >
        <header className="nova-command__header">
          <span className="nova-command__mark" aria-hidden="true"><Command className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <strong id={`${listId}-title`}>{copy.title}</strong>
            <small id={`${listId}-subtitle`}>{copy.subtitle}</small>
          </span>
          <button type="button" onClick={closeAndRestoreFocus} aria-label={copy.close} className="nova-command__close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <label className="nova-command__search">
          <Search className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{copy.placeholder}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={copy.placeholder}
            aria-controls={listId}
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </label>

        {!normalizedQuery && (
          <section className="nova-command__journeys" aria-labelledby={`${listId}-journeys`}>
            <h2 id={`${listId}-journeys`}>{copy.journeys}</h2>
            <div>
              {([
                ['guided', 'guided'],
                ['explore', 'explore'],
                ['deep-dive', 'deep'],
              ] as const).map(([depth, copyKey]) => (
                <button key={depth} type="button" onClick={() => chooseExperienceDepth(depth)}>
                  <span>{copy[copyKey]}</span>
                  <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="nova-command__rooms" aria-labelledby={`${listId}-rooms`}>
          <h2 id={`${listId}-rooms`}>{copy.results}</h2>
          <ul id={listId} aria-label={copy.results}>
            {filteredItems.map(item => {
              const Icon = item.icon;
              const current = item.id === activeRoomId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={current ? 'page' : undefined}
                    onClick={() => chooseRoom(item.id)}
                    style={{ '--command-color': item.color } as React.CSSProperties}
                  >
                    <span className="nova-command__room-icon" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <strong>{item.label}</strong>
                      <small>{item.groupLabel}</small>
                    </span>
                    {current ? <em>{copy.current}</em> : <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {filteredItems.length === 0 && <p className="nova-command__empty" role="status">{copy.empty}</p>}
        </section>
      </div>
    </div>
  );
}

export function CommandPaletteButton({
  buttonRef,
  isOpen,
  lang,
  onOpen,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  lang: Lang;
  onOpen: () => void;
}) {
  const copy = pickLanguage(lang, {
    en: { open: 'Open command palette', search: 'Search museum', shortcut: 'to open' },
    es: { open: 'Abrir paleta de comandos', search: 'Buscar en el museo', shortcut: 'para abrir' },
    he: { open: 'פתיחת לוח הפקודות', search: 'חיפוש במוזיאון', shortcut: 'לפתיחה' },
  });

  return (
    <button
      ref={buttonRef}
      type="button"
      className="nova-command-trigger"
      onClick={onOpen}
      aria-label={`${copy.open}, Ctrl+K`}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      title={`${copy.open} · Ctrl+K ${copy.shortcut}`}
      data-testid="command-palette-trigger"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span>{copy.search}</span>
      <kbd>Ctrl K</kbd>
    </button>
  );
}
