import type { CSSProperties } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import type { Lang } from '../utils/i18n';

const APP_BASE_URL = import.meta.env.BASE_URL;

export const CREATOR_CV_PATHS: Record<Lang, string> = {
  en: `${APP_BASE_URL}cv/kevin-cusnir-cv-en.pdf`,
  es: `${APP_BASE_URL}cv/kevin-cusnir-cv-es.pdf`,
  // A Hebrew-language PDF does not exist yet. Keep the destination honest and
  // stable by using the English CV while the visible Hebrew copy says so.
  he: `${APP_BASE_URL}cv/kevin-cusnir-cv-en.pdf`,
};

type CreatorCvLinkVariant = 'hero' | 'header' | 'menu';

interface CreatorCvLinkProps {
  lang: Lang;
  variant: CreatorCvLinkVariant;
  accent?: string;
  className?: string;
  style?: CSSProperties;
}

const COPY = {
  en: {
    aria: "Open Kevin Cusnir's CV in a new tab",
    hero: 'View my CV',
    menu: 'View my CV',
  },
  es: {
    aria: 'Abrir el CV de Kevin Cusnir en una pestaña nueva',
    hero: 'Ver mi CV',
    menu: 'Ver mi CV',
  },
  he: {
    aria: 'פתיחת קורות החיים של קווין קוסניר באנגלית בכרטיסייה חדשה',
    hero: 'לצפייה בקורות החיים (באנגלית)',
    menu: 'לצפייה בקורות החיים (באנגלית)',
  },
} as const satisfies Record<Lang, { aria: string; hero: string; menu: string }>;

const VARIANT_CLASSES: Record<CreatorCvLinkVariant, string> = {
  hero: 'nova-hero__cv-link',
  header: 'hidden min-h-11 items-center gap-2 rounded-full border px-3 font-mono text-xs font-bold transition-all md:flex',
  menu: 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start font-mono text-xs font-bold transition-colors hover:bg-white/5',
};

export default function CreatorCvLink({
  lang,
  variant,
  accent = '#00f2fe',
  className = '',
  style,
}: CreatorCvLinkProps) {
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
      href={CREATOR_CV_PATHS[lang]}
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
