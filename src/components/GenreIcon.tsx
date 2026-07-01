import React from 'react';

interface GenreIconProps {
  genre: string;
  size?: number;
  className?: string;
}

/**
 * Custom minimalist line-icon per genre category (matching normalizeGenre()'s
 * exact output labels in src/utils/analytics.ts). Uses currentColor so each
 * icon automatically follows whatever accent color the caller sets, working
 * across all 14 themes without per-theme icon variants.
 */
const ICON_PATHS: Record<string, React.ReactNode> = {
  'Metalcore': (
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
  ),
  'Post-Hardcore': (
    <path d="M3 12h3l2-7 4 14 3-10 2 5h4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'Post-Metal / Blackgaze': (
    <>
      <path d="M6 16a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4.5 4.5 0 0 1 18 15" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20l1.5-3M13 20l1-3" strokeLinecap="round" />
    </>
  ),
  'Synthwave / Darksynth': (
    <>
      <circle cx="12" cy="10" r="4.5" />
      <path d="M3 20c2-4 5-6 9-6s7 2 9 6" strokeLinecap="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </>
  ),
  'Pop Punk / Emo': (
    <path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5 6 5c2 0 3.5 1.2 4.5 2.5C11.5 6.2 13 5 15 5c3.5 0 5 3.5 3.5 6.5C16 15.65 12 20 12 20z" strokeLinejoin="round" />
  ),
  'Emo Rap / Trap': (
    <>
      <path d="M12 3a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V8a5 5 0 0 1 5-5z" />
      <path d="M9 9h.01M15 9h.01" strokeLinecap="round" />
      <path d="M9 20l1.5-4M15 20l-1.5-4" strokeLinecap="round" />
    </>
  ),
  'Hard Rock': (
    <path d="M8 21V13a4 4 0 0 1 8 0v8M6 13V7a2 2 0 0 1 4 0M14 13V7a2 2 0 0 1 4 0" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'Progressive Metal': (
    <path d="M12 2l3 6-3 3-3-3 3-6zM3 14l6-3 3 3-3 3-6-3zM21 14l-6-3-3 3 3 3 6-3zM12 22l-3-6 3-3 3 3-3 6z" strokeLinejoin="round" />
  ),
  'Ambient / Lo-Fi': (
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <circle cx="8" cy="13" r="2.2" />
      <circle cx="16" cy="13" r="2.2" />
    </>
  ),
  'Death Metal': (
    <>
      <path d="M12 3a7 7 0 0 0-7 7c0 3 1.5 4.5 2 6h10c.5-1.5 2-3 2-6a7 7 0 0 0-7-7z" strokeLinejoin="round" />
      <path d="M9.5 10.5h.01M14.5 10.5h.01M10 16v3M14 16v3" strokeLinecap="round" />
    </>
  ),
  'Pop / Indie': (
    <>
      <circle cx="7" cy="17" r="3" />
      <path d="M10 17V5l9-2v11" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="14" r="3" />
    </>
  ),
  'Israeli Rock': (
    <path d="M4 17V7l8-4 8 4v10l-8 4-8-4z M12 3v18M4 7l16 10M20 7L4 17" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'Hip-Hop / Rap': (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'Heavy Metal': (
    <path d="M8 2v9a4 4 0 0 0 8 0V2M6 20l2-3M18 20l-2-3M9 22h6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'Alternative Rock': (
    <path d="M9 18V6l9-3v12M6 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'Alternative': (
    <path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'Unclassified': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-2.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17h.01" strokeLinecap="round" />
    </>
  ),
};

export default function GenreIcon({ genre, size = 20, className = '' }: GenreIconProps) {
  const path = ICON_PATHS[genre] ?? ICON_PATHS['Unclassified'];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
