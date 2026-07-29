import { Map, Microscope, Sparkles } from 'lucide-react';

import { useExperience } from '../../context/ExperienceContext';
import { directionFor, pickLanguage, type Lang } from '../../utils/i18n';
import type { ExperienceDepth } from './museumNavigation';

interface ExperienceSwitcherProps {
  lang: Lang;
}

const EXPERIENCE_OPTIONS = [
  { id: 'guided' as const, icon: Sparkles },
  { id: 'explore' as const, icon: Map },
  { id: 'deep-dive' as const, icon: Microscope },
];

export default function ExperienceSwitcher({ lang }: ExperienceSwitcherProps) {
  const { experienceDepth, setExperienceDepth } = useExperience();
  const copy = pickLanguage(lang, {
    en: {
      label: 'Choose experience depth',
      guided: 'Guided',
      explore: 'Explore',
      'deep-dive': 'Deep Dive',
      guidedShort: 'Guided',
      exploreShort: 'Explore',
      'deep-diveShort': 'Details',
      guidedDescription: 'A step-by-step route with simple explanations.',
      exploreDescription: 'Browse every room with brief, clear context.',
      'deep-diveDescription': 'Show methods, sources, limits and advanced controls.',
    },
    es: {
      label: 'Elegir nivel de experiencia',
      guided: 'Guiado',
      explore: 'Explorar',
      'deep-dive': 'A fondo',
      guidedShort: 'Guía',
      exploreShort: 'Explora',
      'deep-diveShort': 'Detalle',
      guidedDescription: 'Te acompaña paso a paso con explicaciones simples.',
      exploreDescription: 'Recorre todas las salas con contexto breve y claro.',
      'deep-diveDescription': 'Muestra métodos, fuentes, límites y controles avanzados.',
    },
    he: {
      label: 'בחירת עומק החוויה',
      guided: 'מודרך',
      explore: 'חקירה',
      'deep-dive': 'צלילה לעומק',
      guidedShort: 'מודרך',
      exploreShort: 'חקירה',
      'deep-diveShort': 'לעומק',
      guidedDescription: 'מסלול צעד־אחר־צעד עם הסברים פשוטים.',
      exploreDescription: 'מעבר חופשי בין כל החדרים, עם הקשר קצר וברור.',
      'deep-diveDescription': 'הצגת שיטות, מקורות, מגבלות וכלים מתקדמים.',
    },
  });

  const compactLabels: Record<ExperienceDepth, string> = {
    guided: copy.guidedShort,
    explore: copy.exploreShort,
    'deep-dive': copy['deep-diveShort'],
  };

  return (
    <div
      className="expedition-journey"
      role="group"
      aria-label={copy.label}
      dir={directionFor(lang)}
      data-testid="experience-switcher"
    >
      {EXPERIENCE_OPTIONS.map(({ id, icon: Icon }) => {
        const active = id === experienceDepth;
        return (
          <button
            key={id}
            type="button"
            className="expedition-journey__option"
            onClick={() => setExperienceDepth(id)}
            aria-pressed={active}
            aria-label={copy[id]}
            aria-describedby={active ? 'experience-depth-description' : undefined}
            title={copy[`${id}Description`]}
            data-experience-depth={id}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="expedition-journey__label expedition-journey__label--full">
              {copy[id]}
            </span>
            <span
              className="expedition-journey__label expedition-journey__label--compact"
              aria-hidden="true"
            >
              {compactLabels[id]}
            </span>
          </button>
        );
      })}
      <p
        id="experience-depth-description"
        className="expedition-journey__description"
        aria-live="polite"
      >
        {copy[`${experienceDepth}Description`]}
      </p>
    </div>
  );
}
