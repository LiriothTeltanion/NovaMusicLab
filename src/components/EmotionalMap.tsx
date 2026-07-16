import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, ZAxis } from 'recharts';
import { Activity, BrainCircuit, Compass, ExternalLink, Flame, Gauge, Moon, Orbit, Radio, Shield, Sparkles, Sun, Zap } from 'lucide-react';
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
import { axisProps, useChartAnimation } from './chartKit';
import { getCuratedArtistMedia, getPrimarySpotifyUrl, getPrimaryYoutubeUrl, getWikipediaUrl, buildSpotifySearchUrl, buildYoutubeSearchUrl } from '../utils/mediaLinks';
import {
  buildEmotionalMapEngineProfile,
  emotionalAxisLabels,
  EMOTIONAL_MOOD_TAXONOMY,
  type ArtistMoodProfile,
  type EmotionalMoodKey,
} from '../engines/emotionalEngine';
import { directionFor, localeFor } from '../utils/i18n';
import {
  layoutEmotionalScatterPoints,
  type EmotionalScatterCoordinate,
  type EmotionalScatterPoint,
} from '../utils/emotionalScatterLayout';

interface EmotionalMapProps {
  data: MusicDnaData;
}

type EmotionKey = EmotionalMoodKey;

interface GalaxyArtistDatum extends EmotionalScatterCoordinate {
  plays: number;
  genre: string;
  type: string;
  engine?: ArtistMoodProfile;
  moodKey: EmotionalMoodKey;
  moodColor: string;
  moodLabel: string;
}

type GalaxyArtistPoint = EmotionalScatterPoint<GalaxyArtistDatum>;

interface EmotionalScatterTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: GalaxyArtistPoint }>;
  accent: string;
  locale: string;
  playsLabel: string;
  rawCoordinatesLabel: string;
  separatedClusterLabel: (count: number) => string;
}

function EmotionalScatterTooltip({
  active,
  payload,
  accent,
  locale,
  playsLabel,
  rawCoordinatesLabel,
  separatedClusterLabel,
}: EmotionalScatterTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const format = (value: number, maximumFractionDigits = 0) => value.toLocaleString(locale, { maximumFractionDigits });

  return (
    <div className="nova-chart-tooltip max-w-64 rounded-2xl border px-3.5 py-3 shadow-2xl backdrop-blur-md"
      style={{ borderColor: `${accent}55` }}>
      <div className="flex items-center gap-2.5">
        <ArtistAvatar name={point.name} size={28} />
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-white"><bdi dir="auto">{point.name}</bdi></p>
          <p className="truncate text-[10px] text-gray-400"><bdi dir="auto">{point.genre}</bdi></p>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-xl bg-white/5 px-2.5 py-2">
          <p className="font-mono uppercase tracking-wider text-gray-500">{playsLabel}</p>
          <p className="mt-1 font-mono font-black text-white">{format(point.plays)}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-2.5 py-2">
          <p className="font-mono uppercase tracking-wider text-gray-500">{rawCoordinatesLabel}</p>
          <p className="mt-1 font-mono font-black text-white" dir="ltr">
            {format(point.rawValence, 2)} · {format(point.rawEnergy, 2)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-bold" style={{ color: point.moodColor }}>{point.moodLabel}</p>
      {point.overlapCount > 1 ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
          {separatedClusterLabel(point.overlapCount)}
        </p>
      ) : null}
    </div>
  );
}

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
    he: {
      tab: "מלנכוליה",
      title: "מלנכוליה / התבוננות פנימית",
      desc: "אווירת שוגייז, פוסט־מטאל אטמוספרי וטראפ רגשי. המוזיקה משמשת זרז להתבוננות ולעיבוד פצעים או מעברי חיים שקטים.",
      time: "שעות הלילה המאוחרות 00–05 והערב 18–23",
      bodyState: "שקט פנימי, מבט פנימה ורצון ללכת, לכתוב או לשהות בתוך דימוי מנטלי.",
      strength: "הופכת עצב לרגישות אסתטית, לסבלנות ולבניית משמעות.",
      shadow: "עלולה להפוך למחשבות מעגליות אם לא מסיימים בשיר יציאה או בפעולה מוחשית.",
      ritual: "האזן לשלושה שירים עוצמתיים, וסיים בשיר מואר אחד כדי להפוך את הכובד לבהירות.",
      evidence: "Deafheaven, Alcest ו-nothingnowhere. משמשים עוגנים של אבל מואר והתבוננות לירית פנימה.",
    },
    artists: ["Deafheaven", "Alcest", "nothingnowhere.", "Hammock"],
    tracks: ["In Blur", "Kodama", "Trauma Factory", "The Journey"],
    trackNotes: {
      es: ["Duelo luminoso y reparación de identidad.", "Peso de espíritu del bosque vuelto luz.", "Trauma convertido en confesión y ruido.", "Pasaje ambient sin palabras a través del duelo."],
      en: ["Luminous grief and identity repair.", "Forest-spirit weight turned into light.", "Trauma turned into confession and noise.", "Wordless ambient passage through grief."],
      he: ["אבל מואר ושיקום הזהות.", "כובד של רוח היער שהופך לאור.", "טראומה שהופכת לווידוי ולרעש.", "מסע אמביינט נטול מילים דרך האבל."],
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
      evidence: "BMTH, The Word Alive, Slaves y Odeon funcionan como armadura emocional y motor de arranque.",
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
      evidence: "BMTH, The Word Alive, Slaves and Odeon work as emotional armor and ignition.",
    },
    he: {
      tab: "קתרזיס",
      title: "עוצמה / קתרזיס של מטאלקור",
      desc: "מטאלקור אגרסיבי ופוסט־הארדקור מהיר. הכעס והעוצמה האינסטרומנטלית פועלים גם כמגן וגם כדלק.",
      time: "הבוקר 06–11 ואחר הצהריים 12–17",
      bodyState: "גוף דרוך, לסת קפוצה וצורך לנוע או להשיב לעצמך שליטה.",
      strength: "מתעלת מתח לכיוון, למשמעת ולפעולה.",
      shadow: "בלי הפסקות היא עלולה להזין עצבנות או גירוי יתר.",
      ritual: "האזן לה לפני אימון, ניקיון, פתרון משימות או שבירת מחסום מנטלי.",
      evidence: "BMTH, The Word Alive, Slaves ו-Odeon פועלים כשריון רגשי וכמנוע התנעה.",
    },
    artists: ["Bring Me the Horizon", "The Word Alive", "Slaves", "Odeon"],
    tracks: ["MANTRA", "Red Clouds", "To Better Days", "loop"],
    trackNotes: {
      es: ["Declaración de control y energía combativa.", "Cielo rojo y empuje metalcore frontal.", "Empuje post-hardcore hacia la recuperación.", "Loop digital para activar el cuerpo."],
      en: ["Statement of control and combative energy.", "Red-sky frontal metalcore push.", "Post-hardcore push toward recovery.", "Digital loop to activate the body."],
      he: ["הצהרת שליטה ואנרגיה לוחמנית.", "שמיים אדומים ודחיפה ישירה של מטאלקור.", "דחיפה של פוסט־הארדקור לעבר התאוששות.", "לופ דיגיטלי שמפעיל את הגוף."],
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
      evidence: "Bilmuri, Magnolia Park, The Story So Far y Neck Deep aparecen como resets de energía juguetona, pop-punk y groove emocional.",
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
      evidence: "Bilmuri, Magnolia Park, The Story So Far and Neck Deep appear as playful energy resets, pop-punk and emotional groove.",
    },
    he: {
      tab: "דופמין",
      title: "דופמין / כיף של אימו־גרוב",
      desc: "ריפים שמחים של גיטרה, שילוב של פופ משנות האלפיים, סינתיסייזרים וכלי הקשה מהירים. צלילים אופטימיים שנועדו להניע אותך.",
      time: "הבוקר 06–11",
      bodyState: "קלילות, תנועה מהירה, הומור מוזר ותחושת איפוס.",
      strength: "מרימה אנרגיה בלי להכביד; גורמת לפרודוקטיביות להרגיש כמו משחק.",
      shadow: "עלולה להפוך לחיפוש מתמיד אחר גירוי אם לא משלבים אותה עם מקטעי מיקוד.",
      ritual: "השתמש בה כמקטע התנעה של 20 דקות למשימה שאתה דוחה.",
      evidence: "Bilmuri, Magnolia Park, The Story So Far ו-Neck Deep משמשים איפוסי אנרגיה שובבים של פופ־פאנק וגרוב רגשי.",
    },
    artists: ["Bilmuri", "Magnolia Park", "The Story So Far", "Neck Deep"],
    tracks: ["2016 CAVALIERS (Ohio)", "Tokyo", "Upside Down", "In Bloom"],
    trackNotes: {
      es: ["Groove absurdo y reconstrucción con sonrisa.", "Energía moderna de pop-punk digital.", "Pop-punk de memoria con pulso brillante.", "Explosión melódica para reiniciar ánimo."],
      en: ["Absurd groove and rebuilding with a smile.", "Modern digital pop-punk energy.", "Memory pop-punk with bright pulse.", "Melodic burst for mood reset."],
      he: ["גרוב אבסורדי ובנייה מחדש עם חיוך.", "אנרגיה מודרנית של פופ־פאנק דיגיטלי.", "פופ־פאנק נוסטלגי עם דופק מואר.", "פרץ מלודי שמאפס את מצב הרוח."],
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
      evidence: "TesseracT, Hammock, Corbin Karasu y Unprocessed conectan precisión, atmósfera, lo-fi/R&B y flujo de trabajo.",
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
      evidence: "TesseracT, Hammock, Corbin Karasu and Unprocessed connect precision, atmosphere, lo-fi/R&B and workflow.",
    },
    he: {
      tab: "מיקוד",
      title: "רוגע / מיקוד טכני",
      desc: "אמביינט, לואו־פיי רך ומטאל פרוגרסיבי מורכב בקצב איטי. המוזיקה משמשת ערוץ להיפר־מיקוד בזמן עיצוב או תכנות.",
      time: "אחר הצהריים 12–17 והערב 18–23",
      bodyState: "נשימה איטית יותר, קשב מתמשך, חשיבה טכנית ורצון לבנות.",
      strength: "מסדרת את האנרגיה המנטלית בלי לכבות את הדמיון.",
      shadow: "עלולה לבודד אותך יותר מדי אם למקטע המיקוד אין נקודת סיום ברורה.",
      ritual: "הגדר משימה אחת, האזן במשך 45 דקות וסיים בשיר חם יותר.",
      evidence: "TesseracT, Hammock, Corbin Karasu ו-Unprocessed מחברים דיוק, אווירה, lo-fi/R&B וזרימת עבודה.",
    },
    artists: ["TesseracT", "Hammock", "Corbin Karasu", "Unprocessed"],
    tracks: ["Of Matter - Proxy", "The Journey", "The Journey", "Gold"],
    trackNotes: {
      es: ["Precisión progresiva para hiperenfoque.", "Ambient para respirar y sostener espacio.", "Lo-fi/R&B para ruta interior y baja luz.", "Metal matemático para foco brillante."],
      en: ["Progressive precision for hyperfocus.", "Ambient breathing room and held space.", "Lo-fi/R&B for inner route and low light.", "Mathematical metal for bright focus."],
      he: ["דיוק פרוגרסיבי להיפר־מיקוד.", "אמביינט שנותן מרחב לנשום ולהישאר.", "לואו־פיי ו-R&B למסע פנימי באור חלש.", "מטאל מתמטי למיקוד חד ומואר."],
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
    he: {
      tab: "זיכרון",
      title: "נוסטלגיה / זיכרון קולנועי",
      desc: "סינת׳ווייב, פופ אפל ושירים שמרגישים כמו סצנה על כביש לילי. זו לא רק היזכרות: המוזיקה הופכת את העבר לאסתטיקה שימושית.",
      time: "הערב 18–23",
      bodyState: "מבט לאחור אל תמונות של עיר, כבישים, גיל ההתבגרות ומקומות שכבר השתנו.",
      strength: "מחברת אותך להמשכיות האישית שלך: מי היית ומה עדיין מהדהד בך.",
      shadow: "עלולה לייפות תקופות קודמות אם ההווה נמדד תמיד מול גרסה ערוכה של העבר.",
      ritual: "צור פלייליסט לכל תקופה, וסיים תמיד בשיר חדש כדי להוביל את העבר אל העתיד.",
      evidence: "The Midnight, Tokio Hotel ו-Emarosa מופיעים כקפסולות של זיכרון רגשי.",
    },
    artists: ["The Midnight", "Tokio Hotel", "Emarosa", "H.E.A.T"],
    tracks: ["Vampires", "Love Who Loves You Back", "Givin' Up", "Back to Life"],
    trackNotes: {
      es: ["Noche de neón y memoria en movimiento.", "Pop romántico como fotografía emocional.", "Vulnerabilidad melódica de regreso.", "AOR luminoso para reanimar el ánimo."],
      en: ["Neon night and memory in motion.", "Romantic pop as emotional photograph.", "Melodic vulnerability returning.", "Luminous AOR to revive the mood."],
      he: ["ליל ניאון וזיכרון בתנועה.", "פופ רומנטי כתצלום רגשי.", "פגיעות מלודית שחוזרת הביתה.", "AOR מואר שמחזיר את מצב הרוח לחיים."],
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
    he: {
      tab: "מרדנות",
      title: "מרדנות / הישרדות",
      desc: "שירים של חיכוך, שבר ועמדה. כאן המוזיקה מציבה גבולות: לא הכול חייב להתעבד בשקט.",
      time: "הבוקר 06–11 והערב 18–23",
      bodyState: "דחף לומר לא, לחסום רעש חיצוני ולהחזיר לעצמך כוח אישי.",
      strength: "מגנה על הזהות, מסמנת גבולות והופכת עייפות להחלטה.",
      shadow: "עלולה להחזיק מתח מעבר לנדרש אם לא נותנים לו מוצא גופני.",
      ritual: "האזן למקטע העוצמתי בזמן הליכה או אימון, ולא בישיבה חוזרת בלופ.",
      evidence: "פוסט־הארדקור, מטאלקור ואימו־פאנק משמשים שפה של הגנה רגשית.",
    },
    artists: ["Bring Me the Horizon", "The Word Alive", "Bad Omens", "Falling In Reverse"],
    tracks: ["Can You Feel My Heart", "Red Clouds", "Just Pretend", "Popular Monster"],
    trackNotes: {
      es: ["Herida convertida en símbolo.", "Rabia melódica y cielo rojo.", "Drama moderno con coro catártico.", "Confesión explosiva de supervivencia."],
      en: ["Wound turned into symbol.", "Melodic rage and red sky.", "Modern drama with cathartic chorus.", "Explosive survival confession."],
      he: ["פצע שהופך לסמל.", "זעם מלודי ושמיים אדומים.", "דרמה מודרנית עם פזמון קתרזי.", "וידוי הישרדות מתפרץ."],
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
    he: {
      tab: "עתיד",
      title: "עתידנות / נסיעת לילה",
      desc: "דארקסינת׳, סייברפאנק והפקה מודרנית. הרגש פונה קדימה: אל טכנולוגיה, מהירות, ממשק ויעד.",
      time: "הלילה 18–23 והשעות המאוחרות 00–05",
      bodyState: "תחושה של מהירות, מסך פתוח, עיר עתידית ושליטה יצירתית.",
      strength: "מפעילה חזון, עיצוב, תכנות ותכנון של עולמות.",
      shadow: "עלולה לנתק אותך מהגוף אם הכול מתרחש בתוך מסכים ואוזניות.",
      ritual: "השתמש בה לעיצוב, לתכנות או לתכנון, ואז צא להליכה בלי מוזיקה.",
      evidence: "Carpenter Brut, Dance With the Dead ו-The Midnight מחזיקים את ציר הסייברפאנק של הארכיון.",
    },
    artists: ["Carpenter Brut", "Dance With the Dead", "The Midnight", "Perturbator"],
    tracks: ["Turbo Killer", "Near Dark", "Vampires", "Venger"],
    trackNotes: {
      es: ["Velocidad cyberpunk y persecución mental.", "Crepúsculo vampírico en autopista synth analógica.", "Carretera nocturna con corazón nostálgico.", "Darksynth urbano con pulso de amenaza."],
      en: ["Cyberpunk speed and mental chase.", "Vampiric dusk on an analog synth highway.", "Nocturnal highway with nostalgic heart.", "Urban darksynth with threat pulse."],
      he: ["מהירות סייברפאנק ומרדף מנטלי.", "דמדומים ערפדיים על כביש של סינת׳ אנלוגי.", "כביש לילי עם לב נוסטלגי.", "דארקסינת׳ עירוני עם דופק מאיים."],
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
    he: {
      tab: "רומנטיקה",
      title: "רומנטיקה אפלה / רגש קולנועי",
      desc: "בלדות, פופ אפל ומנגינות דרמטיות שבהן הרגש הופך לסצנה. פגיעות בתאורה חלשה.",
      time: "הערב 18–23",
      bodyState: "לב פתוח, זיכרון רגשי ורצון להיכנס לסצנה גדולה יותר מן היום עצמו.",
      strength: "מאפשרת רוך, יופי וביטוי רגשי בלי לוותר על האסתטיקה.",
      shadow: "עלולה להעצים דרמה בקשרים או להפוך מרחק לפנטזיה מושלמת מדי.",
      ritual: "האזן לה כשאתה רוצה לכתוב, לעצב דמויות או לסיים את היום ברכות.",
      evidence: "Tokio Hotel, Emarosa ו-The Midnight מחברים רומנטיקה, נוסטלגיה ושפה חזותית.",
    },
    artists: ["Tokio Hotel", "Emarosa", "The Midnight", "Holding Absence"],
    tracks: ["Love Who Loves You Back", "Givin' Up", "Vampires", "Wilt"],
    trackNotes: {
      es: ["Romance brillante con impulso de noche.", "Voz vulnerable y despedida emocional.", "Amor como cine retro nocturno.", "Dolor bello con alcance vocal."],
      en: ["Bright romance with night-drive motion.", "Vulnerable voice and emotional farewell.", "Love as nocturnal retro cinema.", "Beautiful pain with vocal reach."],
      he: ["רומנטיקה מוארת עם תנופה של נסיעת לילה.", "קול פגיע ופרידה רגשית.", "אהבה כקולנוע רטרו לילי.", "כאב יפה עם טווח קולי מרשים."],
    },
    color: "#ec4899",
  },
};

const EMOTION_KEYS: EmotionKey[] = ['melancolia', 'energia', 'dopamina', 'calma', 'nostalgia', 'rebeldia', 'futurismo', 'romanticismo'];
const isolateBidi = (value: string) => `\u2068${value}\u2069`;

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
    scatter: {
      visibleVsAnalyzed: (visible: number, analyzed: number) => `${visible} visibles · ${analyzed} analizados`,
      readingTitle: 'Cómo leer esta constelación',
      xEncoding: 'X · positividad',
      yEncoding: 'Y · energía',
      sizeEncoding: 'Tamaño · reproducciones',
      colorEncoding: 'Color · mood del motor',
      rawCoordinates: 'Coordenadas originales',
      separationNote: 'Los artistas que comparten coordenadas inferidas se separan sólo de forma visual; el tooltip conserva el valor original.',
      separatedCluster: (count: number) => `${count} artistas comparten esta coordenada original; se separaron visualmente para que todos sean descubribles.`,
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
    emotionSelector: 'Selector de estado emocional',
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
      wikipediaAria: (artist: string) => `Leer la biografía de ${artist} en Wikipedia`,
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
    scatter: {
      visibleVsAnalyzed: (visible: number, analyzed: number) => `${visible} visible · ${analyzed} analyzed`,
      readingTitle: 'How to read this constellation',
      xEncoding: 'X · positivity',
      yEncoding: 'Y · energy',
      sizeEncoding: 'Size · plays',
      colorEncoding: 'Color · engine mood',
      rawCoordinates: 'Original coordinates',
      separationNote: 'Artists sharing inferred coordinates are separated only for presentation; the tooltip preserves the original value.',
      separatedCluster: (count: number) => `${count} artists share this original coordinate; they are separated visually so every artist remains discoverable.`,
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
    emotionSelector: 'Emotional state selector',
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
      wikipediaAria: (artist: string) => `Read the ${artist} biography on Wikipedia`,
      verifiedNote: 'Links marked with a dot are verified official pages; the rest open a public search.',
    },
    gallery: {
      title: 'Generative Gallery',
      intro: 'Eight artworks painted by code from your own archive: each mood generates its piece with a deterministic seed based on your artists. Same archive, same gallery; another archive, another museum.',
      variation: 'New variation',
      variationHint: 'Each variation repaints all eight pieces with a new seed.',
    },
  },
  he: {
    quick: {
      intensityLabel: 'עוצמה ממוצעת',
      intensityTitle: (pct: number) => `${pct}% אנרגיה רגשית משוערת`,
      intensityBody: 'האמנים המובילים אינם מתרכזים ברוגע מוחלט: הארכיון נוטה למוזיקה שיש בה תנועה, מתח ותפקיד מווסת.',
      contrastLabel: 'ניגוד',
      contrastTitle: (dark: number, total: number) => `${dark} מתוך ${total} אמנים נמצאים בצד האפל יותר`,
      contrastBody: 'האפלוליות אינה שולטת לבדה; היא מתקיימת לצד דופמין, מיקוד, נוסטלגיה ועתידנות.',
      anchorLabel: 'עוגן רגשי',
      anchorTitle: (artist: string) => artist,
      anchorBody: 'האמן בעל המשקל הרב ביותר בארכיון משמש שער מהיר אל המצב הרגשי שחוזר בתדירות הגבוהה ביותר.',
    },
    engine: {
      title: 'תמהיל המנוע הרגשי',
      subtitle: 'אותה שכבה שמפעילה את התיקים קוראת את האמנים המובילים שלך ומחשבת אילו מצבים רגשיים שולטים בארכיון הפעיל.',
      dominant: 'מצב מוביל',
      analyzedArtists: 'אמנים שנותחו',
      moodMix: 'התפלגות מצבי הרוח',
      averageAxis: 'ממוצע הצירים',
      confidence: 'רמת ביטחון',
      artistMode: 'מצב לפי המנוע',
    },
    scatter: {
      visibleVsAnalyzed: (visible: number, analyzed: number) => `${visible} מוצגים · ${analyzed} נותחו`,
      readingTitle: 'איך לקרוא את הקונסטלציה',
      xEncoding: 'X · חיוביות',
      yEncoding: 'Y · אנרגיה',
      sizeEncoding: 'גודל · השמעות',
      colorEncoding: 'צבע · מצב לפי המנוע',
      rawCoordinates: 'קואורדינטות מקוריות',
      separationNote: 'אמנים בעלי קואורדינטות משוערות זהות מופרדים רק לצורך התצוגה; ה־tooltip שומר על הערך המקורי.',
      separatedCluster: (count: number) => `${count} אמנים חולקים את אותה קואורדינטה מקורית; הם הופרדו חזותית כדי שאפשר יהיה לגלות כל אחד מהם.`,
    },
    quadrantTitle: 'מדריך לרבעים הרגשיים',
    quadrantIntro: 'כדאי לקרוא את המפה כמזג אוויר רגשי: היא אינה מודדת רגשות מדויקים, אלא ממקמת מרקמים של אנרגיה ובהירות.',
    quadrants: [
      { title: 'אפל + דופק נמוך', tag: 'התבוננות', body: 'מוזיקה לעיבוד רגשות, להיזכרות, לכתיבה או להנמכת עוצמת הרעש של העולם.', color: '#00f2fe' },
      { title: 'אפל + דופק גבוה', tag: 'קתרזיס', body: 'מוזיקה לפריקת מתח, להשבת הכוח ולהצבת גבולות.', color: '#f72585' },
      { title: 'מואר + דופק גבוה', tag: 'דופמין', body: 'מוזיקה להפעלה, לתנועה, לביטחון ולאיפוס מהיר.', color: '#ffb703' },
      { title: 'מואר + דופק נמוך', tag: 'מיקוד', body: 'מוזיקה שמסדרת את המחשבות, תומכת בעבודה ושומרת על רוגע יצירתי.', color: '#10b981' },
    ],
    dossierTitle: 'התיק הרגשי שנבחר',
    emotionSelector: 'בחירת מצב רגשי',
    artistRolesTitle: 'התפקידים הרגשיים של האמנים',
    ritualsTitle: 'טקסי האזנה מומלצים',
    methodologyTitle: 'קריאה ומתודולוגיה',
    methodologyBody: 'הקואורדינטות הרגשיות הן קריאה אמנותית שמוסקת מן הז׳אנר, האמן, תדירות ההאזנה והאוצרות הפנימית. הן אינן אבחנה קלינית; מטרתן להסביר כיצד הארכיון שלך מארגן אנרגיה, זיכרון וויסות.',
    labels: {
      meaning: 'מה זה אומר',
      evidence: 'למה זה מופיע',
      body: 'מצב גופני / מנטלי',
      strength: 'חוזקה',
      shadow: 'הצד המאתגר',
      ritual: 'טקס מומלץ',
      artists: 'אמנים מרכזיים',
      tracks: 'שירי מפלט',
      time: 'שעות דומיננטיות',
      plays: 'השמעות',
      role: 'תפקיד רגשי',
    },
    rituals: [
      { title: 'התנעת הבוקר', body: 'השתמש בקתרזיס או בדופמין כדי להניע את הגוף לפני שאתה פונה למסכים.', emotion: 'energia' as EmotionKey },
      { title: 'מקטע מיקוד', body: 'השתמש ברוגע טכני כדי לתכנת, לעצב או לסדר משימות בלי לכבות את הדמיון.', emotion: 'calma' as EmotionKey },
      { title: 'עיבוד לילי', body: 'השתמש במלנכוליה או ברומנטיקה אפלה כדי לסגור רגשות בלי להיתקע בתוכם.', emotion: 'melancolia' as EmotionKey },
      { title: 'בניית עולמות', body: 'השתמש בעתידנות ובנוסטלגיה כדי להפוך זיכרון לאסתטיקה, לאמנות או לסיפור.', emotion: 'futurismo' as EmotionKey },
    ],
    stations: {
      title: 'תחנות מצבי רוח',
      intro: 'כל רגש פועל כתחנת רדיו שנאצרה מתוך הארכיון שלך. הקישורים פותחים עמודים רשמיים או חיפושים ציבוריים ב-Spotify וב-YouTube — שום דבר אינו מתנגן בתוך האפליקציה.',
      spotifyAria: (artist: string) => `פתח את ${artist} ב-Spotify`,
      youtubeAria: (artist: string) => `פתח את ${artist} ב-YouTube`,
      wikipediaAria: (artist: string) => `קרא את הביוגרפיה של ${artist} בוויקיפדיה`,
      verifiedNote: 'קישורים שמסומנים בנקודה מובילים לעמודים רשמיים מאומתים; היתר פותחים חיפוש ציבורי.',
    },
    gallery: {
      title: 'גלריה גנרטיבית',
      intro: 'שמונה יצירות שנוצרו בקוד מתוך הארכיון שלך: כל מצב רגשי מייצר יצירה עם זרע דטרמיניסטי שמבוסס על האמנים שלך. אותו ארכיון יוצר אותה גלריה; ארכיון אחר יוצר מוזיאון אחר.',
      variation: 'וריאציה חדשה',
      variationHint: 'כל וריאציה מציירת מחדש את שמונה היצירות באמצעות זרע חדש.',
    },
  },
};

export default function EmotionalMap({ data }: EmotionalMapProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionKey>('melancolia');
  const [artVariation, setArtVariation] = useState(0);
  const { tc, t, lang } = useApp();
  const chartAnimation = useChartAnimation();
  const axisLabelColor = tc.mode === 'light' ? '#475569' : '#9ca3af';
  const engineProfile = useMemo(() => buildEmotionalMapEngineProfile(data.top_artists, 24), [data.top_artists]);
  const engineArtistMap = useMemo(
    () => new Map(engineProfile.artists.map(profile => [profile.artist.name, profile])),
    [engineProfile],
  );

  const galaxyArtists = useMemo(() => layoutEmotionalScatterPoints(
    data.top_artists.slice(0, 14).map(artist => {
      const engine = engineArtistMap.get(artist.name);
      const mood = engine ? EMOTIONAL_MOOD_TAXONOMY[engine.moodKey] : engineProfile.dominantMood;
      return {
        name: artist.name,
        plays: artist.plays,
        genre: artist.genre,
        engine,
        moodKey: mood.key,
        moodColor: mood.color,
        moodLabel: mood.shortLabel[lang],
        ...inferMoodCoordinates(artist.genre, artist.name),
      };
    }),
  ), [data.top_artists, engineArtistMap, engineProfile.dominantMood, lang]);

  const moodArtistsByKey = useMemo(() => {
    const groups = Object.fromEntries(
      EMOTION_KEYS.map(key => [key, [] as ArtistMoodProfile[]]),
    ) as Record<EmotionKey, ArtistMoodProfile[]>;
    engineProfile.artists.forEach(profile => groups[profile.moodKey].push(profile));
    return groups;
  }, [engineProfile.artists]);

  const visibleMoodLegend = useMemo(() => {
    const seen = new Set<EmotionalMoodKey>();
    return galaxyArtists.filter(artist => {
      if (seen.has(artist.moodKey)) return false;
      seen.add(artist.moodKey);
      return true;
    });
  }, [galaxyArtists]);

  const copy = EMOTIONAL_MAP_COPY[lang];
  const activeEvidenceCopy = {
    es: {
      artists: (names: string) => `Señal observada en el archivo activo: ${names}. La agrupación procede del motor emocional y no de una historia demo fija.`,
      empty: 'El archivo activo todavía no contiene artistas clasificados en este estado emocional.',
      track: (plays: number, genre: string) => `${plays.toLocaleString(localeFor(lang))} escuchas observadas · ${genre}`,
    },
    en: {
      artists: (names: string) => `Observed signal in the active archive: ${names}. The grouping comes from the emotional engine, never from a fixed demo story.`,
      empty: 'The active archive does not yet contain artists classified in this emotional state.',
      track: (plays: number, genre: string) => `${plays.toLocaleString(localeFor(lang))} observed plays · ${genre}`,
    },
    he: {
      artists: (names: string) => `אות שנצפה בארכיון הפעיל: ${names}. הקיבוץ מגיע מהמנוע הרגשי ולא מסיפור הדגמה קבוע.`,
      empty: 'בארכיון הפעיל עדיין אין אמנים שסווגו למצב הרגשי הזה.',
      track: (plays: number, genre: string) => `${plays.toLocaleString(localeFor(lang))} השמעות שנצפו · ${genre}`,
    },
  }[lang];
  const emotionDetails = Object.fromEntries(
    EMOTION_KEYS.map(key => {
      const detail = EMOTION_DETAILS[key];
      const artists = moodArtistsByKey[key].slice(0, 4).map(profile => profile.artist.name);
      const artistSet = new Set(artists.map(name => name.toLocaleLowerCase('en-US')));
      const tracks = data.top_tracks
        .filter(track => artistSet.has(track.artist.toLocaleLowerCase('en-US')))
        .slice(0, 4);
      return [
        key,
        {
          ...detail[lang],
          evidence: artists.length
            ? activeEvidenceCopy.artists(artists.join(', '))
            : activeEvidenceCopy.empty,
          artists,
          tracks: tracks.map(track => track.title),
          trackArtists: tracks.map(track => track.artist),
          trackNotes: tracks.map(track => activeEvidenceCopy.track(track.plays, track.genre)),
          color: detail.color,
        },
      ];
    })
  ) as Record<EmotionKey, typeof EMOTION_DETAILS[EmotionKey][typeof lang] & {
    artists: string[];
    tracks: string[];
    trackArtists: string[];
    trackNotes: string[];
    color: string;
  }>;

  const currentEmotion = emotionDetails[selectedEmotion];
  const topArtist = data.top_artists[0];
  const avgEnergy = galaxyArtists.length
    ? Math.round((galaxyArtists.reduce((sum, artist) => sum + artist.energy, 0) / galaxyArtists.length) * 100)
    : 0;
  const darkArtists = galaxyArtists.filter(artist => artist.valence < 0.46).length;
  const formatNum = (value: number) => value.toLocaleString(localeFor(lang));
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
      title: copy.quick.anchorTitle(isolateBidi(topArtist?.name ?? 'N/A')),
      body: copy.quick.anchorBody,
      color: tc.c3,
    },
  ];

  const selectedArtistEvidence = moodArtistsByKey[selectedEmotion].slice(0, 4).map(profile => ({
    name: profile.artist.name,
    plays: profile.artist.plays,
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
    <div data-testid="emotional-map" className="min-w-0 space-y-6 animate-fade-in md:space-y-8" dir={directionFor(lang)}>
      <SectionNarrative content={t.deepNarratives.emotions} accent="c2" />

      <SectionQuickRead items={quickReadItems} />

      <section
        data-testid="emotional-scatter-workspace"
        aria-label={t.emotionalMap.artistCoordinates}
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,32rem),1fr))] items-start gap-6"
      >
        <div className="nova-surface nova-surface--analysis min-w-0 rounded-3xl p-4 sm:p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-mono font-bold text-gray-300 uppercase tracking-widest">
                {t.emotionalMap.artistCoordinates}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.emotionalMap.axesLabel}</p>
            </div>
            <span
              data-visible-artists={galaxyArtists.length}
              data-analyzed-artists={engineProfile.artists.length}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-mono font-black text-gray-300"
            >
              {copy.scatter.visibleVsAnalyzed(galaxyArtists.length, engineProfile.artists.length)}
            </span>
          </div>

          <div
            data-testid="emotional-scatter-plot"
            className="nova-data-ltr mt-4 h-[clamp(22rem,46dvh,30rem)] min-h-[22rem] w-full min-w-0"
            dir="ltr"
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={80}>
              <ScatterChart accessibilityLayer margin={{ top: 20, right: 18, bottom: 28, left: 0 }}>
                <XAxis
                  {...axisProps(tc.mode)}
                  type="number"
                  dataKey="plotValence"
                  name={t.emotionalMap.positivityName}
                  domain={[0, 1]}
                  label={{ value: t.emotionalMap.positivityAxis, position: 'insideBottom', offset: -16, fill: axisLabelColor, fontSize: 10 }}
                />
                <YAxis
                  {...axisProps(tc.mode)}
                  type="number"
                  dataKey="plotEnergy"
                  name={t.emotionalMap.energyAxis}
                  domain={[0, 1]}
                  width={42}
                  label={{ value: t.emotionalMap.energyAxis, angle: -90, position: 'insideLeft', fill: axisLabelColor, fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="plays" range={[70, 440]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={
                    <EmotionalScatterTooltip
                      accent={tc.c1}
                      locale={localeFor(lang)}
                      playsLabel={copy.labels.plays}
                      rawCoordinatesLabel={copy.scatter.rawCoordinates}
                      separatedClusterLabel={copy.scatter.separatedCluster}
                    />
                  }
                />
                <Scatter
                  data-testid="emotional-scatter-series"
                  name={t.emotionalMap.artistsLegend}
                  data={galaxyArtists}
                  fill={tc.c1}
                  {...chartAnimation}
                >
                  {galaxyArtists.map(entry => (
                    <Cell
                      key={entry.name}
                      fill={entry.moodColor}
                      stroke="#f8fafc"
                      strokeOpacity={0.72}
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <ul className="sr-only" aria-label={t.emotionalMap.artistsLegend}>
            {galaxyArtists.map(artist => (
              <li key={artist.name}>
                {artist.name} · {artist.moodLabel} · {formatNum(artist.plays)} {copy.labels.plays}
              </li>
            ))}
          </ul>

          <div className="nova-data-ltr mt-2 flex w-full justify-between gap-4 px-2 text-[10px] font-mono text-gray-500" dir="ltr">
            <span>{t.emotionalMap.darkSide}</span>
            <span className="text-end">{t.emotionalMap.brightSide}</span>
          </div>

          <div className="mt-5 space-y-3">
            <h4 className="text-[11px] font-mono font-black uppercase tracking-widest text-white">
              {copy.scatter.readingTitle}
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: Compass, label: copy.scatter.xEncoding, color: tc.c1 },
                { icon: Activity, label: copy.scatter.yEncoding, color: tc.c2 },
                { icon: Orbit, label: copy.scatter.sizeEncoding, color: tc.c3 },
                { icon: Sparkles, label: copy.scatter.colorEncoding, color: tc.c4 },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5">
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
                    <span className="text-[10px] font-bold leading-tight text-gray-300">{item.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleMoodLegend.map(mood => (
                <span key={mood.moodKey} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold"
                  style={{ color: mood.moodColor, borderColor: `${mood.moodColor}35`, backgroundColor: `${mood.moodColor}10` }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mood.moodColor }} />
                  {mood.moodLabel}
                </span>
              ))}
            </div>
            <p className="text-[10px] leading-relaxed text-gray-500">{copy.scatter.separationNote}</p>
          </div>

          <details className="mt-5 rounded-2xl border border-white/8 bg-black/15">
            <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-mono font-black uppercase tracking-wider text-white">
              {copy.quadrantTitle}
            </summary>
            <div className="border-t border-white/8 p-4">
              <p className="text-xs leading-relaxed text-gray-400">{copy.quadrantIntro}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {copy.quadrants.map(quad => (
                  <div key={quad.title} className="rounded-2xl border bg-white/3 p-4"
                    style={{ borderColor: `${quad.color}25` }}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-black text-white">{quad.title}</h4>
                      <span className="rounded-full px-2 py-1 text-[9px] font-mono font-black uppercase"
                        style={{ color: quad.color, backgroundColor: `${quad.color}12`, border: `1px solid ${quad.color}28` }}>
                        {quad.tag}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-400">{quad.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>

        <div className="nova-surface nova-surface--analysis flex min-w-0 flex-col justify-between rounded-3xl p-5 md:p-6">
          <div>
            <div
              className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2"
              role="group"
              aria-label={copy.emotionSelector}
            >
              {EMOTION_KEYS.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedEmotion(key)}
                  aria-pressed={selectedEmotion === key}
                  className={`nova-on-dark min-h-11 whitespace-normal break-words rounded-xl border px-2 py-2 font-mono text-[10px] font-bold uppercase leading-tight transition-all ${
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
              <h3 className="flex items-start gap-2 text-xl font-bold text-white">
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: currentEmotion.color }} />
                <span>{currentEmotion.title}</span>
              </h3>
              <p className="text-xs leading-relaxed text-gray-300">{currentEmotion.desc}</p>

              <div className="space-y-1.5">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-400">{copy.labels.artists}</span>
                <div className="flex flex-wrap gap-2">
                  {selectedArtistEvidence.map(({ name, plays }) => (
                    <span key={name} className="flex items-center gap-1.5 rounded-full border border-cyan-500/10 bg-[#0a0f1d] py-1 ps-1 pe-2.5 text-xs font-semibold text-white">
                      <ArtistAvatar name={name} size={20} />
                      <bdi dir="auto">{name}</bdi>
                      {plays ? <span className="text-[9px] text-gray-500">· {formatNum(plays)}</span> : null}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-400">{copy.labels.tracks}</span>
                <div className="space-y-1">
                  {currentEmotion.tracks.map((track, index) => (
                    <div key={`${currentEmotion.trackArtists[index] ?? index}-${track}`} className="flex items-start gap-2.5 rounded-lg border border-cyan-500/10 bg-[#0a0f1d] px-3 py-2 text-xs">
                      <CoverArt artist={currentEmotion.trackArtists[index] ?? currentEmotion.artists[0]} title={track} kind="track" size={34} />
                      <div className="min-w-0">
                        <p className="break-words font-mono text-gray-200"><bdi dir="auto">{track}</bdi></p>
                        <p className="mt-1 text-[10px] leading-relaxed text-gray-500">{currentEmotion.trackNotes[index]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-3 border-t border-cyan-500/10 pt-5 text-xs">
            <span className="text-gray-400">{t.emotionalMap.dominantTimeLabel}</span>
            <span className="max-w-full break-words text-end font-mono text-white">{currentEmotion.time}</span>
          </div>
        </div>
      </section>

      <section data-testid="emotional-engine-summary" className="nova-surface nova-surface--featured relative overflow-hidden rounded-3xl p-5 md:p-6">
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

            <div className="w-full min-w-0 rounded-2xl border bg-black/20 px-4 py-3 sm:w-auto sm:min-w-[220px]"
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

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
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
              <article key={artist.name} className="nova-surface nova-surface--analysis rounded-2xl p-4"
                style={{ borderColor: `${color}25` }}>
                <div className="flex items-center gap-3">
                  <ArtistAvatar name={artist.name} size={38} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-white truncate"><bdi dir="auto">{artist.name}</bdi></h4>
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
                type="button"
                onClick={() => setSelectedEmotion(ritual.emotion)}
                aria-pressed={selectedEmotion === ritual.emotion}
                className="nova-surface nova-surface--utility nova-surface--interactive rounded-2xl p-5 text-start"
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-4">
          {EMOTION_KEYS.filter(key => moodArtistsByKey[key].length > 0).map(key => {
            const emotion = emotionDetails[key];
            const Icon = MOOD_ICONS[EMOTIONAL_MOOD_TAXONOMY[key].icon];
            const stationArtists = moodArtistsByKey[key].slice(0, 4).map(profile => profile.artist.name);
            return (
              <article key={key} className="nova-surface nova-surface--analysis rounded-2xl p-4" style={{ borderColor: `${emotion.color}28` }}>
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
                  {stationArtists.map(name => {
                    const accessibleName = isolateBidi(name);
                    const curated = getCuratedArtistMedia(name);
                    const spotifyUrl = getPrimarySpotifyUrl(curated) ?? buildSpotifySearchUrl(name);
                    const youtubeUrl = getPrimaryYoutubeUrl(curated) ?? buildYoutubeSearchUrl(`${name} official`);
                    const wikipediaUrl = getWikipediaUrl(curated, lang);
                    const verified = Boolean(curated);
                    return (
                      <div key={name} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/10 p-2">
                        <ArtistAvatar name={name} size={24} />
                        <span className="min-w-[7rem] flex-1 break-words text-xs font-semibold text-white">
                          <bdi dir="auto">{name}</bdi>
                          {verified && <span className="ms-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: emotion.color }} />}
                        </span>
                        <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"
                          aria-label={copy.stations.spotifyAria(accessibleName)} title={copy.stations.spotifyAria(accessibleName)}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1DB954]/40 bg-[#1DB954]/10 text-[#1DB954] transition-transform hover:scale-105">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                          aria-label={copy.stations.youtubeAria(accessibleName)} title={copy.stations.youtubeAria(accessibleName)}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ff0033]/40 bg-[#ff0033]/10 text-[#ff4d6a] transition-transform hover:scale-105">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {wikipediaUrl && (
                          <a href={wikipediaUrl} target="_blank" rel="noopener noreferrer"
                            aria-label={copy.stations.wikipediaAria(accessibleName)} title={copy.stations.wikipediaAria(accessibleName)}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#38bdf8]/40 bg-[#38bdf8]/10 text-[#38bdf8] transition-transform hover:scale-105">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
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
            const moodArtistNames = moodArtistsByKey[key].map(profile => profile.artist.name);
            const seedArtists = moodArtistNames.length ? moodArtistNames : data.top_artists.slice(0, 3).map(artist => artist.name);
            const seed = `${seedArtists.join('|')}::${data.top_artists[0]?.name ?? ''}::v${artVariation}`;
            return (
              <figure key={key} className="nova-surface nova-surface--analysis group overflow-hidden rounded-2xl"
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

      <section className="nova-surface nova-surface--utility flex items-start gap-3 rounded-2xl p-5">
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
