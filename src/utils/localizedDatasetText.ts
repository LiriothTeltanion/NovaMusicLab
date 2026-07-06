import type { Lang } from '../context/AppContext';
import type {
  Archetype,
  ArtistProfile,
  PersonalityMatrix,
  PersonalityTrait,
  SourceSummary,
  YearlyEra,
} from '../types';

type PersonalityKey = keyof PersonalityMatrix;

interface CulturalLanguageDatum {
  label: string;
  pct: number;
  color: string;
}

interface CulturalSceneTag {
  tag: string;
  color: string;
}

const ERA_DESC_EN: Record<string, string> = {
  'Synthwave oscuro, metal técnico, Carpenter Brut y descubrimientos progresivos.':
    'Dark synthwave, technical metal, Carpenter Brut and progressive discoveries.',
  'H.E.A.T, Tokio Hotel, vibras synthwave nocturnas y estéticas melódicas.':
    'H.E.A.T, Tokio Hotel, nocturnal synthwave vibes and melodic aesthetics.',
  'Ghost, The Midnight, mística rock, misterio y sonidos cinematográficos.':
    'Ghost, The Midnight, rock mysticism, mystery and cinematic sounds.',
  'Santa Cruz, rock local e integración en nuevas escenas vitales.':
    'Santa Cruz, local rock and integration into new life scenes.',
  'The Word Alive, Emarosa, voz vulnerable y búsquedas emocionales profundas.':
    'The Word Alive, Emarosa, vulnerable vocals and deep emotional searching.',
  'Bring Me the Horizon, Bilmuri, mezcla de pop, metal y catarsis en pandemia.':
    'Bring Me the Horizon, Bilmuri, a pandemic blend of pop, metal and catharsis.',
  'Slaves, Deafheaven, Alcest, fusión gigante de post-hardcore y guitarras celestiales.':
    'Slaves, Deafheaven, Alcest, a huge fusion of post-hardcore and celestial guitars.',
  'Deafheaven (In Blur), melancolía intensa y nostalgia activa en las mañanas.':
    'Deafheaven (In Blur), intense melancholy and active nostalgia in the mornings.',
  'Nevertel, Magnolia Park, pop-punk digital y rap-rock enérgico.':
    'Nevertel, Magnolia Park, digital pop-punk and energetic rap-rock.',
  'Bilmuri, Corbin Karasu, groove reconstructivo y madurez musical.':
    'Bilmuri, Corbin Karasu, reconstructive groove and musical maturity.',
  'nothingnowhere., introspección lírica profunda y reconstrucción artística.':
    'nothingnowhere., deep lyrical introspection and artistic reconstruction.',
  'The Kid LAROI, rap-pop alternativo, sonidos modernos de alta energía.':
    'The Kid LAROI, alternative rap-pop and modern high-energy sounds.',
};

const CULTURAL_LANGUAGE_DATA: Record<Lang, CulturalLanguageDatum[]> = {
  es: [
    { label: 'Inglés', pct: 78, color: '#00f2fe' },
    { label: 'Español', pct: 9, color: '#fb923c' },
    { label: 'Hebreo', pct: 7, color: '#34d399' },
    { label: 'Alemán/Sueco', pct: 4, color: '#f72585' },
    { label: 'Otros', pct: 2, color: '#a78bfa' },
  ],
  en: [
    { label: 'English', pct: 78, color: '#00f2fe' },
    { label: 'Spanish', pct: 9, color: '#fb923c' },
    { label: 'Hebrew', pct: 7, color: '#34d399' },
    { label: 'German/Swedish', pct: 4, color: '#f72585' },
    { label: 'Other', pct: 2, color: '#a78bfa' },
  ],
};

const CULTURAL_SCENE_TAGS: Record<Lang, CulturalSceneTag[]> = {
  es: [
    { tag: '🤘 Post-Hardcore USA', color: '#3b82f6' },
    { tag: '⚡ Synthwave Francia/USA', color: '#8b5cf6' },
    { tag: '🎸 Glam Rock Escandinavia', color: '#facc15' },
    { tag: '🌌 Blackgaze Global', color: '#00f2fe' },
    { tag: '🎮 Cultura Internet', color: '#10b981' },
    { tag: '🇮🇱 Rock Israelí', color: '#34d399' },
    { tag: '🔥 Metalcore UK/USA', color: '#ef4444' },
    { tag: '🌙 Darksynth Cyberpunk', color: '#f72585' },
  ],
  en: [
    { tag: '🤘 Post-Hardcore USA', color: '#3b82f6' },
    { tag: '⚡ Synthwave France/USA', color: '#8b5cf6' },
    { tag: '🎸 Scandinavian Glam Rock', color: '#facc15' },
    { tag: '🌌 Global Blackgaze', color: '#00f2fe' },
    { tag: '🎮 Internet Culture', color: '#10b981' },
    { tag: '🇮🇱 Israeli Rock', color: '#34d399' },
    { tag: '🔥 Metalcore UK/USA', color: '#ef4444' },
    { tag: '🌙 Cyberpunk Darksynth', color: '#f72585' },
  ],
};

const COUNTRY_NAMES_ES: Record<string, string> = {
  'United States': 'Estados Unidos',
  'United Kingdom': 'Reino Unido',
  Sweden: 'Suecia',
  Finland: 'Finlandia',
  Germany: 'Alemania',
  France: 'Francia',
  Israel: 'Israel',
  Norway: 'Noruega',
  'New Zealand': 'Nueva Zelanda',
  'Puerto Rico': 'Puerto Rico',
  Venezuela: 'Venezuela',
  'Dominican Republic': 'República Dominicana',
  Unknown: 'Desconocido',
};

const TRAIT_AXIS_LABELS: Record<PersonalityKey, Record<Lang, string>> = {
  sensibilidad_emocional: { es: 'Sensibilidad', en: 'Sensitivity' },
  nostalgia: { es: 'Nostalgia', en: 'Nostalgia' },
  energia: { es: 'Energía', en: 'Energy' },
  oscuridad_estetica: { es: 'Oscuridad', en: 'Darkness' },
  creatividad: { es: 'Creatividad', en: 'Creativity' },
  rebeldia: { es: 'Rebeldía', en: 'Rebellion' },
  futurismo: { es: 'Futurismo', en: 'Futurism' },
};

const TRAIT_TEXT_EN: Partial<Record<PersonalityKey, Partial<Pick<PersonalityTrait, 'evidence' | 'positive' | 'shadow' | 'tip'>>>> = {
  sensibilidad_emocional: {
    evidence: 'Strong presence of Deafheaven (In Blur, Honeycomb) and Alcest. Nostalgic lyrics.',
    positive: 'High empathy, deep artistic connection and emotional richness.',
    shadow: 'A tendency to ruminate on sad or melancholic emotions.',
    tip: 'Use melancholic music actively as a creative catalyst (writing, painting) instead of a passive loop.',
  },
  nostalgia: {
    evidence: 'Frequent returns to Tokio Hotel classics, The Midnight (Vampires) and retro synthwave.',
    positive: 'Appreciation for historical memory, roots and the aesthetic value of the past.',
    shadow: 'Staying anchored in previous eras while avoiding the present.',
    tip: 'Create "futuristic fuel" playlists that push you forward.',
  },
  energia: {
    evidence: 'Strong presence of hard rock, pop punk and emo punk.',
    positive: 'Determination, physical strength and instant motivation.',
    shadow: 'Restlessness and overstimulation if fast tempo takes over the whole day.',
    tip: 'Use glam and pop-punk as a dopamine charger for workouts or work mornings.',
  },
  oscuridad_estetica: {
    evidence: 'Listening to Carpenter Brut, Deafheaven and gothic or atmospheric black metal bands.',
    positive: 'Attraction to drama, epic scale and beauty outside convention.',
    shadow: 'Emotional isolation or a pull toward severe melancholy.',
    tip: 'Balance dark music with groove and chill textures like Bilmuri and lo-fi.',
  },
  creatividad: {
    evidence: 'An extremely high variety ratio (4,208 unique artists) combined with experimental and progressive genres.',
    positive: 'Open-mindedness, love for sonic innovation and technical inventiveness.',
    shadow: 'Difficulty staying focused on one thing because fixations keep shifting.',
    tip: 'Create your own music by fusing contrasting genres: blackgaze with nocturnal synthwave.',
  },
  rebeldia: {
    evidence: 'Presence of angry post-hardcore and metalcore bands.',
    positive: 'Questioning the status quo, personal empowerment and combative strength.',
    shadow: 'Irritability or contained internal tension.',
    tip: 'Use loud music (BMTH) as controlled catharsis to release work or life tension.',
  },
  futurismo: {
    evidence: 'Massive presence of synthwave, darksynth and cyberpunk sounds.',
    positive: 'Passion for technology, the future, clean design and neon escapism.',
    shadow: 'Disconnection from nature and too much time in front of screens.',
    tip: 'Listen to synthwave while programming or designing cyberpunk interfaces for your projects.',
  },
};

const FALLBACK_TRAIT_TEXT_EN: Partial<Record<PersonalityKey, Partial<Pick<PersonalityTrait, 'evidence' | 'positive' | 'shadow' | 'tip'>>>> = {
  sensibilidad_emocional: {
    evidence: 'Recurring listening to post-metal, shoegaze or emotionally intense songs.',
    positive: 'Empathy and deep emotional reading.',
    shadow: 'A tendency to stay too long in intense emotional states.',
    tip: 'Alternate cathartic songs with brighter closing tracks.',
  },
  nostalgia: {
    evidence: 'Presence of retro sounds, synthwave or artists that return across years.',
    positive: 'Powerful affective memory.',
    shadow: 'Idealizing past stages.',
    tip: 'Create playlists by era and close each one with a new song.',
  },
  energia: {
    evidence: 'Blocks of rock, punk, metalcore or high-pulse pop.',
    positive: 'Drive and resilience.',
    shadow: 'Overstimulation if the whole day becomes intensity.',
    tip: 'Use high energy as an action ritual.',
  },
  oscuridad_estetica: {
    evidence: 'Affinity for dark, atmospheric or cyberpunk textures.',
    positive: 'Strong visual imagination.',
    shadow: 'Aestheticized isolation.',
    tip: 'Turn that darkness into design, writing or sound.',
  },
  creatividad: {
    evidence: 'Wide artist variety and frequent stage changes.',
    positive: 'Exploration and openness.',
    shadow: 'Jumping too quickly between ideas.',
    tip: 'Choose one creative micro-era each week.',
  },
  rebeldia: {
    evidence: 'Songs of catharsis, rupture and reconstruction.',
    positive: 'Emotional self-defense.',
    shadow: 'Accumulated tension.',
    tip: 'Close intense loops with physical movement.',
  },
  futurismo: {
    evidence: 'Synthesizers, modern production and digital aesthetics.',
    positive: 'Future vision.',
    shadow: 'Disconnection from the present.',
    tip: 'Use futuristic music to program, design or plan.',
  },
};

const ARCHETYPE_EN: Record<string, Omit<Archetype, 'artists' | 'tracks' | 'color'>> = {
  'El Explorador Melancólico': {
    name: 'The Melancholic Explorer',
    desc: 'A tireless seeker of beauty in sadness, using celestial guitars and enveloping atmospheres for inner travel.',
    aesthetic: 'Foggy mountains lit by a blue neon moon.',
    strength: 'Deep introspection, resilience and artistic empathy.',
    wound: 'Fear of superficiality and recurring loneliness.',
    advice: 'Transform this introspection into videogame narrative or visual interface design.',
  },
  'El Guerrero Emocional': {
    name: 'The Emotional Warrior',
    desc: 'Uses energetic metalcore and post-hardcore as a protective shield and a channel for inner strength during life crises.',
    aesthetic: 'A futuristic city in flames under digital pink rain.',
    strength: 'Capacity for rebirth, emotional catharsis and motivational power.',
    wound: 'Repressed anxiety and accumulated rage.',
    advice: 'Use these songs at the start of the workday or during heavy training routines.',
  },
  'El Arquitecto Sonoro': {
    name: 'The Sonic Architect',
    desc: 'Appreciates mathematical complexity, technical rhythmic patterns and clean progressive productions.',
    aesthetic: 'Crystal structures floating in the void of space.',
    strength: 'Attention to detail, advanced structural logic and intellectual curiosity.',
    wound: 'Chronic overthinking and paralyzing perfectionism.',
    advice: 'Listen to instrumental progressive metal without vocals for hyperfocused programming.',
  },
  'El Romántico Oscuro': {
    name: 'The Dark Romantic',
    desc: 'Connects with retro nostalgia, nocturnal 80s aesthetics, dark pop melodies and synthesizers.',
    aesthetic: 'Driving a classic sports car along a coastal highway at midnight.',
    strength: 'Aesthetic sensitivity, passion and connection with the inner child.',
    wound: 'Melancholy for past times or idealized relationships.',
    advice: 'Ideal for nocturnal creative moments or relaxing before sleep.',
  },
  'El Explorador Melancolico': {
    name: 'The Melancholic Explorer',
    desc: 'A seeker of beauty inside sadness.',
    aesthetic: 'A neon moon.',
    strength: 'Introspection.',
    wound: 'Loneliness.',
    advice: 'Transform melancholy into work.',
  },
};

const ARTIST_TEXT_EN: Record<string, string> = {
  'Fusión de Blackgaze (guitarras shoegaze con batería rápida de metal), Synthwave Cyberpunk y voces limpias de Post-Hardcore con tintes de R&B. Un groove enérgico e introspectivo.':
    'A fusion of blackgaze (shoegaze guitars with fast metal drumming), cyberpunk synthwave and clean post-hardcore vocals with R&B touches. An energetic, introspective groove.',
  'Glassmorphism futurista, ropa negra con detalles cian y rosa neón, interfaces holográficas, simbología de runas tecnológicas.':
    'Futuristic glassmorphism, black clothing with cyan and neon pink details, holographic interfaces and technological rune symbolism.',
  'Neon Catarsis': 'Neon Catharsis',
  'Un EP de 6 temas que narra una transición vital desde el aislamiento geográfico hasta la reconstrucción digital y emocional.':
    'A 6-track EP that narrates a life transition from geographic isolation toward digital and emotional reconstruction.',
  '1. Autopista del Olvido (Intro Synth)': '1. Highway of Forgetting (Synth Intro)',
  '2. In Blur / Out Loud (feat. Deafheaven & Bilmuri)': '2. In Blur / Out Loud (feat. Deafheaven & Bilmuri)',
  '3. Ruinas en Tel Aviv (Metalcore / Blackgaze)': '3. Ruins in Tel Aviv (Metalcore / Blackgaze)',
  '4. Vampiros de Caracas (Synthwave Retro)': '4. Vampires of Caracas (Retro Synthwave)',
  '5. Loop Infinito (Post-Hardcore Emocional)': '5. Infinite Loop (Emotional Post-Hardcore)',
  '6. Renacer de Lirioth (Instrumental Outro)': '6. Rebirth of Lirioth (Instrumental Outro)',
  'Visuales reactivos en 3D (pantalla holográfica), luces en degradado azul y rosa, batería en vivo superpuesta a sintetizadores analógicos retro.':
    'Reactive 3D visuals (holographic screen), blue-to-pink gradient lights and live drums layered over retro analog synthesizers.',
  'Fusion de Blackgaze, Metalcore melodico y Synthwave Cyberpunk':
    'A fusion of blackgaze, melodic metalcore and cyberpunk synthwave.',
  'Cyberpunk / Glassmorphic': 'Cyberpunk / Glassmorphic',
  'Un EP conceptual sobre memoria, reconstruccion y luces nocturnas.':
    'A conceptual EP about memory, reconstruction and nocturnal lights.',
  '1. Portal de Ruido': '1. Noise Portal',
  '2. In Blur (Echo)': '2. In Blur (Echo)',
  '3. Ciudad Interior': '3. Inner City',
  '4. Amanecer Sintetico': '4. Synthetic Dawn',
  'Hologramas reactivos': 'Reactive holograms',
};

export function localizeEraDescription(era: YearlyEra, lang: Lang, locale = lang === 'en' ? 'en-US' : 'es-ES') {
  if (/^Un año marcado por /i.test(era.era_desc)) {
    const plays = era.plays.toLocaleString(locale);
    const artists = era.unique_artists.toLocaleString(locale);
    return lang === 'en'
      ? `A year shaped by ${era.top_artist}, ${plays} plays and ${artists} unique artists.`
      : `Un año marcado por ${era.top_artist}, ${plays} reproducciones y ${artists} artistas únicos.`;
  }

  return lang === 'en'
    ? ERA_DESC_EN[era.era_desc] ?? era.era_desc
    : era.era_desc;
}

export function localizeSourceNote(source: SourceSummary, lang: Lang) {
  if (lang === 'en') {
    if (source.source_type === 'merged') {
      return 'Merged upload: totals include all imported events. Overlap is measured by normalized artist + track names.';
    }
    if (source.source_type === 'spotify') {
      return 'Spotify-only upload: skip, platform and country data are measured directly from the export.';
    }
    if (source.source_type === 'youtube') {
      return 'YouTube-only upload: watch timestamps are direct, while artist and track names are inferred from video titles and channels.';
    }
    if (source.source_type === 'apple_music') {
      return 'Apple Music-only upload: Play Activity timestamps are direct, while rows without a resolvable artist are skipped rather than guessed.';
    }
    if (source.source_type === 'listenbrainz') {
      return 'ListenBrainz-only upload: listens are direct, including the artist, track and album fields you already scrobbled there.';
    }
    if (source.source_type === 'lastfm' && (source.spotify_plays > 0 || source.spotify_short_plays > 0)) {
      return 'Bundled Kevin analysis: Last.fm is the primary verified timeline; Spotify values are report-level estimates unless a fresh Spotify export is uploaded.';
    }
    if (source.source_type === 'lastfm') {
      return 'Last.fm-only upload: timestamps and scrobbles are direct, while skip/platform data are unavailable.';
    }
    return 'Unknown source: this view is using the best available imported events and marks unavailable fields separately.';
  }

  if (source.source_type === 'merged') {
    return 'Carga combinada: los totales incluyen todos los eventos importados. El solapamiento se mide por nombres normalizados de artista y canción.';
  }
  if (source.source_type === 'spotify') {
    return 'Carga solo de Spotify: saltos, plataforma y país se miden directamente desde la exportación.';
  }
  if (source.source_type === 'youtube') {
    return 'Carga solo de YouTube: los timestamps son directos, mientras artista y canción se infieren desde títulos de video y canales.';
  }
  if (source.source_type === 'apple_music') {
    return 'Carga solo de Apple Music: los timestamps de Play Activity son directos; las filas sin artista identificable se descartan en vez de adivinarse.';
  }
  if (source.source_type === 'listenbrainz') {
    return 'Carga solo de ListenBrainz: los listens son directos, incluyendo artista, canción y álbum que ya scrobbleaste ahí.';
  }
  if (source.source_type === 'lastfm' && (source.spotify_plays > 0 || source.spotify_short_plays > 0)) {
    return 'Análisis incluido de Kevin: Last.fm es la línea temporal verificada principal; los valores de Spotify son estimaciones del informe salvo que se suba una exportación fresca de Spotify.';
  }
  if (source.source_type === 'lastfm') {
    return 'Carga solo de Last.fm: marcas de tiempo y scrobbles son directos; los datos de saltos y plataforma no están disponibles.';
  }
  return 'Fuente no identificada: esta vista usa los eventos importados disponibles y marca por separado los campos no disponibles.';
}

export function getCulturalLanguageData(lang: Lang) {
  return CULTURAL_LANGUAGE_DATA[lang];
}

export function getCulturalSceneTags(lang: Lang) {
  return CULTURAL_SCENE_TAGS[lang];
}

export function localizeCountryName(country: string, lang: Lang) {
  return lang === 'es' ? COUNTRY_NAMES_ES[country] ?? country : country;
}

export function localizeProjectLabel(project: string, lang: Lang) {
  if (lang === 'en') return project.replace('Datos Importados', 'Imported Data');
  return project.replace('Imported Data', 'Datos Importados');
}

export function localizeTraitAxis(key: PersonalityKey, lang: Lang) {
  return TRAIT_AXIS_LABELS[key]?.[lang] ?? String(key);
}

export function localizePersonalityTrait(key: PersonalityKey, trait: PersonalityTrait, lang: Lang): PersonalityTrait {
  if (lang === 'es') return trait;

  const preferred = TRAIT_TEXT_EN[key];
  const fallback = FALLBACK_TRAIT_TEXT_EN[key];

  return {
    ...trait,
    evidence: preferred?.evidence ?? fallback?.evidence ?? trait.evidence,
    positive: preferred?.positive ?? fallback?.positive ?? trait.positive,
    shadow: preferred?.shadow ?? fallback?.shadow ?? trait.shadow,
    tip: preferred?.tip ?? fallback?.tip ?? trait.tip,
  };
}

export function localizeArchetype(arch: Archetype, lang: Lang): Archetype {
  if (lang === 'es') return arch;

  const localized = ARCHETYPE_EN[arch.name];
  if (!localized) return arch;

  return {
    ...arch,
    ...localized,
  };
}

export function localizeArtistProfile(profile: ArtistProfile, lang: Lang): ArtistProfile {
  if (lang === 'es') return profile;

  const tr = (text: string) => ARTIST_TEXT_EN[text] ?? text;

  return {
    ...profile,
    sound: tr(profile.sound),
    aesthetic: tr(profile.aesthetic),
    ep_concept: {
      ...profile.ep_concept,
      title: tr(profile.ep_concept.title),
      description: tr(profile.ep_concept.description),
      tracklist: profile.ep_concept.tracklist.map(tr),
    },
    live_show: tr(profile.live_show),
  };
}
