import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Surface from './Surface';

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

const MotionSurface = motion.create(Surface);

export default function SectionQuickRead({ items }: SectionQuickReadProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section role="list" className="grid grid-cols-1 gap-3 md:grid-cols-3 sm:gap-4">
      {items.map((item, index) => (
        <MotionSurface
          as="article"
          role="listitem"
          variant="analysis"
          key={`${item.label}-${item.title}`}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : index * 0.05 }}
          className="relative overflow-hidden rounded-xl p-4 sm:rounded-2xl sm:p-5"
          style={{ borderColor: `${item.color}25` }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: `radial-gradient(circle at top right, ${item.color}12, transparent 68%)` }}
          />
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border sm:h-8 sm:w-8 sm:rounded-xl"
                style={{ color: item.color, borderColor: `${item.color}35`, backgroundColor: `${item.color}10` }}>
                {item.icon}
              </span>
              <p className="type-label" style={{ color: item.color }}>
                {item.label}
              </p>
            </div>
            <h3 className="type-body type-strong font-bold leading-snug">{item.title}</h3>
            <p className="type-caption type-muted">{item.body}</p>
          </div>
        </MotionSurface>
      ))}
    </section>
  );
}
