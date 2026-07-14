import React, { createContext, useContext, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { localeFor, pickLanguage } from '../utils/i18n';

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

/** Recharts animation props that collapse cleanly under reduced motion. */
export function useChartAnimation() {
  const reduceMotion = Boolean(useReducedMotion());
  return reduceMotion
    ? { isAnimationActive: false, animationDuration: 0 as const }
    : { ...CHART_ANIMATION, isAnimationActive: true };
}

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
  const tick = mode === 'light' ? '#334155' : '#cbd5e1';
  const stroke = mode === 'light' ? '#64748b' : '#64748b';
  return { stroke, fontSize: 11, tick: { fill: tick }, tickLine: false as const, axisLine: { stroke, strokeOpacity: 0.35 } };
}

/** Subtle theme-tinted grid stroke (use on <CartesianGrid stroke={...}>). */
export function gridStroke(accent: string, mode: 'dark' | 'light' = 'dark') {
  return mode === 'light' ? '#cbd5e1' : `${accent}1c`;
}

export type ChartConfidence = 'exact' | 'estimated' | 'ytd';

export interface ChartTableColumn<Row extends Record<string, unknown>> {
  key: keyof Row & string;
  label: string;
  format?: (value: Row[keyof Row], row: Row) => React.ReactNode;
}

interface ChartFrameProps<Row extends Record<string, unknown>> {
  title: string;
  subtitle: string;
  summary: string;
  status?: ChartConfidence | ChartConfidence[];
  tableRows?: Row[];
  tableColumns?: ChartTableColumn<Row>[];
  fileName?: string;
  children: React.ReactNode;
  className?: string;
}

interface ChartA11yContextValue {
  titleId: string;
  summaryId: string;
}

const ChartA11yContext = createContext<ChartA11yContextValue | null>(null);

interface ChartCanvasProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'aria-label' | 'children'> {
  children: React.ReactNode;
  /** Optional standalone label when ChartCanvas is rendered outside ChartFrame. */
  label?: string;
}

/**
 * Direction-safe boundary for chart geometry only. Keep metric selectors,
 * tabs and other controls outside this component so assistive technology does
 * not discover interactive descendants inside an image role.
 */
export function ChartCanvas({ children, className = '', label, ...divProps }: ChartCanvasProps) {
  const context = useContext(ChartA11yContext);

  return (
    <div
      {...divProps}
      className={`nova-chart-canvas nova-data-ltr min-w-0 ${className}`}
      dir="ltr"
      role="img"
      aria-label={context ? undefined : label}
      aria-labelledby={context?.titleId}
      aria-describedby={context?.summaryId}
    >
      {children}
    </div>
  );
}

export function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  // Artist/track names can come from user uploads. Neutralize spreadsheet
  // formula prefixes without changing genuine numeric values.
  const safeText = typeof value === 'string' && /^\s*[=+\-@]/.test(value)
    ? `'${text}`
    : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

/**
 * Evidence-first chart shell: every visual gets a title, denominator/context,
 * confidence, accessible takeaway and an exact-value table/CSV companion.
 */
export function ChartFrame<Row extends Record<string, unknown>>({
  title,
  subtitle,
  summary,
  status = 'exact',
  tableRows,
  tableColumns,
  fileName = 'nova-music-chart.csv',
  children,
  className = '',
}: ChartFrameProps<Row>) {
  const { lang, tc } = useApp();
  const id = useId().replaceAll(':', '');
  const titleId = `chart-title-${id}`;
  const summaryId = `chart-summary-${id}`;
  const statuses = Array.isArray(status) ? status : [status];
  const statusCopy: Record<ChartConfidence, string> = pickLanguage(lang, {
    es: { exact: '✅ Exacto', estimated: '≈ Estimado', ytd: '⏳ Año en curso' },
    en: { exact: '✅ Exact', estimated: '≈ Estimated', ytd: '⏳ YTD' },
    he: { exact: '✅ מדויק', estimated: '≈ משוער', ytd: '⏳ מתחילת השנה' },
  });
  const tableCopy = pickLanguage(lang, {
    es: { open: '▦ Ver datos exactos', export: '💾 Exportar CSV' },
    en: { open: '▦ View exact data', export: '💾 Export CSV' },
    he: { open: '▦ הצגת הנתונים המדויקים', export: '💾 ייצוא CSV' },
  });
  const columns = tableColumns ?? (tableRows?.[0]
    ? Object.keys(tableRows[0]).map((key) => ({ key, label: key })) as ChartTableColumn<Row>[]
    : []);

  const downloadCsv = () => {
    if (!tableRows?.length || !columns.length) return;
    const rows = [
      columns.map((column) => csvCell(column.label)).join(','),
      ...tableRows.map((row) => columns.map((column) => csvCell(row[column.key])).join(',')),
    ];
    const anchor = document.createElement('a');
    anchor.href = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${rows.join('\n')}`)}`;
    anchor.download = fileName;
    anchor.click();
  };

  return (
    <figure
      className={`nova-chart-frame min-w-0 ${className}`}
      aria-labelledby={titleId}
      aria-describedby={summaryId}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id={titleId} className="type-section type-strong break-words">{title}</h3>
          <p className="type-caption type-muted mt-1 max-w-3xl leading-relaxed">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {statuses.map((item) => (
            <span
              key={item}
              className="rounded-full border px-2.5 py-1 text-xs font-mono font-black uppercase tracking-wider"
              style={{ borderColor: `${tc.c1}35`, backgroundColor: `${tc.c1}0d`, color: 'var(--type-ink-muted)' }}
            >
              {statusCopy[item]}
            </span>
          ))}
        </div>
      </div>

      <ChartA11yContext.Provider value={{ titleId, summaryId }}>
        <div className="min-w-0">{children}</div>
      </ChartA11yContext.Provider>

      <figcaption id={summaryId} className="type-caption type-muted mt-3 leading-relaxed">
        {summary}
      </figcaption>

      {tableRows?.length && columns.length ? (
        <details className="mt-4 rounded-2xl border border-white/10 bg-black/10">
          <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-mono font-bold text-[var(--type-ink-muted)]">
            {tableCopy.open}
          </summary>
          <div className="border-t border-white/10 p-3">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={downloadCsv}
                className="min-h-11 rounded-xl border border-white/10 px-3 py-2 text-xs font-mono font-black uppercase tracking-wider text-[var(--type-ink-muted)] hover:border-white/25"
              >
                {tableCopy.export}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-start text-xs">
                <thead className="font-mono uppercase tracking-wider text-[var(--type-ink-muted)]">
                  <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2">{column.label}</th>)}</tr>
                </thead>
                <tbody>
                  {tableRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-white/5 text-[var(--type-ink)]">
                      {columns.map((column) => (
                        <td key={column.key} className="px-3 py-2 font-mono">
                          {column.format ? column.format(row[column.key], row) : String(row[column.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ) : null}
    </figure>
  );
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
  const locale = localeFor(lang);
  const fmt = (v: number | string | undefined) =>
    typeof v === 'number' ? v.toLocaleString(locale) : v ?? '';

  return (
    <div
      className="nova-chart-tooltip rounded-2xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-md"
      style={{
        borderColor: `${color}55`,
      }}
    >
      {renderHeader && payload[0]?.payload ? (
        <div className="mb-1.5">{renderHeader(payload[0].payload)}</div>
      ) : label !== undefined && label !== '' ? (
        <p className="mb-1.5 text-xs font-mono font-black uppercase tracking-widest" style={{ color }}>
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={`${entry.name}-${i}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? color }} />
              {entry.name}
            </span>
            <span className="nova-chart-tooltip__value font-mono text-xs font-black">
              {fmt(entry.value)}
              {unit ? <span className="ml-1 font-normal text-gray-500">{unit}</span> : null}
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
