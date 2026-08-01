import type React from 'react';
import NovaMark from './NovaMark';

export interface NovaWordmarkProps {
  /**
   * Colour for the MUSIC LAB half. The chrome passes the active theme accent;
   * omit it to inherit, which is what surfaces with their own palette want.
   */
  accentColor?: string;
  /** Extra classes on the root, for per-surface spacing or glow. */
  className?: string;
  /** Extra classes on the two stacked words, for responsive hiding. */
  wordsClassName?: string;
}

/**
 * The compact Nova Music Lab lockup: the app mark, then NOVA stacked over
 * MUSIC LAB.
 *
 * It exists because the wordmark used to be re-typed at every call site - the
 * header, the hero masthead, the poster, the wrapped card, the chapter footer -
 * in four different treatments, three of which set MUSIC LAB in var(--font-mono).
 * That resolves to whatever monospace the operating system ships, so the logo
 * rendered in an unchosen typeface that changed from machine to machine, right
 * next to NOVA's Space Grotesk. One component, one lockup.
 *
 * The full hero expression stays in HeroSection: at that size the mark carries
 * a gradient fill and a displaced echo, and those belong with the rest of the
 * hero's material rather than in a component shared with 40px chrome.
 */
export default function NovaWordmark({
  accentColor,
  className = '',
  wordsClassName = '',
}: NovaWordmarkProps) {
  // Published as a custom property as well as applied directly, so a surface
  // can tint the mark's frame from the same value without prop-drilling a
  // second colour that could drift out of step with the words.
  const accentStyle = accentColor
    ? ({ '--nova-wordmark-accent': accentColor } as React.CSSProperties)
    : undefined;

  return (
    <span className={`nova-wordmark ${className}`.trim()} style={accentStyle}>
      <span className="nova-wordmark__mark">
        <NovaMark size="100%" />
      </span>
      <span className={`nova-wordmark__words ${wordsClassName}`.trim()}>
        <span className="nova-wordmark__nova">NOVA</span>
        <span className="nova-wordmark__lab" style={accentColor ? { color: accentColor } : undefined}>
          MUSIC LAB
        </span>
      </span>
    </span>
  );
}
