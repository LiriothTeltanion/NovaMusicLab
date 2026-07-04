import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, ZAxis } from 'recharts';
import { Activity, BrainCircuit, Compass, ExternalLink, Flame, Gauge, Heart, Moon, Orbit, Radio, Shield, Sparkles, Sun, Zap } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { inferMoodCoordinates } from '../utils/analytics';
import ArtistAvatar from './ArtistAvatar';
import CoverArt from './CoverArt';
import EmotionalTimeline from './EmotionalTimeline';
import ExpandableInsightCard from './ExpandableInsightCard';
import SectionNarrative from './SectionNarrative';
import SectionQuickRead from './SectionQuickRead';
import MoodBadge, { MOOD_ICONS } from './MoodBadge';
import MoodArtCanvas from './MoodArtCanvas';
import { getCuratedArtistMedia, getPrimarySpotifyUrl, getPrimaryYoutubeUrl, buildSpotifySearchUrl, buildYoutubeSearchUrl } from '../utils/mediaLinks';
import {
  buildEmotionalMapEngineProfile,
  emotionalAxisLabels,
  EMOTIONAL_MOOD_TAXONOMY,
  type EmotionalMoodKey,
} from '../engines/emotionalEngine';

interface EmotionalMapProps {
  data: MusicDnaData;
}

type EmotionKey = EmotionalMoodKey;

const EMOTION_DETAILS = {
  melancolia: {
    es: {
      tab: "Melancolía",
      title: "Melancolía / Introspección",
      desc: "Vibras shoegaze, post-metal atmosférico y trap emocional. La música sirve como un catalizador reflexivo para procesar heridas o transiciones de vida silenciosas.",
      time: "Madrugada 00-05 y Noche 18-23",
      bodyState: "Silencio interno, mirada hacia adentro, ganas de caminar, escribir o quedarse en una imagen mental.",
      strength: "Convierte la tristeza en sensibilidad estética, paciencia y construcción de sentido.",
      shadow: "Puede empujar a rumiar demasiado si no se cierra con una canción de salida o una acción concreta.",
      ritual: "Escucha 3 canciones intensas y termina con una luminosa para transformar el peso en claridad.",
      evidence: "Deafheaven, Alcest y nothingnowhere. aparecen como anclas de duelo luminoso e introspección lírica.",
    },
    en: {
      tab: "Melancholy",
      title: "Melancholy / Introspection",
      desc: "Shoegaze vibes, atmospheric post-metal, and emotional trap. Music works as a reflective catalyst for processing wounds or quiet life transitions.",
      time: "Late night 00-05 and Evening 18-23",
      bodyState: "Inner quiet, inward gaze, and the urge to walk, write, or stay inside a mental image.",
      strength: "Turns sadness into aesthetic sensitivity, patience and meaning-making.",
      shadow: "Can become rumination if it does not end with an exit song or a concrete action.",
      ritual: "Listen to 3 intense songs, then close with one luminous track to turn weight into clarity.",
      evidence: "Deafheaven, Alcest and nothingnowhere. appear as anchors of luminous grief and lyrical introspection.",
    },
    artists: ["Deafheaven", "Alcest", "nothingnowhere.", "Hammock"],
    tracks: ["In Blur", "Shellstar", "Great Mass of Color", "Love Who Loves You Back"],
    trackNotes: {
      es: ["Duelo luminoso y reparación de identidad.", "Belleza enorme con textura de cielo frío.", "Catarsis shoegaze sin perder esperanza.", "Nostalgia romántica con gesto pop."],
      en: ["Luminous grief and identity repair.", "Huge beauty with cold-sky texture.", "Shoegaze catharsis without losing hope.", "Romantic nostalgia with a pop gesture."],
    },
    color: "#00f2fe",
  },
  energia: {
    es: {
      tab: "Catarsis",
      title: "Fuerza / Catarsis Metalcore",
      desc: "Metalcore agresivo y post-hardcore rápido. El enojo y la intensidad instrumental funcionan como escudo y combustible energético.",
      time: "Mañana 06-11 y Tarde 12-17",
      bodyState: "Cuerpo activado, mandíbula apretada, necesidad de moverte o recuperar control.",
      strength: "Canaliza tensión en dirección, disciplina y empuje para actuar.",
      shadow: "Si se usa sin pausa puede alimentar irritación o sobreestimulación.",
      ritual: "Úsala antes de entrenar, limpiar, resolver tareas o cortar un bloqueo mental.",
      evidence: "BMTH, The Word Alive y Slaves funcionan como armadura emocional y motor de arranque.",
    },
    en: {
      tab: "Catharsis",
      title: "Force / Metalcore Catharsis",
      desc: "Aggressive metalcore and fast post-hardcore. Anger and instrumental intensity work as both shield and fuel.",
      time: "Morning 06-11 and Afternoon 12-17",
      bodyState: "Activated body, clenched jaw, and a need to move or regain control.",
      strength: "Channels tension into direction, discipline and action.",
      shadow: "Without pauses, it can feed irritation or overstimulation.",
      ritual: "Use it before training, cleaning, solving tasks or breaking a mental block.",
      evidence: "BMTH, The Word Alive and Slaves work as emotional armor and ignition.",
    },
    artists: ["Bring Me the Horizon", "The Word Alive", "Slaves", "Odeon"],
    tracks: ["MANTRA", "Prayers", "Red Clouds", "Ritual"],
    trackNotes: {
      es: ["Declaración de control y energía combativa.", "Catarsis emocional frontal.", "Tensión post-hardcore para soltar presión.", "Golpe ritual para activar el cuerpo."],
      en: ["Statement of control and combative energy.", "Direct emotional catharsis.", "Post-hardcore tension to release pressure.", "Ritual hit to activate the body."],
    },
    color: "#f72585",
  },
  dopamina: {
    es: {
      tab: "Dopamina",
      title: "Dopamina / Diversión Emo-Groove",
      desc: "Riffs alegres de guitarra, mezcla de pop de los 2000s, sintetizadores y percusiones rápidas. Sonidos optimistas ideales para motivarte.",
      time: "Mañana 06-11",
      bodyState: "Ligereza, movimiento rápido, humor raro y sensación de reinicio.",
      strength: "Sube la energía sin sentirse tan pesada; hace que la productividad parezca juego.",
      shadow: "Puede convertirse en búsqueda constante de estímulo si no se alterna con foco.",
      ritual: "Ponla como bloque de 20 minutos para empezar una tarea que vienes evitando.",
      evidence: "Bilmuri y Magnolia Park aparecen como resets de energía juguetona y groove emocional.",
    },
    en: {
      tab: "Dopamine",
      title: "Dopamine / Emo-Groove Fun",
      desc: "Cheerful guitar riffs, a blend of 2000s pop, synths and fast percussion. Upbeat sounds built to motivate you.",
      time: "Morning 06-11",
      bodyState: "Lightness, quick movement, strange humor and a feeling of reset.",
      strength: "Raises energy without feeling too heavy; makes productivity feel playful.",
      shadow: "Can become constant stimulation-seeking if it is not alternated with focus.",
      ritual: "Use it as a 20-minute launch block for a task you have been avoiding.",
      evidence: "Bilmuri and Magnolia Park appear as playful energy resets and emotional groove.",
    },
    artists: ["Bilmuri", "Magnolia Park", "All Time Low", "Aries"],
    tracks: ["2016 CAVALIERS (Ohio)", "Tokyo", "THICC THICCLY", "Aperol Spritz"],
    trackNotes: {
      es: ["Groove absurdo y reconstrucción con sonrisa.", "Energía moderna de pop-punk digital.", "Dopamina caótica para desbloquearte.", "Ligereza de tarde y movimiento social."],
      en: ["Absurd groove and rebuilding with a smile.", "Modern digital pop-punk energy.", "Chaotic dopamine to unblock yourself.", "Afternoon lightness and social motion."],
    },
    color: "#ffb703",
  },
  calma: {
    es: {
      tab: "Foco",
      title: "Calma / Enfoque Técnico",
      desc: "Ambient, lo-fi suave y metal progresivo intrincado de ritmos lentos. Utilizado como canalizador del hiperenfoque al diseñar o programar.",
      time: "Tarde 12-17 y Noche 18-23",
      bodyState: "Respiración más lenta, atención sostenida, mente técnica y deseo de construir.",
      strength: "Ordena la energía mental sin apagar la imaginación.",
      shadow: "Puede aislarte demasiado si el bloque de foco no tiene final claro.",
      ritual: "Define una tarea, pon 45 minutos de foco y cierra con una canción cálida.",
      evidence: "TesseracT, Hammock y Corbin Karasu conectan precisión, atmósfera y flujo de trabajo.",
    },
    en: {
      tab: "Focus",
      title: "Calm / Technical Focus",
      desc: "Ambient, soft lo-fi, and intricate slow-tempo progressive metal. Used as a channel for hyperfocus while designing or coding.",
      time: "Afternoon 12-17 and Evening 18-23",
      bodyState: "Slower breathing, sustained attention, technical mind and a desire to build.",
      strength: "Organizes mental energy without turning imagination off.",
      shadow: "Can isolate you too much if the focus block has no clear ending.",
      ritual: "Define one task, play 45 minutes of focus music and close with a warmer song.",
      evidence: "TesseracT, Hammock and Corbin Karasu connect precision, atmosphere and workflow.",
    },
    artists: ["TesseracT", "Hammock", "Corbin Karasu", "Astral Wonder"],
    tracks: ["Of Matter - Proxy", "The Journey", "Midnight Relief", "Candyland"],
    trackNotes: {
      es: ["Precisión progresiva para hiperenfoque.", "Ambient para respirar y sostener espacio.", "Alivio nocturno con textura suave.", "Complejidad juguetona sin perder control."],
      en: ["Progressive precision for hyperfocus.", "Ambient breathing room and held space.", "Nocturnal relief with soft texture.", "Playful complexity without losing control."],
    },
    color: "#10b981",
  },
  nostalgia: {
    es: {
      tab: "Memoria",
      title: "Nostalgia / Memoria Cinemática",
      desc: "Synthwave, pop oscuro y canciones que parecen una escena de carretera. No es solo recordar: es convertir el pasado en estética útil.",
      time: "Noche 18-23",
      bodyState: "Mirada hacia atrás, imágenes de ciudad, carretera, adolescencia y lugares que ya cambiaron.",
      strength: "Te conecta con continuidad personal: quién fuiste y qué todavía vibra en ti.",
      shadow: "Puede idealizar etapas anteriores si todo el presente se compara con una versión editada del pasado.",
      ritual: "Haz una playlist por era y termina siempre con una canción nueva para traer el pasado al futuro.",
      evidence: "The Midnight, Tokio Hotel y Emarosa aparecen como cápsulas de memoria emocional.",
    },
    en: {
      tab: "Memory",
      title: "Nostalgia / Cinematic Memory",
      desc: "Synthwave, dark pop and songs that feel like a highway scene. It is not only remembering: it turns the past into useful aesthetics.",
      time: "Evening 18-23",
      bodyState: "Looking back: city images, highways, adolescence and places that have already changed.",
      strength: "Connects you with personal continuity: who you were and what still vibrates in you.",
      shadow: "Can idealize earlier stages if the present is always compared with an edited past.",
      ritual: "Make playlists by era, then always end with a new song to bring the past forward.",
      evidence: "The Midnight, Tokio Hotel and Emarosa appear as capsules of emotional memory.",
    },
    artists: ["The Midnight", "Tokio Hotel", "Emarosa", "H.E.A.T"],
    tracks: ["Vampires", "Love Who Loves You Back", "Givin' Up", "Back to Life"],
    trackNotes: {
      es: ["Noche de neón y memoria en movimiento.", "Pop romántico como fotografía emocional.", "Vulnerabilidad melódica de regreso.", "AOR luminoso para reanimar el ánimo."],
      en: ["Neon night and memory in motion.", "Romantic pop as emotional photograph.", "Melodic vulnerability returning.", "Luminous AOR to revive the mood."],
    },
    color: "#a78bfa",
  },
  rebeldia: {
    es: {
      tab: "Rebeldía",
      title: "Rebeldía / Supervivencia",
      desc: "Canciones de fricción, ruptura y postura. Aquí la música crea límites: no todo se procesa en silencio.",
      time: "Mañana 06-11 y Noche 18-23",
      bodyState: "Impulso de decir no, cortar ruido externo y recuperar poder personal.",
      strength: "Protege identidad, marca límites y transforma cansancio en decisión.",
      shadow: "Puede sostener tensión más tiempo del necesario si no encuentra salida corporal.",
      ritual: "Escucha el bloque intenso caminando o entrenando, no sentado en bucle.",
      evidence: "Post-hardcore, metalcore y emo punk aparecen como lenguaje de defensa emocional.",
    },
    en: {
      tab: "Rebellion",
      title: "Rebellion / Survival",
      desc: "Songs of friction, rupture and stance. Here music creates boundaries: not everything is processed quietly.",
      time: "Morning 06-11 and Evening 18-23",
      bodyState: "An urge to say no, cut external noise and reclaim personal power.",
      strength: "Protects identity, marks boundaries and turns exhaustion into decision.",
      shadow: "Can hold tension longer than needed if it has no physical outlet.",
      ritual: "Listen to the intense block while walking or training, not sitting in a loop.",
      evidence: "Post-hardcore, metalcore and emo punk appear as a language of emotional defense.",
    },
    artists: ["Bring Me the Horizon", "The Word Alive", "Bad Omens", "Falling In Reverse"],
    tracks: ["Can You Feel My Heart", "Red Clouds", "Just Pretend", "Popular Monster"],
    trackNotes: {
      es: ["Herida convertida en símbolo.", "Rabia melódica y cielo rojo.", "Drama moderno con coro catártico.", "Confesión explosiva de supervivencia."],
      en: ["Wound turned into symbol.", "Melodic rage and red sky.", "Modern drama with cathartic chorus.", "Explosive survival confession."],
    },
    color: "#ef4444",
  },
  futurismo: {
    es: {
      tab: "Futuro",
      title: "Futurismo / Night Drive",
      desc: "Darksynth, cyberpunk y producción moderna. La emoción mira hacia adelante: tecnología, velocidad, interfaz y destino.",
      time: "Noche 18-23 y Madrugada 00-05",
      bodyState: "Sensación de velocidad, pantalla abierta, ciudad futura y control creativo.",
      strength: "Activa visión, diseño, programación y planificación de mundos.",
      shadow: "Puede desconectarte del cuerpo si todo ocurre dentro de pantalla y auriculares.",
      ritual: "Úsala para diseñar, programar o planear, luego sal a caminar sin música.",
      evidence: "Carpenter Brut, Dance With the Dead y The Midnight sostienen el eje cyberpunk del archivo.",
    },
    en: {
      tab: "Future",
      title: "Futurism / Night Drive",
      desc: "Darksynth, cyberpunk and modern production. The emotion looks forward: technology, speed, interface and destination.",
      time: "Night 18-23 and Late night 00-05",
      bodyState: "A sense of speed, open screen, future city and creative control.",
      strength: "Activates vision, design, programming and world planning.",
      shadow: "Can disconnect you from the body if everything happens inside screens and headphones.",
      ritual: "Use it to design, code or plan, then walk outside without music.",
      evidence: "Carpenter Brut, Dance With the Dead and The Midnight sustain the cyberpunk axis of the archive.",
    },
    artists: ["Carpenter Brut", "Dance With the Dead", "The Midnight", "Perturbator"],
    tracks: ["Turbo Killer", "Vampires", "Neo Tokyo", "Roller Mobster"],
    trackNotes: {
      es: ["Velocidad cyberpunk y persecución mental.", "Carretera nocturna con corazón nostálgico.", "Ciudad futura como refugio.", "Darksynth físico y cinematográfico."],
      en: ["Cyberpunk speed and mental chase.", "Nocturnal highway with nostalgic heart.", "Future city as refuge.", "Physical and cinematic darksynth."],
    },
    color: "#7209b7",
  },
  romanticismo: {
    es: {
      tab: "Romance",
      title: "Romanticismo Oscuro / Emoción Cinemática",
      desc: "Baladas, pop oscuro y melodías dramáticas donde la emoción se vuelve escena. Vulnerabilidad con luces bajas.",
      time: "Noche 18-23",
      bodyState: "Corazón abierto, memoria afectiva y ganas de habitar una escena más grande que el día.",
      strength: "Permite ternura, belleza y expresión sentimental sin perder estética.",
      shadow: "Puede dramatizar vínculos o convertir la distancia en fantasía demasiado perfecta.",
      ritual: "Escúchala cuando quieras escribir, diseñar personajes o cerrar el día con suavidad.",
      evidence: "Tokio Hotel, Emarosa y The Midnight conectan romanticismo, nostalgia y escena visual.",
    },
    en: {
      tab: "Romance",
      title: "Dark Romanticism / Cinematic Emotion",
      desc: "Ballads, dark pop and dramatic melodies where emotion becomes scene. Vulnerability under low lights.",
      time: "Evening 18-23",
      bodyState: "Open heart, affective memory and the desire to inhabit a scene larger than the day.",
      strength: "Allows tenderness, beauty and sentimental expression without losing aesthetics.",
      shadow: "Can dramatize bonds or turn distance into too-perfect fantasy.",
      ritual: "Use it for writing, character design or closing the day softly.",
      evidence: "Tokio Hotel, Emarosa and The Midnight connect romanticism, nostalgia and visual scene.",
    },
    artists: ["Tokio Hotel", "Emarosa", "The Midnight", "Holding Absence"],
    tracks: ["Love Who Loves You Back", "Givin' Up", "Vampires", "Wilt"],
    trackNotes: {
      es: ["Romance brillante con impulso de noche.", "Voz vulnerable y despedida emocional.", "Amor como cine retro nocturno.", "Dolor bello con alcance vocal."],
      en: ["Bright romance with night-drive motion.", "Vulnerable voice and emotional farewell.", "Love as nocturnal retro cinema.", "Beautiful pain with vocal reach."],
    },
    color: "#ec4899",
  },
};

const EMOTION_KEYS: EmotionKey[] = ['melancolia', 'energia', 'dopamina', 'calma', 'nostalgia', 'rebeldia', 'futurismo', 'romanticismo'];

const EMOTIONAL_MAP_COPY = {
  es: {
    quick: {
      intensityLabel: 'Intensidad media',
      intensityTitle: (pct: number) => `${pct}% de energía emocional inferida`,
      intensityBody: 'Los artistas principales no se agrupan en calma absoluta: el archivo tiende a música con movimiento, tensión y función reguladora.',
      contrastLabel: 'Contraste',
      contrastTitle: (dark: number, total: number) => `${dark}/${total} artistas caen del lado oscuro`,
      contrastBody: 'La oscuridad no domina sola; convive con dopamina, enfoque, nostalgia y futurismo.',
      anchorLabel: 'Ancla emocional',
      anchorTitle: (artist: string) => artist,
      anchorBody: 'El artista más fuerte del archivo funciona como una puerta rápida al estado emocional que más regresa.',
    },
    engine: {
      title: 'Mezcla del motor emocional',
      subtitle: 'La misma capa que ahora alimenta los dossiers lee tus artistas principales y calcula qué modos emocionales dominan el archivo activo.',
      dominant: 'Modo dominante',
      analyzedArtists: 'artistas analizados',
      moodMix: 'Distribución por mood',
      averageAxis: 'Promedio de ejes',
      confidence: 'confianza',
      artistMode: 'modo del motor',
    },
    quadrantTitle: 'Guía de cuadrantes emocionales',
    quadrantIntro: 'El mapa se lee mejor como clima emocional: no mide sentimientos exactos, ubica texturas de energía y brillo.',
    quadrants: [
      { title: 'Oscuro + bajo pulso', tag: 'Reflexión', body: 'Música para procesar, recordar, escribir o bajar el volumen del mundo.', color: '#00f2fe' },
      { title: 'Oscuro + alto pulso', tag: 'Catarsis', body: 'Música para descargar tensión, recuperar fuerza y crear límites.', color: '#f72585' },
      { title: 'Brillante + alto pulso', tag: 'Dopamina', body: 'Música de activación, movimiento, confianza y reinicio rápido.', color: '#ffb703' },
      { title: 'Brillante + bajo pulso', tag: 'Foco', body: 'Música para ordenar la mente, trabajar y sostener calma creativa.', color: '#10b981' },
    ],
    dossierTitle: 'Dossier emocional seleccionado',
    artistRolesTitle: 'Roles emocionales de artistas',
    ritualsTitle: 'Rituales recomendados',
    methodologyTitle: 'Lectura y metodología',
    methodologyBody: 'Las coordenadas emocionales son una lectura artística inferida desde género, artista, frecuencia y curaduría interna. No son diagnóstico clínico; sirven para entender cómo tu archivo organiza energía, memoria y regulación.',
    labels: {
      meaning: 'Qué significa',
      evidence: 'Por qué aparece',
      body: 'Estado corporal / mental',
      strength: 'Fortaleza',
      shadow: 'Sombra',
      ritual: 'Ritual recomendado',
      artists: 'Artistas clave',
      tracks: 'Canciones refugio',
      time: 'Horario dominante',
      plays: 'plays',
      role: 'Rol emocional',
    },
    rituals: [
      { title: 'Activación de mañana', body: 'Usa catarsis o dopamina para entrar en movimiento antes de revisar pantallas.', emotion: 'energia' as EmotionKey },
      { title: 'Bloque de foco', body: 'Usa calma técnica para programar, diseñar o ordenar tareas sin apagar la imaginación.', emotion: 'calma' as EmotionKey },
      { title: 'Procesamiento nocturno', body: 'Usa melancolía o romanticismo oscuro para cerrar emociones sin quedarte atrapado.', emotion: 'melancolia' as EmotionKey },
      { title: 'Construcción de mundos', body: 'Usa futurismo y nostalgia para convertir memoria en estética, arte o narrativa.', emotion: 'futurismo' as EmotionKey },
    ],
    stations: {
      title: 'Estaciones de Mood',
      intro: 'Cada emoción funciona como una estación de radio curada desde tu propio archivo. Los enlaces abren páginas oficiales o búsquedas públicas en Spotify y YouTube — nada se reproduce dentro de la app.',
      spotifyAria: (artist: string) => `Abrir ${artist} en Spotify`,
      youtubeAria: (artist: string) => `Abrir ${artist} en YouTube`,
      verifiedNote: 'Los enlaces marcados con punto son páginas oficiales verificadas; el resto abre una búsqueda pública.',
    },
    gallery: {
      title: 'Galería Generativa',
      intro: 'Ocho obras pintadas por código desde tu propio archivo: cada mood genera su pieza con una semilla determinista basada en tus artistas. Mismo archivo, misma galería; otro archivo, otro museo.',
      variation: 'Nueva variación',
      variationHint: 'Cada variación repinta las ocho obras con una semilla nueva.',
    },
  },
  en: {
    quick: {
      intensityLabel: 'Average intensity',
      intensityTitle: (pct: number) => `${pct}% inferred emotional energy`,
      intensityBody: 'The main artists do not cluster in pure calm: the archive leans toward music with motion, tension and regulation.',
      contrastLabel: 'Contrast',
      contrastTitle: (dark: number, total: number) => `${dark}/${total} artists fall on the darker side`,
      contrastBody: 'Darkness does not dominate alone; it coexists with dopamine, focus, nostalgia and futurism.',
      anchorLabel: 'Emotional anchor',
      anchorTitle: (artist: string) => artist,
      anchorBody: 'The strongest artist in the archive works as a fast doorway into the emotional state that returns most often.',
    },
    engine: {
      title: 'Emotional engine mix',
      subtitle: 'The same layer now powering the dossiers reads your main artists and calculates which emotional modes dominate the active archive.',
      dominant: 'Dominant mode',
      analyzedArtists: 'artists analyzed',
      moodMix: 'Mood distribution',
      averageAxis: 'Average axes',
      confidence: 'confidence',
      artistMode: 'engine mode',
    },
    quadrantTitle: 'Emotional Quadrant Guide',
    quadrantIntro: 'The map works best as emotional weather: it does not measure exact feelings, it places textures of energy and brightness.',
    quadrants: [
      { title: 'Dark + low pulse', tag: 'Reflection', body: 'Music for processing, remembering, writing or lowering the volume of the world.', color: '#00f2fe' },
      { title: 'Dark + high pulse', tag: 'Catharsis', body: 'Music for releasing tension, regaining force and creating boundaries.', color: '#f72585' },
      { title: 'Bright + high pulse', tag: 'Dopamine', body: 'Music for activation, movement, confidence and quick reset.', color: '#ffb703' },
      { title: 'Bright + low pulse', tag: 'Focus', body: 'Music for organizing the mind, working and sustaining creative calm.', color: '#10b981' },
    ],
    dossierTitle: 'Selected Emotional Dossier',
    artistRolesTitle: 'Artist Emotional Roles',
    ritualsTitle: 'Recommended Rituals',
    methodologyTitle: 'Reading and Methodology',
    methodologyBody: 'Emotional coordinates are an artistic reading inferred from genre, artist, frequency and internal curation. They are not a clinical diagnosis; they help explain how your archive organizes energy, memory and regulation.',
    labels: {
      meaning: 'What it means',
      evidence: 'Why it appears',
      body: 'Body / mental state',
      strength: 'Strength',
      shadow: 'Shadow',
      ritual: 'Recommended ritual',
      artists: 'Key artists',
      tracks: 'Refuge songs',
      time: 'Dominant time',
      plays: 'plays',
      role: 'Emotional role',
    },
    rituals: [
      { title: 'Morning activation', body: 'Use catharsis or dopamine to get moving before checking screens.', emotion: 'energia' as EmotionKey },
      { title: 'Focus block', body: 'Use technical calm to code, design or organize tasks without turning imagination off.', emotion: 'calma' as EmotionKey },
      { title: 'Night processing', body: 'Use melancholy or dark romanticism to close emotions without getting trapped.', emotion: 'melancolia' as EmotionKey },
      { title: 'Worldbuilding', body: 'Use futurism and nostalgia to turn memory into aesthetics, art or narrative.', emotion: 'futurismo' as EmotionKey },
    ],
    stations: {
      title: 'Mood Stations',
      intro: 'Each emotion works as a radio station curated from your own archive. Links open official pages or public searches on Spotify and YouTube — nothing plays inside the app.',
      spotifyAria: (artist: string) => `Open ${artist} on Spotify`,
      youtubeAria: (artist: string) => `Open ${artist} on YouTube`,
      verifiedNote: 'Links marked with a dot are verified official pages; the rest open a public search.',
    },
    gallery: {
      title: 'Generative Gallery',
      intro: 'Eight artworks painted by code from your own archive: each mood generates its piece with a deterministic seed based on your artists. Same archive, same gallery; another archive, another museum.',
      variation: 'New variation',
      variationHint: 'Each variation repaints all eight pieces with a new seed.',
    },
  },
};

export default function EmotionalMap({ data }: EmotionalMapProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionKey>('melancolia');
  const [artVariation, setArtVariation] = useState(0);
  const { tc, t, lang } = useApp();
  const engineProfile = useMemo(() => buildEmotionalMapEngineProfile(data.top_artists, 24), [data.top_artists]);
  const engineArtistMap = useMemo(
    () => new Map(engineProfile.artists.map(profile => [profile.artist.name, profile])),
    [engineProfile],
  );

  const galaxyArtists = useMemo(() => data.top_artists.slice(0, 14).map(artist => ({
    name: artist.name,
    plays: artist.plays,
    genre: artist.genre,
    engine: engineArtistMap.get(artist.name),
    ...inferMoodCoordinates(artist.genre, artist.name),
  })), [data.top_artists, engineArtistMap]);

  const copy = EMOTIONAL_MAP_COPY[lang];
  const emotionDetails = Object.fromEntries(
    EMOTION_KEYS.map(key => {
      const detail = EMOTION_DETAILS[key];
      return [
        key,
        {
          ...detail[lang],
          artists: detail.artists,
          tracks: detail.tracks,
          trackNotes: detail.trackNotes[lang],
          color: detail.color,
        },
      ];
    })
  ) as Record<EmotionKey, typeof EMOTION_DETAILS[EmotionKey][typeof lang] & {
    artists: string[];
    tracks: string[];
    trackNotes: string[];
    color: string;
  }>;

  const currentEmotion = emotionDetails[selectedEmotion];
  const topArtist = data.top_artists[0];
  const avgEnergy = galaxyArtists.length
    ? Math.round((galaxyArtists.reduce((sum, artist) => sum + artist.energy, 0) / galaxyArtists.length) * 100)
    : 0;
  const darkArtists = galaxyArtists.filter(artist => artist.valence < 0.46).length;
  const formatNum = (value: number) => value.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');
  const DominantMoodIcon = MOOD_ICONS[engineProfile.dominantMood.icon];

  const quickReadItems = [
    {
      icon: <Gauge className="w-4 h-4" />,
      label: copy.quick.intensityLabel,
      title: copy.quick.intensityTitle(avgEnergy),
      body: copy.quick.intensityBody,
      color: tc.c2,
    },
    {
      icon: <Orbit className="w-4 h-4" />,
      label: copy.quick.contrastLabel,
      title: copy.quick.contrastTitle(darkArtists, galaxyArtists.length),
      body: copy.quick.contrastBody,
      color: tc.c1,
    },
    {
      icon: <Shield className="w-4 h-4" />,
      label: copy.quick.anchorLabel,
      title: copy.quick.anchorTitle(topArtist?.name ?? 'N/A'),
      body: copy.quick.anchorBody,
      color: tc.c3,
    },
  ];

  const selectedArtistEvidence = currentEmotion.artists.map(name => ({
    name,
    plays: data.top_artists.find(artist => artist.name === name)?.plays,
  }));

  const emotionDossierLines = [
    { label: copy.labels.meaning, value: currentEmotion.desc },
    { label: copy.labels.evidence, value: currentEmotion.evidence },
    { label: copy.labels.body, value: currentEmotion.bodyState },
    { label: copy.labels.strength, value: currentEmotion.strength },
    { label: copy.labels.shadow, value: currentEmotion.shadow },
    { label: copy.labels.ritual, value: currentEmotion.ritual },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <Heart className="w-6 h-6" style={{ color: tc.c2 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.sections.emotionalMap}</h2>
      </div>

      <SectionNarrative content={t.deepNarratives.emotions} accent="c2" />

      <SectionQuickRead items={quickReadItems} />

      <section className="glass-panel p-5 md:p-6 rounded-3xl border border-white/10 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background: `radial-gradient(circle at 12% 10%, ${engineProfile.dominantMood.color}24, transparent 34%), radial-gradient(circle at 88% 10%, ${tc.c2}18, transparent 30%)`,
          }} />
        <div className="relative z-10 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" style={{ color: engineProfile.dominantMood.color }} />
                <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
                  {copy.engine.title}
                </h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mt-2 max-w-3xl">
                {copy.engine.subtitle}
              </p>
            </div>

            <div className="rounded-2xl border bg-black/20 px-4 py-3 min-w-[220px]"
              style={{ borderColor: `${engineProfile.dominantMood.color}35` }}>
              <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                {copy.engine.dominant}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                  style={{
                    color: engineProfile.dominantMood.color,
                    borderColor: `${engineProfile.dominantMood.color}40`,
                    backgroundColor: `${engineProfile.dominantMood.color}12`,
                  }}>
                  <DominantMoodIcon className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-white">{engineProfile.dominantMood.shortLabel[lang]}</p>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {engineProfile.artists.length} {copy.engine.analyzedArtists}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] gap-4">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Orbit className="w-4 h-4" style={{ color: tc.c1 }} />
                <h4 className="text-[11px] font-mono uppercase tracking-widest font-black" style={{ color: tc.c1 }}>
                  {copy.engine.moodMix}
                </h4>
              </div>
              <div className="space-y-3">
                {engineProfile.distribution.map(item => {
                  const Icon = MOOD_ICONS[item.mood.icon];
                  return (
                    <div key={item.mood.key}>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" style={{ color: item.mood.color }} />
                          <span className="text-xs font-bold text-white truncate">{item.mood.shortLabel[lang]}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{item.count}</span>
                        </div>
                        <span className="text-[10px] font-mono font-black" style={{ color: item.mood.color }}>
                          {item.pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.mood.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-4 h-4" style={{ color: tc.c3 }} />
                <h4 className="text-[11px] font-mono uppercase tracking-widest font-black" style={{ color: tc.c3 }}>
                  {copy.engine.averageAxis}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(engineProfile.averageAxis) as Array<[keyof typeof engineProfile.averageAxis, number]>).map(([axis, value], index) => (
                  <div key={axis} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500">
                      {emotionalAxisLabels[axis][lang]}
                    </p>
                    <p className="text-lg font-black font-mono mt-1" style={{ color: [tc.c1, tc.c2, tc.c3, tc.c4, '#fb923c', '#a78bfa'][index] }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <EmotionalTimeline data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Scatter Chart "Galaxia Emocional" */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h3 className="text-sm font-mono font-bold text-gray-400 uppercase tracking-widest">{t.emotionalMap.artistCoordinates}</h3>
            <span className="text-[10px] font-mono text-gray-500">{t.emotionalMap.axesLabel}</span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <XAxis
                  type="number"
                  dataKey="valence"
                  name={t.emotionalMap.positivityName}
                  domain={[0, 1]}
                  stroke="#4b5563"
                  label={{ value: t.emotionalMap.positivityAxis, position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="energy"
                  name={t.emotionalMap.energyAxis}
                  domain={[0, 1]}
                  stroke="#4b5563"
                  label={{ value: t.emotionalMap.energyAxis, angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="plays" range={[50, 450]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: 'rgba(10, 25, 47, 0.95)', borderColor: '#00f2fe', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value, name) => {
                    if (name === "plays") return [`${value} plays`, t.emotionalMap.frequencyLabel];
                    return [value, name];
                  }}
                />
                <Scatter name={t.emotionalMap.artistsLegend} data={galaxyArtists} fill="#00f2fe">
                  {galaxyArtists.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.valence > 0.5 ? '#ffb703' : '#00f2fe'} 
                      stroke={entry.energy > 0.7 ? '#f72585' : '#7209b7'}
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full flex justify-between text-xs font-mono text-gray-500 mt-2 px-6">
            <span>{t.emotionalMap.darkSide}</span>
            <span>{t.emotionalMap.brightSide}</span>
          </div>

          <div className="w-full mt-6 space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
                {copy.quadrantTitle}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">{copy.quadrantIntro}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {copy.quadrants.map(quad => (
              <div key={quad.title} className="rounded-2xl border bg-white/3 p-4"
                style={{ borderColor: `${quad.color}25` }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h4 className="text-sm font-black text-white">{quad.title}</h4>
                  <span className="text-[9px] font-mono font-black uppercase px-2 py-1 rounded-full"
                    style={{ color: quad.color, backgroundColor: `${quad.color}12`, border: `1px solid ${quad.color}28` }}>
                    {quad.tag}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{quad.body}</p>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Details */}
        <div className="glass-panel p-8 rounded-3xl lg:col-span-5 flex flex-col justify-between h-full">
          <div>
            {/* Tab selector buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {EMOTION_KEYS.map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedEmotion(key)}
                  className={`py-2 font-mono text-[9px] font-bold rounded-xl border uppercase transition-all truncate ${
                    selectedEmotion === key 
                      ? 'bg-cyberPink/10 border-cyberPink text-cyberPink' 
                      : 'bg-[#0a0f1d] border-cyan-500/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {emotionDetails[key].tab}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentEmotion.color }}></span>
                {currentEmotion.title}
              </h3>
              
              <p className="text-xs text-gray-300 font-sans leading-relaxed">
                {currentEmotion.desc}
              </p>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">{copy.labels.artists}</span>
                <div className="flex flex-wrap gap-2">
                  {selectedArtistEvidence.map(({ name, plays }) => (
                    <span key={name} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-[#0a0f1d] border border-cyan-500/10 rounded-full text-xs text-white font-semibold font-mono">
                      <ArtistAvatar name={name} size={20} />
                      <span>{name}</span>
                      {plays && <span className="text-[9px] text-gray-500">· {formatNum(plays)}</span>}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">{copy.labels.tracks}</span>
                <div className="space-y-1">
                  {currentEmotion.tracks.map((track, index) => (
                    <div key={track} className="px-3 py-2 bg-[#0a0f1d] border border-cyan-500/10 rounded-lg text-xs flex items-start gap-2.5">
                      <CoverArt artist={currentEmotion.artists[index] ?? currentEmotion.artists[0]} title={track} kind="track" size={34} />
                      <div className="min-w-0">
                        <p className="font-mono text-gray-200 truncate">{track}</p>
                        <p className="text-[10px] text-gray-500 leading-relaxed mt-1">{currentEmotion.trackNotes[index]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-cyan-500/10 space-y-1 mt-6 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">{t.emotionalMap.dominantTimeLabel}</span>
              <span className="font-mono text-white">{currentEmotion.time}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {copy.dossierTitle}
          </h3>
        </div>
        <ExpandableInsightCard
          eyebrow={currentEmotion.tab}
          title={currentEmotion.title}
          summary={currentEmotion.evidence}
          lines={emotionDossierLines}
          color={currentEmotion.color}
          defaultOpen
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5" style={{ color: tc.c1 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {copy.artistRolesTitle}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {galaxyArtists.slice(0, 8).map(artist => {
            const moodProfile = artist.engine;
            const mood = moodProfile ? EMOTIONAL_MOOD_TAXONOMY[moodProfile.moodKey] : engineProfile.dominantMood;
            const Icon = MOOD_ICONS[mood.icon];
            const color = mood.color;
            return (
              <article key={artist.name} className="glass-panel p-4 rounded-2xl border hover:scale-[1.01] transition-transform"
                style={{ borderColor: `${color}25` }}>
                <div className="flex items-center gap-3">
                  <ArtistAvatar name={artist.name} size={38} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-white truncate">{artist.name}</h4>
                    <p className="text-[10px] text-gray-500 font-mono">{formatNum(artist.plays)} {copy.labels.plays}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-mono font-black uppercase tracking-wider" style={{ color }}>
                      {copy.engine.artistMode}
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-mono font-black"
                      style={{ color, border: `1px solid ${color}35`, backgroundColor: `${color}12` }}>
                      <Icon className="w-3 h-3" />
                      {moodProfile?.confidence ?? 0}% {copy.engine.confidence}
                    </span>
                  </div>
                  <p className="text-xs text-white font-bold leading-relaxed">{mood.title[lang]}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{mood.description[lang]}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{artist.type}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-500">
                    <span>{t.emotionalMap.positivityName}: {Math.round(artist.valence * 100)}%</span>
                    <span>{t.emotionalMap.energyAxis}: {Math.round(artist.energy * 100)}%</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: tc.c3 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {copy.ritualsTitle}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {copy.rituals.map((ritual, index) => {
            const emotion = emotionDetails[ritual.emotion];
            const Icon = index === 0 ? Zap : index === 1 ? Activity : index === 2 ? Moon : Sun;
            return (
              <button
                key={ritual.title}
                onClick={() => setSelectedEmotion(ritual.emotion)}
                className="glass-panel p-5 rounded-2xl border text-left hover:scale-[1.02] transition-transform"
                style={{ borderColor: `${emotion.color}25` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border"
                    style={{ color: emotion.color, borderColor: `${emotion.color}35`, backgroundColor: `${emotion.color}10` }}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: emotion.color }}>
                    {emotion.tab}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">{ritual.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed mt-2">{ritual.body}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5" style={{ color: tc.c4 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {copy.stations.title}
          </h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">{copy.stations.intro}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {EMOTION_KEYS.map(key => {
            const emotion = emotionDetails[key];
            const Icon = MOOD_ICONS[EMOTIONAL_MOOD_TAXONOMY[key].icon];
            return (
              <article key={key} className="glass-panel rounded-2xl border p-4" style={{ borderColor: `${emotion.color}28` }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border"
                    style={{ color: emotion.color, borderColor: `${emotion.color}38`, backgroundColor: `${emotion.color}10` }}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-mono font-black uppercase tracking-widest" style={{ color: emotion.color }}>
                    {emotion.tab}
                  </h4>
                </div>
                <div className="space-y-2">
                  {emotion.artists.map(name => {
                    const curated = getCuratedArtistMedia(name);
                    const spotifyUrl = getPrimarySpotifyUrl(curated) ?? buildSpotifySearchUrl(name);
                    const youtubeUrl = getPrimaryYoutubeUrl(curated) ?? buildYoutubeSearchUrl(`${name} official`);
                    const verified = Boolean(curated);
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <ArtistAvatar name={name} size={24} />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
                          {name}
                          {verified && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: emotion.color }} />}
                        </span>
                        <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"
                          aria-label={copy.stations.spotifyAria(name)} title={copy.stations.spotifyAria(name)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#1DB954]/40 bg-[#1DB954]/10 text-[#1DB954] transition-transform hover:scale-110">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                          aria-label={copy.stations.youtubeAria(name)} title={copy.stations.youtubeAria(name)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#ff0033]/40 bg-[#ff0033]/10 text-[#ff4d6a] transition-transform hover:scale-110">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">{copy.stations.verifiedNote}</p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: tc.c3 }} />
            <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
              {copy.gallery.title}
            </h3>
          </div>
          <button
            onClick={() => setArtVariation(v => v + 1)}
            title={copy.gallery.variationHint}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all hover:scale-[1.04]"
            style={{ color: tc.c3, borderColor: `${tc.c3}45`, backgroundColor: `${tc.c3}12` }}
          >
            <Zap className="h-3.5 w-3.5" />
            {copy.gallery.variation}
          </button>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">{copy.gallery.intro}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {EMOTION_KEYS.map(key => {
            const emotion = emotionDetails[key];
            const seed = `${emotion.artists.join('|')}::${data.top_artists[0]?.name ?? ''}::v${artVariation}`;
            return (
              <figure key={key} className="glass-panel rounded-2xl border overflow-hidden group"
                style={{ borderColor: `${emotion.color}28` }}>
                <div className="aspect-[4/3] overflow-hidden">
                  <MoodArtCanvas moodKey={key} seed={seed} width={340} height={255}
                    className="transition-transform duration-500 group-hover:scale-[1.04]" />
                </div>
                <figcaption className="flex items-center justify-between gap-2 p-3">
                  <MoodBadge moodKey={key} size="sm" />
                  <span className="text-[9px] font-mono text-gray-500">#{String(artVariation + 1).padStart(2, '0')}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      <section className="glass-panel p-5 rounded-2xl border border-white/10 flex items-start gap-3">
        <Flame className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c2 }} />
        <div className="space-y-1">
          <p className="text-xs font-mono font-black uppercase tracking-widest text-white">
            {copy.methodologyTitle}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">{copy.methodologyBody}</p>
        </div>
      </section>
    </div>
  );
}
