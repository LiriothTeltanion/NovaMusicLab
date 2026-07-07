import React from 'react';

interface BrandIconProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export default function BrandIcon({ name, className = '', size = 16, color }: BrandIconProps) {
  const norm = name.toLowerCase().trim();

  // Pick color if not overridden
  const defaultColors: Record<string, string> = {
    spotify: '#1DB954',
    lastfm: '#d51007',
    youtube: '#FF0000',
    bandcamp: '#629aa9',
    discogs: '#e5c158',
    facebook: '#1877F2',
    instagram: '#E4405F',
    twitter: '#ffffff',
    x: '#ffffff',
    wikipedia: '#cccccc',
    wikidata: '#3a8ee6',
    musicbrainz: '#eb743b',
    soundcloud: '#ff7700',
    applemusic: '#fa243c',
  };

  const fill = color || defaultColors[norm] || 'currentColor';

  // SVG Paths
  switch (norm) {
    case 'spotify':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.892-1.007-.336.074-.67-.14-.744-.477-.074-.336.14-.67.477-.743 3.844-.88 7.135-.503 9.813 1.137.295.18.387.563.206.863zm1.224-2.724c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.182-.413.125-.848-.107-.973-.52-.125-.413.107-.847.52-.972 3.67-1.114 8.243-.574 11.343 1.33.367.226.487.707.26 1.074zm.106-2.833C14.385 8.8 8.442 8.6 5.018 9.64c-.524.16-1.07-.142-1.23-.667-.16-.524.143-1.07.667-1.23 3.934-1.2 10.51-.97 14.59 1.455.473.28.627.893.346 1.367-.28.473-.893.627-1.367.346z" />
        </svg>
      );
    case 'lastfm':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5.72 13.56c-.66.86-1.68 1.32-3.14 1.32-2.14 0-3.32-1.16-3.8-3.02l-.24-.96c-.36-1.38-.88-2.06-1.74-2.06-.92 0-1.52.74-1.52 2.06 0 1.28.6 2.04 1.5 2.04.56 0 1.06-.24 1.4-.7l.82.72c-.54.76-1.34 1.18-2.26 1.18-1.58 0-2.62-1.12-2.62-3.24 0-2.08 1.04-3.26 2.64-3.26 1.36 0 2.22.92 2.66 2.54l.24.96c.26 1.04.82 1.62 1.76 1.62.9 0 1.54-.36 1.94-1.26l1.24.42c-.22.68-.58 1.14-.94 1.38z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.387.507 9.387.507s7.517 0 9.387-.507a3.002 3.002 0 0 0 2.11-2.11C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'bandcamp':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M0 18.75h16.005L24 5.25H7.995L0 18.75z" />
        </svg>
      );
    case 'discogs':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case 'twitter':
    case 'x':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'soundcloud':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M11.56 16.51c0-.46.06-.9.18-1.32-.4-.28-.88-.47-1.42-.47-.5 0-.94.16-1.3.43v-5.63c0-.48-.39-.87-.87-.87s-.87.39-.87.87v6.61c.42.22.9.35 1.42.35.48 0 .93-.11 1.32-.32.32.22.7.35 1.12.35.42 0 .8-.13 1.12-.35-.3-.42-.5-.92-.5-1.46zM20.25 10.5c-2.07 0-3.75 1.68-3.75 3.75 0 2.07 1.68 3.75 3.75 3.75s3.75-1.68 3.75-3.75-1.68-3.75-3.75-3.75zM15.5 12.25c-1.24 0-2.25 1.01-2.25 2.25 0 1.24 1.01 2.25 2.25 2.25s2.25-1.01 2.25-2.25c0-1.24-1.01-2.25-2.25-2.25zM1.62 14.25c-.9 0-1.62.72-1.62 1.62s.72 1.62 1.62 1.62 1.62-.72 1.62-1.62-.72-1.62-1.62-1.62zM4.12 13.25c-.9 0-1.62.72-1.62 1.62s.72 1.62 1.62 1.62 1.62-.72 1.62-1.62-.72-1.62-1.62-1.62zM6.62 12.25c-.9 0-1.62.72-1.62 1.62s.72 1.62 1.62 1.62 1.62-.72 1.62-1.62-.72-1.62-1.62-1.62z" />
        </svg>
      );
    case 'applemusic':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} className={className}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.18 11.23c-.15 0-.31-.03-.45-.09l-3.32-1.42V7.47c0-.28-.22-.5-.5-.5H11.4c-.28 0-.5.22-.5.5v5.82c0 .24.17.45.41.49l3.77 1.62c.1.04.2.06.31.06.33 0 .61-.22.68-.54.1-.38-.13-.77-.52-.87-.1-.02-.19-.02-.29-.02z" />
        </svg>
      );
    case 'wikipedia':
    case 'wikidata':
    case 'musicbrainz':
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
}
