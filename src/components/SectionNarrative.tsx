import React from 'react';
import { BookOpenText, Info, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

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

export default function SectionNarrative({
  content,
  accent = 'c1',
  compact = false,
  className = '',
}: SectionNarrativeProps) {
  const { tc } = useApp();
  const color = tc[accent];
  const secondary = accent === 'c1' ? tc.c2 : tc.c1;
  const deepDiveLabel = content.deepDiveLabel ?? 'Deep reading';

  return (
    <section
      className={`glass-panel rounded-3xl border-l-4 overflow-hidden ${compact ? 'p-5' : 'p-6 md:p-7'} ${className}`}
      style={{ borderLeftColor: color }}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpenText className="w-4 h-4 shrink-0" style={{ color }} />
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color }}>
              {content.eyebrow}
            </p>
          </div>
          <h3 className="text-lg md:text-xl font-black text-white leading-tight">
            {content.title}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            {content.body}
          </p>
        </div>

        <div className={`grid gap-3 ${compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
          {content.insights.map((insight, index) => {
            const insightColor = [color, secondary, tc.c3, tc.c4][index % 4];
            return (
              <div
                key={insight.title}
                className="rounded-2xl border bg-white/3 p-4"
                style={{ borderColor: `${insightColor}24` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: insightColor }} />
                  <p className="text-xs font-mono font-black uppercase tracking-wider" style={{ color: insightColor }}>
                    {insight.title}
                  </p>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {insight.body}
                </p>
              </div>
            );
          })}
        </div>

        {(content.dataNote || content.deepDive) && (
          <div className="space-y-3 pt-1">
            {content.dataNote && (
              <div className="flex items-start gap-3 rounded-2xl border bg-white/2 p-4" style={{ borderColor: `${color}20` }}>
                <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
                <p className="text-xs text-gray-400 leading-relaxed">
                  {content.dataNote}
                </p>
              </div>
            )}

            {content.deepDive && (
              <details className="group rounded-2xl border bg-white/2 p-4" style={{ borderColor: `${secondary}20` }}>
                <summary className="cursor-pointer list-none text-xs font-mono font-black uppercase tracking-wider" style={{ color: secondary }}>
                  <span className="group-open:hidden">+ {deepDiveLabel}</span>
                  <span className="hidden group-open:inline">- {deepDiveLabel}</span>
                </summary>
                <p className="mt-3 text-xs text-gray-300 leading-relaxed">
                  {content.deepDive}
                </p>
              </details>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
