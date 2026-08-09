import { BookOpenText, FlaskConical, House, Map, MapPinned, Radio } from 'lucide-react';

import { directionFor, pickLanguage, type Lang } from '../../utils/i18n';
import type { MuseumHubId } from './museumNavigation';
import './HubNavigation.css';

interface HubNavigationProps {
  activeHub: MuseumHubId;
  lang: Lang;
  onSelect: (hub: MuseumHubId) => void;
}

const HUBS = [
  { id: 'home' as const, icon: House },
  { id: 'pulse' as const, icon: Radio },
  { id: 'atlas' as const, icon: MapPinned },
  { id: 'stories' as const, icon: BookOpenText },
  { id: 'lab' as const, icon: FlaskConical },
];

export default function HubNavigation({ activeHub, lang, onSelect }: HubNavigationProps) {
  const copy = pickLanguage(lang, {
    en: {
      label: 'Museum map',
      eyebrow: 'Quick route',
      current: 'Current hub',
      select: 'Choose a museum hub',
      home: 'Overview',
      pulse: 'Pulse',
      atlas: 'Artists',
      stories: 'Stories',
      lab: 'Create',
    },
    es: {
      label: 'Mapa del museo',
      eyebrow: 'Ruta rápida',
      current: 'Centro actual',
      select: 'Elegir un centro del museo',
      home: 'Resumen',
      pulse: 'Pulso',
      atlas: 'Artistas',
      stories: 'Historias',
      lab: 'Crear',
    },
    he: {
      label: 'מפת המוזיאון',
      eyebrow: 'מסלול מהיר',
      current: 'המרכז הנוכחי',
      select: 'בחירת מרכז במוזיאון',
      home: 'סקירה',
      pulse: 'דופק',
      atlas: 'אמנים',
      stories: 'סיפורים',
      lab: 'יצירה',
    },
  });

  return (
    <nav
      className="museum-hub-nav"
      aria-label={copy.label}
      data-testid="museum-map-dock"
      dir={directionFor(lang)}
    >
      <span className="museum-hub-nav__identity">
        <span className="museum-hub-nav__mark" aria-hidden="true">
          <Map className="h-4 w-4" />
        </span>
        <span>
          <small>{copy.eyebrow}</small>
          <strong>{copy.label}</strong>
        </span>
      </span>

      <label className="museum-hub-nav__mobile">
        <span className="sr-only">{copy.select}</span>
        <select
          value={activeHub}
          onChange={event => onSelect(event.target.value as MuseumHubId)}
          aria-label={copy.select}
        >
          {HUBS.map(hub => (
            <option key={hub.id} value={hub.id}>{copy[hub.id]}</option>
          ))}
        </select>
      </label>

      <div className="museum-hub-nav__desktop" role="list">
        {HUBS.map(({ id, icon: Icon }) => {
          const active = id === activeHub;
          return (
            <span key={id} role="listitem">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={copy[id]}
                title={copy[id]}
                onClick={() => onSelect(id)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{copy[id]}</span>
              </button>
            </span>
          );
        })}
      </div>

      <span className="museum-hub-nav__context" aria-live="polite">
        <small>{copy.current}</small>
        <strong>{copy[activeHub]}</strong>
      </span>
    </nav>
  );
}
