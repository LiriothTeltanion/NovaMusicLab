import type { Archetype, ArtistProfile, PersonalityMatrix, TopArtist, TopTrack } from '../types';
import { normalizeGenre } from './analytics';
import { localeFor, pickLanguage, type Lang } from './i18n';
import { hashSeed } from './seededRandom';

type Localized<T> = Record<Lang, T>;

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
 * arrays. The fixed prose describes musical patterns and creative prompts;
 * it must never be presented as a personality, wellbeing or mental-health
 * assessment.
 */

/**
 * The real artist alias for the bundled demo archive (Kevin/Lirioth's own
 * curated dataset) - a genuine fact about that one specific archive, not a
 * fabricated default. Every other archive (any visitor's own upload) gets
 * a freshly generated alias via buildArtistProfile's ArtistProfileOptions.
 */
export const DEMO_ARCHIVE_ALIAS = 'Lirioth Teltanion';

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

const TRAIT_TEXT: Record<keyof PersonalityMatrix, Localized<{ positive: string; shadow: string; tip: string }>> = {
  sensibilidad_emocional: {
    es: { positive: 'Contraste rico entre texturas delicadas e intensas.', shadow: 'Las texturas densas ocupan más espacio y dejan menos contraste ligero.', tip: 'Compara una canción densa con un cierre más luminoso y observa la diferencia sonora.' },
    en: { positive: 'Rich contrast between delicate and intense textures.', shadow: 'Dense textures occupy more space and leave less room for lighter contrast.', tip: 'Compare one dense track with a brighter closer and notice the sonic difference.' },
    he: { positive: 'ניגוד עשיר בין מרקמים עדינים לעוצמתיים.', shadow: 'מרקמים צפופים תופסים יותר מקום ומשאירים פחות ניגוד קליל.', tip: 'השווה שיר צפוף לסיום מואר יותר ובחן את ההבדל הצלילי.' },
  },
  nostalgia: {
    es: { positive: 'Continuidad clara entre épocas y sonidos recurrentes.', shadow: 'La paleta retro puede ocupar más espacio que los descubrimientos recientes.', tip: 'Crea una playlist por era y añade una canción nueva como punto de contraste.' },
    en: { positive: 'Clear continuity across eras and recurring sounds.', shadow: 'The retro palette may occupy more space than recent discoveries.', tip: 'Build a playlist per era and add one new track as a point of contrast.' },
    he: { positive: 'רצף ברור בין תקופות וצלילים שחוזרים.', shadow: 'הפלטה הרטרואית עשויה לתפוס יותר מקום מתגליות חדשות.', tip: 'צור פלייליסט לכל תקופה והוסף שיר חדש אחד כנקודת ניגוד.' },
  },
  energia: {
    es: { positive: 'Pulso alto y movimiento rítmico claramente representados.', shadow: 'Los bloques intensos dejan menos espacio para texturas de bajo pulso.', tip: 'Alterna un bloque de alta energía con una pieza de menor densidad.' },
    en: { positive: 'High pulse and rhythmic movement are clearly represented.', shadow: 'Intense blocks leave less space for low-pulse textures.', tip: 'Alternate a high-energy block with one lower-density piece.' },
    he: { positive: 'דופק גבוה ותנועה קצבית מיוצגים בבירור.', shadow: 'מקטעים עוצמתיים משאירים פחות מקום למרקמים בדופק נמוך.', tip: 'שלב מקטע עתיר אנרגיה עם יצירה אחת בצפיפות נמוכה יותר.' },
  },
  oscuridad_estetica: {
    es: { positive: 'Paleta oscura y atmosférica con identidad visual coherente.', shadow: 'Una paleta muy uniforme puede reducir el contraste tonal.', tip: 'Combina una textura oscura con una producción acústica o brillante.' },
    en: { positive: 'A coherent dark and atmospheric visual palette.', shadow: 'A very uniform palette can reduce tonal contrast.', tip: 'Pair one dark texture with an acoustic or brighter production.' },
    he: { positive: 'פלטה אפלה ואטמוספרית בעלת שפה חזותית עקבית.', shadow: 'פלטה אחידה מאוד עשויה לצמצם את הניגוד הטונאלי.', tip: 'שלב מרקם אפל אחד עם הפקה אקוסטית או מוארת יותר.' },
  },
  creatividad: {
    es: { positive: 'Variedad amplia de artistas y rutas de exploración.', shadow: 'Una amplitud muy grande puede hacer menos visibles los patrones centrales.', tip: 'Elige una micro-ruta de tres artistas y compárala con el resto del archivo.' },
    en: { positive: 'A broad variety of artists and exploratory paths.', shadow: 'Very broad coverage can make central patterns less visible.', tip: 'Choose a three-artist micro-route and compare it with the rest of the archive.' },
    he: { positive: 'מגוון רחב של אמנים ונתיבי חקירה.', shadow: 'כיסוי רחב מאוד עשוי להסתיר את הדפוסים המרכזיים.', tip: 'בחר מסלול קטן של שלושה אמנים והשווה אותו לשאר הארכיון.' },
  },
  rebeldia: {
    es: { positive: 'Contraste fuerte, ruptura y producción de alto impacto.', shadow: 'Texturas de impacto similares pueden agruparse y reducir la variedad dinámica.', tip: 'Coloca una canción de baja intensidad entre dos bloques de alto impacto.' },
    en: { positive: 'Strong contrast, rupture and high-impact production.', shadow: 'Similar high-impact textures can cluster and reduce dynamic variety.', tip: 'Place one low-intensity track between two high-impact blocks.' },
    he: { positive: 'ניגוד חזק, שבירה והפקה בעלת השפעה גבוהה.', shadow: 'מרקמים עוצמתיים דומים עשויים להצטבר ולצמצם את המגוון הדינמי.', tip: 'מקם שיר אחד בעצימות נמוכה בין שני מקטעים עוצמתיים.' },
  },
  futurismo: {
    es: { positive: 'Producción sintética y estética digital consistentes.', shadow: 'Una paleta muy sintética puede ocultar el contraste acústico.', tip: 'Compara una pieza sintética con otra basada en instrumentos orgánicos.' },
    en: { positive: 'Consistent synthetic production and digital aesthetics.', shadow: 'A strongly synthetic palette can obscure acoustic contrast.', tip: 'Compare one synthetic piece with another built from organic instruments.' },
    he: { positive: 'הפקה סינתטית ואסתטיקה דיגיטלית עקביות.', shadow: 'פלטה סינתטית חזקה עשויה להסתיר ניגוד אקוסטי.', tip: 'השווה יצירה סינתטית אחת ליצירה המבוססת על כלים אורגניים.' },
  },
};

const TRAIT_EVIDENCE_LABEL: Record<keyof PersonalityMatrix, Localized<string>> = {
  sensibilidad_emocional: { es: 'texturas expresivas densas', en: 'dense expressive textures', he: 'מרקמים אקספרסיביים צפופים' },
  nostalgia: { es: 'producción retro y sonidos recurrentes de época', en: 'retro production and recurring era sounds', he: 'הפקה רטרואית וצלילים שחוזרים בין תקופות' },
  energia: { es: 'bloques de alto pulso', en: 'high-pulse blocks', he: 'מקטעים עם דופק גבוה' },
  oscuridad_estetica: { es: 'texturas oscuras y atmosféricas', en: 'dark, atmospheric textures', he: 'מרקמים אפלים ואטמוספריים' },
  creatividad: { es: 'variedad amplia de artistas', en: 'a wide variety of artists', he: 'מגוון רחב של אמנים' },
  rebeldia: { es: 'contraste abrasivo, ruptura y producción de impacto', en: 'abrasive contrast, rupture and high-impact production', he: 'ניגוד מחוספס, שבירה והפקה עוצמתית' },
  futurismo: { es: 'producción sintética y estética digital', en: 'synthetic production and digital aesthetics', he: 'הפקה סינתטית ואסתטיקה דיגיטלית' },
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

export function buildPersonalityMatrix(topArtists: TopArtist[], lang: Lang = 'es'): PersonalityMatrix {
  const scores = scoreTraits(topArtists);
  const traits = Object.keys(TRAIT_TEXT) as (keyof PersonalityMatrix)[];
  const matrix = {} as PersonalityMatrix;

  traits.forEach(trait => {
    const { pct, topArtist } = scores[trait];
    const score = Math.round(pct * 100);
    const label = TRAIT_EVIDENCE_LABEL[trait][lang];
    const evidence = topArtist
      ? pickLanguage(lang, {
        es: `Escucha recurrente de ${label}, liderada por ${topArtist.name} (${topArtist.plays.toLocaleString(localeFor(lang))} plays).`,
        en: `Recurring listening of ${label}, led by ${topArtist.name} (${topArtist.plays.toLocaleString(localeFor(lang))} plays).`,
        he: `האזנה חוזרת ל${label}, בהובלת ${topArtist.name} (${topArtist.plays.toLocaleString(localeFor(lang))} השמעות).`,
      })
      : pct > 0
        ? pickLanguage(lang, {
          es: `La variedad de artistas aporta una señal normalizada de ${score}/100 para ${label}.`,
          en: `Artist variety contributes a normalized ${score}/100 archive signal for ${label}.`,
          he: `מגוון האמנים תורם אות ארכיוני מנורמל של ${score}/100 עבור ${label}.`,
        })
        : pickLanguage(lang, {
          es: `No hay evidencia de género mapeada para ${label} en el archivo activo.`,
          en: `No mapped genre evidence for ${label} is present in the active archive.`,
          he: `בארכיון הפעיל אין עדות ז׳אנר ממופה עבור ${label}.`,
        });
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
  he: Omit<Archetype, 'artists' | 'tracks'>;
}

const ARCHETYPE_BANK: ArchetypeTemplate[] = [
  {
    id: 'melancolico',
    genres: ['Post-Metal / Blackgaze', 'Ambient / Lo-Fi'],
    es: { name: 'El Explorador Atmosférico', desc: 'Prompt creativo basado en texturas amplias y de bajo brillo', color: 'cyan', aesthetic: 'Luna de neón', strength: 'Profundidad textural', wound: 'Contraste luminoso limitado', advice: 'Combina la atmósfera con una textura más brillante.' },
    en: { name: 'The Atmospheric Explorer', desc: 'A creative prompt built from spacious, low-brightness textures', color: 'cyan', aesthetic: 'Neon moon', strength: 'Textural depth', wound: 'Limited brightness contrast', advice: 'Pair the atmosphere with one brighter texture.' },
    he: { name: 'החוקר האטמוספרי', desc: 'הצעה יצירתית שנבנתה ממרקמים רחבים ובעלי בהירות נמוכה', color: 'cyan', aesthetic: 'ירח ניאון', strength: 'עומק מרקמי', wound: 'ניגוד בהירות מוגבל', advice: 'שלב את האווירה עם מרקם מואר יותר.' },
  },
  {
    id: 'guerrero',
    genres: ['Metalcore', 'Post-Hardcore'],
    es: { name: 'El Motor de Alto Pulso', desc: 'Prompt creativo basado en guitarras rápidas y producción de impacto', color: 'pink', aesthetic: 'Lluvia rosa', strength: 'Impulso rítmico', wound: 'Poco contraste de baja energía', advice: 'Abre espacio entre bloques intensos con una pieza más lenta.' },
    en: { name: 'The High-Pulse Engine', desc: 'A creative prompt built from fast guitars and high-impact production', color: 'pink', aesthetic: 'Pink rain', strength: 'Rhythmic momentum', wound: 'Limited low-energy contrast', advice: 'Open space between intense blocks with one slower piece.' },
    he: { name: 'מנוע הדופק הגבוה', desc: 'הצעה יצירתית שנבנתה מגיטרות מהירות והפקה עוצמתית', color: 'pink', aesthetic: 'גשם ורוד', strength: 'תנופה קצבית', wound: 'ניגוד מוגבל באנרגיה נמוכה', advice: 'פתח מרווח בין מקטעים עוצמתיים בעזרת יצירה איטית יותר.' },
  },
  {
    id: 'arquitecto',
    genres: ['Synthwave / Darksynth', 'Progressive Metal'],
    es: { name: 'El Arquitecto Nocturno', desc: 'Prompt creativo basado en síntesis, precisión y atmósferas retro', color: 'purple', aesthetic: 'Rejilla cian sobre asfalto mojado', strength: 'Construcción digital de mundos', wound: 'Paleta sintética estrecha', advice: 'Añade una textura orgánica al plano futurista.' },
    en: { name: 'The Night Architect', desc: 'A creative prompt built from synthesis, precision and retro atmosphere', color: 'purple', aesthetic: 'Cyan grid over wet asphalt', strength: 'Digital worldbuilding', wound: 'Narrow synthetic palette', advice: 'Add one organic texture to the futuristic blueprint.' },
    he: { name: 'אדריכל הלילה', desc: 'הצעה יצירתית שנבנתה מסינתזה, דיוק ואווירה רטרואית', color: 'purple', aesthetic: 'רשת ציאן מעל אספלט רטוב', strength: 'בניית עולמות דיגיטלית', wound: 'פלטה סינתטית צרה', advice: 'הוסף מרקם אורגני אחד לתוכנית העתידנית.' },
  },
  {
    id: 'nomada',
    genres: [],
    es: { name: 'El Nómada Sonoro', desc: 'Prompt creativo basado en variedad y cruces de género', color: 'green', aesthetic: 'Mapa desplegado', strength: 'Amplitud de catálogo', wound: 'Foco de género disperso', advice: 'Elige un territorio y compáralo con el mapa completo.' },
    en: { name: 'The Sonic Nomad', desc: 'A creative prompt built from variety and genre-crossing', color: 'green', aesthetic: 'An unfolded map', strength: 'Catalog breadth', wound: 'Scattered genre focus', advice: 'Pick one territory and compare it with the complete map.' },
    he: { name: 'הנווד הצלילי', desc: 'הצעה יצירתית שנבנתה ממגוון ומחיבורים בין ז׳אנרים', color: 'green', aesthetic: 'מפה פרושה', strength: 'רוחב קטלוג', wound: 'מיקוד ז׳אנרי מפוזר', advice: 'בחר טריטוריה אחת והשווה אותה למפה המלאה.' },
  },
  {
    id: 'ritual',
    genres: ['Death Metal', 'Heavy Metal', 'Power / Speed Metal', 'Folk Metal'],
    es: { name: 'El Guardián del Ritual', desc: 'Prompt creativo basado en continuidad pesada y formas recurrentes', color: 'red', aesthetic: 'Vitral roto y forja', strength: 'Continuidad estilística', wound: 'Contraste de género limitado', advice: 'Deja entrar una textura ligera para ampliar el ritual.' },
    en: { name: 'The Ritual Keeper', desc: 'A creative prompt built from heavy continuity and recurring forms', color: 'red', aesthetic: 'Shattered stained glass and forge-light', strength: 'Stylistic continuity', wound: 'Limited genre contrast', advice: 'Let one lighter texture in to widen the ritual.' },
    he: { name: 'שומר הטקס', desc: 'הצעה יצירתית שנבנתה מהמשכיות כבדה ומצורות חוזרות', color: 'red', aesthetic: 'ויטראז׳ מנופץ ואור כבשן', strength: 'המשכיות סגנונית', wound: 'ניגוד ז׳אנרי מוגבל', advice: 'אפשר למרקם קליל אחד להרחיב את הטקס.' },
  },
  {
    id: 'romantico',
    genres: ['Pop Punk / Emo', 'Emo Rap / Trap'],
    es: { name: 'El Melodista Digital', desc: 'Prompt creativo basado en melodía, brillo y recurrencia nostálgica', color: 'orange', aesthetic: 'Polaroid con glitch', strength: 'Continuidad melódica', wound: 'Paleta nostálgica repetida', advice: 'Añade una canción nueva al loop melódico.' },
    en: { name: 'The Digital Melodist', desc: 'A creative prompt built from melody, brightness and nostalgic recurrence', color: 'orange', aesthetic: 'A glitched-out polaroid', strength: 'Melodic continuity', wound: 'Repeated nostalgic palette', advice: 'Add one new track to the melodic loop.' },
    he: { name: 'המלודיסט הדיגיטלי', desc: 'הצעה יצירתית שנבנתה ממלודיה, בהירות וחזרתיות נוסטלגית', color: 'orange', aesthetic: 'Polaroid עם גליץ׳', strength: 'המשכיות מלודית', wound: 'פלטה נוסטלגית חוזרת', advice: 'הוסף שיר חדש אחד ללופ המלודי.' },
  },
];

export function buildArchetypes(topArtists: TopArtist[], lang: Lang = 'es'): Archetype[] {
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

  return scored.filter(({ score }) => score > 0).slice(0, 2).map(({ tpl }) => {
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

const SOUND_TEMPLATES: Record<string, Localized<string>> = {
  'Post-Metal / Blackgaze': { es: 'Blackgaze', en: 'Blackgaze', he: 'Blackgaze' },
  'Synthwave / Darksynth': { es: 'Synthwave Cyberpunk', en: 'Cyberpunk Synthwave', he: 'Synthwave בסגנון Cyberpunk' },
  'Metalcore': { es: 'Metalcore melódico', en: 'Melodic Metalcore', he: 'Metalcore מלודי' },
  'Post-Hardcore': { es: 'Post-Hardcore', en: 'Post-Hardcore', he: 'Post-Hardcore' },
  'Death Metal': { es: 'Death Metal melódico', en: 'Melodic Death Metal', he: 'Death Metal מלודי' },
  'Heavy Metal': { es: 'Heavy Metal clásico', en: 'Classic Heavy Metal', he: 'Heavy Metal קלאסי' },
  'Power / Speed Metal': { es: 'Power/Speed Metal', en: 'Power/Speed Metal', he: 'Power/Speed Metal' },
  'Folk Metal': { es: 'Folk Metal', en: 'Folk Metal', he: 'Folk Metal' },
  'Hard Rock': { es: 'Hard Rock', en: 'Hard Rock', he: 'Hard Rock' },
  'Pop Punk / Emo': { es: 'Pop Punk emocional', en: 'Emotional Pop Punk', he: 'Pop Punk רגשי' },
  'Emo Rap / Trap': { es: 'Emo Rap', en: 'Emo Rap', he: 'Emo Rap' },
  'Hip-Hop / Rap': { es: 'Hip-Hop introspectivo', en: 'Introspective Hip-Hop', he: 'Hip-Hop אינטרוספקטיבי' },
  'Pop / Indie': { es: 'Pop/Indie luminoso', en: 'Luminous Pop/Indie', he: 'Pop/Indie מואר' },
  'Progressive Metal': { es: 'Metal Progresivo', en: 'Progressive Metal', he: 'Progressive Metal' },
  'Alt-Metal': { es: 'Alt-Metal', en: 'Alt-Metal', he: 'Alt-Metal' },
  'Alternative Rock': { es: 'Rock Alternativo', en: 'Alternative Rock', he: 'רוק אלטרנטיבי' },
  'Israeli Rock': { es: 'Rock Israelí', en: 'Israeli Rock', he: 'רוק ישראלי' },
};

const EP_TITLES = ['Neon Catarsis', 'Ruido Interior', 'Segunda Piel', 'Circuito Cerrado', 'Voltaje Emocional', 'Ciudad de Vidrio'];
const EP_DESC: Localized<string[]> = {
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
  he: [
    'EP קונספטואלי על זיכרון, בנייה מחדש ואורות ליליים.',
    'EP קצר שמחבר בין קתרזיס, עיר פנימית והצליל של הבריחה.',
    'חמישה שירים על השארת גרסה קודמת של עצמך מאחור, בלי למחוק אותה לגמרי.',
  ],
};

const GENRE_BLURB: Record<string, Localized<string>> = {
  'Post-Metal / Blackgaze': { es: 'Guitarras enormes, melancolía luminosa y sensación de ascenso emocional.', en: 'Huge guitars, luminous melancholy and the feeling of emotional ascent.', he: 'גיטרות עצומות, מלנכוליה מוארת ותחושה של התעלות רגשית.' },
  'Synthwave / Darksynth': { es: 'Neón, movimiento nocturno, pads retro y textura cinematográfica.', en: 'Neon, nocturnal motion, retro pads and cinematic texture.', he: 'ניאון, תנועה לילית, פאדים של רטרו ומרקם קולנועי.' },
  'Post-Hardcore': { es: 'Voz frontal, catarsis, tensión melódica y energía de reconstrucción.', en: 'Forward vocals, catharsis, melodic tension and reconstruction energy.', he: 'שירה ישירה, קתרזיס, מתח מלודי ואנרגיה של בנייה מחדש.' },
  Metalcore: { es: 'Pulso pesado, breakdowns y catarsis con estructura moderna.', en: 'Heavy pulse, breakdowns and catharsis with a modern structure.', he: 'דופק כבד, breakdowns וקתרזיס בתוך מבנה מודרני.' },
  'Pop Punk / Emo': { es: 'Hooks directos, letras vulnerables y energía de garage adolescente.', en: 'Direct hooks, vulnerable lyrics and teenage-garage energy.', he: 'הוקים ישירים, מילים חשופות ואנרגיה של גראז׳ נעורים.' },
  'Emo Rap / Trap': { es: 'Producción íntima, voz quebrada y beats lentos y confesionales.', en: 'Intimate production, cracked vocals and slow, confessional beats.', he: 'הפקה אינטימית, קול שבור וביטים איטיים וחשופים.' },
  'Hip-Hop / Rap': { es: 'Ritmo, flow y narrativa directa sobre una base solida.', en: 'Rhythm, flow and direct storytelling over a solid beat.', he: 'קצב, flow וסיפור ישיר מעל ביט יציב.' },
  'Death Metal': { es: 'Densidad, técnica y oscuridad sin filtro.', en: 'Density, technicality and unfiltered darkness.', he: 'צפיפות, טכניקה ואפלה ללא פילטר.' },
  'Heavy Metal': { es: 'Riffs clásicos, poder y tradición metalera.', en: 'Classic riffs, power and metal tradition.', he: 'ריפים קלאסיים, עוצמה ומסורת של Metal.' },
  'Folk Metal': { es: 'Raíz acústica y melodía folclórica combinadas con fuerza metalera.', en: 'Acoustic roots and folk melody combined with metal force.', he: 'שורשים אקוסטיים ומלודיה עממית שמתחברים לעוצמה של Metal.' },
  'Power / Speed Metal': { es: 'Velocidad, coros épicos y virtuosismo instrumental.', en: 'Speed, epic choruses and instrumental virtuosity.', he: 'מהירות, פזמונים אפיים ווירטואוזיות אינסטרומנטלית.' },
  'Progressive Metal': { es: 'Estructuras complejas, cambios de compás y ambición compositiva.', en: 'Complex structures, shifting time signatures and compositional ambition.', he: 'מבנים מורכבים, משקלים מתחלפים ושאפתנות הלחנתית.' },
  'Alt-Metal': { es: 'Groove pesado con hooks accesibles y actitud alternativa.', en: 'Heavy groove with accessible hooks and alternative attitude.', he: 'גרוב כבד עם הוקים נגישים וגישה אלטרנטיבית.' },
  'Hard Rock': { es: 'Riffs directos, actitud y energía de estadio.', en: 'Direct riffs, attitude and stadium-sized energy.', he: 'ריפים ישירים, אטיטיוד ואנרגיה בגודל אצטדיון.' },
  'Ambient / Lo-Fi': { es: 'Texturas suaves, espacio y calma introspectiva.', en: 'Soft textures, space and introspective calm.', he: 'מרקמים רכים, מרחב ושקט אינטרוספקטיבי.' },
  'Pop / Indie': { es: 'Melodías luminosas y producción cuidada, más ligera que pesada.', en: 'Bright melodies and polished production, lighter than heavy.', he: 'מלודיות מוארות והפקה מלוטשת, קלילה יותר מכבדה.' },
  'Alternative Rock': { es: 'Guitarras crudas y actitud alternativa clásica.', en: 'Raw guitars and classic alt-rock attitude.', he: 'גיטרות מחוספסות וגישה אלטרנטיבית קלאסית.' },
  'Israeli Rock': { es: 'Una identidad de escena local dentro del archivo.', en: 'A local scene identity thread inside the archive.', he: 'חוט של זהות מקומית שעובר בתוך הארכיון.' },
};

/** Real top-4 genres by weighted play-share, with an honest computed percentage - not a fixed "92%" for everyone. */
export function buildSonicGenes(topArtists: TopArtist[], lang: Lang = 'es'): Array<{ label: string; value: string; body: string }> {
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
        ?? pickLanguage(lang, {
          es: 'Un hilo definitorio en el archivo.',
          en: 'A defining thread across the archive.',
          he: 'חוט מרכזי שמגדיר את הארכיון.',
        }),
    }));
}

export interface ArtistProfileOptions {
  /**
   * Pins the alias to a fixed value instead of the seeded generator - used
   * only for the bundled demo archive (the app's own real, curated dataset),
   * where the alias is a genuine fact about that specific archive rather
   * than a fabricated stand-in. Any visitor-uploaded archive always gets
   * the generated alias, never this one.
   */
  fixedAlias?: string;
}

type AestheticKey = 'cyberpunk' | 'gothic' | 'warm';
type TempoKey = 'fast' | 'mid' | 'slow';

interface DossierAestheticFacets {
  synths: string;
  palette: string;
  wardrobe: string;
  world: string;
  screen: string;
  lights: string;
  band: string;
  audience: string;
}

interface IdentitySignals {
  primaryGenre?: string;
  secondaryGenre?: string;
  sound1?: string;
  sound2?: string;
  scores: Record<keyof PersonalityMatrix, { pct: number; topArtist?: TopArtist }>;
  dominantTrait: keyof PersonalityMatrix;
  aestheticKey: AestheticKey;
  tempoKey: TempoKey;
  influences: string[];
  seed: number;
}

/** Shared by buildArtistProfile and buildDossierLineValues so genre-ranking and trait-scoring logic never drifts between the two. */
function computeIdentitySignals(topArtists: TopArtist[], lang: Lang): IdentitySignals {
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

  const aestheticKey: AestheticKey = scores.futurismo.pct > 0.4
    ? 'cyberpunk'
    : scores.oscuridad_estetica.pct > 0.4
      ? 'gothic'
      : 'warm';

  const tempoKey: TempoKey = scores.energia.pct > 0.55 ? 'fast' : scores.energia.pct > 0.3 ? 'mid' : 'slow';

  return { primaryGenre, secondaryGenre, sound1, sound2, scores, dominantTrait, aestheticKey, tempoKey, influences, seed };
}

const TEMPO_BPM: Record<TempoKey, string> = { fast: '140-160 BPM', mid: '110-130 BPM', slow: '80-100 BPM' };

const AESTHETIC_LABEL: Record<AestheticKey, Localized<string>> = {
  cyberpunk: { es: 'Cyberpunk / Glassmorphic', en: 'Cyberpunk / Glassmorphic', he: 'Cyberpunk / Glassmorphic' },
  gothic: { es: 'Gótico Atmosférico', en: 'Atmospheric Gothic', he: 'גותי אטמוספרי' },
  warm: { es: 'Cálido Analógico', en: 'Warm Analog', he: 'אנלוגי חם' },
};

const AESTHETIC_LIVE_SHOW: Record<AestheticKey, Localized<string>> = {
  cyberpunk: { es: 'Hologramas reactivos', en: 'Reactive holograms', he: 'הולוגרמות תגובתיות' },
  gothic: { es: 'Niebla y luz estroboscópica', en: 'Fog and strobing light', he: 'ערפל ותאורת סטרוב' },
  warm: { es: 'Luces cálidas y cuerdas en vivo', en: 'Warm stage lighting and live strings', he: 'תאורת במה חמה וכלי קשת חיים' },
};

/** Per-aesthetic-bucket facets reused across the Sound Architecture, Visual Identity and Live Show dossier layers. */
const AESTHETIC_STYLE: Record<AestheticKey, Localized<DossierAestheticFacets>> = {
  cyberpunk: {
    es: {
      synths: 'Pads oscuros, arpegios cyberpunk y bajos nocturnos',
      palette: 'Cian, rosa neón, negro profundo y blanco frío',
      wardrobe: 'Ropa técnica negra, detalles reflectantes y accesorios cromados',
      world: 'carreteras nocturnas, ruinas digitales y pantallas holográficas con lluvia de datos',
      screen: 'Visuales 3D reactivos con montañas geométricas y lluvia digital',
      lights: 'Gradientes cian/rosa sincronizados a golpes de batería',
      band: 'Sintetizadores como centro atmosférico junto a batería real',
      audience: 'Momentos de movimiento colectivo bajo luces de neón',
    },
    en: {
      synths: 'Dark pads, cyberpunk arpeggios and nocturnal basses',
      palette: 'Cyan, neon pink, deep black and cold white',
      wardrobe: 'Technical black clothing, reflective details and chrome accessories',
      world: 'nocturnal highways, digital ruins and holographic screens under data rain',
      screen: 'Reactive 3D visuals with geometric mountains and digital rain',
      lights: 'Cyan/pink gradients synchronized to the drum hits',
      band: 'Synthesizers as the atmospheric center alongside live drums',
      audience: 'Collective movement under neon light',
    },
    he: {
      synths: 'פאדים אפלים, ארפג׳ים של Cyberpunk ובסים ליליים',
      palette: 'ציאן, ורוד ניאון, שחור עמוק ולבן קר',
      wardrobe: 'ביגוד טכני שחור, פרטים מחזירי אור ואביזרי כרום',
      world: 'כבישים ליליים, חורבות דיגיטליות ומסכים הולוגרפיים תחת גשם של נתונים',
      screen: 'ויז׳ואלים תלת־ממדיים תגובתיים עם הרים גאומטריים וגשם דיגיטלי',
      lights: 'גרדיאנטים של ציאן וורוד שמסתנכרנים עם מכות התופים',
      band: 'סינתיסייזרים במרכז האטמוספרי לצד תופים חיים',
      audience: 'תנועה קולקטיבית תחת אור ניאון',
    },
  },
  gothic: {
    es: {
      synths: 'Texturas atmosféricas oscuras y drones de fondo',
      palette: 'Negro profundo, rojo óxido y grises de piedra',
      wardrobe: 'Capas largas, texturas desgastadas y siluetas ceremoniales',
      world: 'catedrales en ruinas, niebla baja y vitrales rotos',
      screen: 'Proyecciones de humo, vitrales fracturados y contraluces',
      lights: 'Niebla espesa y luz estroboscópica puntual',
      band: 'Percusión ritual al frente y guitarras como coro de fondo',
      audience: 'Silencio tenso que estalla en momentos puntuales',
    },
    en: {
      synths: 'Dark atmospheric textures and background drones',
      palette: 'Deep black, oxide red and stone greys',
      wardrobe: 'Long layers, worn textures and ceremonial silhouettes',
      world: 'ruined cathedrals, low fog and shattered stained glass',
      screen: 'Smoke projections, fractured stained glass and backlighting',
      lights: 'Thick fog and pointed strobing light',
      band: 'Ritual percussion upfront with guitars as a background choir',
      audience: 'Tense silence that breaks in sharp bursts',
    },
    he: {
      synths: 'מרקמים אטמוספריים אפלים ודרונים ברקע',
      palette: 'שחור עמוק, אדום חלודה וגוני אפור של אבן',
      wardrobe: 'שכבות ארוכות, מרקמים שחוקים וצלליות טקסיות',
      world: 'קתדרלות חרבות, ערפל נמוך וויטראז׳ים מנופצים',
      screen: 'הקרנות עשן, ויטראז׳ים שבורים ותאורה אחורית',
      lights: 'ערפל סמיך והבזקי סטרוב ממוקדים',
      band: 'כלי הקשה טקסיים בחזית וגיטרות כמקהלה ברקע',
      audience: 'שקט מתוח שמתפרץ ברגעים חדים',
    },
  },
  warm: {
    es: {
      synths: 'Capas cálidas, casi ausentes, dejando espacio a la banda',
      palette: 'Ocre, marrón cálido y blanco hueso',
      wardrobe: 'Telas naturales, capas sencillas y accesorios artesanales',
      world: 'habitaciones iluminadas por lámparas, madera y luz de tarde',
      screen: 'Proyecciones mínimas, casi documentales, sin exceso digital',
      lights: 'Luces cálidas de escenario y velas reales',
      band: 'Cuerdas en vivo y batería acústica sin procesar',
      audience: 'Cercanía física, coros compartidos y calma',
    },
    en: {
      synths: 'Warm layers, almost absent, leaving room for the band',
      palette: 'Ochre, warm brown and bone white',
      wardrobe: 'Natural fabrics, simple layers and handmade accessories',
      world: 'lamp-lit rooms, wood and afternoon light',
      screen: 'Minimal, almost documentary projections, no digital excess',
      lights: 'Warm stage lighting and real candles',
      band: 'Live strings and unprocessed acoustic drums',
      audience: 'Physical closeness, shared singalongs and calm',
    },
    he: {
      synths: 'שכבות חמות וכמעט בלתי מורגשות, שמשאירות מקום ללהקה',
      palette: 'אוכרה, חום חם ולבן עצם',
      wardrobe: 'בדים טבעיים, שכבות פשוטות ואביזרים בעבודת יד',
      world: 'חדרים מוארים במנורות, עץ ואור אחר הצהריים',
      screen: 'הקרנות מינימליות וכמעט תיעודיות, בלי עודף דיגיטלי',
      lights: 'תאורת במה חמה ונרות אמיתיים',
      band: 'כלי קשת חיים ותופים אקוסטיים ללא עיבוד',
      audience: 'קרבה פיזית, שירה משותפת ורוגע',
    },
  },
};

const VOICE_STYLE: Record<keyof PersonalityMatrix, Localized<string>> = {
  sensibilidad_emocional: { es: 'Voz limpia y frontal, cerca del micrófono para que la emoción tenga rostro humano.', en: 'Clean, forward vocals close to the mic so the emotion has a human face.', he: 'שירה נקייה וישירה, קרובה למיקרופון, כדי לתת לרגש פנים אנושיות.' },
  nostalgia: { es: 'Voz cálida con eco suave, como si llegara desde otra década.', en: 'Warm vocals with a soft echo, as if arriving from another decade.', he: 'שירה חמה עם הד עדין, כאילו הגיעה מעשור אחר.' },
  energia: { es: 'Voz proyectada con fuerza, casi gritada en los estribillos.', en: 'Vocals pushed hard, almost shouted through the choruses.', he: 'שירה עוצמתית, כמעט צעקה לאורך הפזמונים.' },
  oscuridad_estetica: { es: 'Voz grave y contenida, con susurros que se rompen en momentos puntuales.', en: 'Low, restrained vocals that break into whispers at key moments.', he: 'שירה נמוכה ומאופקת, שנשברת ללחישות ברגעים הנכונים.' },
  creatividad: { es: 'Voz cambiante, que salta de registro limpio a experimental sin aviso.', en: 'A shifting voice that jumps from a clean register to experimental without warning.', he: 'שירה משתנה שקופצת מרגיסטר נקי לניסיוני בלי התראה.' },
  rebeldia: { es: 'Voz que alterna entre limpia y gritada, catártica en los puentes.', en: 'Vocals that shift between clean and screamed, cathartic through the bridges.', he: 'שירה שנעה בין נקי לצרחות, וקתרזיס שמתפרץ בגשרים.' },
  futurismo: { es: 'Voz procesada con capas digitales, casi vocoder en los coros.', en: 'Vocals processed with digital layers, almost vocoder-like in the choruses.', he: 'שירה מעובדת בשכבות דיגיטליות, כמעט כמו vocoder בפזמונים.' },
};

const TEMPO_STYLE: Record<TempoKey, Localized<string>> = {
  fast: { es: 'Pulso rápido y directo, con fills que empujan cada estribillo hacia adelante.', en: 'A fast, direct pulse, with fills that push every chorus forward.', he: 'דופק מהיר וישיר, עם fills שדוחפים כל פזמון קדימה.' },
  mid: { es: 'Pulso medio con groove marcado, ni frenético ni relajado.', en: 'A mid-tempo groove, neither frantic nor relaxed.', he: 'קצב בינוני עם גרוב מודגש, לא תזזיתי ולא רגוע.' },
  slow: { es: 'Pulso relajado y espacioso, dejando que cada golpe respire.', en: 'A relaxed, spacious pulse that lets every hit breathe.', he: 'דופק רגוע ומרווח שנותן לכל מכה לנשום.' },
};

function joinTwo(a: string | undefined, b: string | undefined, lang: Lang): string {
  if (a && b) {
    return pickLanguage(lang, {
      es: `${a} y ${b}`,
      en: `${a} and ${b}`,
      he: `${a} ו־${b}`,
    });
  }
  return a ?? b ?? '';
}

export function buildArtistProfile(topArtists: TopArtist[], topTracks: TopTrack[], lang: Lang = 'es', options?: ArtistProfileOptions): ArtistProfile {
  const { sound1, sound2, dominantTrait, aestheticKey, tempoKey, influences, seed } = computeIdentitySignals(topArtists, lang);

  const sound = sound1 && sound2
    ? pickLanguage(lang, {
      es: `Fusión de ${sound1} y ${sound2}`,
      en: `A fusion of ${sound1} and ${sound2}`,
      he: `היתוך של ${sound1} ו־${sound2}`,
    })
    : sound1
      ? sound1
      : pickLanguage(lang, {
        es: 'Una mezcla personal ecléctica',
        en: 'An eclectic personal blend',
        he: 'תערובת אישית אקלקטית',
      });

  const tempo = TEMPO_BPM[tempoKey];
  const aesthetic = AESTHETIC_LABEL[aestheticKey][lang];
  const liveShow = AESTHETIC_LIVE_SHOW[aestheticKey][lang];

  const idx = Math.abs(seed) % EP_TITLES.length;
  const title = EP_TITLES[idx];
  const description = EP_DESC[lang][idx % EP_DESC[lang].length];
  const topTrackTitle = topTracks[0]?.title;

  const tracklist = pickLanguage(lang, {
    es: [
      '1. Portal de Ruido',
      topTrackTitle ? `2. ${topTrackTitle} (Echo)` : '2. Cámara de Eco',
      '3. Ciudad Interior',
      '4. Amanecer Sintético',
    ],
    en: [
      '1. Noise Portal',
      topTrackTitle ? `2. ${topTrackTitle} (Echo)` : '2. Echo Chamber',
      '3. Inner City',
      '4. Synthetic Sunrise',
    ],
    he: [
      '1. שער הרעש',
      topTrackTitle ? `2. ${topTrackTitle} (Echo)` : '2. תא ההד',
      '3. העיר הפנימית',
      '4. זריחה סינתטית',
    ],
  });

  return {
    alias: options?.fixedAlias ?? pickAlias(seed, dominantTrait),
    sound,
    tempo,
    influences,
    aesthetic,
    ep_concept: { title, description, tracklist },
    live_show: liveShow,
  };
}

export interface DossierLineValues {
  layer1: { guitars: string; drums: string; synths: string; voice: string };
  layer2: { palette: string; wardrobe: string; world: string; covers: string };
  layer3: { act2: string };
  layer4: { screen: string; lights: string; band: string; audience: string };
  layer6: { single1: string; single2: string; art: string };
}

/**
 * Fills in the descriptive "value" text for the ArtistIdentity dossier's
 * expandable layer cards, driven by the same real signals as
 * buildArtistProfile (dominant genre/trait/aesthetic/tempo, real influences,
 * real top track) instead of one fixed set of sentences naming specific real
 * artists ("The Midnight and Carpenter Brut") for every visitor. Card
 * eyebrow/title/summary and the line labels (Guitars/Drums/...) stay fixed
 * in ArtistIdentity.tsx - they're structural section labels, not claims
 * about the archive.
 */
export function buildDossierLineValues(topArtists: TopArtist[], topTracks: TopTrack[], lang: Lang = 'es'): DossierLineValues {
  const { sound1, sound2, dominantTrait, aestheticKey, tempoKey, influences } = computeIdentitySignals(topArtists, lang);
  const style = AESTHETIC_STYLE[aestheticKey][lang];
  const topTrackTitle = topTracks[0]?.title;
  const influencePair = joinTwo(influences[0], influences[1], lang);

  const guitars = pickLanguage(lang, {
    es: `Texturas de guitarra marcadas por ${sound1 ?? 'tu sonido dominante'}${influencePair ? `, coloreadas por lo que ${influencePair} traen a tu rotación` : ''}.`,
    en: `Guitar textures shaped by ${sound1 ?? 'your dominant sound'}${influencePair ? `, colored by what ${influencePair} bring to your rotation` : ''}.`,
    he: `מרקמי גיטרה שעוצבו בידי ${sound1 ?? 'הסאונד הדומיננטי שלך'}${influencePair ? `, ונצבעו במה ש־${influencePair} מביאים לרוטציה שלך` : ''}.`,
  });

  const synths = influences[0]
    ? pickLanguage(lang, {
      es: `${style.synths}, en la línea de ${influences[0]}.`,
      en: `${style.synths}, in the spirit of ${influences[0]}.`,
      he: `${style.synths}, ברוח ${influences[0]}.`,
    })
    : `${style.synths}.`;

  const covers = pickLanguage(lang, {
    es: `El alias en primer plano como silueta o avatar, sobre ${style.world}.`,
    en: `The alias as silhouette or avatar, set against ${style.world}.`,
    he: `הכינוי כצללית או כאווטאר בחזית, על רקע ${style.world}.`,
  });

  const world = pickLanguage(lang, {
    es: `El escenario imaginado: ${style.world}.`,
    en: `The imagined setting: ${style.world}.`,
    he: `העולם המדומיין: ${style.world}.`,
  });

  const act2 = pickLanguage(lang, {
    es: `Choque de sonidos: ${sound1 ?? 'tu género principal'}${sound2 ? ` y ${sound2}` : ''} pelean hasta convertirse en idioma propio.`,
    en: `Sound collision: ${sound1 ?? 'your lead genre'}${sound2 ? ` and ${sound2}` : ''} fight until they become a personal language.`,
    he: `התנגשות צלילים: ${sound1 ?? 'הז׳אנר המוביל שלך'}${sound2 ? ` ו־${sound2}` : ''} נאבקים עד שהם הופכים לשפה אישית.`,
  });

  const single1 = topTrackTitle
    ? pickLanguage(lang, {
      es: `Elegir "${topTrackTitle}" como sencillo ancla: el gancho ya existe, solo falta un visualizer a su altura.`,
      en: `Choose "${topTrackTitle}" as the anchor single: the hook is already there, it just needs a visualizer that matches it.`,
      he: `בחר ב־"${topTrackTitle}" כסינגל העוגן: ההוק כבר שם; חסר רק visualizer שמתאים לו.`,
    })
    : pickLanguage(lang, {
      es: 'Elegir una canción ancla: la más directa, con un gancho fuerte y un visualizer a su altura.',
      en: 'Choose an anchor song: the most direct one, with a strong hook and a visualizer that matches it.',
      he: 'בחר שיר עוגן: הישיר ביותר, עם הוק חזק ו־visualizer שמתאים לו.',
    });

  const single2 = sound2
    ? pickLanguage(lang, {
      es: `Publicar una pieza más atmosférica cerca de ${sound2}, para mostrar profundidad y no solo energía.`,
      en: `Release a more atmospheric piece leaning into ${sound2}, to show depth and not only energy.`,
      he: `הוצא קטע אטמוספרי יותר שנוטה לכיוון ${sound2}, כדי להראות עומק ולא רק אנרגיה.`,
    })
    : pickLanguage(lang, {
      es: 'Publicar una pieza más atmosférica para mostrar profundidad, no solo energía.',
      en: 'Release a more atmospheric piece to show depth, not only energy.',
      he: 'הוצא קטע אטמוספרי יותר כדי להראות עומק ולא רק אנרגיה.',
    });

  const normalizedPalette = style.palette.toLocaleLowerCase(localeFor(lang));
  const art = pickLanguage(lang, {
    es: `Definir portada, fotos y visualizers alrededor de la paleta ${normalizedPalette} para que todo pertenezca al mismo universo.`,
    en: `Define cover, photos and visualizers around the ${normalizedPalette} palette so everything belongs to the same universe.`,
    he: `בנה את העטיפה, התמונות וה־visualizers סביב פלטת ${normalizedPalette}, כדי שהכול ישתייך לאותו יקום.`,
  });

  return {
    layer1: { guitars, drums: TEMPO_STYLE[tempoKey][lang], synths, voice: VOICE_STYLE[dominantTrait][lang] },
    layer2: { palette: `${style.palette}.`, wardrobe: `${style.wardrobe}.`, world, covers },
    layer3: { act2 },
    layer4: { screen: `${style.screen}.`, lights: `${style.lights}.`, band: `${style.band}.`, audience: `${style.audience}.` },
    layer6: { single1, single2, art },
  };
}
