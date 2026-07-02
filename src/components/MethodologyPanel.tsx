import React from 'react';
import { Database, ListChecks, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface MethodPoint {
  readonly title: string;
  readonly tag: string;
  readonly body: string;
}

interface MethodStat {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
}

interface MethodologyPanelProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  points: readonly MethodPoint[];
  stats?: readonly MethodStat[];
  accent?: 'c1' | 'c2' | 'c3' | 'c4';
  className?: string;
}

export default function MethodologyPanel({
  eyebrow,
  title,
  subtitle,
  points,
  stats = [],
  accent = 'c1',
  className = '',
}: MethodologyPanelProps) {
  const { tc } = useApp();
  const color = tc[accent];
  const secondary = accent === 'c1' ? tc.c2 : tc.c1;

  return (
    <section className={`glass-panel rounded-3xl p-6 md:p-7 border ${className}`} style={{ borderColor: `${color}24` }}>
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl p-2" style={{ backgroundColor: `${color}16`, border: `1px solid ${color}30` }}>
            <Database className="w-5 h-5" style={{ color }} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color }}>
              {eyebrow}
            </p>
            <h3 className="text-lg md:text-xl font-black text-white leading-tight">{title}</h3>
            <p className="text-sm text-gray-300 leading-relaxed max-w-4xl">{subtitle}</p>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {stats.map((stat, index) => {
              const statColor = [color, secondary, tc.c3, tc.c4][index % 4];
              return (
                <div key={stat.label} className="border-l-2 pl-4 py-1" style={{ borderLeftColor: statColor }}>
                  <p className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500">{stat.label}</p>
                  <p className="text-base font-mono font-black text-white mt-1">{stat.value}</p>
                  {stat.note && <p className="text-[11px] text-gray-400 leading-relaxed mt-1">{stat.note}</p>}
                </div>
              );
            })}
          </div>
        )}

        <div className="divide-y divide-white/5 border-y border-white/5">
          {points.map((point, index) => {
            const pointColor = [color, secondary, tc.c3, tc.c4][index % 4];
            return (
              <div key={point.title} className="py-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-5">
                <div className="flex items-center gap-2 md:w-56 shrink-0">
                  {index % 2 === 0 ? (
                    <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: pointColor }} />
                  ) : (
                    <ListChecks className="w-4 h-4 shrink-0" style={{ color: pointColor }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-black uppercase tracking-wider truncate" style={{ color: pointColor }}>
                      {point.title}
                    </p>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider truncate">{point.tag}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{point.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
