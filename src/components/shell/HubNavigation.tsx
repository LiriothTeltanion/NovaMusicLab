import { BookOpenText, FlaskConical, House, MapPinned, Radio } from 'lucide-react';

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
      label: 'Museum hubs',
      select: 'Choose a museum hub',
      home: 'Home',
      pulse: 'Pulse',
      atlas: 'Atlas',
      stories: 'Stories',
      lab: 'Data Lab',
    },
    es: {
      label: 'Centros del museo',
      select: 'Elegir un centro del museo',
      home: 'Inicio',
      pulse: 'Pulso',
      atlas: 'Atlas',
      stories: 'Historias',
      lab: 'Lab de Datos',
    },
    he: {
      label: 'מרכזי המוזיאון',
      select: 'בחירת מרכז במוזיאון',
      home: 'בית',
      pulse: 'דופק',
      atlas: 'אטלס',
      stories: 'סיפורים',
      lab: 'מעבדת נתונים',
    },
  });

  return (
    <nav className="museum-hub-nav" aria-label={copy.label} dir={directionFor(lang)}>
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
    </nav>
  );
}
