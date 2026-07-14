import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Upload, LayoutDashboard, Palette, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MoodArtCanvas from './MoodArtCanvas';
import type { EmotionalMoodKey } from '../engines/emotionalEngine';

const STEP_ICONS = [Sparkles, Upload, LayoutDashboard, Palette, ShieldCheck];
const STEP_MOODS: EmotionalMoodKey[] = ['dopamina', 'futurismo', 'calma', 'romanticismo', 'energia'];

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
  /** Called only when the user finishes the last step (not on skip/close). */
  onFinish?: () => void;
}

/**
 * First-visit welcome tour: a short glass-panel walkthrough of what the
 * museum does, painted with the same generative mood art used elsewhere in
 * the app. Fully controlled by the parent (open/onClose) so it can be
 * re-triggered later from a header button - closing always persists the
 * "seen" flag via the caller, this component only renders what it's told to.
 */
export default function OnboardingTour({ open, onClose, onFinish }: OnboardingTourProps) {
  const { t, tc } = useApp();
  const copy = t.onboarding;
  const steps = copy.steps;
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusFrame = window.requestAnimationFrame(() => {
      initialFocusRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [index, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []).filter(element => !element.hasAttribute('hidden'));
        if (focusable.length === 0) {
          e.preventDefault();
          dialogRef.current?.focus({ preventScroll: true });
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, steps.length]);

  if (!open) return null;

  const step = steps[index];
  const Icon = STEP_ICONS[index] ?? Sparkles;
  const mood = STEP_MOODS[index] ?? 'dopamina';
  const isLast = index === steps.length - 1;

  const handleAdvance = () => {
    if (isLast) {
      onFinish?.();
      onClose();
    } else {
      setIndex(i => i + 1);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={dialogRef}
          key={index}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
          className="nova-on-dark relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border shadow-2xl"
          style={{ borderColor: `${tc.c1}35`, backgroundColor: 'rgba(6, 12, 24, 0.92)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label={copy.closeAria}
            className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-gray-300 transition-colors hover:text-white sm:right-3 sm:top-3"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative h-24 w-full overflow-hidden sm:h-36">
            <MoodArtCanvas moodKey={mood} seed={`onboarding-${index}`} width={520} height={200} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(6,12,24,0.95) 100%)' }} />
            <div className="absolute bottom-3 left-5 flex h-11 w-11 items-center justify-center rounded-2xl border"
              style={{ color: tc.c1, borderColor: `${tc.c1}45`, backgroundColor: `${tc.c1}18`, boxShadow: `0 0 20px ${tc.c1}30` }}>
              <Icon className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 pt-3 sm:p-6 sm:pt-4">
            <p className="mb-2 text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c1 }}>
              {copy.stepLabel(index + 1, steps.length)}
            </p>
            <h3 id={titleId} className="text-xl font-black text-white leading-tight">{step.title}</h3>
            <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-gray-300">{step.body}</p>

            <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden="true">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === index ? 20 : 6,
                    backgroundColor: i === index ? tc.c1 : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="min-h-11 px-2 text-xs font-mono font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-200"
              >
                {copy.skip}
              </button>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    onClick={() => setIndex(i => Math.max(i - 1, 0))}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-gray-300 transition-all hover:border-white/30"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {copy.back}
                  </button>
                )}
                <button
                  ref={initialFocusRef}
                  onClick={handleAdvance}
                  className="flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-mono font-black uppercase tracking-wider transition-all hover:scale-[1.03]"
                  style={{ color: tc.c1, borderColor: `${tc.c1}55`, backgroundColor: `${tc.c1}14` }}
                >
                  {isLast ? copy.finish : copy.next}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
