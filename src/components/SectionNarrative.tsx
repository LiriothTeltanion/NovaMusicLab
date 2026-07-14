import React, { useState } from 'react';
import { BookOpenText, ChevronDown, Info, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Surface from './Surface';

interface NarrativeInsight {
  readonly title: string;
  readonly body: string;
}

export interface SectionNarrativeContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly insights: readonly NarrativeInsight[];
  readonly dataNote?: string;
  readonly deepDive?: string;
  readonly deepDiveLabel?: string;
}

interface SectionNarrativeProps {
  content: SectionNarrativeContent;
  accent?: 'c1' | 'c2' | 'c3' | 'c4';
  compact?: boolean;
  className?: string;
}

/**
 * The interpretive intro/tutorial block every section opens with. Collapsed
 * by default - returning visitors already know what a section is, so the
 * data should lead and the reading should be one click away, not a wall of
 * prose pushing the charts below the fold.
 */
export default function SectionNarrative({
  content,
  accent = 'c1',
  compact = false,
  className = '',
}: SectionNarrativeProps) {
  const { tc, t } = useApp();
  const [expanded, setExpanded] = useState(false);
  const color = tc[accent];
  const secondary = accent === 'c1' ? tc.c2 : tc.c1;
  const deepDiveLabel = content.deepDiveLabel ?? 'Deep reading';
  const toggleHint = expanded ? t.collapsible.hideReading : t.collapsible.readIntro;

  return (
    <Surface
      as="section"
      variant="utility"
      className={`rounded-xl border-l-2 sm:rounded-2xl ${compact ? 'p-3 sm:p-4' : 'p-3 sm:p-4 md:p-4'} ${className}`}
      style={{ borderLeftColor: color }}
    >
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="group flex min-h-11 w-full items-center justify-between gap-2.5 text-left"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <BookOpenText className="w-4 h-4 shrink-0" style={{ color }} />
            <p className="type-label" style={{ color }}>
              {content.eyebrow}
            </p>
          </div>
          <h2 className="type-section type-strong">
            {content.title}
          </h2>
        </div>
        <span className="flex items-center gap-2 shrink-0">
          <span className="type-label type-muted hidden transition-colors group-hover:text-[var(--fg)] sm:inline">
            {toggleHint}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            style={{ color }}
          />
        </span>
      </button>

      {expanded && (
        <div className="animate-fade-in space-y-4 border-t border-white/5 pt-3 sm:pt-4">
          <p className="type-body type-muted">
            {content.body}
          </p>

          <div className={`grid gap-2.5 sm:gap-3 ${compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {content.insights.map((insight, index) => {
              const insightColor = [color, secondary, tc.c3, tc.c4][index % 4];
              return (
                <Surface
                  key={insight.title}
                  variant="analysis"
                  className="rounded-xl p-3.5 sm:rounded-2xl sm:p-4"
                  style={{ borderColor: `${insightColor}24` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: insightColor }} />
                    <p className="type-label" style={{ color: insightColor }}>
                      {insight.title}
                    </p>
                  </div>
                  <p className="type-caption type-muted">
                    {insight.body}
                  </p>
                </Surface>
              );
            })}
          </div>

          {(content.dataNote || content.deepDive) && (
            <div className="space-y-3 pt-1">
              {content.dataNote && (
                <div className="flex items-start gap-3 rounded-xl border bg-white/2 p-3.5 sm:rounded-2xl sm:p-4" style={{ borderColor: `${color}20` }}>
                  <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
                  <p className="type-caption type-muted">
                    {content.dataNote}
                  </p>
                </div>
              )}

              {content.deepDive && (
                <details className="group/deep rounded-xl border bg-white/2 p-3.5 sm:rounded-2xl sm:p-4" style={{ borderColor: `${secondary}20` }}>
                  <summary className="type-label cursor-pointer list-none" style={{ color: secondary }}>
                    <span className="group-open/deep:hidden">+ {deepDiveLabel}</span>
                    <span className="hidden group-open/deep:inline">- {deepDiveLabel}</span>
                  </summary>
                  <p className="type-caption type-muted mt-3">
                    {content.deepDive}
                  </p>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}
