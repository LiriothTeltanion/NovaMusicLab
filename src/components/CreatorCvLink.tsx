import type { CSSProperties } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import type { Lang } from '../utils/i18n';

type CreatorCvLinkVariant = 'hero' | 'header' | 'menu';

interface CreatorCvLinkProps {
  lang: Lang;
  variant: CreatorCvLinkVariant;
  accent?: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Optional public HTTPS destination. The production app intentionally omits
   * the CTA when no reviewed public CV URL is configured.
   */
  href?: string | null;
}

const COPY = {
  en: {
    aria: "Open Kevin Cusnir's public CV in a new tab",
    hero: 'View my CV',
    menu: 'View my CV',
  },
  es: {
    aria: 'Abrir el CV público de Kevin Cusnir en una pestaña nueva',
    hero: 'Ver mi CV',
    menu: 'Ver mi CV',
  },
  he: {
    aria: 'פתיחת קורות החיים הציבוריים של קווין קוסניר בכרטיסייה חדשה',
    hero: 'לצפייה בקורות החיים',
    menu: 'לצפייה בקורות החיים',
  },
} as const satisfies Record<Lang, { aria: string; hero: string; menu: string }>;

const VARIANT_CLASSES: Record<CreatorCvLinkVariant, string> = {
  hero: 'nova-hero__cv-link',
  header: 'hidden min-h-11 items-center gap-2 rounded-full border px-3 font-mono text-xs font-bold transition-all md:flex',
  menu: 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start font-mono text-xs font-bold transition-colors hover:bg-white/5',
};

function normalizePublicUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const CONFIGURED_CV_URLS: Partial<Record<Lang, string>> = {
  en: import.meta.env.VITE_CREATOR_CV_EN_URL,
  es: import.meta.env.VITE_CREATOR_CV_ES_URL,
  he: import.meta.env.VITE_CREATOR_CV_HE_URL,
};

export function creatorCvUrlFor(lang: Lang): string | null {
  const localizedUrl = normalizePublicUrl(CONFIGURED_CV_URLS[lang]);
  if (localizedUrl) return localizedUrl;

  // Hebrew may deliberately use a reviewed English public CV, but the app no
  // longer assumes that a private/local PDF exists in the public bundle.
  return lang === 'he' ? normalizePublicUrl(CONFIGURED_CV_URLS.en) : null;
}

export default function CreatorCvLink({
  lang,
  variant,
  accent = '#00f2fe',
  className = '',
  style,
  href,
}: CreatorCvLinkProps) {
  const publicUrl = normalizePublicUrl(href) ?? (href === undefined ? creatorCvUrlFor(lang) : null);
  if (!publicUrl) return null;

  const copy = COPY[lang];
  const themedStyle = variant === 'hero'
    ? style
    : {
        borderColor: variant === 'header' ? `${accent}38` : undefined,
        backgroundColor: variant === 'header' ? `${accent}0c` : undefined,
        color: accent,
        ...style,
      };

  return (
    <a
      href={publicUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.aria}
      data-testid={`${variant}-cv-link`}
      className={`${VARIANT_CLASSES[variant]} ${className}`.trim()}
      style={themedStyle}
    >
      <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
      {variant === 'header' ? (
        <>
          <span className="hidden xl:inline">Kevin Cusnir</span>
          <strong>CV</strong>
        </>
      ) : (
        <span>{variant === 'hero' ? copy.hero : copy.menu}</span>
      )}
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}
