import type { HTMLAttributes } from 'react';

export type SurfaceVariant = 'featured' | 'analysis' | 'utility';

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
  variant?: SurfaceVariant;
  interactive?: boolean;
}

/**
 * Shared visual hierarchy for museum surfaces.
 *
 * Static surfaces never lift by default. Consumers must opt into interactive
 * feedback so charts, prose and controls no longer look equally clickable.
 */
export default function Surface({
  as: Component = 'div',
  variant = 'analysis',
  interactive = false,
  className = '',
  ...props
}: SurfaceProps) {
  const classes = [
    'nova-surface',
    `nova-surface--${variant}`,
    interactive ? 'nova-surface--interactive' : '',
    className,
  ].filter(Boolean).join(' ');

  return <Component className={classes} {...props} />;
}
