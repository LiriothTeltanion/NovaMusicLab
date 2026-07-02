import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface InsightLine {
  label: string;
  value: string;
}

interface ExpandableInsightCardProps {
  eyebrow: string;
  title: string;
  summary: string;
  lines: InsightLine[];
  color: string;
  defaultOpen?: boolean;
}

export default function ExpandableInsightCard({
  eyebrow,
  title,
  summary,
  lines,
  color,
  defaultOpen = false,
}: ExpandableInsightCardProps) {
  return (
    <details
      open={defaultOpen}
      className="glass-panel rounded-2xl border p-0 overflow-hidden group"
      style={{ borderColor: `${color}28` }}
    >
      <summary className="list-none cursor-pointer p-5 flex items-start justify-between gap-4 hover:bg-white/3 transition-colors">
        <div className="space-y-2 min-w-0">
          <p className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color }}>
            {eyebrow}
          </p>
          <h3 className="text-base font-black text-white leading-tight">{title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">{summary}</p>
        </div>
        <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-transform group-open:rotate-180"
          style={{ color, borderColor: `${color}35`, backgroundColor: `${color}10` }}>
          <ChevronDown className="w-4 h-4" />
        </span>
      </summary>
      <div className="px-5 pb-5 pt-1 space-y-3">
        {lines.map(line => (
          <div key={`${line.label}-${line.value}`} className="rounded-xl border border-white/5 bg-white/3 p-3">
            <p className="text-[10px] font-mono font-black uppercase tracking-wider" style={{ color }}>
              {line.label}
            </p>
            <p className="text-xs text-gray-300 leading-relaxed mt-1">{line.value}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
