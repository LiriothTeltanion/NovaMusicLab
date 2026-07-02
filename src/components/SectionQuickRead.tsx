import React from 'react';
import { motion } from 'framer-motion';

export interface QuickReadItem {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  color: string;
}

interface SectionQuickReadProps {
  items: QuickReadItem[];
}

export default function SectionQuickRead({ items }: SectionQuickReadProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <motion.article
          key={`${item.label}-${item.title}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.06 }}
          className="glass-panel rounded-2xl border p-5 relative overflow-hidden group"
          style={{ borderColor: `${item.color}25` }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ background: `radial-gradient(circle at top right, ${item.color}12, transparent 68%)` }} />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border"
                style={{ color: item.color, borderColor: `${item.color}35`, backgroundColor: `${item.color}10` }}>
                {item.icon}
              </span>
              <p className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: item.color }}>
                {item.label}
              </p>
            </div>
            <h3 className="text-base font-black text-white leading-tight">{item.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>
          </div>
        </motion.article>
      ))}
    </section>
  );
}
