import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        role="dialog"
        aria-modal="true"
        aria-label={copy.steps[index].title}
      >
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl"
          style={{ borderColor: `${tc.c1}35`, backgroundColor: 'rgba(6, 12, 24, 0.92)' }}
        >
          <button
            onClick={onClose}
            aria-label={copy.closeAria}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/30 text-gray-300 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative h-36 w-full overflow-hidden">
            <MoodArtCanvas moodKey={mood} seed={`onboarding-${index}`} width={520} height={200} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(6,12,24,0.95) 100%)' }} />
            <div className="absolute bottom-3 left-5 flex h-11 w-11 items-center justify-center rounded-2xl border"
              style={{ color: tc.c1, borderColor: `${tc.c1}45`, backgroundColor: `${tc.c1}18`, boxShadow: `0 0 20px ${tc.c1}30` }}>
              <Icon className="h-5 w-5" />
            </div>
          </div>

          <div className="p-6 pt-4">
            <p className="mb-2 text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c1 }}>
              {copy.stepLabel(index + 1, steps.length)}
            </p>
            <h3 className="text-xl font-black text-white leading-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">{step.body}</p>

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

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-300"
              >
                {copy.skip}
              </button>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    onClick={() => setIndex(i => Math.max(i - 1, 0))}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-gray-300 transition-all hover:border-white/30"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {copy.back}
                  </button>
                )}
                <button
                  onClick={handleAdvance}
                  className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-mono font-black uppercase tracking-wider transition-all hover:scale-[1.03]"
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
