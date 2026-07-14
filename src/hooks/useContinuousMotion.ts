import { useEffect, useState, type RefObject } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function motionIsAllowed() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  return !document.hidden && !(window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false);
}

/**
 * True only while continuous decorative motion is useful to the visitor.
 * Timers and animation loops should stop when this returns false. Passing a
 * target also pauses work while that surface is outside the viewport.
 */
export function useContinuousMotion(targetRef?: RefObject<Element | null>) {
  const [allowed, setAllowed] = useState(motionIsAllowed);
  const [inViewport, setInViewport] = useState(true);

  useEffect(() => {
    const media = window.matchMedia?.(REDUCED_MOTION_QUERY);
    const sync = () => setAllowed(motionIsAllowed());

    document.addEventListener('visibilitychange', sync);
    media?.addEventListener?.('change', sync);
    // Safari < 14 exposes only the legacy listener pair.
    if (media && !media.addEventListener) media.addListener(sync);
    sync();

    return () => {
      document.removeEventListener('visibilitychange', sync);
      media?.removeEventListener?.('change', sync);
      if (media && !media.removeEventListener) media.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    const target = targetRef?.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setInViewport(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setInViewport(Boolean(entry?.isIntersecting));
    }, { threshold: 0.01 });
    observer.observe(target);

    return () => observer.disconnect();
  }, [targetRef]);

  return allowed && inViewport;
}
