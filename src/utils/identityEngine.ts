import type { Archetype, ArtistProfile, PersonalityMatrix, TopArtist, TopTrack } from '../types';
import { normalizeGenre } from './analytics';
import { hashSeed } from './seededRandom';

/**
 * Generates the "Personality Matrix", "Archetypes" and "Artist Identity"
 * sections from the ACTUAL archive being viewed, instead of one fixed set of
 * facts about a single specific person's listening history.
 *
 * Why this exists: this app lets any visitor upload their own Last.fm/
 * Spotify/YouTube/Apple Music/ListenBrainz export (DataUploader.tsx), but
 * these three sections used to return the exact same hardcoded object no
 * matter whose data was loaded - citing specific real artists as "evidence"
 * of traits that may have nothing to do with the archive on screen, and a
 * fixed artist alias for every visitor. That is exactly
 * the "fabricated data" pattern this project treats as a hard bug (see
 * HANDOFF.md: "never fabricate data" / the Discrepancy Auditor incident).
 * Every score/evidence/artist/track below is derived from the real top_*
 * arrays; only the interpretive prose (positive/shadow/tip, archetype
 * descriptions) is fixed per-category, the same way a horoscope's houses are
 * fixed but which one applies to you is not.
 */

const GENRE_WEIGHTS: Record<string, Partial<Record<keyof PersonalityMatrix, number>>> = {
  'Post-Metal / Blackgaze': { sensibilidad_emocional: 1, oscuridad_estetica: 0.5 },
  'Ambient / Lo-Fi': { sensibilidad_emocional: 0.7, futurismo: 0.2 },
  'Pop Punk / Emo': { sensibilidad_emocional: 0.4, rebeldia: 0.4, energia: 0.4 },
  'Post-Hardcore': { sensibilidad_emocional: 0.35, rebeldia: 0.75, energia: 0.5 },
  'Synthwave / Darksynth': { nostalgia: 0.75, futurismo: 1, oscuridad_estetica: 0.6 },
  'Pop / Indie': { nostalgia: 0.4 },
  'Hard Rock': { nostalgia: 0.35, energia: 0.5 },
  'Alternative Rock': { nostalgia: 0.3 },
  'Metalcore': { energia: 1, rebeldia: 0.6 },
  'Power / Speed Metal': { energia: 0.85, oscuridad_estetica: 0.2 },
  'Hip-Hop / Rap': { energia: 0.4, rebeldia: 0.55 },
  'Emo Rap / Trap': { energia: 0.35, sensibilidad_emocional: 0.3 },
  'Death Metal': { oscuridad_estetica: 1, energia: 0.4 },
  'Heavy Metal': { oscuridad_estetica: 0.45, energia: 0.4 },
  'Folk Metal': { oscuridad_estetica: 0.3, nostalgia: 0.3 },
  'Progressive Metal': { futurismo: 0.4, creatividad: 0.3 },
  'Alt-Metal': { rebeldia: 0.35, energia: 0.45 },
  'Israeli Rock': { nostalgia: 0.2 },
};

const TRAIT_TEXT: Record<keyof PersonalityMatrix, { es: { positive: string; shadow: string; tip: string }; en: { positive: string; shadow: string; tip: string } }> = {
  sensibilidad_emocional: {
    es: { positive: 'Empatía y lectura emocional profunda.', shadow: 'Tendencia a quedarse demasiado tiempo en estados intensos.', tip: 'Alterna canciones catárticas con cierres luminosos.' },
    en: { positive: 'Empathy and deep emotional reading.', shadow: 'A tendency to linger too long in intense states.', tip: 'Alternate cathartic songs with brighter closers.' },
  },
  nostalgia: {
    es: { positive: 'Memoria afectiva poderosa.', shadow: 'Idealizar etapas pasadas.', tip: 'Crea playlists por era y cierra cada una con una canción nueva.' },
    en: { positive: 'Powerful emotional memory.', shadow: 'Idealizing past eras.', tip: 'Build playlists per era and close each with a brand-new song.' },
  },
  energia: {
    es: { positive: 'Impulso y resiliencia.', shadow: 'Sobreestimulación si todo el día se vuelve intensidad.', tip: 'Usa la energía alta como ritual de acción.' },
    en: { positive: 'Drive and resilience.', shadow: 'Overstimulation if every hour stays high-intensity.', tip: 'Use high-energy tracks as an action ritual.' },
  },
  oscuridad_estetica: {
    es: { positive: 'Imaginación visual fuerte.', shadow: 'Aislamiento estetizado.', tip: 'Convierte esa oscuridad en diseño, escritura o sonido.' },
    en: { positive: 'Strong visual imagination.', shadow: 'Aestheticized isolation.', tip: 'Turn that darkness into design, writing or sound.' },
  },
  creatividad: {
    es: { positive: 'Exploración y apertura.', shadow: 'Saltar demasiado rápido entre ideas.', tip: 'Elige una micro-era creativa por semana.' },
    en: { positive: 'Exploration and openness.', shadow: 'Jumping too fast between ideas.', tip: 'Pick one creative micro-era per week.' },
  },
  rebeldia: {
    es: { positive: 'Autodefensa emocional.', shadow: 'Tensión acumulada.', tip: 'Cierra los loops intensos con movimiento físico.' },
    en: { positive: 'Emotional self-defense.', shadow: 'Accumulated tension.', tip: 'Close intense loops with physical movement.' },
  },
  futurismo: {
    es: { positive: 'Visión de futuro.', shadow: 'Desconexión del presente.', tip: 'Usa la música futurista para programar, diseñar o planear.' },
    en: { positive: 'Vision of the future.', shadow: 'Disconnection from the present.', tip: 'Use futuristic music to code, design or plan.' },
  },
};

const TRAIT_EVIDENCE_LABEL: Record<keyof PersonalityMatrix, { es: string; en: string }> = {
  sensibilidad_emocional: { es: 'texturas emocionales densas', en: 'dense emotional textures' },
  nostalgia: { es: 'sonidos retro y recurrencias de época', en: 'retro sounds and era-recurring artists' },
  energia: { es: 'bloques de alto pulso', en: 'high-pulse blocks' },
  oscuridad_estetica: { es: 'texturas oscuras y atmosféricas', en: 'dark, atmospheric textures' },
  creatividad: { es: 'variedad amplia de artistas', en: 'a wide variety of artists' },
  rebeldia: { es: 'catarsis, ruptura y reconstrucción', en: 'catharsis, rupture and reconstruction' },
  futurismo: { es: 'producción sintética y estética digital', en: 'synthetic production and digital aesthetics' },
};

/** Weighted play-share per trait, from the real top-100 genres - not a fixed score for anyone. */
function scoreTraits(topArtists: TopArtist[]): Record<keyof PersonalityMatrix, { pct: number; topArtist?: TopArtist }> {
  const traitPlays: Partial<Record<keyof PersonalityMatrix, number>> = {};
  const traitTopArtist: Partial<Record<keyof PersonalityMatrix, { name: string; plays: number }>> = {};
  let totalPlays = 0;

  topArtists.forEach(artist => {
    const genre = normalizeGenre(artist.genre);
    const weights = GENRE_WEIGHTS[genre];
    totalPlays += artist.plays;
    if (!weights) return;
    (Object.entries(weights) as [keyof PersonalityMatrix, number][]).forEach(([trait, weight]) => {
      const weightedPlays = artist.plays * weight;
      traitPlays[trait] = (traitPlays[trait] ?? 0) + weightedPlays;
      const current = traitTopArtist[trait];
      if (!current || artist.plays > current.plays) traitTopArtist[trait] = { name: artist.name, plays: artist.plays };
    });
  });

  const uniqueRatio = totalPlays > 0 ? topArtists.length / Math.min(totalPlays, topArtists.length * 40) : 0;

  const traits = ['sensibilidad_emocional', 'nostalgia', 'energia', 'oscuridad_estetica', 'creatividad', 'rebeldia', 'futurismo'] as const;
  const result = {} as Record<keyof PersonalityMatrix, { pct: number; topArtist?: TopArtist }>;
  traits.forEach(trait => {
    if (trait === 'creatividad') {
      result[trait] = { pct: Math.min(1, uniqueRatio * 1.4) };
      return;
    }
    const pct = totalPlays > 0 ? Math.min(1, (traitPlays[trait] ?? 0) / totalPlays) : 0;
    const found = traitTopArtist[trait];
    result[trait] = {
      pct,
      topArtist: found ? topArtists.find(a => a.name === found.name) : undefined,
    };
  });
  return result;
}

export function buildPersonalityMatrix(topArtists: TopArtist[], lang: 'es' | 'en' = 'es'): PersonalityMatrix {
  const scores = scoreTraits(topArtists);
  const traits = Object.keys(TRAIT_TEXT) as (keyof PersonalityMatrix)[];
  const matrix = {} as PersonalityMatrix;

  traits.forEach(trait => {
    const { pct, topArtist } = scores[trait];
    // Floor at 30 (everyone has some baseline of every trait) so a 0%-share
    // trait doesn't read as a hard zero, but the ceiling stays proportional
    // to how much of the real archive actually supports it.
    const score = Math.round(30 + pct * 68);
    const label = TRAIT_EVIDENCE_LABEL[trait][lang];
    const evidence = topArtist
      ? (lang === 'en'
        ? `Recurring listening of ${label}, led by ${topArtist.name} (${topArtist.plays.toLocaleString('en-US')} plays).`
        : `Escucha recurrente de ${label}, liderada por ${topArtist.name} (${topArtist.plays.toLocaleString('es-ES')} plays).`)
      : (lang === 'en'
        ? `A modest but present thread of ${label} across the archive.`
        : `Un hilo modesto pero presente de ${label} en el archivo.`);
    const text = TRAIT_TEXT[trait][lang];
    matrix[trait] = {
      score,
      evidence,
      artists: topArtist ? [topArtist.name] : [],
      positive: text.positive,
      shadow: text.shadow,
      tip: text.tip,
    };
  });

  return matrix;
}

interface ArchetypeTemplate {
  id: string;
  genres: string[];
  es: Omit<Archetype, 'artists' | 'tracks'>;
  en: Omit<Archetype, 'artists' | 'tracks'>;
}

const ARCHETYPE_BANK: ArchetypeTemplate[] = [
  {
    id: 'melancolico',
    genres: ['Post-Metal / Blackgaze', 'Ambient / Lo-Fi'],
    es: { name: 'El Explorador Melancólico', desc: 'Buscador de belleza en la tristeza', color: 'cyan', aesthetic: 'Luna de neón', strength: 'Introspección', wound: 'Soledad', advice: 'Transforma la melancolía en obra.' },
    en: { name: 'The Melancholic Explorer', desc: 'A seeker of beauty inside sadness', color: 'cyan', aesthetic: 'Neon moon', strength: 'Introspection', wound: 'Loneliness', advice: 'Turn melancholy into a body of work.' },
  },
  {
    id: 'guerrero',
    genres: ['Metalcore', 'Post-Hardcore'],
    es: { name: 'El Guerrero Emocional', desc: 'Usa la intensidad como escudo creativo', color: 'pink', aesthetic: 'Lluvia rosa', strength: 'Resiliencia', wound: 'Ansiedad', advice: 'Convierte la fuerza en acción concreta.' },
    en: { name: 'The Emotional Warrior', desc: 'Uses intensity as a creative shield', color: 'pink', aesthetic: 'Pink rain', strength: 'Resilience', wound: 'Anxiety', advice: 'Turn strength into concrete action.' },
  },
  {
    id: 'arquitecto',
    genres: ['Synthwave / Darksynth', 'Progressive Metal'],
    es: { name: 'El Arquitecto Nocturno', desc: 'Construye mundos digitales desde la nostalgia', color: 'purple', aesthetic: 'Rejilla cian sobre asfalto mojado', strength: 'Visión', wound: 'Desconexión del presente', advice: 'Aterriza un plano futurista en un paso de hoy.' },
    en: { name: 'The Night Architect', desc: 'Builds digital worlds out of nostalgia', color: 'purple', aesthetic: 'Cyan grid over wet asphalt', strength: 'Vision', wound: 'Disconnection from the present', advice: 'Ground one futuristic blueprint in a step you take today.' },
  },
  {
    id: 'nomada',
    genres: [],
    es: { name: 'El Nómada Sonoro', desc: 'Nunca se queda demasiado tiempo en un solo género', color: 'green', aesthetic: 'Mapa desplegado', strength: 'Curiosidad', wound: 'Dispersión', advice: 'Elige un territorio y quédate una temporada más.' },
    en: { name: 'The Sonic Nomad', desc: 'Never stays in one genre for too long', color: 'green', aesthetic: 'An unfolded map', strength: 'Curiosity', wound: 'Scattered focus', advice: 'Pick one territory and stay a season longer.' },
  },
  {
    id: 'ritual',
    genres: ['Death Metal', 'Heavy Metal', 'Power / Speed Metal', 'Folk Metal'],
    es: { name: 'El Guardián del Ritual', desc: 'Encuentra orden y pertenencia en lo pesado', color: 'red', aesthetic: 'Vitral roto y forja', strength: 'Disciplina', wound: 'Rigidez', advice: 'Deja que un sonido ligero entre sin traicionar el ritual.' },
    en: { name: 'The Ritual Keeper', desc: 'Finds order and belonging in heaviness', color: 'red', aesthetic: 'Shattered stained glass and forge-light', strength: 'Discipline', wound: 'Rigidity', advice: 'Let one lighter sound in without betraying the ritual.' },
  },
  {
    id: 'romantico',
    genres: ['Pop Punk / Emo', 'Emo Rap / Trap'],
    es: { name: 'El Romántico Digital', desc: 'Convierte cada obsesión en una carta de amor', color: 'orange', aesthetic: 'Polaroid con glitch', strength: 'Ternura', wound: 'Apego', advice: 'Escribe el final antes de vivir el loop otra vez.' },
    en: { name: 'The Digital Romantic', desc: 'Turns every fixation into a love letter', color: 'orange', aesthetic: 'A glitched-out polaroid', strength: 'Tenderness', wound: 'Attachment', advice: 'Write the ending before living the loop again.' },
  },
];

export function buildArchetypes(topArtists: TopArtist[], lang: 'es' | 'en' = 'es'): Archetype[] {
  const genrePlays: Record<string, number> = {};
  const genreTopPick: Record<string, { name: string; plays: number }> = {};
  const genreSecondPick: Record<string, { name: string; plays: number }> = {};
  let totalPlays = 0;

  topArtists.forEach(artist => {
    const genre = normalizeGenre(artist.genre);
    totalPlays += artist.plays;
    genrePlays[genre] = (genrePlays[genre] ?? 0) + artist.plays;
    const top = genreTopPick[genre];
    if (!top || artist.plays > top.plays) {
      genreSecondPick[genre] = top;
      genreTopPick[genre] = { name: artist.name, plays: artist.plays };
    } else if (!genreSecondPick[genre] || artist.plays > genreSecondPick[genre].plays) {
      genreSecondPick[genre] = { name: artist.name, plays: artist.plays };
    }
  });

  const uniqueRatio = totalPlays > 0 ? topArtists.length / Math.min(totalPlays, topArtists.length * 40) : 0;

  const scored = ARCHETYPE_BANK.map(tpl => {
    if (tpl.genres.length === 0) {
      // 'Nómada' scores on real diversity, not a genre bucket.
      return { tpl, score: uniqueRatio * 1.4, plays: 0 };
    }
    const plays = tpl.genres.reduce((sum, g) => sum + (genrePlays[g] ?? 0), 0);
    return { tpl, score: totalPlays > 0 ? plays / totalPlays : 0, plays };
  }).sort((a, b) => b.score - a.score);

  return scored.slice(0, 2).map(({ tpl }) => {
    const copy = tpl[lang];
    const genre = tpl.genres[0];
    const first = genre ? genreTopPick[genre] : undefined;
    const second = genre ? genreSecondPick[genre] : undefined;
    const fallback = topArtists[0];
    return {
      ...copy,
      artists: [first?.name ?? fallback?.name].filter((v): v is string => Boolean(v)),
      tracks: [second?.name ?? fallback?.name].filter((v): v is string => Boolean(v)),
    };
  });
}

const ALIAS_PARTS = {
  dark: ['Noctave', 'Umbrel', 'Cindra', 'Vhaltis', 'Morrigh', 'Sablewynn'],
  neon: ['Vexara', 'Nyxel', 'Astravex', 'Circuitrix', 'Novareign', 'Synthral'],
  warm: ['Solene', 'Aurenne', 'Emberlyn', 'Rosevane', 'Cadenlyn', 'Verolume'],
  suffix: ['Teltanion', 'Voss', 'Kaeloth', 'Riverne', 'Aescher', 'Draye'],
};

function pickAlias(seed: number, dominantTrait: keyof PersonalityMatrix): string {
  const bank = dominantTrait === 'oscuridad_estetica' || dominantTrait === 'rebeldia'
    ? ALIAS_PARTS.dark
    : dominantTrait === 'futurismo' || dominantTrait === 'creatividad'
      ? ALIAS_PARTS.neon
      : ALIAS_PARTS.warm;
  const first = bank[Math.abs(seed) % bank.length];
  const last = ALIAS_PARTS.suffix[Math.abs(seed >> 3) % ALIAS_PARTS.suffix.length];
  return `${first} ${last}`;
}

const SOUND_TEMPLATES: Record<string, { es: string; en: string }> = {
  'Post-Metal / Blackgaze': { es: 'Blackgaze', en: 'Blackgaze' },
  'Synthwave / Darksynth': { es: 'Synthwave Cyberpunk', en: 'Cyberpunk Synthwave' },
  'Metalcore': { es: 'Metalcore melódico', en: 'Melodic Metalcore' },
  'Post-Hardcore': { es: 'Post-Hardcore', en: 'Post-Hardcore' },
  'Death Metal': { es: 'Death Metal melódico', en: 'Melodic Death Metal' },
  'Heavy Metal': { es: 'Heavy Metal clásico', en: 'Classic Heavy Metal' },
  'Power / Speed Metal': { es: 'Power/Speed Metal', en: 'Power/Speed Metal' },
  'Folk Metal': { es: 'Folk Metal', en: 'Folk Metal' },
  'Hard Rock': { es: 'Hard Rock', en: 'Hard Rock' },
  'Pop Punk / Emo': { es: 'Pop Punk emocional', en: 'Emotional Pop Punk' },
  'Emo Rap / Trap': { es: 'Emo Rap', en: 'Emo Rap' },
  'Hip-Hop / Rap': { es: 'Hip-Hop introspectivo', en: 'Introspective Hip-Hop' },
  'Pop / Indie': { es: 'Pop/Indie luminoso', en: 'Luminous Pop/Indie' },
  'Progressive Metal': { es: 'Metal Progresivo', en: 'Progressive Metal' },
  'Alt-Metal': { es: 'Alt-Metal', en: 'Alt-Metal' },
  'Alternative Rock': { es: 'Rock Alternativo', en: 'Alternative Rock' },
  'Israeli Rock': { es: 'Rock Israelí', en: 'Israeli Rock' },
};

const EP_TITLES = ['Neon Catarsis', 'Ruido Interior', 'Segunda Piel', 'Circuito Cerrado', 'Voltaje Emocional', 'Ciudad de Vidrio'];
const EP_DESC: Record<'es' | 'en', string[]> = {
  es: [
    'Un EP conceptual sobre memoria, reconstrucción y luces nocturnas.',
    'Un EP corto que cruza catarsis, ciudad interior y sonido de escape.',
    'Cinco pistas sobre dejar una versión anterior atrás sin borrarla del todo.',
  ],
  en: [
    'A concept EP about memory, reconstruction and nocturnal lights.',
    'A short EP crossing catharsis, an inner city and the sound of escape.',
    'Five tracks about leaving an earlier self behind without erasing it.',
  ],
};

const GENRE_BLURB: Record<string, { es: string; en: string }> = {
  'Post-Metal / Blackgaze': { es: 'Guitarras enormes, melancolía luminosa y sensación de ascenso emocional.', en: 'Huge guitars, luminous melancholy and the feeling of emotional ascent.' },
  'Synthwave / Darksynth': { es: 'Neón, movimiento nocturno, pads retro y textura cinematográfica.', en: 'Neon, nocturnal motion, retro pads and cinematic texture.' },
  'Post-Hardcore': { es: 'Voz frontal, catarsis, tensión melódica y energía de reconstrucción.', en: 'Forward vocals, catharsis, melodic tension and reconstruction energy.' },
  Metalcore: { es: 'Pulso pesado, breakdowns y catarsis con estructura moderna.', en: 'Heavy pulse, breakdowns and catharsis with a modern structure.' },
  'Pop Punk / Emo': { es: 'Hooks directos, letras vulnerables y energía de garage adolescente.', en: 'Direct hooks, vulnerable lyrics and teenage-garage energy.' },
  'Emo Rap / Trap': { es: 'Producción íntima, voz quebrada y beats lentos y confesionales.', en: 'Intimate production, cracked vocals and slow, confessional beats.' },
  'Hip-Hop / Rap': { es: 'Ritmo, flow y narrativa directa sobre una base solida.', en: 'Rhythm, flow and direct storytelling over a solid beat.' },
  'Death Metal': { es: 'Densidad, técnica y oscuridad sin filtro.', en: 'Density, technicality and unfiltered darkness.' },
  'Heavy Metal': { es: 'Riffs clásicos, poder y tradición metalera.', en: 'Classic riffs, power and metal tradition.' },
  'Folk Metal': { es: 'Raíz acústica y melodía folclórica combinadas con fuerza metalera.', en: 'Acoustic roots and folk melody combined with metal force.' },
  'Power / Speed Metal': { es: 'Velocidad, coros épicos y virtuosismo instrumental.', en: 'Speed, epic choruses and instrumental virtuosity.' },
  'Progressive Metal': { es: 'Estructuras complejas, cambios de compás y ambición compositiva.', en: 'Complex structures, shifting time signatures and compositional ambition.' },
  'Alt-Metal': { es: 'Groove pesado con hooks accesibles y actitud alternativa.', en: 'Heavy groove with accessible hooks and alternative attitude.' },
  'Hard Rock': { es: 'Riffs directos, actitud y energía de estadio.', en: 'Direct riffs, attitude and stadium-sized energy.' },
  'Ambient / Lo-Fi': { es: 'Texturas suaves, espacio y calma introspectiva.', en: 'Soft textures, space and introspective calm.' },
  'Pop / Indie': { es: 'Melodías luminosas y producción cuidada, más ligera que pesada.', en: 'Bright melodies and polished production, lighter than heavy.' },
  'Alternative Rock': { es: 'Guitarras crudas y actitud alternativa clásica.', en: 'Raw guitars and classic alt-rock attitude.' },
  'Israeli Rock': { es: 'Una identidad de escena local dentro del archivo.', en: 'A local scene identity thread inside the archive.' },
};

/** Real top-4 genres by weighted play-share, with an honest computed percentage - not a fixed "92%" for everyone. */
export function buildSonicGenes(topArtists: TopArtist[], lang: 'es' | 'en' = 'es'): Array<{ label: string; value: string; body: string }> {
  const genrePlays: Record<string, number> = {};
  let totalPlays = 0;
  topArtists.forEach(a => {
    const genre = normalizeGenre(a.genre);
    totalPlays += a.plays;
    genrePlays[genre] = (genrePlays[genre] ?? 0) + a.plays;
  });

  return Object.entries(genrePlays)
    .filter(([genre]) => genre !== 'Unclassified' && genre !== 'Alternative')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([genre, plays]) => ({
      label: genre,
      value: `${Math.round((plays / Math.max(1, totalPlays)) * 100)}%`,
      body: GENRE_BLURB[genre]?.[lang]
        ?? (lang === 'en' ? 'A defining thread across the archive.' : 'Un hilo definitorio en el archivo.'),
    }));
}

export function buildArtistProfile(topArtists: TopArtist[], topTracks: TopTrack[], lang: 'es' | 'en' = 'es'): ArtistProfile {
  const genrePlays: Record<string, number> = {};
  topArtists.forEach(a => {
    const g = normalizeGenre(a.genre);
    genrePlays[g] = (genrePlays[g] ?? 0) + a.plays;
  });
  const [primaryGenre, secondaryGenre] = Object.entries(genrePlays)
    .filter(([g]) => g !== 'Unclassified' && g !== 'Alternative')
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const scores = scoreTraits(topArtists);
  const dominantTrait = (Object.entries(scores) as [keyof PersonalityMatrix, { pct: number }][])
    .sort((a, b) => b[1].pct - a[1].pct)[0]?.[0] ?? 'sensibilidad_emocional';

  const influences = topArtists.slice(0, 3).map(a => a.name);
  const seed = hashSeed(influences.join('|') || 'default');

  const sound1 = primaryGenre ? SOUND_TEMPLATES[primaryGenre]?.[lang] : undefined;
  const sound2 = secondaryGenre ? SOUND_TEMPLATES[secondaryGenre]?.[lang] : undefined;
  const sound = sound1 && sound2
    ? (lang === 'en' ? `A fusion of ${sound1} and ${sound2}` : `Fusión de ${sound1} y ${sound2}`)
    : sound1
      ? sound1
      : (lang === 'en' ? 'An eclectic personal blend' : 'Una mezcla personal ecléctica');

  const highEnergy = scores.energia.pct;
  const tempo = highEnergy > 0.55 ? '140-160 BPM' : highEnergy > 0.3 ? '110-130 BPM' : '80-100 BPM';

  const aesthetic = scores.futurismo.pct > 0.4
    ? 'Cyberpunk / Glassmorphic'
    : scores.oscuridad_estetica.pct > 0.4
      ? (lang === 'en' ? 'Atmospheric Gothic' : 'Gótico Atmosférico')
      : (lang === 'en' ? 'Warm Analog' : 'Cálido Analógico');

  const liveShow = scores.futurismo.pct > 0.4
    ? (lang === 'en' ? 'Reactive holograms' : 'Hologramas reactivos')
    : scores.oscuridad_estetica.pct > 0.4
      ? (lang === 'en' ? 'Fog and strobing light' : 'Niebla y luz estroboscópica')
      : (lang === 'en' ? 'Warm stage lighting and live strings' : 'Luces cálidas y cuerdas en vivo');

  const idx = Math.abs(seed) % EP_TITLES.length;
  const title = EP_TITLES[idx];
  const description = EP_DESC[lang][idx % EP_DESC[lang].length];
  const topTrackTitle = topTracks[0]?.title;

  const tracklist = lang === 'en'
    ? [
      '1. Noise Portal',
      topTrackTitle ? `2. ${topTrackTitle} (Echo)` : '2. Echo Chamber',
      '3. Inner City',
      '4. Synthetic Sunrise',
    ]
    : [
      '1. Portal de Ruido',
      topTrackTitle ? `2. ${topTrackTitle} (Echo)` : '2. Cámara de Eco',
      '3. Ciudad Interior',
      '4. Amanecer Sintético',
    ];

  return {
    alias: pickAlias(seed, dominantTrait),
    sound,
    tempo,
    influences,
    aesthetic,
    ep_concept: { title, description, tracklist },
    live_show: liveShow,
  };
}

