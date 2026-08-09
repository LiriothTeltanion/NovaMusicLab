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
      label: 'Choose reading depth',
      guided: 'Guided',
      explore: 'Explore',
      'deep-dive': 'Deep Dive',
      guidedShort: 'Guided',
      exploreShort: 'Explore',
      'deep-diveShort': 'Details',
      guidedDescription: 'Simpler language and the key context in every room.',
      exploreDescription: 'Balanced explanations while every room stays available.',
      'deep-diveDescription': 'Show methods, sources, limits and advanced controls.',
    },
    es: {
      label: 'Elegir profundidad de lectura',
      guided: 'Guiado',
      explore: 'Explorar',
      'deep-dive': 'A fondo',
      guidedShort: 'Guía',
      exploreShort: 'Explora',
      'deep-diveShort': 'Detalle',
      guidedDescription: 'Lenguaje más simple y el contexto esencial en cada sala.',
      exploreDescription: 'Explicaciones equilibradas con todas las salas disponibles.',
      'deep-diveDescription': 'Muestra métodos, fuentes, límites y controles avanzados.',
    },
    he: {
      label: 'בחירת עומק הקריאה',
      guided: 'מודרך',
      explore: 'חקירה',
      'deep-dive': 'צלילה לעומק',
      guidedShort: 'מודרך',
      exploreShort: 'חקירה',
      'deep-diveShort': 'לעומק',
      guidedDescription: 'שפה פשוטה יותר וההקשר העיקרי בכל חדר.',
      exploreDescription: 'הסברים מאוזנים כאשר כל החדרים נשארים זמינים.',
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
