import React from 'react';

interface FlagArtProps {
  country: string;
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Hand-authored minimal SVG flags (viewBox 30x20) for every country in
 * src/data/artist_meta.json - no external flag images or emoji-font
 * dependence, so they render identically on every OS and stay crisp at
 * chip size. Details are simplified (e.g. star counts, seals) since these
 * render at ~14-24px tall; geometry and colors match each real flag.
 */
const FLAGS: Record<string, React.ReactNode> = {
  'United States': (
    <>
      {[0, 1, 2, 3].map(i => <rect key={i} y={i * 5.7} width="30" height="2.85" fill="#B22234" />)}
      <rect width="30" height="20" fill="none" />
      <rect width="13" height="8.5" fill="#3C3B6E" />
      {[2, 5, 8, 11].map(x => [2, 4.5, 6.5].map(y => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.7" fill="#fff" />
      )))}
    </>
  ),
  'United Kingdom': (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M15 0 V20 M0 10 H30" stroke="#fff" strokeWidth="6.5" />
      <path d="M15 0 V20 M0 10 H30" stroke="#C8102E" strokeWidth="3.5" />
    </>
  ),
  'Israel': (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect y="2" width="30" height="3" fill="#0038B8" />
      <rect y="15" width="30" height="3" fill="#0038B8" />
      <path d="M15 6.2 L18.3 12 H11.7 Z" fill="none" stroke="#0038B8" strokeWidth="1" />
      <path d="M15 13.8 L11.7 8 H18.3 Z" fill="none" stroke="#0038B8" strokeWidth="1" />
    </>
  ),
  'India': (
    <>
      <rect width="30" height="6.67" fill="#FF9933" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle cx="15" cy="10" r="2.2" fill="none" stroke="#000080" strokeWidth="0.8" />
      <circle cx="15" cy="10" r="0.55" fill="#000080" />
    </>
  ),
  'Sweden': (
    <>
      <rect width="30" height="20" fill="#006AA7" />
      <rect x="8" width="4" height="20" fill="#FECC02" />
      <rect y="8" width="30" height="4" fill="#FECC02" />
    </>
  ),
  'Finland': (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect x="8" width="5" height="20" fill="#003580" />
      <rect y="7.5" width="30" height="5" fill="#003580" />
    </>
  ),
  'Norway': (
    <>
      <rect width="30" height="20" fill="#BA0C2F" />
      <rect x="7" width="6" height="20" fill="#fff" />
      <rect y="7" width="30" height="6" fill="#fff" />
      <rect x="8.5" width="3" height="20" fill="#00205B" />
      <rect y="8.5" width="30" height="3" fill="#00205B" />
    </>
  ),
  'Iceland': (
    <>
      <rect width="30" height="20" fill="#02529C" />
      <rect x="7" width="6" height="20" fill="#fff" />
      <rect y="7" width="30" height="6" fill="#fff" />
      <rect x="8.5" width="3" height="20" fill="#DC1E35" />
      <rect y="8.5" width="30" height="3" fill="#DC1E35" />
    </>
  ),
  'Romania': (
    <>
      <rect width="10" height="20" fill="#002B7F" />
      <rect x="10" width="10" height="20" fill="#FCD116" />
      <rect x="20" width="10" height="20" fill="#CE1126" />
    </>
  ),
  'France': (
    <>
      <rect width="10" height="20" fill="#002395" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#ED2939" />
    </>
  ),
  'Ireland': (
    <>
      <rect width="10" height="20" fill="#169B62" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#FF883E" />
    </>
  ),
  'Italy': (
    <>
      <rect width="10" height="20" fill="#009246" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#CE2B37" />
    </>
  ),
  'Mexico': (
    <>
      <rect width="10" height="20" fill="#006847" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#CE1126" />
      <circle cx="15" cy="10" r="2" fill="#8C6239" opacity="0.85" />
    </>
  ),
  'Germany': (
    <>
      <rect width="30" height="6.67" fill="#000" />
      <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
      <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
    </>
  ),
  'Austria': (
    <>
      <rect width="30" height="6.67" fill="#ED2939" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#ED2939" />
    </>
  ),
  'Poland': (
    <>
      <rect width="30" height="10" fill="#fff" />
      <rect y="10" width="30" height="10" fill="#DC143C" />
    </>
  ),
  'Denmark': (
    <>
      <rect width="30" height="20" fill="#C8102E" />
      <rect x="8" width="3" height="20" fill="#fff" />
      <rect y="8.5" width="30" height="3" fill="#fff" />
    </>
  ),
  'Egypt': (
    <>
      <rect width="30" height="6.67" fill="#CE1126" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#000" />
      {/* Simplified golden Eagle of Saladin mark */}
      <circle cx="15" cy="10" r="1.8" fill="#C09300" />
    </>
  ),
  'Tunisia': (
    <>
      <rect width="30" height="20" fill="#E70013" />
      <circle cx="15" cy="10" r="5.2" fill="#fff" />
      <circle cx="15.8" cy="10" r="3.3" fill="#E70013" />
      <circle cx="16.8" cy="10" r="2.6" fill="#fff" />
      <path d="M17.2 7.7 l0.6 1.5 1.6 0.1 -1.2 1 0.4 1.6 -1.4 -0.9 -1.4 0.9 0.4 -1.6 -1.2 -1 1.6 -0.1 Z" fill="#E70013" />
    </>
  ),
  'Netherlands': (
    <>
      <rect width="30" height="6.67" fill="#AE1C28" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#21468B" />
    </>
  ),
  'Spain': (
    <>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </>
  ),
  'Japan': (
    <>
      <rect width="30" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="5.5" fill="#BC002D" />
    </>
  ),
  'South Korea': (
    <>
      <rect width="30" height="20" fill="#fff" />
      <path d="M15 5.5 A4.5 4.5 0 0 1 15 14.5 A2.25 2.25 0 0 1 15 10 A2.25 2.25 0 0 0 15 5.5" fill="#CD2E3A" />
      <path d="M15 14.5 A4.5 4.5 0 0 1 15 5.5 A2.25 2.25 0 0 1 15 10 A2.25 2.25 0 0 0 15 14.5" fill="#0047A0" />
      <g stroke="#000" strokeWidth="1">
        <path d="M4 4 l3.5 -2.3 M4.8 5.2 l3.5 -2.3 M5.6 6.4 l3.5 -2.3" transform="translate(0.2,1.5)" />
        <path d="M22.5 1.7 l3.5 2.3 M21.7 2.9 l3.5 2.3 M20.9 4.1 l3.5 2.3" transform="translate(0.2,-0.2)" />
        <path d="M4 16 l3.5 2.3 M4.8 14.8 l3.5 2.3 M5.6 13.6 l3.5 2.3" transform="translate(0.2,-1.3)" />
        <path d="M22.5 18.3 l3.5 -2.3 M21.7 17.1 l3.5 -2.3 M20.9 15.9 l3.5 -2.3" transform="translate(0.2,0.2)" />
      </g>
    </>
  ),
  'Canada': (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="7.5" height="20" fill="#FF0000" />
      <rect x="22.5" width="7.5" height="20" fill="#FF0000" />
      <path d="M15 4 l1.2 2.6 2.4 -0.7 -0.8 2.4 2.2 1.4 -2.6 1 0.3 2.5 -2.7 -1.4 -2.7 1.4 0.3 -2.5 -2.6 -1 2.2 -1.4 -0.8 -2.4 2.4 0.7 Z" fill="#FF0000" />
    </>
  ),
  'Australia': (
    <>
      <rect width="30" height="20" fill="#00008B" />
      <g transform="scale(0.45)">
        <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="4" />
        <path d="M15 0 V20 M0 10 H30" stroke="#fff" strokeWidth="6" />
        <path d="M15 0 V20 M0 10 H30" stroke="#C8102E" strokeWidth="3" />
      </g>
      <circle cx="7" cy="15" r="1.3" fill="#fff" />
      <circle cx="21" cy="4" r="0.9" fill="#fff" />
      <circle cx="25" cy="8" r="0.9" fill="#fff" />
      <circle cx="21" cy="13" r="0.9" fill="#fff" />
      <circle cx="26" cy="15.5" r="0.7" fill="#fff" />
    </>
  ),
  'New Zealand': (
    <>
      <rect width="30" height="20" fill="#012169" />
      <g transform="scale(0.45)">
        <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="4" />
        <path d="M15 0 V20 M0 10 H30" stroke="#fff" strokeWidth="6" />
        <path d="M15 0 V20 M0 10 H30" stroke="#C8102E" strokeWidth="3" />
      </g>
      <circle cx="21" cy="5" r="1" fill="#CC142B" stroke="#fff" strokeWidth="0.4" />
      <circle cx="25" cy="9" r="1" fill="#CC142B" stroke="#fff" strokeWidth="0.4" />
      <circle cx="21" cy="13" r="1" fill="#CC142B" stroke="#fff" strokeWidth="0.4" />
      <circle cx="23" cy="16.5" r="0.8" fill="#CC142B" stroke="#fff" strokeWidth="0.4" />
    </>
  ),
  'Puerto Rico': (
    <>
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} y={i * 4} width="30" height="4" fill={i % 2 === 0 ? '#EF3340' : '#fff'} />
      ))}
      <path d="M0 0 L13 10 L0 20 Z" fill="#0050F0" />
      <path d="M4.5 7.2 l0.9 1.9 2.1 0.3 -1.5 1.5 0.4 2.1 -1.9 -1 -1.9 1 0.4 -2.1 -1.5 -1.5 2.1 -0.3 Z" fill="#fff" />
    </>
  ),
  'Venezuela': (
    <>
      <rect width="30" height="6.67" fill="#FFCC00" />
      <rect y="6.67" width="30" height="6.67" fill="#00247D" />
      <rect y="13.33" width="30" height="6.67" fill="#CF142B" />
      {[-3, -2, -1, 0, 1, 2, 3].map(i => (
        <circle key={i} cx={15 + i * 2.6} cy={10 - Math.cos(i * 0.45) * 1.8 + 1.2} r="0.55" fill="#fff" />
      ))}
    </>
  ),
  'Colombia': (
    <>
      <rect width="30" height="10" fill="#FCD116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#CE1126" />
    </>
  ),
  'Argentina': (
    <>
      <rect width="30" height="6.67" fill="#74ACDF" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#74ACDF" />
      <circle cx="15" cy="10" r="2.2" fill="#F6B40E" />
      <circle cx="15" cy="10" r="1.1" fill="#85340A" opacity="0.6" />
    </>
  ),
  'Brazil': (
    <>
      <rect width="30" height="20" fill="#009B3A" />
      <path d="M15 3.1 L26 10 L15 16.9 L4 10 Z" fill="#FFDF00" />
      <circle cx="15" cy="10" r="4.7" fill="#002776" />
      <path d="M10.7 8.8 C13 8.1 16.9 8.6 19.4 10.8" fill="none" stroke="#fff" strokeWidth="1.05" />
      {[0, 1, 2, 3, 4].map(i => (
        <circle key={i} cx={12 + i * 1.55} cy={7.6 + (i % 2) * 0.9} r="0.28" fill="#fff" />
      ))}
    </>
  ),
  'Barbados': (
    <>
      <rect width="10" height="20" fill="#00267F" />
      <rect x="10" width="10" height="20" fill="#FFC726" />
      <rect x="20" width="10" height="20" fill="#00267F" />
      <path d="M15 5 v9 M12.2 6.5 c0 3 1 4.5 2.8 4.5 M17.8 6.5 c0 3 -1 4.5 -2.8 4.5" stroke="#000" strokeWidth="1.3" fill="none" />
    </>
  ),
  'South Africa': (
    <>
      <rect width="30" height="10" fill="#E03C31" />
      <rect y="10" width="30" height="10" fill="#001489" />
      <path d="M0 0 L13 10 L0 20 Z" fill="#fff" />
      <path d="M0 2 L11 10 L0 18 Z" fill="#000" />
      <path d="M0 3.5 L9.5 10 L0 16.5 Z" fill="#FFB81C" />
      <path d="M0 -1 L14 10 L0 21 L30 21 L30 13 L16 13 L16 7 L30 7 L30 -1 Z" fill="none" />
      <path d="M13 10 L30 10" stroke="#007749" strokeWidth="6" />
      <path d="M0 0 L13 10 L0 20" stroke="#007749" strokeWidth="6" fill="none" />
      <path d="M0 2.5 L11 10 L0 17.5" stroke="#FFB81C" strokeWidth="1.6" fill="none" />
      <path d="M0 4 L10 10 L0 16" fill="#000" />
      <path d="M13.5 8 L30 8 M13.5 12 L30 12" stroke="#fff" strokeWidth="1.6" />
      <path d="M0 -0.8 L14.2 9 M0 20.8 L14.2 11" stroke="#fff" strokeWidth="1.6" />
    </>
  ),
  'Wales': (
    <>
      <rect width="30" height="10" fill="#fff" />
      <rect y="10" width="30" height="10" fill="#00AB39" />
      <path
        d="M5 12.7 c2.4 -3.8 5.2 -5.1 8.2 -3.4 l2.2 -2.2 0.8 2.5 3.8 -1.6 -1 2.8 4 1.1 -3.6 1.2 1.2 3.2 -3.7 -1.9 -2.8 3.2 -1.1 -3.5 -4 2.2 1.5 -3.5 Z"
        fill="#D30731"
      />
    </>
  ),
  'Barbados_alt': null,
};


function GeneratedStripeFlag({ country }: { country: string }) {
  // Stable hash based on country name
  const hash = (str: string, seed: number) => {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };
  
  const h1 = hash(country, 987);
  const h2 = hash(country, 432);
  const h3 = hash(country, 115);

  const hue1 = h1 % 360;
  const hue2 = h2 % 360;
  const hue3 = h3 % 360;

  const c1 = `hsl(${hue1}, 80%, 42%)`;
  const c2 = `hsl(${hue2}, 75%, 48%)`;
  const c3 = `hsl(${hue3}, 85%, 38%)`;

  // Draw a beautiful 3-stripe design with a small glowing neonic circle in the center
  return (
    <>
      <rect width="30" height="6.67" fill={c1} />
      <rect y="6.67" width="30" height="6.67" fill={c2} />
      <rect y="13.33" width="30" height="6.67" fill={c3} />
      <circle cx="15" cy="10" r="2.2" fill="#ffffff" opacity="0.65" style={{ filter: 'drop-shadow(0 0 2px #fff)' }} />
    </>
  );
}

export default function FlagArt({ country, size = 20, className = '', title }: FlagArtProps) {
  const flag = FLAGS[country];
  const height = Math.round(size * (2 / 3));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 30 20"
      className={`shrink-0 ${className}`}
      style={{ borderRadius: Math.max(2, size * 0.12), overflow: 'hidden', boxShadow: '0 0 0 1px rgba(128,128,128,0.35)' }}
      role="img"
      aria-label={title ?? country}
    >
      <title>{title ?? country}</title>
      <clipPath id={`flag-clip-${country.replace(/[^a-zA-Z]/g, '')}`}>
        <rect width="30" height="20" rx="1.5" />
      </clipPath>
      <g clipPath={`url(#flag-clip-${country.replace(/[^a-zA-Z]/g, '')})`}>
        {flag ?? <GeneratedStripeFlag country={country} />}
      </g>
    </svg>
  );
}
