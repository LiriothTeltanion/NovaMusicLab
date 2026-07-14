import type { TopArtist } from '../types';
import type { LocalizedText } from '../utils/artistEnrichment';

/**
 * Lightweight, deterministic mood classification used by the landing and
 * ambient visuals. This module must remain free of dataset imports: deeper
 * artist facts live in emotionalEngine and are loaded with their dossiers.
 */

export interface EmotionalAxis {
  energy: number;
  valence: number;
  nostalgia: number;
  catharsis: number;
  focus: number;
  darkness: number;
}

export type EmotionalMoodKey =
  | 'melancolia'
  | 'energia'
  | 'dopamina'
  | 'calma'
  | 'nostalgia'
  | 'rebeldia'
  | 'futurismo'
  | 'romanticismo';

export interface EmotionalMoodTaxonomyItem {
  key: EmotionalMoodKey;
  color: string;
  icon: 'moon' | 'flame' | 'sun' | 'activity' | 'heart' | 'shield' | 'orbit' | 'sparkles';
  title: LocalizedText;
  shortLabel: LocalizedText;
  description: LocalizedText;
  ritual: LocalizedText;
}

export interface ArtistMoodProfile {
  artist: TopArtist;
  moodKey: EmotionalMoodKey;
  axis: EmotionalAxis;
  confidence: number;
}

export interface EmotionalItemMoodProfile {
  moodKey: EmotionalMoodKey;
  axis: EmotionalAxis;
  confidence: number;
}

export interface EmotionalMapEngineProfile {
  artists: ArtistMoodProfile[];
  dominantMood: EmotionalMoodTaxonomyItem;
  distribution: Array<{
    mood: EmotionalMoodTaxonomyItem;
    count: number;
    plays: number;
    pct: number;
  }>;
  averageAxis: EmotionalAxis;
}

export const EMOTIONAL_MOOD_TAXONOMY: Record<EmotionalMoodKey, EmotionalMoodTaxonomyItem> = {
  melancolia: {
    key: 'melancolia',
    color: '#00f2fe',
    icon: 'moon',
    title: { es: 'Melancolía / Introspección', en: 'Melancholy / Introspection', he: 'מלנכוליה / התבוננות פנימית' },
    shortLabel: { es: 'Melancolía', en: 'Melancholy', he: 'מלנכוליה' },
    description: {
      es: 'Música para procesar, recordar, caminar de noche y convertir tristeza en paisaje estético.',
      en: 'Music for processing, remembering, night walking and turning sadness into an aesthetic landscape.',
      he: 'מוזיקה שעוזרת לעבד רגשות, להיזכר, ללכת בלילה ולהפוך עצב לנוף אסתטי.',
    },
    ritual: {
      es: 'Cierra con una canción luminosa o una acción concreta para que el peso no se quede abierto.',
      en: 'Close with one luminous track or a concrete action so the weight does not stay open.',
      he: 'סיים בשיר מואר או בפעולה מוחשית, כדי לא להשאיר את הכובד פתוח.',
    },
  },
  energia: {
    key: 'energia',
    color: '#f72585',
    icon: 'flame',
    title: { es: 'Fuerza / Catarsis', en: 'Force / Catharsis', he: 'עוצמה / קתרזיס' },
    shortLabel: { es: 'Catarsis', en: 'Catharsis', he: 'קתרזיס' },
    description: {
      es: 'Música de presión, cuerpo, defensa y descarga emocional con dirección.',
      en: 'Music of pressure, body, defense and emotional release with direction.',
      he: 'מוזיקה של לחץ, גוף, הגנה ופריקה רגשית ממוקדת.',
    },
    ritual: {
      es: 'Úsala para moverte: entrenar, limpiar, caminar rápido o romper bloqueo mental.',
      en: 'Use it with movement: training, cleaning, fast walking or breaking a mental block.',
      he: 'השתמש בה תוך כדי תנועה: אימון, ניקיון, הליכה מהירה או שבירת מחסום מנטלי.',
    },
  },
  dopamina: {
    key: 'dopamina',
    color: '#ffb703',
    icon: 'sun',
    title: { es: 'Dopamina / Reinicio', en: 'Dopamine / Reset', he: 'דופמין / איפוס' },
    shortLabel: { es: 'Dopamina', en: 'Dopamine', he: 'דופמין' },
    description: {
      es: 'Música para levantar energía, jugar, recuperar humor y empezar tareas con menos fricción.',
      en: 'Music for raising energy, playing, recovering humor and starting tasks with less friction.',
      he: 'מוזיקה שמרימה את האנרגיה, מחזירה את מצב הרוח ועוזרת להתחיל משימות בפחות חיכוך.',
    },
    ritual: {
      es: 'Haz bloques cortos de 15-20 minutos para iniciar sin caer en estímulo infinito.',
      en: 'Use short 15-20 minute blocks to start without falling into endless stimulation.',
      he: 'עבוד במקטעים קצרים של 15–20 דקות, כדי להתחיל בלי להישאב לגירוי אינסופי.',
    },
  },
  calma: {
    key: 'calma',
    color: '#10b981',
    icon: 'activity',
    title: { es: 'Calma / Foco técnico', en: 'Calm / Technical Focus', he: 'רוגע / מיקוד טכני' },
    shortLabel: { es: 'Foco', en: 'Focus', he: 'מיקוד' },
    description: {
      es: 'Música para ordenar atención, sostener trabajo creativo y respirar sin apagar la imaginación.',
      en: 'Music for organizing attention, sustaining creative work and breathing without shutting imagination down.',
      he: 'מוזיקה שמסדרת את הקשב, תומכת בעבודה יצירתית ומאפשרת לנשום בלי לכבות את הדמיון.',
    },
    ritual: {
      es: 'Define una tarea antes de darle play y cierra el bloque con una canción cálida.',
      en: 'Define one task before pressing play and close the block with a warmer track.',
      he: 'הגדר משימה אחת לפני שאתה לוחץ על Play, וסיים את המקטע בשיר חם יותר.',
    },
  },
  nostalgia: {
    key: 'nostalgia',
    color: '#a78bfa',
    icon: 'heart',
    title: { es: 'Nostalgia / Memoria', en: 'Nostalgia / Memory', he: 'נוסטלגיה / זיכרון' },
    shortLabel: { es: 'Memoria', en: 'Memory', he: 'זיכרון' },
    description: {
      es: 'Música que convierte pasado, carreteras, ciudades y versiones antiguas de ti en estética útil.',
      en: 'Music that turns the past, highways, cities and older versions of you into useful aesthetics.',
      he: 'מוזיקה שהופכת את העבר, הכבישים, הערים והגרסאות הקודמות שלך לאסתטיקה שימושית.',
    },
    ritual: {
      es: 'Crea una playlist por era y termina con algo nuevo para traer la memoria al presente.',
      en: 'Make an era playlist and end with something new to bring memory into the present.',
      he: 'צור פלייליסט לכל תקופה וסיים במשהו חדש, כדי להביא את הזיכרון אל ההווה.',
    },
  },
  rebeldia: {
    key: 'rebeldia',
    color: '#ef4444',
    icon: 'shield',
    title: { es: 'Rebeldía / Supervivencia', en: 'Rebellion / Survival', he: 'מרדנות / הישרדות' },
    shortLabel: { es: 'Rebeldía', en: 'Rebellion', he: 'מרדנות' },
    description: {
      es: 'Música para marcar límites, cortar ruido externo y convertir cansancio en decisión.',
      en: 'Music for setting boundaries, cutting external noise and turning exhaustion into decision.',
      he: 'מוזיקה שעוזרת להציב גבולות, לחסום רעש חיצוני ולהפוך עייפות להחלטה.',
    },
    ritual: {
      es: 'Evita escucharla sentado en bucle: dale salida corporal o úsala como transición.',
      en: 'Avoid looping it while sitting still: give it a physical outlet or use it as transition.',
      he: 'אל תשמע אותה שוב ושוב בישיבה: תן לה מוצא גופני או השתמש בה כמעבר.',
    },
  },
  futurismo: {
    key: 'futurismo',
    color: '#7209b7',
    icon: 'orbit',
    title: { es: 'Futurismo / Night Drive', en: 'Futurism / Night Drive', he: 'עתידנות / נסיעת לילה' },
    shortLabel: { es: 'Futuro', en: 'Future', he: 'עתיד' },
    description: {
      es: 'Música de pantalla, velocidad, cyberpunk, diseño y construcción de mundos posibles.',
      en: 'Music of screens, speed, cyberpunk, design and possible-world building.',
      he: 'מוזיקה של מסכים, מהירות, סייברפאנק, עיצוב ובניית עולמות אפשריים.',
    },
    ritual: {
      es: 'Úsala para diseñar o programar, luego sal a caminar sin música para volver al cuerpo.',
      en: 'Use it to design or code, then walk without music to return to the body.',
      he: 'השתמש בה לעיצוב או לתכנות, ואז צא להליכה בלי מוזיקה כדי לחזור אל הגוף.',
    },
  },
  romanticismo: {
    key: 'romanticismo',
    color: '#ec4899',
    icon: 'sparkles',
    title: { es: 'Romanticismo oscuro', en: 'Dark Romanticism', he: 'רומנטיקה אפלה' },
    shortLabel: { es: 'Romance', en: 'Romance', he: 'רומנטיקה' },
    description: {
      es: 'Música donde vulnerabilidad, belleza dramática y memoria afectiva se vuelven escena.',
      en: 'Music where vulnerability, dramatic beauty and affective memory become a scene.',
      he: 'מוזיקה שבה פגיעות, יופי דרמטי וזיכרון רגשי הופכים לסצנה.',
    },
    ritual: {
      es: 'Úsala para escribir, diseñar personajes o cerrar el día con suavidad.',
      en: 'Use it for writing, character design or closing the day softly.',
      he: 'השתמש בה לכתיבה, לעיצוב דמויות או לסיום רך של היום.',
    },
  },
};

export const clampMoodScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function scoreAxisFromGenre(genre: string): EmotionalAxis {
  const text = genre.toLowerCase();
  const axis: EmotionalAxis = {
    energy: 48,
    valence: 50,
    nostalgia: 38,
    catharsis: 42,
    focus: 44,
    darkness: 42,
  };

  if (/(blackgaze|metalcore|post-hardcore|death|metal|hardcore|djent|grind|doom|industrial)/.test(text)) {
    axis.energy += 28;
    axis.catharsis += 34;
    axis.darkness += 25;
    axis.valence -= 15;
  }
  if (/(shoegaze|ambient|post-rock|dream|slowcore|blackgaze)/.test(text)) {
    axis.nostalgia += 24;
    axis.focus += 14;
    axis.darkness += 12;
    axis.energy -= 5;
  }
  if (/(synth|wave|electronic|retro|cyber|dance|edm|darksynth)/.test(text)) {
    axis.energy += 18;
    axis.nostalgia += 26;
    axis.focus += 12;
    axis.valence += 7;
  }
  if (/(emo|pop punk|post emo|sad|confessional|acoustic)/.test(text)) {
    axis.nostalgia += 21;
    axis.catharsis += 18;
    axis.valence -= 8;
    axis.darkness += 10;
  }
  if (/(pop|funk|r&b|indie|rap|hip hop|latin|reggaeton)/.test(text)) {
    axis.valence += 18;
    axis.energy += 12;
    axis.darkness -= 10;
  }

  return {
    energy: clampMoodScore(axis.energy),
    valence: clampMoodScore(axis.valence),
    nostalgia: clampMoodScore(axis.nostalgia),
    catharsis: clampMoodScore(axis.catharsis),
    focus: clampMoodScore(axis.focus),
    darkness: clampMoodScore(axis.darkness),
  };
}

export function blendEmotionalAxis(base: EmotionalAxis, influence: Partial<EmotionalAxis>): EmotionalAxis {
  return {
    energy: clampMoodScore(base.energy + (influence.energy ?? 0)),
    valence: clampMoodScore(base.valence + (influence.valence ?? 0)),
    nostalgia: clampMoodScore(base.nostalgia + (influence.nostalgia ?? 0)),
    catharsis: clampMoodScore(base.catharsis + (influence.catharsis ?? 0)),
    focus: clampMoodScore(base.focus + (influence.focus ?? 0)),
    darkness: clampMoodScore(base.darkness + (influence.darkness ?? 0)),
  };
}

export function classifyMoodKey(axis: EmotionalAxis, sourceText: string): EmotionalMoodKey {
  const text = sourceText.toLowerCase();

  if (/(synth|wave|cyber|darksynth|retro|electronic|industrial|future)/.test(text)) return 'futurismo';
  if (/(romantic|ballad|love|tokio hotel|holding absence|emarosa)/.test(text)) return 'romanticismo';
  if (/(blackgaze|shoegaze|ambient|post-rock|slowcore|hammock|alcest|deafheaven)/.test(text) && axis.nostalgia >= 52) {
    return 'melancolia';
  }
  if (/(metalcore|post-hardcore|hardcore|death|metal|bad omens|bring me|falling in reverse)/.test(text)) {
    return axis.darkness >= 66 ? 'rebeldia' : 'energia';
  }
  if (/(pop punk|emo-groove|funk|dance|latin|reggaeton|bilmuri|magnolia park)/.test(text)) return 'dopamina';
  if (axis.focus >= 62 && axis.energy <= 68) return 'calma';
  if (axis.catharsis >= 70 && axis.darkness >= 62) return 'rebeldia';
  if (axis.catharsis >= 66 || axis.energy >= 72) return 'energia';
  if (axis.nostalgia >= 66 && axis.valence >= 48) return 'nostalgia';
  if (axis.valence >= 62) return 'dopamina';
  if (axis.darkness >= 58 || axis.nostalgia >= 58) return 'melancolia';
  return 'calma';
}

export function moodConfidence(axis: EmotionalAxis, plays: number) {
  const strongest = Math.max(axis.energy, axis.valence, axis.nostalgia, axis.catharsis, axis.focus, axis.darkness);
  const archiveWeight = Math.min(18, Math.log10(Math.max(plays, 1)) * 5);
  return clampMoodScore(52 + strongest * 0.34 + archiveWeight);
}

export function buildCoreArtistMoodProfile(artist: TopArtist): ArtistMoodProfile {
  const sourceText = `${artist.genre} ${artist.name}`;
  const axis = scoreAxisFromGenre(sourceText);
  return {
    artist,
    moodKey: classifyMoodKey(axis, sourceText),
    axis,
    confidence: moodConfidence(axis, artist.plays),
  };
}

export function buildMusicItemMoodProfile(
  sourceText: string,
  plays: number,
  influence: Partial<EmotionalAxis> = {},
): EmotionalItemMoodProfile {
  const axis = blendEmotionalAxis(scoreAxisFromGenre(sourceText), influence);
  return {
    moodKey: classifyMoodKey(axis, sourceText),
    axis,
    confidence: moodConfidence(axis, plays),
  };
}

function averageAxis(profiles: ArtistMoodProfile[]): EmotionalAxis {
  if (!profiles.length) {
    return { energy: 0, valence: 0, nostalgia: 0, catharsis: 0, focus: 0, darkness: 0 };
  }
  const totals = profiles.reduce<EmotionalAxis>((acc, profile) => ({
    energy: acc.energy + profile.axis.energy,
    valence: acc.valence + profile.axis.valence,
    nostalgia: acc.nostalgia + profile.axis.nostalgia,
    catharsis: acc.catharsis + profile.axis.catharsis,
    focus: acc.focus + profile.axis.focus,
    darkness: acc.darkness + profile.axis.darkness,
  }), { energy: 0, valence: 0, nostalgia: 0, catharsis: 0, focus: 0, darkness: 0 });

  return {
    energy: clampMoodScore(totals.energy / profiles.length),
    valence: clampMoodScore(totals.valence / profiles.length),
    nostalgia: clampMoodScore(totals.nostalgia / profiles.length),
    catharsis: clampMoodScore(totals.catharsis / profiles.length),
    focus: clampMoodScore(totals.focus / profiles.length),
    darkness: clampMoodScore(totals.darkness / profiles.length),
  };
}

export function buildCoreEmotionalMapProfile(artists: TopArtist[], limit = 24): EmotionalMapEngineProfile {
  const profiles = artists.slice(0, limit).map(buildCoreArtistMoodProfile);
  const totalPlays = profiles.reduce((sum, profile) => sum + profile.artist.plays, 0);
  const distribution = (Object.values(EMOTIONAL_MOOD_TAXONOMY) as EmotionalMoodTaxonomyItem[])
    .map(mood => {
      const matching = profiles.filter(profile => profile.moodKey === mood.key);
      const plays = matching.reduce((sum, profile) => sum + profile.artist.plays, 0);
      return {
        mood,
        count: matching.length,
        plays,
        pct: totalPlays ? clampMoodScore((plays / totalPlays) * 100) : 0,
      };
    })
    .filter(item => item.count > 0)
    .sort((a, b) => b.plays - a.plays || b.count - a.count);

  return {
    artists: profiles,
    dominantMood: distribution[0]?.mood ?? EMOTIONAL_MOOD_TAXONOMY.calma,
    distribution,
    averageAxis: averageAxis(profiles),
  };
}
