import { FlaskConical, Map, Sparkles } from 'lucide-react';

import { directionFor, pickLanguage, type Lang } from '../../utils/i18n';
import type { ExpeditionJourneyId } from './expeditionJourney';

interface JourneySwitcherProps {
  activeJourney: ExpeditionJourneyId;
  lang: Lang;
  onChange: (journey: ExpeditionJourneyId) => void;
}

const JOURNEYS = [
  { id: 'quick' as const, icon: Sparkles },
  { id: 'full' as const, icon: Map },
  { id: 'lab' as const, icon: FlaskConical },
];

export default function JourneySwitcher({ activeJourney, lang, onChange }: JourneySwitcherProps) {
  const copy = pickLanguage(lang, {
    en: {
      label: 'Choose museum journey',
      quick: 'Quick Tour',
      full: 'Full Museum',
      lab: 'Lab Tools',
      quickShort: 'Quick',
      fullShort: 'Museum',
      labShort: 'Lab',
      quickDescription: 'A cinematic route through the essential rooms',
      fullDescription: 'Every exhibition and archive room',
      labDescription: 'Analysis, comparison and archive tools',
    },
    es: {
      label: 'Elegir recorrido del museo',
      quick: 'Tour rápido',
      full: 'Museo completo',
      lab: 'Herramientas',
      quickShort: 'Rápido',
      fullShort: 'Museo',
      labShort: 'Lab',
      quickDescription: 'Un recorrido cinematográfico por las salas esenciales',
      fullDescription: 'Todas las exposiciones y salas del archivo',
      labDescription: 'Análisis, comparación y herramientas del archivo',
    },
    he: {
      label: 'בחירת מסלול במוזיאון',
      quick: 'סיור מהיר',
      full: 'המוזיאון המלא',
      lab: 'כלי מעבדה',
      quickShort: 'מהיר',
      fullShort: 'מוזיאון',
      labShort: 'כלים',
      quickDescription: 'מסלול קולנועי בין החדרים המרכזיים',
      fullDescription: 'כל התערוכות וחדרי הארכיון',
      labDescription: 'כלי ניתוח, השוואה וניהול הארכיון',
    },
  });
  const compactLabels = {
    quick: copy.quickShort,
    full: copy.fullShort,
    lab: copy.labShort,
  };

  return (
    <div
      className="expedition-journey"
      role="group"
      aria-label={copy.label}
      dir={directionFor(lang)}
      data-testid="journey-switcher"
    >
      {JOURNEYS.map(({ id, icon: Icon }) => {
        const active = id === activeJourney;
        return (
          <button
            key={id}
            type="button"
            className="expedition-journey__option"
            onClick={() => onChange(id)}
            aria-pressed={active}
            aria-label={copy[id]}
            title={copy[`${id}Description` as const]}
            data-journey={id}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="expedition-journey__label expedition-journey__label--full">{copy[id]}</span>
            <span className="expedition-journey__label expedition-journey__label--compact" aria-hidden="true">
              {compactLabels[id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
