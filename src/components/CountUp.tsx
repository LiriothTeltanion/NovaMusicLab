import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
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
  const [val, setVal] = useState(duration <= 0 ? target : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (duration <= 0) {
      setVal(target);
      return undefined;
    }

    let startTime: number | null = null;
    const durationMs = duration * 1000;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setVal(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  const locale = localeFor(lang);
  const formatted = val.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
