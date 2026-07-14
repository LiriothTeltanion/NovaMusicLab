import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { pickLanguage } from '../utils/i18n';

interface MobileDetailDrawerProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  returnFocusTarget?: HTMLElement | null;
  children: ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessible mobile master/detail pattern used by dense museum rankings.
 * It portals outside animated room wrappers, locks background scrolling and
 * restores focus to the row that opened it.
 */
export default function MobileDetailDrawer({
  open,
  title,
  closeLabel,
  onClose,
  returnFocusTarget,
  children,
}: MobileDetailDrawerProps) {
  const { lang } = useApp();
  const reduceMotion = Boolean(useReducedMotion());
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const returnFocusLabelRef = useRef<string | null>(null);
  const restoreFocusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    if (restoreFocusTimerRef.current !== null) {
      window.clearTimeout(restoreFocusTimerRef.current);
      restoreFocusTimerRef.current = null;
    }

    returnFocusRef.current = returnFocusTarget ?? (
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    returnFocusLabelRef.current = returnFocusRef.current?.getAttribute('aria-label') ?? null;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById('root');
    const previousInert = appRoot?.inert ?? false;
    document.body.style.overflow = 'hidden';
    if (appRoot) appRoot.inert = true;

    const focusFrame = window.requestAnimationFrame(() => {
      // Portaled media can restore an old nested scroll position while mounting.
      // Always open the dossier at its header and move focus without scrolling it.
      if (drawerRef.current) drawerRef.current.scrollTop = 0;
      closeRef.current?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(element => !element.hasAttribute('disabled') && element.tabIndex !== -1);
      if (!focusable.length) return;
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
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
      const returnTarget = returnFocusRef.current;
      // AnimatePresence keeps the focused close control mounted during the exit
      // pose. Restore the ranking row after that pose so its later removal cannot
      // drop focus back onto <body> in real browsers.
      restoreFocusTimerRef.current = window.setTimeout(() => {
        const replacementTarget = returnFocusLabelRef.current
          ? Array.from(document.querySelectorAll<HTMLElement>('[aria-label]'))
            .find(element => element.getAttribute('aria-label') === returnFocusLabelRef.current)
          : null;
        const focusTarget = returnTarget?.isConnected ? returnTarget : replacementTarget;
        focusTarget?.focus({ preventScroll: true });
        restoreFocusTimerRef.current = null;
      }, reduceMotion ? 0 : 260);
    };
  }, [onClose, open, reduceMotion, returnFocusTarget]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] xl:hidden">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onClick={onClose}
          />
          <motion.section
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="nova-surface nova-surface--featured absolute inset-x-0 bottom-0 max-h-[calc(100dvh-3.5rem)] overflow-y-auto rounded-t-[2rem] border-b-0 shadow-2xl"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: '12%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: '8%' }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
          >
            <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur-xl">
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="nova-on-dark nova-surface--interactive inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-xs font-black uppercase tracking-wider text-white"
              >
                <ArrowLeft className="nova-mirror-rtl h-4 w-4" aria-hidden="true" />
                {closeLabel}
              </button>
              <div className="nova-on-dark min-w-0 text-end">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-gray-400">
                  🎧 {pickLanguage(lang, { es: 'DETALLE NOVA', en: 'NOVA DETAIL', he: 'פרטי NOVA' })}
                </p>
                <h2 id={titleId} className="truncate text-sm font-black text-white"><bdi dir="auto">{title}</bdi></h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`${closeLabel} — \u2068${title}\u2069`}
                className="nova-on-dark nova-surface--interactive flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:p-5">
              {children}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
