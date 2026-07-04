import React from 'react';
import { motion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  /** Stagger offset in seconds for sequenced siblings. */
  delay?: number;
  className?: string;
}

/**
 * Scroll-triggered entrance shared by every museum section: content rises
 * softly into place the first time it enters the viewport. Respects
 * prefers-reduced-motion via the global CSS override in index.css.
 */
export default function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' as const }}
    >
      {children}
    </motion.div>
  );
}
