import type { Lang } from './i18n';

const DAYPART_LABELS: Record<string, Record<Lang, string>> = {
  'Madrugada 00-05': {
    es: 'Madrugada 00-05',
    en: 'Late night 00-05',
    he: 'לפנות בוקר 00–05',
  },
  'Mañana 06-11': {
    es: 'Mañana 06-11',
    en: 'Morning 06-11',
    he: 'בוקר 06–11',
  },
  'Tarde 12-17': {
    es: 'Tarde 12-17',
    en: 'Afternoon 12-17',
    he: 'אחר הצהריים 12–17',
  },
  'Noche 18-23': {
    es: 'Noche 18-23',
    en: 'Night 18-23',
    he: 'ערב ולילה 18–23',
  },
};

const ERA_LABELS: Record<string, Record<Lang, string>> = {
  'Era Darksynth & Metal Prog': {
    es: 'Era Darksynth & Metal Prog',
    en: 'Darksynth & Prog Metal Era',
    he: "תקופת דארקסינת' ומטאל פרוגרסיבי",
  },
  'Era Neon Glam & Melodías': {
    es: 'Era Neon Glam & Melodías',
    en: 'Neon Glam & Melodies Era',
    he: 'תקופת ניאון גלאם ומלודיות',
  },
  'Era Atmósferas Ocultas': {
    es: 'Era Atmósferas Ocultas',
    en: 'Hidden Atmospheres Era',
    he: 'תקופת האטמוספרות הנסתרות',
  },
  'Era Rock Israelí & Hard Rock': {
    es: 'Era Rock Israelí & Hard Rock',
    en: 'Israeli Rock & Hard Rock Era',
    he: 'תקופת הרוק הישראלי וההארד רוק',
  },
  'Era Catarsis Post-Hardcore': {
    es: 'Era Catarsis Post-Hardcore',
    en: 'Post-Hardcore Catharsis Era',
    he: 'תקופת הקתרזיס בפוסט־הארדקור',
  },
  'Era Caos Divertido & BMTH': {
    es: 'Era Caos Divertido & BMTH',
    en: 'Playful Chaos & BMTH Era',
    he: 'תקופת הכאוס השובב ו־BMTH',
  },
  'Era Blackgaze Luminoso': {
    es: 'Era Blackgaze Luminoso',
    en: 'Luminous Blackgaze Era',
    he: 'תקופת הבלאקגייז הזוהר',
  },
  'Era Deafheaven & Emo-Pop': {
    es: 'Era Deafheaven & Emo-Pop',
    en: 'Deafheaven & Emo-Pop Era',
    he: 'תקופת Deafheaven והאימו־פופ',
  },
  'Era Alt-Moderno & Pop-Punk': {
    es: 'Era Alt-Moderno & Pop-Punk',
    en: 'Modern Alt & Pop-Punk Era',
    he: 'תקופת האלטרנטיב המודרני והפופ־פאנק',
  },
  'Era Groove Emocional': {
    es: 'Era Groove Emocional',
    en: 'Emotional Groove Era',
    he: 'תקופת הגרוב הרגשי',
  },
  'Era Emo Rap & Recuperación': {
    es: 'Era Emo Rap & Recuperación',
    en: 'Emo Rap & Recovery Era',
    he: 'תקופת האימו־ראפ וההתאוששות',
  },
  'Era Energía & Dopamina Moderna': {
    es: 'Era Energía & Dopamina Moderna',
    en: 'Modern Energy & Dopamine Era',
    he: 'תקופת האנרגיה והדופמין המודרניים',
  },
};

export function localizeDaypart(daypart: string, lang: Lang) {
  return DAYPART_LABELS[daypart]?.[lang] ?? daypart;
}

export function localizeEraLabel(label: string, lang: Lang) {
  const dynamicEra = label.match(/^Era de (.+)$/);
  if (dynamicEra?.[1]) {
    if (lang === 'en') return `${dynamicEra[1]} Era`;
    if (lang === 'he') return `תקופת ${dynamicEra[1]}`;
  }

  return ERA_LABELS[label]?.[lang] ?? label;
}
