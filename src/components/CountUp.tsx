import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useContinuousMotion } from '../hooks/useContinuousMotion';
import { localeFor } from '../utils/i18n';

interface CountUpProps {
  target: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** 
 * Shared count-up component using requestAnimationFrame — reliable across React versions.
 * Counts from 0 → target with easeOutCubic curve.
 */
export default function CountUp({
  target,
  duration = 1.6,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: CountUpProps) {
  const { lang } = useApp();
  const continuousMotion = useContinuousMotion();
  const [val, setVal] = useState(duration <= 0 || !continuousMotion ? target : 0);
  const rafRef = useRef<number | null>(null);
  const settledTargetRef = useRef<number | null>(
    duration <= 0 || !continuousMotion ? target : null,
  );

  useEffect(() => {
    if (duration <= 0 || !continuousMotion) {
      settledTargetRef.current = target;
      setVal(target);
      return undefined;
    }

    // A visitor switching away from Static mode should keep the number they
    // already read instead of replaying every count-up on the page.
    if (settledTargetRef.current === target) {
      setVal(target);
      return undefined;
    }

    settledTargetRef.current = null;
    let startTime: number | null = null;
    const durationMs = duration * 1000;

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setVal(eased * target);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        settledTargetRef.current = target;
        rafRef.current = null;
      }
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [target, duration, delay, continuousMotion]);

  const locale = localeFor(lang);
  const displayValue = duration <= 0 || !continuousMotion ? target : val;
  const formatted = displayValue.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
