import type { Lang } from '../context/AppContext';

const DAYPART_LABELS: Record<string, Record<Lang, string>> = {
  'Madrugada 00-05': {
    es: 'Madrugada 00-05',
    en: 'Late night 00-05',
  },
  'Mañana 06-11': {
    es: 'Mañana 06-11',
    en: 'Morning 06-11',
  },
  'Tarde 12-17': {
    es: 'Tarde 12-17',
    en: 'Afternoon 12-17',
  },
  'Noche 18-23': {
    es: 'Noche 18-23',
    en: 'Night 18-23',
  },
};

const ERA_LABELS: Record<string, Record<Lang, string>> = {
  'Era Darksynth & Metal Prog': {
    es: 'Era Darksynth & Metal Prog',
    en: 'Darksynth & Prog Metal Era',
  },
  'Era Neon Glam & Melodías': {
    es: 'Era Neon Glam & Melodías',
    en: 'Neon Glam & Melodies Era',
  },
  'Era Atmósferas Ocultas': {
    es: 'Era Atmósferas Ocultas',
    en: 'Hidden Atmospheres Era',
  },
  'Era Rock Israelí & Hard Rock': {
    es: 'Era Rock Israelí & Hard Rock',
    en: 'Israeli Rock & Hard Rock Era',
  },
  'Era Catarsis Post-Hardcore': {
    es: 'Era Catarsis Post-Hardcore',
    en: 'Post-Hardcore Catharsis Era',
  },
  'Era Caos Divertido & BMTH': {
    es: 'Era Caos Divertido & BMTH',
    en: 'Playful Chaos & BMTH Era',
  },
  'Era Blackgaze Luminoso': {
    es: 'Era Blackgaze Luminoso',
    en: 'Luminous Blackgaze Era',
  },
  'Era Deafheaven & Emo-Pop': {
    es: 'Era Deafheaven & Emo-Pop',
    en: 'Deafheaven & Emo-Pop Era',
  },
  'Era Alt-Moderno & Pop-Punk': {
    es: 'Era Alt-Moderno & Pop-Punk',
    en: 'Modern Alt & Pop-Punk Era',
  },
  'Era Groove Emocional': {
    es: 'Era Groove Emocional',
    en: 'Emotional Groove Era',
  },
  'Era Emo Rap & Recuperación': {
    es: 'Era Emo Rap & Recuperación',
    en: 'Emo Rap & Recovery Era',
  },
  'Era Energía & Dopamina Moderna': {
    es: 'Era Energía & Dopamina Moderna',
    en: 'Modern Energy & Dopamine Era',
  },
};

export function localizeDaypart(daypart: string, lang: Lang) {
  return DAYPART_LABELS[daypart]?.[lang] ?? daypart;
}

export function localizeEraLabel(label: string, lang: Lang) {
  if (lang === 'en') {
    const dynamicEra = label.match(/^Era de (.+)$/);
    if (dynamicEra?.[1]) return `${dynamicEra[1]} Era`;
  }

  return ERA_LABELS[label]?.[lang] ?? label;
}
