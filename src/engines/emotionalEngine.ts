import type { TopAlbum, TopArtist, TopTrack, YearlyEra } from '../types';
import type { ArtistAlbumEnrichment, ArtistEnrichment, LocalizedText } from '../utils/artistEnrichment';
import { getOfflineArtistKnowledge, getOfflineArtistSourceText } from '../utils/offlineArtistKnowledge';

export type EmotionalEngineLang = 'es' | 'en';

export interface EmotionalAxis {
  energy: number;
  valence: number;
  nostalgia: number;
  catharsis: number;
  focus: number;
  darkness: number;
}

export interface EmotionalEngineReading {
  moodKey: EmotionalMoodKey;
  moodConfidence: number;
  primaryEmotion: LocalizedText;
  secondaryEmotion: LocalizedText;
  intensityLabel: LocalizedText;
  longNarrative: LocalizedText;
  listeningUse: LocalizedText;
  evidence: {
    es: string[];
    en: string[];
  };
  axis: EmotionalAxis;
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

interface ArtistReadingInput {
  artist: TopArtist;
  profile?: ArtistEnrichment;
  albums: TopAlbum[];
  tracks: TopTrack[];
  eras: YearlyEra[];
}

interface AlbumReadingInput {
  album: TopAlbum;
  artist?: TopArtist;
  profile?: ArtistEnrichment;
  albumMeta?: ArtistAlbumEnrichment;
  rank: number;
  artistTracks: TopTrack[];
  catalogIndex: number;
}

interface TrackReadingInput {
  track: TopTrack;
  artist?: TopArtist;
  profile?: ArtistEnrichment;
  rank: number;
  artistTracks: TopTrack[];
  artistAlbums: TopAlbum[];
  eras: YearlyEra[];
}

export const EMOTIONAL_MOOD_TAXONOMY: Record<EmotionalMoodKey, EmotionalMoodTaxonomyItem> = {
  melancolia: {
    key: 'melancolia',
    color: '#00f2fe',
    icon: 'moon',
    title: { es: 'Melancolía / Introspección', en: 'Melancholy / Introspection' },
    shortLabel: { es: 'Melancolía', en: 'Melancholy' },
    description: {
      es: 'Música para procesar, recordar, caminar de noche y convertir tristeza en paisaje estético.',
      en: 'Music for processing, remembering, night walking and turning sadness into an aesthetic landscape.',
    },
    ritual: {
      es: 'Cierra con una canción luminosa o una acción concreta para que el peso no se quede abierto.',
      en: 'Close with one luminous track or a concrete action so the weight does not stay open.',
    },
  },
  energia: {
    key: 'energia',
    color: '#f72585',
    icon: 'flame',
    title: { es: 'Fuerza / Catarsis', en: 'Force / Catharsis' },
    shortLabel: { es: 'Catarsis', en: 'Catharsis' },
    description: {
      es: 'Música de presión, cuerpo, defensa y descarga emocional con dirección.',
      en: 'Music of pressure, body, defense and emotional release with direction.',
    },
    ritual: {
      es: 'Úsala para moverte: entrenar, limpiar, caminar rápido o romper bloqueo mental.',
      en: 'Use it with movement: training, cleaning, fast walking or breaking a mental block.',
    },
  },
  dopamina: {
    key: 'dopamina',
    color: '#ffb703',
    icon: 'sun',
    title: { es: 'Dopamina / Reinicio', en: 'Dopamine / Reset' },
    shortLabel: { es: 'Dopamina', en: 'Dopamine' },
    description: {
      es: 'Música para levantar energía, jugar, recuperar humor y empezar tareas con menos fricción.',
      en: 'Music for raising energy, playing, recovering humor and starting tasks with less friction.',
    },
    ritual: {
      es: 'Haz bloques cortos de 15-20 minutos para iniciar sin caer en estímulo infinito.',
      en: 'Use short 15-20 minute blocks to start without falling into endless stimulation.',
    },
  },
  calma: {
    key: 'calma',
    color: '#10b981',
    icon: 'activity',
    title: { es: 'Calma / Foco técnico', en: 'Calm / Technical Focus' },
    shortLabel: { es: 'Foco', en: 'Focus' },
    description: {
      es: 'Música para ordenar atención, sostener trabajo creativo y respirar sin apagar la imaginación.',
      en: 'Music for organizing attention, sustaining creative work and breathing without shutting imagination down.',
    },
    ritual: {
      es: 'Define una tarea antes de darle play y cierra el bloque con una canción cálida.',
      en: 'Define one task before pressing play and close the block with a warmer track.',
    },
  },
  nostalgia: {
    key: 'nostalgia',
    color: '#a78bfa',
    icon: 'heart',
    title: { es: 'Nostalgia / Memoria', en: 'Nostalgia / Memory' },
    shortLabel: { es: 'Memoria', en: 'Memory' },
    description: {
      es: 'Música que convierte pasado, carreteras, ciudades y versiones antiguas de ti en estética útil.',
      en: 'Music that turns the past, highways, cities and older versions of you into useful aesthetics.',
    },
    ritual: {
      es: 'Crea una playlist por era y termina con algo nuevo para traer la memoria al presente.',
      en: 'Make an era playlist and end with something new to bring memory into the present.',
    },
  },
  rebeldia: {
    key: 'rebeldia',
    color: '#ef4444',
    icon: 'shield',
    title: { es: 'Rebeldía / Supervivencia', en: 'Rebellion / Survival' },
    shortLabel: { es: 'Rebeldía', en: 'Rebellion' },
    description: {
      es: 'Música para marcar límites, cortar ruido externo y convertir cansancio en decisión.',
      en: 'Music for setting boundaries, cutting external noise and turning exhaustion into decision.',
    },
    ritual: {
      es: 'Evita escucharla sentado en bucle: dale salida corporal o úsala como transición.',
      en: 'Avoid looping it while sitting still: give it a physical outlet or use it as transition.',
    },
  },
  futurismo: {
    key: 'futurismo',
    color: '#7209b7',
    icon: 'orbit',
    title: { es: 'Futurismo / Night Drive', en: 'Futurism / Night Drive' },
    shortLabel: { es: 'Futuro', en: 'Future' },
    description: {
      es: 'Música de pantalla, velocidad, cyberpunk, diseño y construcción de mundos posibles.',
      en: 'Music of screens, speed, cyberpunk, design and possible-world building.',
    },
    ritual: {
      es: 'Úsala para diseñar o programar, luego sal a caminar sin música para volver al cuerpo.',
      en: 'Use it to design or code, then walk without music to return to the body.',
    },
  },
  romanticismo: {
    key: 'romanticismo',
    color: '#ec4899',
    icon: 'sparkles',
    title: { es: 'Romanticismo oscuro', en: 'Dark Romanticism' },
    shortLabel: { es: 'Romance', en: 'Romance' },
    description: {
      es: 'Música donde vulnerabilidad, belleza dramática y memoria afectiva se vuelven escena.',
      en: 'Music where vulnerability, dramatic beauty and affective memory become a scene.',
    },
    ritual: {
      es: 'Úsala para escribir, diseñar personajes o cerrar el día con suavidad.',
      en: 'Use it for writing, character design or closing the day softly.',
    },
  },
};

const EMOTION_LEXICON = {
  catharsis: {
    es: 'catarsis',
    en: 'catharsis',
  },
  tension: {
    es: 'tensión',
    en: 'tension',
  },
  nostalgia: {
    es: 'nostalgia luminosa',
    en: 'luminous nostalgia',
  },
  melancholy: {
    es: 'melancolía',
    en: 'melancholy',
  },
  focus: {
    es: 'foco',
    en: 'focus',
  },
  euphoria: {
    es: 'dopamina',
    en: 'dopamine',
  },
  intimacy: {
    es: 'intimidad',
    en: 'intimacy',
  },
  movement: {
    es: 'movimiento',
    en: 'movement',
  },
} as const;

const INTENSITY_LABELS = {
  veryHigh: {
    es: 'alta intensidad emocional',
    en: 'high emotional intensity',
  },
  high: {
    es: 'intensidad sostenida',
    en: 'sustained intensity',
  },
  medium: {
    es: 'presencia emocional estable',
    en: 'stable emotional presence',
  },
  low: {
    es: 'señal emocional secundaria',
    en: 'secondary emotional signal',
  },
} as const;

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function normalizeText(value: string) {
  return value.toLowerCase();
}

function genreText(parts: Array<string | undefined>) {
  return normalizeText(parts.filter(Boolean).join(' '));
}

function scoreAxisFromGenre(genre: string): EmotionalAxis {
  const text = normalizeText(genre);
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
    energy: clampScore(axis.energy),
    valence: clampScore(axis.valence),
    nostalgia: clampScore(axis.nostalgia),
    catharsis: clampScore(axis.catharsis),
    focus: clampScore(axis.focus),
    darkness: clampScore(axis.darkness),
  };
}

function blendAxis(base: EmotionalAxis, influence: Partial<EmotionalAxis>): EmotionalAxis {
  return {
    energy: clampScore(base.energy + (influence.energy ?? 0)),
    valence: clampScore(base.valence + (influence.valence ?? 0)),
    nostalgia: clampScore(base.nostalgia + (influence.nostalgia ?? 0)),
    catharsis: clampScore(base.catharsis + (influence.catharsis ?? 0)),
    focus: clampScore(base.focus + (influence.focus ?? 0)),
    darkness: clampScore(base.darkness + (influence.darkness ?? 0)),
  };
}

function dominantEmotion(axis: EmotionalAxis): LocalizedText {
  const candidates = [
    { key: EMOTION_LEXICON.catharsis, value: axis.catharsis + axis.energy * 0.25 },
    { key: EMOTION_LEXICON.nostalgia, value: axis.nostalgia + axis.valence * 0.12 },
    { key: EMOTION_LEXICON.focus, value: axis.focus + (100 - axis.energy) * 0.1 },
    { key: EMOTION_LEXICON.melancholy, value: axis.darkness + axis.nostalgia * 0.15 },
    { key: EMOTION_LEXICON.euphoria, value: axis.valence + axis.energy * 0.15 },
  ].sort((a, b) => b.value - a.value);

  return candidates[0].key;
}

function secondaryEmotion(axis: EmotionalAxis): LocalizedText {
  if (axis.darkness >= 68 && axis.catharsis >= 60) return EMOTION_LEXICON.tension;
  if (axis.nostalgia >= 62 && axis.focus >= 52) return EMOTION_LEXICON.intimacy;
  if (axis.energy >= 65 && axis.valence >= 55) return EMOTION_LEXICON.movement;
  if (axis.focus >= 62) return EMOTION_LEXICON.focus;
  return EMOTION_LEXICON.melancholy;
}

function intensityLabel(axis: EmotionalAxis, plays = 0, rank = 0): LocalizedText {
  const archiveBoost = Math.min(24, Math.log10(Math.max(plays, 1)) * 9) + (rank > 0 ? Math.max(0, 18 - rank) : 0);
  const score = Math.max(axis.energy, axis.catharsis, axis.nostalgia, axis.darkness) + archiveBoost;
  if (score >= 105) return INTENSITY_LABELS.veryHigh;
  if (score >= 88) return INTENSITY_LABELS.high;
  if (score >= 68) return INTENSITY_LABELS.medium;
  return INTENSITY_LABELS.low;
}

function formatCount(value: number, lang: EmotionalEngineLang) {
  return Math.round(value).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');
}

function formatShortList(items: string[], lang: EmotionalEngineLang) {
  const cleanItems = items.filter(Boolean);
  if (cleanItems.length <= 1) return cleanItems[0] ?? '';
  const formatter = new Intl.ListFormat(lang === 'en' ? 'en-US' : 'es-ES', {
    style: 'long',
    type: 'conjunction',
  });

  return formatter.format(cleanItems);
}

function offlineArtistFactLine(artistName: string): LocalizedText | undefined {
  const knowledge = getOfflineArtistKnowledge(artistName);
  const mb = knowledge?.musicbrainz;

  if (!knowledge || (!mb && !knowledge.curated)) return undefined;

  const wd = knowledge.wikidata;
  const curated = knowledge.curated;
  const place = curated?.origin ?? mb?.beginArea ?? mb?.area ?? mb?.country ?? knowledge.archive.country;
  const activeYears = knowledge.emotionalSeeds.activeYears.join('-');
  const tags = knowledge.emotionalSeeds.tags.slice(0, 4);
  const members = wd?.members.slice(0, 4) ?? [];
  const occupations = wd?.occupations.slice(0, 3) ?? [];
  const releases = knowledge.releaseGroups.slice(0, 3).map(group => {
    const year = group.firstReleaseDate?.slice(0, 4);
    return year ? `${group.title} (${year})` : group.title;
  });
  const alias = mb && mb.name !== knowledge.name ? mb.name : undefined;
  const sourceEs = mb ? `MusicBrainz lo identifica${alias ? ` también como ${alias}` : ''}` : `ficha curada desde ${curated?.sourceName}`;
  const sourceEn = mb ? `MusicBrainz identifies it${alias ? ` also as ${alias}` : ''}` : `curated profile from ${curated?.sourceName}`;

  return {
    es: [
      `Base offline: ${sourceEs}`,
      wd?.id ? `Wikidata agrega ficha ${wd.id}` : '',
      curated?.description ? 'perfil local verificado manualmente' : '',
      place ? `con conexión a ${place}` : '',
      activeYears ? `actividad desde ${activeYears}` : '',
      tags.length ? `señales de ${formatShortList(tags, 'es')}` : '',
      members.length ? `miembros documentados: ${formatShortList(members, 'es')}` : '',
      wd?.officialWebsites?.length ? 'sitio oficial verificado' : '',
      releases.length ? `y una línea de álbumes que arranca con ${formatShortList(releases, 'es')}` : '',
    ].filter(Boolean).join(', ') + '.',
    en: [
      `Offline base: ${sourceEn}`,
      wd?.description ? `Wikidata profiles it as ${wd.description}` : wd?.id ? `Wikidata adds profile ${wd.id}` : '',
      curated?.description ? curated.description : '',
      place ? `with a connection to ${place}` : '',
      activeYears ? `active from ${activeYears}` : '',
      tags.length ? `signals of ${formatShortList(tags, 'en')}` : '',
      members.length ? `documented members: ${formatShortList(members, 'en')}` : '',
      occupations.length ? `background roles: ${formatShortList(occupations, 'en')}` : '',
      wd?.officialWebsites?.length ? 'verified official site' : '',
      releases.length ? `and an album line starting with ${formatShortList(releases, 'en')}` : '',
    ].filter(Boolean).join(', ') + '.',
  };
}

function evidencePair(es: string, en: string) {
  return { es, en };
}

function strongestAxisLabel(axis: EmotionalAxis): LocalizedText {
  const entries: Array<[keyof EmotionalAxis, number, LocalizedText]> = [
    ['energy', axis.energy, { es: 'energía', en: 'energy' }],
    ['valence', axis.valence, { es: 'luminosidad', en: 'brightness' }],
    ['nostalgia', axis.nostalgia, { es: 'nostalgia', en: 'nostalgia' }],
    ['catharsis', axis.catharsis, { es: 'catarsis', en: 'catharsis' }],
    ['focus', axis.focus, { es: 'foco', en: 'focus' }],
    ['darkness', axis.darkness, { es: 'oscuridad estética', en: 'aesthetic darkness' }],
  ];
  return entries.sort((a, b) => b[1] - a[1])[0][2];
}

function classifyMoodKey(axis: EmotionalAxis, sourceText: string): EmotionalMoodKey {
  const text = normalizeText(sourceText);

  if (/(synth|wave|cyber|darksynth|retro|electronic|industrial|future)/.test(text)) {
    return 'futurismo';
  }

  if (/(romantic|ballad|love|tokio hotel|holding absence|emarosa)/.test(text)) {
    return 'romanticismo';
  }

  if (/(blackgaze|shoegaze|ambient|post-rock|slowcore|hammock|alcest|deafheaven)/.test(text) && axis.nostalgia >= 52) {
    return 'melancolia';
  }

  if (/(metalcore|post-hardcore|hardcore|death|metal|bad omens|bring me|falling in reverse)/.test(text)) {
    return axis.darkness >= 66 ? 'rebeldia' : 'energia';
  }

  if (/(pop punk|emo-groove|funk|dance|latin|reggaeton|bilmuri|magnolia park)/.test(text)) {
    return 'dopamina';
  }

  if (axis.focus >= 62 && axis.energy <= 68) return 'calma';
  if (axis.catharsis >= 70 && axis.darkness >= 62) return 'rebeldia';
  if (axis.catharsis >= 66 || axis.energy >= 72) return 'energia';
  if (axis.nostalgia >= 66 && axis.valence >= 48) return 'nostalgia';
  if (axis.valence >= 62) return 'dopamina';
  if (axis.darkness >= 58 || axis.nostalgia >= 58) return 'melancolia';
  return 'calma';
}

function moodConfidence(axis: EmotionalAxis, plays: number) {
  const strongest = Math.max(axis.energy, axis.valence, axis.nostalgia, axis.catharsis, axis.focus, axis.darkness);
  const archiveWeight = Math.min(18, Math.log10(Math.max(plays, 1)) * 5);
  return clampScore(52 + strongest * 0.34 + archiveWeight);
}

function averageAxis(profiles: ArtistMoodProfile[]): EmotionalAxis {
  if (!profiles.length) {
    return {
      energy: 0,
      valence: 0,
      nostalgia: 0,
      catharsis: 0,
      focus: 0,
      darkness: 0,
    };
  }

  const totals = profiles.reduce<EmotionalAxis>((acc, profile) => ({
    energy: acc.energy + profile.axis.energy,
    valence: acc.valence + profile.axis.valence,
    nostalgia: acc.nostalgia + profile.axis.nostalgia,
    catharsis: acc.catharsis + profile.axis.catharsis,
    focus: acc.focus + profile.axis.focus,
    darkness: acc.darkness + profile.axis.darkness,
  }), {
    energy: 0,
    valence: 0,
    nostalgia: 0,
    catharsis: 0,
    focus: 0,
    darkness: 0,
  });

  return {
    energy: clampScore(totals.energy / profiles.length),
    valence: clampScore(totals.valence / profiles.length),
    nostalgia: clampScore(totals.nostalgia / profiles.length),
    catharsis: clampScore(totals.catharsis / profiles.length),
    focus: clampScore(totals.focus / profiles.length),
    darkness: clampScore(totals.darkness / profiles.length),
  };
}

export function buildArtistMoodProfile(artist: TopArtist): ArtistMoodProfile {
  const sourceText = `${artist.genre} ${artist.name} ${getOfflineArtistSourceText(artist.name)}`;
  const axis = scoreAxisFromGenre(sourceText);
  const moodKey = classifyMoodKey(axis, sourceText);

  return {
    artist,
    moodKey,
    axis,
    confidence: moodConfidence(axis, artist.plays),
  };
}

export function buildMusicItemMoodProfile(
  sourceText: string,
  plays: number,
  influence: Partial<EmotionalAxis> = {},
): EmotionalItemMoodProfile {
  const axis = blendAxis(scoreAxisFromGenre(sourceText), influence);
  const moodKey = classifyMoodKey(axis, sourceText);

  return {
    moodKey,
    axis,
    confidence: moodConfidence(axis, plays),
  };
}

export function buildEmotionalMapEngineProfile(artists: TopArtist[], limit = 24): EmotionalMapEngineProfile {
  const profiles = artists.slice(0, limit).map(buildArtistMoodProfile);
  const totalPlays = profiles.reduce((sum, profile) => sum + profile.artist.plays, 0);
  const distribution = (Object.values(EMOTIONAL_MOOD_TAXONOMY) as EmotionalMoodTaxonomyItem[])
    .map(mood => {
      const matching = profiles.filter(profile => profile.moodKey === mood.key);
      const plays = matching.reduce((sum, profile) => sum + profile.artist.plays, 0);

      return {
        mood,
        count: matching.length,
        plays,
        pct: totalPlays ? clampScore((plays / totalPlays) * 100) : 0,
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

export function buildArtistEmotionalReading({
  artist,
  profile,
  albums,
  tracks,
  eras,
}: ArtistReadingInput): EmotionalEngineReading {
  const genre = genreText([
    artist.genre,
    profile?.signature_moods.en.join(' '),
    profile?.signature_moods.es.join(' '),
    getOfflineArtistSourceText(artist.name),
  ]);
  const axis = blendAxis(scoreAxisFromGenre(genre), {
    catharsis: Math.min(16, Math.log10(Math.max(artist.plays, 1)) * 3),
    nostalgia: Math.min(12, eras.length * 4),
    focus: Math.min(10, albums.length * 2),
  });
  const primary = dominantEmotion(axis);
  const secondary = secondaryEmotion(axis);
  const strongest = strongestAxisLabel(axis);
  const topTrack = tracks[0];
  const topAlbum = albums[0];
  const offlineFacts = offlineArtistFactLine(artist.name);

  return {
    moodKey: classifyMoodKey(axis, `${genre} ${artist.name}`),
    moodConfidence: moodConfidence(axis, artist.plays),
    primaryEmotion: primary,
    secondaryEmotion: secondary,
    intensityLabel: intensityLabel(axis, artist.plays, 1),
    axis,
    evidence: {
      es: [
        `${formatCount(artist.plays, 'es')} plays del artista en el archivo.`,
        topTrack ? `Canción ancla: ${topTrack.title}.` : 'Sin canción ancla directa en el top todavía.',
        topAlbum ? `Álbum con más peso: ${topAlbum.title}.` : 'Sin álbum dominante en el top de álbumes.',
        eras.length ? `Domina ${eras.length} era(s) anual(es).` : 'No domina un año completo, pero puede funcionar como influencia lateral.',
        ...(offlineFacts ? [offlineFacts.es] : []),
      ],
      en: [
        `${formatCount(artist.plays, 'en')} artist plays in the archive.`,
        topTrack ? `Anchor track: ${topTrack.title}.` : 'No direct anchor track in the top yet.',
        topAlbum ? `Heaviest album: ${topAlbum.title}.` : 'No dominant album in the album top.',
        eras.length ? `Dominates ${eras.length} yearly era(s).` : 'Does not dominate a full year, but may work as a side influence.',
        ...(offlineFacts ? [offlineFacts.en] : []),
      ],
    },
    longNarrative: {
      es: `En el motor emocional, ${artist.name} aparece principalmente como ${primary.es}: una presencia marcada por ${strongest.es}, ${formatCount(artist.plays, 'es')} plays y una relación con tu ranking que no se reduce a popularidad. ${topTrack ? `"${topTrack.title}" actúa como puerta de entrada a esa energía; ` : ''}${topAlbum ? `${topAlbum.title} añade una capa de escucha más lenta y de catálogo. ` : ''}La lectura más útil es verlo como un nodo de estado de ánimo: cuando este artista aparece, el museo activa una combinación de memoria, cuerpo, tensión y forma visual.`,
      en: `In the emotional engine, ${artist.name} reads mainly as ${primary.en}: a presence shaped by ${strongest.en}, ${formatCount(artist.plays, 'en')} plays and a relationship with your ranking that is bigger than popularity. ${topTrack ? `"${topTrack.title}" works as the doorway into that energy; ` : ''}${topAlbum ? `${topAlbum.title} adds a slower catalog-level layer. ` : ''}The most useful reading is to treat this artist as a mood node: when they appear, the museum activates a blend of memory, body, tension and visual identity.`,
    },
    listeningUse: {
      es: `Úsalo cuando necesites entrar en ${primary.es} sin perder dirección: primero una canción ancla, luego un álbum fuerte y después una era donde el artista domine o dialogue con tu identidad musical.`,
      en: `Use this when you need to enter ${primary.en} without losing direction: start with an anchor track, then a strong album, then an era where the artist dominates or speaks to your musical identity.`,
    },
  };
}

export function buildAlbumEmotionalReading({
  album,
  artist,
  profile,
  albumMeta,
  rank,
  artistTracks,
  catalogIndex,
}: AlbumReadingInput): EmotionalEngineReading {
  const genre = genreText([
    artist?.genre,
    profile?.signature_moods.en.join(' '),
    profile?.signature_moods.es.join(' '),
    albumMeta?.description.en,
    albumMeta?.description.es,
    getOfflineArtistSourceText(album.artist),
  ]);
  const axis = blendAxis(scoreAxisFromGenre(genre), {
    focus: 10,
    nostalgia: albumMeta?.year && albumMeta.year < 2018 ? 12 : 4,
    catharsis: Math.max(0, 10 - rank),
  });
  const primary = dominantEmotion(axis);
  const secondary = secondaryEmotion(axis);
  const strongest = strongestAxisLabel(axis);
  const anchorTrack = artistTracks[0];
  const releaseInfo = albumMeta?.year ? `${albumMeta.year}` : undefined;
  const offlineFacts = offlineArtistFactLine(album.artist);

  return {
    moodKey: classifyMoodKey(axis, `${genre} ${album.artist} ${album.title}`),
    moodConfidence: moodConfidence(axis, album.plays),
    primaryEmotion: primary,
    secondaryEmotion: secondary,
    intensityLabel: intensityLabel(axis, album.plays, rank),
    axis,
    evidence: {
      es: [
        `${formatCount(album.plays, 'es')} plays de álbum en el archivo.`,
        rank ? `Puesto #${rank} dentro del top de álbumes.` : 'Sin puesto de álbum calculado.',
        releaseInfo ? `Año de salida identificado: ${releaseInfo}.` : 'Año de salida pendiente en la ficha local.',
        anchorTrack ? `Conecta con canciones del artista como ${anchorTrack.title}.` : 'Todavía no hay canciones cercanas del artista en el top.',
        ...(offlineFacts ? [offlineFacts.es] : []),
      ],
      en: [
        `${formatCount(album.plays, 'en')} album plays in the archive.`,
        rank ? `Rank #${rank} inside the album top.` : 'No album rank calculated.',
        releaseInfo ? `Identified release year: ${releaseInfo}.` : 'Release year is still pending in the local profile.',
        anchorTrack ? `Connects with artist tracks such as ${anchorTrack.title}.` : 'No nearby artist tracks in the top yet.',
        ...(offlineFacts ? [offlineFacts.en] : []),
      ],
    },
    longNarrative: {
      es: `${album.title} funciona como una lectura de álbum, no solo como una suma de canciones. ${albumMeta?.description.es ?? 'Todavía no tiene contexto editorial exacto, así que el motor lo interpreta por peso de archivo, artista y género.'} En la matriz emocional aparece como ${primary.es}, con ${strongest.es} como eje dominante. ${catalogIndex >= 0 ? `Dentro de la línea curada ocupa el capítulo ${catalogIndex + 1}, así que puede leerse como una estación concreta de evolución. ` : ''}Su valor para el museo está en dar continuidad: una canción puede ser impulso inmediato, pero un álbum suele revelar permanencia, atmósfera y una forma más larga de habitar al artista.`,
      en: `${album.title} works as an album reading, not only as a sum of songs. ${albumMeta?.description.en ?? 'It does not have exact editorial context yet, so the engine interprets it through archive weight, artist and genre.'} In the emotional matrix it appears as ${primary.en}, with ${strongest.en} as the dominant axis. ${catalogIndex >= 0 ? `Inside the curated line it sits as chapter ${catalogIndex + 1}, so it can be read as a specific station of evolution. ` : ''}Its value for the museum is continuity: a track can be immediate impulse, but an album usually reveals permanence, atmosphere and a longer way of inhabiting the artist.`,
    },
    listeningUse: {
      es: `Escúchalo cuando quieras sostener ${primary.es} durante más tiempo: sirve para pasar de una emoción puntual a un clima completo.`,
      en: `Play it when you want to hold ${primary.en} for longer: it helps turn one emotional spark into a full atmosphere.`,
    },
  };
}

export function buildTrackEmotionalReading({
  track,
  artist,
  profile,
  rank,
  artistTracks,
  artistAlbums,
  eras,
}: TrackReadingInput): EmotionalEngineReading {
  const genre = genreText([
    track.genre,
    artist?.genre,
    profile?.signature_moods.en.join(' '),
    profile?.signature_moods.es.join(' '),
    getOfflineArtistSourceText(track.artist),
  ]);
  const axis = blendAxis(scoreAxisFromGenre(genre), {
    catharsis: rank <= 10 ? 16 : rank <= 25 ? 9 : 4,
    focus: artistTracks.length > 3 ? 8 : 2,
    nostalgia: eras.length ? 8 : 0,
    energy: track.plays > 500 ? 8 : 2,
  });
  const primary = dominantEmotion(axis);
  const secondary = secondaryEmotion(axis);
  const strongest = strongestAxisLabel(axis);
  const relatedAlbum = artistAlbums[0];
  const offlineFacts = offlineArtistFactLine(track.artist);

  return {
    moodKey: classifyMoodKey(axis, `${genre} ${track.artist} ${track.title}`),
    moodConfidence: moodConfidence(axis, track.plays),
    primaryEmotion: primary,
    secondaryEmotion: secondary,
    intensityLabel: intensityLabel(axis, track.plays, rank),
    axis,
    evidence: {
      es: [
        `${formatCount(track.plays, 'es')} plays de canción.`,
        rank ? `Puesto #${rank} en el top histórico de canciones.` : 'Sin puesto calculado.',
        `${artistTracks.length} canción(es) del artista aparecen cerca en tu archivo.`,
        relatedAlbum ? `Gravedad de álbum cercana: ${relatedAlbum.title}.` : 'Sin álbum cercano detectado en el top.',
        ...(offlineFacts ? [offlineFacts.es] : []),
      ],
      en: [
        `${formatCount(track.plays, 'en')} track plays.`,
        rank ? `Rank #${rank} in the all-time track top.` : 'No calculated rank.',
        `${artistTracks.length} track(s) by the artist appear nearby in your archive.`,
        relatedAlbum ? `Nearby album gravity: ${relatedAlbum.title}.` : 'No nearby album detected in the top.',
        ...(offlineFacts ? [offlineFacts.en] : []),
      ],
    },
    longNarrative: {
      es: `${track.title} se comporta como una unidad emocional de alta precisión. Por género, repetición y posición en el ranking, el motor la clasifica como ${primary.es}, con ${secondary.es} como segunda capa. Su eje más fuerte es ${strongest.es}, lo que sugiere que no vuelve solo por gusto sino por función: abrir una emoción, acelerar el cuerpo, ordenar una noche, acompañar foco o tocar una memoria específica. ${rank <= 10 ? 'Al estar tan arriba, funciona casi como botón directo del archivo: una entrada rápida a un estado interno reconocible.' : 'Aunque no sea el himno absoluto, su persistencia la convierte en una señal importante dentro del mapa.'}`,
      en: `${track.title} behaves like a high-precision emotional unit. Through genre, repetition and ranking position, the engine classifies it as ${primary.en}, with ${secondary.en} as a second layer. Its strongest axis is ${strongest.en}, which suggests it returns not only because of taste but because of function: opening an emotion, accelerating the body, organizing a night, supporting focus or touching a specific memory. ${rank <= 10 ? 'Because it sits so high, it works almost like a direct button in the archive: a quick entrance into a recognizable inner state.' : 'Even if it is not the absolute anthem, its persistence makes it an important signal inside the map.'}`,
    },
    listeningUse: {
      es: `Úsala como herramienta de ${primary.es}: al inicio de una sesión para activar el estado, o al final para cerrar una emoción que necesita forma.`,
      en: `Use it as a ${primary.en} tool: at the beginning of a session to activate the state, or at the end to close an emotion that needs shape.`,
    },
  };
}

export const emotionalAxisLabels: Record<keyof EmotionalAxis, LocalizedText> = {
  energy: evidencePair('energía', 'energy'),
  valence: evidencePair('luminosidad', 'brightness'),
  nostalgia: evidencePair('nostalgia', 'nostalgia'),
  catharsis: evidencePair('catarsis', 'catharsis'),
  focus: evidencePair('foco', 'focus'),
  darkness: evidencePair('oscuridad', 'darkness'),
};
