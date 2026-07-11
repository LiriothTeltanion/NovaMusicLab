import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../context/AppContext';

/**
 * Shared premium styling for every Recharts surface in the app, so charts
 * finally match the glass/neon language of the KPI cards: one glass tooltip,
 * reusable gradient defs, theme-aware axis/grid props and ONE shared motion
 * language (draw-in timing + swap transition) instead of each section
 * animating at its own speed.
 */

/**
 * Shared Recharts draw-in timing - spread into <Bar>/<Area>/<Line>/<Radar>
 * (`{...CHART_ANIMATION}`) so every chart in the app draws with the same
 * rhythm instead of Recharts' per-chart defaults.
 */
export const CHART_ANIMATION = {
  animationDuration: 750,
  animationEasing: 'ease-out',
} as const;

/** One timing for every chart/panel swap in the app (see ChartSwap below). */
export const SWAP_TRANSITION = { duration: 0.35, ease: 'easeOut' as const };

/** Enter/exit poses matching ChartSwap, for sites that need AnimatePresence exits. */
export const SWAP_POSES = {
  initial: { opacity: 0, y: 14, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.995 },
} as const;

/**
 * Shared transition for swapping one chart/panel for another (sub-tab change,
 * year selection, mood filter...). Keyed remounts crossfade+rise identically
 * everywhere. Respects prefers-reduced-motion by collapsing to a plain fade.
 *
 *   <ChartSwap swapKey={subTab}> ...chart... </ChartSwap>
 */
export function ChartSwap({ swapKey, children, className }: {
  swapKey: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  return (
    <motion.div
      key={swapKey}
      className={className}
      initial={reduceMotion ? { opacity: 0 } : SWAP_POSES.initial}
      animate={reduceMotion ? { opacity: 1 } : SWAP_POSES.animate}
      transition={SWAP_TRANSITION}
    >
      {children}
    </motion.div>
  );
}

/** Theme-aware axis tick/stroke props (spread into <XAxis>/<YAxis>). */
export function axisProps(mode: 'dark' | 'light' = 'dark') {
  const tick = mode === 'light' ? '#475569' : '#9ca3af';
  const stroke = mode === 'light' ? '#94a3b8' : '#4b5563';
  return { stroke, fontSize: 11, tick: { fill: tick }, tickLine: false as const, axisLine: { stroke, strokeOpacity: 0.35 } };
}

/** Subtle theme-tinted grid stroke (use on <CartesianGrid stroke={...}>). */
export function gridStroke(accent: string) {
  return `${accent}1c`;
}

interface GradientSpec {
  id: string;
  color: string;
  /** 'v' fades downward (columns/areas), 'h' fades rightward (horizontal bars). */
  direction?: 'v' | 'h';
  from?: number;
  to?: number;
}

/** Reusable <defs> block: one linearGradient per spec, ready for `url(#id)` fills. */
export function ChartGradients({ specs }: { specs: GradientSpec[] }) {
  return (
    <defs>
      {specs.map(({ id, color, direction = 'v', from = 0.95, to = 0.25 }) => (
        <linearGradient
          key={id}
          id={id}
          x1="0" y1="0"
          x2={direction === 'h' ? '1' : '0'}
          y2={direction === 'v' ? '1' : '0'}
        >
          <stop offset="0%" stopColor={color} stopOpacity={direction === 'h' ? to : from} />
          <stop offset="100%" stopColor={color} stopOpacity={direction === 'h' ? from : to} />
        </linearGradient>
      ))}
    </defs>
  );
}

export interface GlassTooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

interface GlassTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: GlassTooltipEntry[];
  /** Accent for the border + label. Defaults to first entry color. */
  accent?: string;
  /** Optional unit appended after numeric values (e.g. 'plays'). */
  unit?: string;
  /** Optional header renderer (avatars, badges) given the first entry's payload. */
  renderHeader?: (row: Record<string, unknown>) => React.ReactNode;
}

/**
 * Glass-styled Recharts tooltip. Pass via <Tooltip content={<GlassTooltip …/>} />;
 * Recharts injects active/label/payload at render time.
 */
export function GlassTooltip({ active, label, payload, accent, unit, renderHeader }: GlassTooltipProps) {
  const { lang } = useApp();
  if (!active || !payload?.length) return null;
  const color = accent ?? payload[0]?.color ?? '#00f2fe';
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const fmt = (v: number | string | undefined) =>
    typeof v === 'number' ? v.toLocaleString(locale) : v ?? '';

  return (
    <div
      className="rounded-2xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(6, 12, 24, 0.92)',
        borderColor: `${color}55`,
        boxShadow: `0 12px 32px rgba(0,0,0,0.45), 0 0 18px ${color}22`,
      }}
    >
      {renderHeader && payload[0]?.payload ? (
        <div className="mb-1.5">{renderHeader(payload[0].payload)}</div>
      ) : label !== undefined && label !== '' ? (
        <p className="mb-1.5 text-[10px] font-mono font-black uppercase tracking-widest" style={{ color }}>
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={`${entry.name}-${i}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? color }} />
              {entry.name}
            </span>
            <span className="font-mono text-xs font-black text-white">
              {fmt(entry.value)}
              {unit ? <span className="ml-1 font-normal text-gray-400">{unit}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Subtle hover cursor for bar charts (spread into <Tooltip cursor={...}>). */
export function barCursor(accent: string) {
  return { fill: `${accent}10` } as const;
}
