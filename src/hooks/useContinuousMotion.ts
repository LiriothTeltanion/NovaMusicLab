import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MOTION_SCOPE_SELECTOR = [
  '[data-motion="expressive"]',
  '[data-motion="calm"]',
  '[data-motion="static"]',
].join(',');
const APP_MOTION_SCOPE_SELECTOR = [
  '.nova-app-root[data-motion="expressive"]',
  '.nova-app-root[data-motion="calm"]',
  '.nova-app-root[data-motion="static"]',
].join(',');

function findMotionScope(target?: Element | null) {
  const localScope = target?.closest<HTMLElement>(MOTION_SCOPE_SELECTOR);
  if (localScope) return localScope;
  return document.querySelector<HTMLElement>(APP_MOTION_SCOPE_SELECTOR);
}

function motionIsAllowed(target?: Element | null) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  const motionMode = findMotionScope(target)?.dataset.motion;
  return !document.hidden
    && motionMode !== 'static'
    && !(window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false);
}

/**
 * True only while continuous decorative motion is useful to the visitor.
 * Timers and animation loops should stop when this returns false. Passing a
 * target also pauses work while that surface is outside the viewport.
 */
export function useContinuousMotion(targetRef?: RefObject<Element | null>) {
  const [allowed, setAllowed] = useState(() => motionIsAllowed(targetRef?.current));
  const [inViewport, setInViewport] = useState(true);

  // Layout timing is intentional: the root data-motion attribute exists after
  // commit, and consumers must see Static mode before their timer/RAF effects
  // get a chance to start.
  useLayoutEffect(() => {
    const media = window.matchMedia?.(REDUCED_MOTION_QUERY);
    const sync = () => setAllowed(motionIsAllowed(targetRef?.current));
    const motionScope = findMotionScope(targetRef?.current);
    const observer = motionScope && typeof MutationObserver !== 'undefined'
      ? new MutationObserver(sync)
      : null;

    document.addEventListener('visibilitychange', sync);
    media?.addEventListener?.('change', sync);
    // Safari < 14 exposes only the legacy listener pair.
    if (media && !media.addEventListener) media.addListener(sync);
    if (motionScope) {
      observer?.observe(motionScope, { attributes: true, attributeFilter: ['data-motion'] });
    }
    sync();

    return () => {
      document.removeEventListener('visibilitychange', sync);
      media?.removeEventListener?.('change', sync);
      if (media && !media.removeEventListener) media.removeListener(sync);
      observer?.disconnect();
    };
  }, [targetRef]);

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
