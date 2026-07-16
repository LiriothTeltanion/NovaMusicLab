import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Key, Lock, Eye, EyeOff, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp, type Lang } from '../context/AppContext';
import { directionFor, localeFor, pickLanguage } from '../utils/i18n';
import { localizeGenreName } from '../utils/localizedDatasetText';

interface AIAssistantProps {
  data: MusicDnaData;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const STORAGE_KEY = 'nml_gemini_api_key';
const SESSION_KEY = 'nml_gemini_api_key_session';
const GENERIC_GENRE_BUCKETS = new Set(['alternative', 'unclassified']);

function isGenericGenreBucket(name: string) {
  const normalized = name.trim().toLowerCase();
  return GENERIC_GENRE_BUCKETS.has(normalized)
    || normalized.includes('unclassified')
    || normalized.includes('miscellaneous');
}

function genreShare(plays: number, totalPlays: number) {
  return ((plays / Math.max(totalPlays, 1)) * 100).toFixed(1);
}

interface PromptChip {
  label: string;
  text: string;
}

interface AssistantCopy {
  playsUnit: string;
  notEnoughClassified: string;
  none: string;
  genreResponse: (
    bucketList: string,
    primaryLine: string,
    secondaryLine: string,
    genericShare: string,
    genericNames: string,
  ) => string;
  welcome: (project: string) => string;
  conversationCleared: string;
  promptChips: PromptChip[];
  artistLine: (name: string, plays: string) => string;
  trackLine: (title: string, artist: string, plays: string) => string;
  playlistResponse: (tracks: string) => string;
  obsessionResponse: (topTracks: string, leader: string, share: string) => string;
  daypartResponse: (daypart: string, evidence: string) => string;
  morningFallback: string;
  defaultResponse: (query: string, totalPlays: string, uniqueArtists: string, topArtists: string) => string;
  apiRequestFailed: string;
  emptyResponse: string;
  connectionFailed: string;
  errorResponse: (message: string) => string;
  clearChat: string;
  conversationAria: string;
  userMessage: string;
  thinkingAria: string;
  thinking: string;
  quickTemplates: string;
  askPlaceholder: string;
  askAria: string;
  sendMessage: string;
  apiSettings: string;
  apiDescription: string;
  apiPlaceholder: string;
  apiKeyAria: string;
  hideApiKey: string;
  showApiKey: string;
  keySaved: string;
  keySession: string;
  rememberKey: string;
  clearKey: string;
  sandboxActive: string;
  freeGeminiKey: string;
  opensNewTab: string;
  contextualDna: string;
  scrobbles: string;
  uniqueArtists: string;
  livePromptInstruction: string;
}

const ASSISTANT_COPY: Record<Lang, AssistantCopy> = {
  es: {
    playsUnit: 'escuchas',
    notEnoughClassified: 'todavía no hay suficientes metadatos clasificados',
    none: 'ninguno',
    genreResponse: (bucketList, primaryLine, secondaryLine, genericShare, genericNames) =>
      `### 📊 Lectura de géneros basada en evidencia\n\nTu archivo activo muestra:\n- Principales categorías del archivo: ${bucketList}\n- Señal específica más fuerte: ${primaryLine} del total de escuchas contadas.\n- Segunda señal específica: ${secondaryLine} del total de escuchas contadas.\n- Contexto de datos: **${genericShare}%** permanece en categorías amplias (${genericNames}). Lo trato como incertidumbre de clasificación, no como un rasgo de tu personalidad musical.\n\nLos géneros nombrados son la evidencia más sólida para interpretar; las categorías amplias deben orientar la limpieza futura de metadatos, no definir tu identidad.`,
    welcome: project => `¡Hola! Soy **Nova**, tu asistente musical de IA. 🌌\n\nPuedo analizar tu historial compilado (*${project}*) y darte análisis profundos. Pregúntame lo que quieras o configura abajo tu clave personal de API de Gemini para activar razonamiento avanzado.`,
    conversationCleared: 'Conversación reiniciada. ¡Todo listo para tu siguiente pregunta!',
    promptChips: [
      { label: '🎵 Sugiere una playlist matutina', text: 'Sugiere una lista de reproducción de 5 canciones para la mañana basada en mis datos. Dale un nombre creativo y explica por qué las elegiste.' },
      { label: '📊 Describe mis géneros principales', text: 'Analiza mis géneros principales en detalle. ¿Qué dicen sobre mi identidad musical?' },
      { label: '🔥 Analiza mis obsesiones', text: 'Revisa mis canciones principales y obsesiones de escucha. ¿Qué patrones encuentras?' },
      { label: '⚡ Perfil de franja horaria dominante', text: 'Explica qué significa mi franja horaria dominante en relación con mi estilo de vida y mi descubrimiento musical.' },
    ],
    artistLine: (name, plays) => `**${name}** (${plays} escuchas)`,
    trackLine: (title, artist, plays) => `*"${title}"* de **${artist}** (${plays} escuchas)`,
    playlistResponse: tracks => `### 🎵 Playlist simulada personalizada: *Cartografía del momento*\n\nEsta selección se genera únicamente con las canciones mejor posicionadas del archivo activo:\n\n${tracks}\n\n*Es una propuesta local basada en ranking y repetición, no una afirmación sobre tu estado emocional. Con Gemini activo, Nova puede adaptar el contexto con tu pregunta.*`,
    obsessionResponse: (topTracks, leader, share) => `### 🔥 Resumen de escucha repetida\n\nLas canciones principales del archivo activo son:\n- ${topTracks}\n\nLa señal de repetición más fuerte es ${leader}, con **${share}%** de las escuchas contadas. Esto describe frecuencia observada; no presupone una rutina, hora del día ni significado emocional.`,
    daypartResponse: (daypart, evidence) => `### ⚡ Análisis de la franja horaria dominante\n\nLa franja registrada con mayor peso es **${daypart}**.\n\nLas señales musicales principales del archivo son ${evidence}. Esta lectura describe coincidencias del archivo activo y evita atribuir hábitos personales que los datos no demuestran.`,
    morningFallback: 'Mañana',
    defaultResponse: (query, totalPlays, uniqueArtists, topArtists) => `### 🌌 Modo Sandbox de Nova\n\nHe procesado tu consulta: *"${query}"*\n\nEstas son algunas métricas clave:\n- **Reproducciones totales**: ${totalPlays} escuchas\n- **Artistas únicos**: ${uniqueArtists}\n- **Artistas principales**: ${topArtists}\n\n*🔧 **¿Cómo activar el razonamiento de IA en vivo?***\n1. Consigue una clave de API gratuita en [Google AI Studio](https://aistudio.google.com/).\n2. Abre el panel de **Configuración de API** de abajo.\n3. Pega tu clave.\n4. Pregúntame lo que quieras; analizaré tus datos en tiempo real con **Gemini 2.5 Flash**.`,
    apiRequestFailed: 'La solicitud a la API falló. Verifica tu clave.',
    emptyResponse: 'Se recibió una respuesta vacía.',
    connectionFailed: 'No fue posible conectar. Verifica tu red y tu clave de API.',
    errorResponse: message => `❌ **Error**: ${message}`,
    clearChat: 'Limpiar chat',
    conversationAria: 'Conversación con Nova',
    userMessage: 'Tu mensaje',
    thinkingAria: 'Nova está analizando',
    thinking: 'Nova está analizando…',
    quickTemplates: 'Análisis sugeridos:',
    askPlaceholder: 'Pregúntale a Nova por tu historial musical…',
    askAria: 'Pregunta a Nova sobre tu historial musical',
    sendMessage: 'Enviar mensaje',
    apiSettings: 'Configurar clave de API',
    apiDescription: 'Por defecto, tu clave permanece sólo en esta sesión/pestaña. Puedes elegir recordarla explícitamente en este navegador. Al enviar un mensaje, Gemini recibe tu pregunta y un resumen compacto —nunca los archivos de exportación en bruto—.',
    apiPlaceholder: 'Clave de API de Gemini…',
    apiKeyAria: 'Clave de API de Gemini',
    hideApiKey: 'Ocultar clave de API',
    showApiKey: 'Mostrar clave de API',
    keySaved: 'Clave recordada explícitamente en el almacenamiento local del navegador.',
    keySession: 'Clave disponible sólo durante esta sesión del navegador.',
    rememberKey: 'Recordar la clave en este navegador',
    clearKey: 'Olvidar y borrar la clave',
    sandboxActive: 'Modo Sandbox simulado activo.',
    freeGeminiKey: 'Obtener una clave de Gemini gratis',
    opensNewTab: 'se abre en una pestaña nueva',
    contextualDna: 'ADN musical contextual',
    scrobbles: 'Reproducciones',
    uniqueArtists: 'Artistas únicos',
    livePromptInstruction: 'The active interface language is Spanish. Answer in Spanish unless the user clearly asks in another language.',
  },
  en: {
    playsUnit: 'plays',
    notEnoughClassified: 'not enough classified metadata yet',
    none: 'none',
    genreResponse: (bucketList, primaryLine, secondaryLine, genericShare, genericNames) =>
      `### 📊 Nova's Evidence-Based Genre Reading\n\nYour active archive shows:\n- Top archive categories: ${bucketList}\n- Strongest specific signal: ${primaryLine} of all counted plays.\n- Secondary specific signal: ${secondaryLine} of all counted plays.\n- Data context: **${genericShare}%** currently sits in broad metadata categories (${genericNames}). I treat that as classification uncertainty, not as a musical personality trait.\n\nThe named genres are the stronger evidence for interpretation; broad categories should guide future metadata cleanup, not define your identity.`,
    welcome: project => `Hello! I am **Nova**, your AI Music Assistant. 🌌\n\nI can analyze your compiled history (*${project}*) and provide deep musical insights. Ask me anything, or configure your personal Gemini API key below to unlock advanced reasoning.`,
    conversationCleared: 'Conversation cleared. Ready for your next question!',
    promptChips: [
      { label: '🎵 Suggest a morning playlist', text: 'Suggest a 5-track morning playlist based on my listening data. Give it a creative name and explain why you chose these tracks.' },
      { label: '📊 Describe my top genres', text: 'Analyze my top genres in detail. What do they say about my musical identity?' },
      { label: '🔥 Analyze my obsessions', text: 'Review my top tracks and listening obsessions. What patterns do you see?' },
      { label: '⚡ Dominant daypart profile', text: 'Explain what my dominant daypart means for my lifestyle and music discovery.' },
    ],
    artistLine: (name, plays) => `**${name}** (${plays} plays)`,
    trackLine: (title, artist, plays) => `*"${title}"* by **${artist}** (${plays} plays)`,
    playlistResponse: tracks => `### 🎵 Simulated Custom Playlist: *Cartography of Now*\n\nThis selection is generated only from the active archive's highest-ranked tracks:\n\n${tracks}\n\n*It is a local ranking-and-repetition suggestion, not a claim about your emotional state. With Gemini enabled, Nova can adapt the context to your question.*`,
    obsessionResponse: (topTracks, leader, share) => `### 🔥 Repeated Listening Summary\n\nThe active archive's leading tracks are:\n- ${topTracks}\n\nThe strongest repetition signal is ${leader}, representing **${share}%** of counted plays. This describes observed frequency; it does not assume a routine, time of day or emotional meaning.`,
    daypartResponse: (daypart, evidence) => `### ⚡ Dominant Daypart Analysis\n\nThe highest-weight recorded window is **${daypart}**.\n\nThe archive's leading musical signals are ${evidence}. This reading describes the active archive and avoids assigning personal habits that the evidence cannot prove.`,
    morningFallback: 'Morning',
    defaultResponse: (query, totalPlays, uniqueArtists, topArtists) => `### 🌌 Nova Sandbox Mode\n\nI processed your query: *"${query}"*\n\nHere are some key metrics:\n- **Total plays**: ${totalPlays}\n- **Unique artists**: ${uniqueArtists}\n- **Top artists**: ${topArtists}\n\n*🔧 **How do I enable live AI reasoning?***\n1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).\n2. Open the **API Settings** panel below.\n3. Paste your key.\n4. Ask me anything; I will analyze your data in real time with **Gemini 2.5 Flash**.`,
    apiRequestFailed: 'The API request failed. Verify your key.',
    emptyResponse: 'An empty response was received.',
    connectionFailed: 'Could not connect. Check your network and API key.',
    errorResponse: message => `❌ **Error**: ${message}`,
    clearChat: 'Clear chat',
    conversationAria: 'Conversation with Nova',
    userMessage: 'Your message',
    thinkingAria: 'Nova is analyzing',
    thinking: 'Nova is analyzing…',
    quickTemplates: 'Quick analysis templates:',
    askPlaceholder: 'Ask Nova about your music history…',
    askAria: 'Ask Nova about your music history',
    sendMessage: 'Send message',
    apiSettings: 'API key settings',
    apiDescription: 'By default, your key stays only in this browser tab/session. You can explicitly choose to remember it on this browser. When you send a message, Gemini receives your question plus a compact summary, never the raw export files.',
    apiPlaceholder: 'Gemini API key…',
    apiKeyAria: 'Gemini API key',
    hideApiKey: 'Hide API key',
    showApiKey: 'Show API key',
    keySaved: 'Key explicitly remembered in browser local storage.',
    keySession: 'Key available only for this browser session.',
    rememberKey: 'Remember key on this browser',
    clearKey: 'Forget and clear key',
    sandboxActive: 'Simulated Sandbox Mode is active.',
    freeGeminiKey: 'Get a free Gemini key',
    opensNewTab: 'opens in a new tab',
    contextualDna: 'Contextual music DNA',
    scrobbles: 'Scrobbles',
    uniqueArtists: 'Unique artists',
    livePromptInstruction: 'The active interface language is English. Answer in English unless the user clearly asks in another language.',
  },
  he: {
    playsUnit: 'השמעות',
    notEnoughClassified: 'עדיין אין מספיק מטא־נתונים מסווגים',
    none: 'אין',
    genreResponse: (bucketList, primaryLine, secondaryLine, genericShare, genericNames) =>
      `### 📊 קריאת ז׳אנרים מבוססת נתונים\n\nבארכיון הפעיל שלך נמצאו:\n- הקטגוריות המובילות בארכיון: ${bucketList}\n- האות הסגנוני הספציפי החזק ביותר: ${primaryLine} מכלל ההשמעות שנספרו.\n- האות הסגנוני הספציפי השני בעוצמתו: ${secondaryLine} מכלל ההשמעות שנספרו.\n- הקשר הנתונים: **${genericShare}%** נמצאים כרגע בקטגוריות מטא־נתונים רחבות (${genericNames}). זהו חוסר ודאות בסיווג, ולא מאפיין של האישיות המוזיקלית שלך.\n\nהז׳אנרים המפורשים הם הבסיס החזק יותר לפרשנות; הקטגוריות הרחבות אמורות לכוון את שיפור המטא־נתונים בעתיד, ולא להגדיר את הזהות שלך.`,
    welcome: project => `שלום! אני **Nova**, עוזרת ה-AI המוזיקלית שלך. 🌌\n\nאני יכולה לנתח את היסטוריית ההאזנה שנאספה (*${project}*) ולהפיק ממנה תובנות מוזיקליות עמוקות. אפשר לשאול אותי כל דבר, או להגדיר למטה מפתח API אישי של Gemini כדי להפעיל ניתוח מתקדם.`,
    conversationCleared: 'השיחה נוקתה. אפשר להמשיך לשאלה הבאה!',
    promptChips: [
      { label: '🎵 בניית פלייליסט לבוקר', text: 'נא ליצור פלייליסט של 5 שירים לבוקר על סמך נתוני ההאזנה שלי, לתת לו שם יצירתי ולהסביר למה כל שיר נבחר.' },
      { label: '📊 ניתוח הז׳אנרים המובילים', text: 'נא לנתח לעומק את הז׳אנרים המובילים שלי ולהסביר מה הם מלמדים על הזהות המוזיקלית שלי.' },
      { label: '🔥 זיהוי דפוסי האזנה חוזרת', text: 'נא לבדוק את השירים המובילים ואת דפוסי ההאזנה החוזרת שלי. אילו דפוסים בולטים בנתונים?' },
      { label: '⚡ פרופיל שעות ההאזנה', text: 'נא להסביר מה חלון ההאזנה הדומיננטי שלי מלמד על אורח החיים ועל הדרך שבה אני מגלה מוזיקה.' },
    ],
    artistLine: (name, plays) => `**${name}** (${plays} השמעות)`,
    trackLine: (title, artist, plays) => `*"${title}"* מאת **${artist}** (${plays} השמעות)`,
    playlistResponse: tracks => `### 🎵 פלייליסט מותאם אישית במצב הדמיה: *המפה של עכשיו*\n\nהבחירה הזאת נוצרת אך ורק מהשירים המדורגים גבוה בארכיון הפעיל:\n\n${tracks}\n\n*זו הצעה מקומית המבוססת על דירוג וחזרתיות, ולא קביעה לגבי המצב הרגשי שלך. עם Gemini פעיל, Nova יכולה להתאים את ההקשר לשאלה שלך.*`,
    obsessionResponse: (topTracks, leader, share) => `### 🔥 סיכום דפוסי ההאזנה החוזרת\n\nהשירים המובילים בארכיון הפעיל הם:\n- ${topTracks}\n\nאות החזרתיות החזק ביותר הוא ${leader}, עם **${share}%** מההשמעות שנספרו. זהו תיאור של תדירות נצפית בלבד, ללא הנחה על שגרה, שעה ביום או משמעות רגשית.`,
    daypartResponse: (daypart, evidence) => `### ⚡ ניתוח חלון ההאזנה הדומיננטי\n\nחלון הזמן בעל המשקל הגבוה ביותר ברשומות הוא **${daypart}**.\n\nהאותות המוזיקליים המובילים בארכיון הם ${evidence}. הקריאה מתארת את הארכיון הפעיל ונמנעת מייחוס הרגלים אישיים שהנתונים אינם מוכיחים.`,
    morningFallback: 'בוקר',
    defaultResponse: (query, totalPlays, uniqueArtists, topArtists) => `### 🌌 מצב ה-Sandbox של Nova\n\nעיבדתי את הבקשה: *"${query}"*\n\nהנה כמה מדדים מרכזיים:\n- **סך כל ההשמעות**: ${totalPlays}\n- **אמנים ייחודיים**: ${uniqueArtists}\n- **האמנים המובילים**: ${topArtists}\n\n*🔧 **איך מפעילים ניתוח AI בזמן אמת?***\n1. לקבל מפתח API בחינם דרך [Google AI Studio](https://aistudio.google.com/).\n2. לפתוח את חלונית **הגדרות ה-API** שלמטה.\n3. להדביק את המפתח.\n4. לשאול אותי כל דבר; אנתח את הנתונים בזמן אמת באמצעות **Gemini 2.5 Flash**.`,
    apiRequestFailed: 'הבקשה ל-API נכשלה. כדאי לבדוק את המפתח.',
    emptyResponse: 'התקבלה תשובה ריקה.',
    connectionFailed: 'לא ניתן להתחבר. כדאי לבדוק את החיבור לרשת ואת מפתח ה-API.',
    errorResponse: message => `❌ **שגיאה**: ${message}`,
    clearChat: 'ניקוי השיחה',
    conversationAria: 'שיחה עם Nova',
    userMessage: 'ההודעה שלך',
    thinkingAria: 'Nova מנתחת את הנתונים',
    thinking: 'Nova מנתחת את הנתונים…',
    quickTemplates: 'תבניות לניתוח מהיר:',
    askPlaceholder: 'אפשר לשאול את Nova על היסטוריית ההאזנה שלך…',
    askAria: 'שליחת שאלה ל-Nova על היסטוריית ההאזנה שלך',
    sendMessage: 'שליחת הודעה',
    apiSettings: 'הגדרות מפתח API',
    apiDescription: 'כברירת מחדל, המפתח נשמר רק בכרטיסייה ובסשן הנוכחיים. אפשר לבחור במפורש לזכור אותו בדפדפן הזה. בעת שליחת הודעה, Gemini מקבלת את השאלה וסיכום מצומצם בלבד, ולעולם לא את קובצי הייצוא הגולמיים.',
    apiPlaceholder: 'מפתח API של Gemini…',
    apiKeyAria: 'מפתח API של Gemini',
    hideApiKey: 'הסתרת מפתח ה-API',
    showApiKey: 'הצגת מפתח ה-API',
    keySaved: 'המפתח נשמר במפורש באחסון המקומי של הדפדפן.',
    keySession: 'המפתח זמין רק במהלך סשן הדפדפן הנוכחי.',
    rememberKey: 'לזכור את המפתח בדפדפן הזה',
    clearKey: 'לשכוח ולמחוק את המפתח',
    sandboxActive: 'מצב Sandbox מדומה פעיל.',
    freeGeminiKey: 'קבלת מפתח Gemini בחינם',
    opensNewTab: 'נפתח בכרטיסייה חדשה',
    contextualDna: 'DNA מוזיקלי לפי הקשר',
    scrobbles: 'השמעות מתועדות',
    uniqueArtists: 'אמנים ייחודיים',
    livePromptInstruction: 'The active interface language is Hebrew. Answer in fluent Modern Hebrew unless the user clearly asks in another language. Preserve artist, track, genre and product names in their original form.',
  },
};

const SANDBOX_QUERY_TERMS = {
  playlist: ['playlist', 'reproducción', 'sugiere', 'suggest', 'פלייליסט', 'רשימת השמעה'],
  genre: ['genre', 'género', 'style', 'estilo', 'ז׳אנר', "ז'אנר", 'סגנון'],
  obsession: ['obsession', 'obsesión', 'track', 'canción', 'אובססיה', 'האזנה חוזרת', 'האזנה החוזרת', 'השמעות חוזרות', 'שיר'],
  daypart: ['daypart', 'horaria', 'mañana', 'morning', 'שעות ההאזנה', 'חלון ההאזנה', 'בוקר'],
} as const;

const DAYPART_LABELS: Record<Lang, Record<string, string>> = {
  es: {
    'Madrugada 00-05': 'Madrugada 00–05',
    'Mañana 06-11': 'Mañana 06–11',
    'Tarde 12-17': 'Tarde 12–17',
    'Noche 18-23': 'Noche 18–23',
  },
  en: {
    'Madrugada 00-05': 'Late night 00–05',
    'Mañana 06-11': 'Morning 06–11',
    'Tarde 12-17': 'Afternoon 12–17',
    'Noche 18-23': 'Evening 18–23',
  },
  he: {
    'Madrugada 00-05': 'לילה מאוחר 00–05',
    'Mañana 06-11': 'בוקר 06–11',
    'Tarde 12-17': 'אחר הצהריים 12–17',
    'Noche 18-23': 'ערב 18–23',
  },
};

function includesAny(value: string, terms: readonly string[]) {
  return terms.some(term => value.includes(term));
}

/**
 * Build an evidence-backed local genre reading. Broad metadata buckets remain
 * visible for honesty, but are never presented as personality traits and no
 * percentage is asserted without being calculated from the active archive.
 */
export function buildSandboxGenreResponse(data: MusicDnaData, lang: Lang): string {
  const copy = pickLanguage(lang, ASSISTANT_COPY);
  const number = new Intl.NumberFormat(localeFor(lang));
  const topBuckets = data.top_genres.slice(0, 5);
  const specificGenres = data.top_genres.filter(
    genre => !isGenericGenreBucket(genre.name),
  );
  const genericGenres = data.top_genres.filter(
    genre => isGenericGenreBucket(genre.name),
  );
  const [primary, secondary] = specificGenres;
  const totalPlays = data.core_metrics.total_plays;
  const genericPlays = genericGenres.reduce((sum, genre) => sum + genre.plays, 0);
  const bucketList = topBuckets
    .map(genre => `**${localizeGenreName(genre.name, lang)}** (${number.format(genre.plays)} ${copy.playsUnit})`)
    .join(', ');

  const primaryLine = primary
    ? `**${primary.name}** — ${number.format(primary.plays)} ${copy.playsUnit} (**${genreShare(primary.plays, totalPlays)}%**)`
    : copy.notEnoughClassified;
  const secondaryLine = secondary
    ? `**${secondary.name}** — ${number.format(secondary.plays)} ${copy.playsUnit} (**${genreShare(secondary.plays, totalPlays)}%**)`
    : copy.notEnoughClassified;
  const genericNames = genericGenres.map(genre => localizeGenreName(genre.name, lang)).join(' + ');

  return copy.genreResponse(
    bucketList,
    primaryLine,
    secondaryLine,
    genreShare(genericPlays, totalPlays),
    genericNames || copy.none,
  );
}

export function buildSandboxResponse(data: MusicDnaData, lang: Lang, query: string): string {
  const copy = pickLanguage(lang, ASSISTANT_COPY);
  const locale = localeFor(lang);
  const number = new Intl.NumberFormat(locale);
  const normalizedQuery = query.toLowerCase();
  const topArtists = data.top_artists
    .slice(0, 5)
    .map(artist => copy.artistLine(artist.name, number.format(artist.plays)))
    .join(', ');
  const topTracks = data.top_tracks
    .slice(0, 5)
    .map(track => copy.trackLine(track.title, track.artist, number.format(track.plays)))
    .join('\n- ');
  const playlistTracks = data.top_tracks
    .slice(0, 5)
    .map((track, index) => `${index + 1}. **${track.title}** — ${track.artist} (${number.format(track.plays)} ${copy.playsUnit})`)
    .join('\n');
  const leadingTrack = data.top_tracks[0];
  const leadingTrackLabel = leadingTrack
    ? `**${leadingTrack.title}** — ${leadingTrack.artist}`
    : copy.none;
  const leadingTrackShare = leadingTrack
    ? genreShare(leadingTrack.plays, data.core_metrics.total_plays)
    : '0.0';
  const leadingGenres = data.top_genres
    .filter(genre => !isGenericGenreBucket(genre.name))
    .slice(0, 3)
    .map(genre => `**${localizeGenreName(genre.name, lang)}**`)
    .join(', ') || copy.notEnoughClassified;

  if (includesAny(normalizedQuery, SANDBOX_QUERY_TERMS.playlist)) {
    return copy.playlistResponse(playlistTracks || copy.none);
  }

  if (includesAny(normalizedQuery, SANDBOX_QUERY_TERMS.genre)) {
    return buildSandboxGenreResponse(data, lang);
  }

  if (includesAny(normalizedQuery, SANDBOX_QUERY_TERMS.obsession)) {
    return copy.obsessionResponse(topTracks || copy.none, leadingTrackLabel, leadingTrackShare);
  }

  if (includesAny(normalizedQuery, SANDBOX_QUERY_TERMS.daypart)) {
    const sourceDaypart = data.yearly_eras.reduce((best, era) => (
      !best || era.plays > best.plays ? era : best
    ), data.yearly_eras[0])?.dominant_daypart;
    const localizedDaypart = sourceDaypart
      ? DAYPART_LABELS[lang][sourceDaypart] ?? sourceDaypart
      : copy.morningFallback;
    return copy.daypartResponse(localizedDaypart, leadingGenres);
  }

  return copy.defaultResponse(
    query,
    number.format(data.core_metrics.total_plays),
    number.format(data.core_metrics.unique_artists),
    topArtists,
  );
}

export default function AIAssistant({ data }: AIAssistantProps) {
  const { lang } = useApp();
  const copy = pickLanguage(lang, ASSISTANT_COPY);
  const locale = localeFor(lang);
  const isRtl = directionFor(lang) === 'rtl';

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: copy.welcome(data.project),
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [rememberApiKey, setRememberApiKey] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(SESSION_KEY) || '';
    } catch {
      return '';
    }
  });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatLog = chatLogRef.current;
    if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    setMessages(previous => {
      if (previous.length !== 1 || !['welcome', 'welcome-reset'].includes(previous[0].id)) {
        return previous;
      }

      const isResetMessage = previous[0].id === 'welcome-reset';
      return [{
        ...previous[0],
        text: isResetMessage ? copy.conversationCleared : copy.welcome(data.project),
      }];
    });
  }, [copy, data.project]);

  const saveKey = (key: string) => {
    const cleanKey = key.trim();
    setApiKey(cleanKey);
    try {
      if (cleanKey) {
        sessionStorage.setItem(SESSION_KEY, cleanKey);
        if (rememberApiKey) localStorage.setItem(STORAGE_KEY, cleanKey);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore browser-storage security errors; the in-memory key still works */
    }
  };

  const setKeyPersistence = (remember: boolean) => {
    setRememberApiKey(remember);
    try {
      if (apiKey) sessionStorage.setItem(SESSION_KEY, apiKey);
      if (remember && apiKey) {
        localStorage.setItem(STORAGE_KEY, apiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore browser-storage security errors */
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    setRememberApiKey(false);
    setShowKey(false);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore browser-storage security errors */
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: copy.conversationCleared,
        timestamp: new Date(),
      },
    ]);
  };

  const promptChips = copy.promptChips;

  // Chat Submission handler
  const handleSend = async (textToSend: string) => {
    const prompt = textToSend.trim();
    if (!prompt || loading) return;

    setInput('');
    const userMsgId = Math.random().toString(36).substring(7);
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      if (!apiKey) {
        // Run in local sandbox mode
        await new Promise(resolve => setTimeout(resolve, 800)); // simulate network delay
        const reply = buildSandboxResponse(data, lang, prompt);
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          sender: 'assistant',
          text: reply,
          timestamp: new Date(),
        }]);
      } else {
        // Build prompt context with this visitor's compiled music summary -
        // never a fixed name, since anyone can upload their own archive here.
        const promptContext = `
You are Nova, this listener's personal AI Music Assistant. Do not assume the user's name; address them naturally without inventing one.
Here is a summary of this listener's music listening history:
- Project: ${data.project}
- Total plays: ${data.core_metrics.total_plays}
- Unique artists: ${data.core_metrics.unique_artists}
- Unique tracks: ${data.core_metrics.unique_tracks}
- Unique albums: ${data.core_metrics.unique_albums}
- Total hours: ${data.core_metrics.listening_hours}
- Active days: ${data.core_metrics.active_days}
- Top Artists: ${data.top_artists.slice(0, 10).map(a => `${a.name} (${a.plays} plays, ${a.genre})`).join(', ')}
- Top Tracks: ${data.top_tracks.slice(0, 10).map(t => `${t.artist} - ${t.title} (${t.plays} plays)`).join(', ')}
- Top Genres: ${data.top_genres.slice(0, 8).map(g => `${g.name} (${g.plays} plays)`).join(', ')}
- Genre metadata rule: "Unclassified" and broad "Alternative" buckets represent classification uncertainty, not identity traits. Never invent a percentage; calculate every share from the play counts and total plays above.
- Listening Countries: ${data.countries.slice(0, 5).map(c => `${c.country} (${c.plays} plays)`).join(', ')}
- Top Eras: ${data.yearly_eras.map(e => `Year ${e.year}: Top Artist ${e.top_artist}, Top Track ${e.top_track}, Label: ${e.era_label}`).join('\n')}

Preferred visual style for responses: Cyberpunk, neon accents, dark theme, futuristic, glassmorphism, sci-fi.
Keep your responses structured, beautiful, detailed, using markdown, emojis, bullet points, code blocks, and high information density. Maintain a friendly, supportive, and encouraging tone. Answer in the same language as the user's query.
${copy.livePromptInstruction}

The user asks: "${prompt}"
`;

        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Header, never a ?key= query param: URLs (with query strings)
              // leak into DevTools, console errors on failed CORS requests,
              // and screen-shared bug reports - and this is the user's own
              // billable personal key.
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: promptContext,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          throw new Error(copy.apiRequestFailed);
        }

        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
          throw new Error(copy.emptyResponse);
        }

        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          sender: 'assistant',
          text,
          timestamp: new Date(),
        }]);
      }
    } catch (err: unknown) {
      console.error(err);
      const knownMessage = err instanceof Error
        && [copy.apiRequestFailed, copy.emptyResponse].includes(err.message)
        ? err.message
        : copy.connectionFailed;
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        sender: 'assistant',
        text: copy.errorResponse(knownMessage),
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col min-h-[calc(100vh-140px)]">
      <div className="flex shrink-0 justify-end">
        <button
          type="button"
          onClick={clearChat}
          className="flex min-h-11 items-center gap-1.5 rounded-xl border border-transparent px-3 py-1.5 text-xs font-mono text-gray-500 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-red-400"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{copy.clearChat}</span>
        </button>
      </div>

      {/* Main chat layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-stretch flex-1 font-sans">
        {/* Chat area */}
        <div className="nova-surface nova-surface--featured rounded-3xl border border-white/10 p-4 md:p-6 flex flex-col min-h-[460px] max-h-[620px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
          
          {/* Scrollable logs */}
          <div
            ref={chatLogRef}
            className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={loading}
            aria-label={copy.conversationAria}
          >
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  aria-label={`${msg.sender === 'user' ? copy.userMessage : 'Nova'}: ${msg.text}`}
                >
                  <div
                    dir="auto"
                    className={`nova-on-dark max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed border relative ${
                      msg.sender === 'user'
                        ? 'bg-purple-600/10 border-purple-500/30 text-white'
                        : 'bg-white/5 border-white/10 text-gray-200'
                    }`}
                  >
                    {/* Render message markup */}
                    <div className="prose prose-invert prose-xs max-w-none">
                      {msg.text.split('\n\n').map((paragraph, pi) => {
                        const formatText = (txt: string) => {
                          const boldRegex = /\*\*(.*?)\*\*/g;
                          let parts: React.ReactNode[] = [];
                          let lastIdx = 0;
                          
                          txt.replace(boldRegex, (match, p1, index) => {
                            if (index > lastIdx) {
                              parts.push(txt.substring(lastIdx, index));
                            }
                            parts.push(<strong key={index} className="text-white font-extrabold">{p1}</strong>);
                            lastIdx = index + match.length;
                            return match;
                          });
                          
                          if (lastIdx < txt.length) {
                            parts.push(txt.substring(lastIdx));
                          }
                          return parts.length ? parts : txt;
                        };

                        if (paragraph.startsWith('### ')) {
                          return <h4 key={pi} className="text-sm font-bold text-white mt-3 mb-1 font-mono uppercase tracking-wide">{paragraph.replace('### ', '')}</h4>;
                        }
                        if (paragraph.startsWith('- ')) {
                          return (
                            <ul key={pi} className="my-1 list-disc space-y-1 ps-4">
                              {paragraph.split('\n').map((li, lii) => (
                                <li key={lii} className="text-xs text-gray-300">{formatText(li.replace('- ', ''))}</li>
                              ))}
                            </ul>
                          );
                        }
                        return <p key={pi} className="text-xs text-gray-300 my-1 whitespace-pre-wrap">{formatText(paragraph)}</p>;
                      })}
                    </div>
                    <span className="mt-1 block text-end font-mono text-[9px] text-gray-500">
                      {msg.timestamp.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex justify-start" aria-label={copy.thinkingAria}>
                <div className="nova-on-dark bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-xs text-gray-400 font-mono">
                    {copy.thinking}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Prompt chips */}
          {messages.length === 1 && !loading && (
            <div className="mt-4 pt-3 border-t border-white/5 shrink-0">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2">
                {copy.quickTemplates}
              </p>
              <div className="flex flex-wrap gap-2">
                {promptChips.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleSend(chip.text)}
                    className="flex min-h-11 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-start text-xs text-gray-300 transition-all hover:scale-[1.01] hover:border-purple-500/40 hover:bg-purple-950/20"
                  >
                    <span>{chip.label}</span>
                    <ArrowRight className={`h-3 w-3 text-purple-400 opacity-55 ${isRtl ? 'rotate-180' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input field */}
          <div className="mt-4 pt-3 border-t border-white/10 shrink-0 flex items-center space-x-2 relative z-20">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              placeholder={copy.askPlaceholder}
              aria-label={copy.askAria}
              dir="auto"
              className="nova-on-dark flex-1 bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
              aria-label={copy.sendMessage}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg transition-all hover:bg-purple-500 hover:shadow-purple-500/20 disabled:bg-white/5 disabled:text-gray-600"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side Panel: Settings & Summary */}
        <div className="flex flex-col space-y-4">
          {/* Key configuration panel */}
          <div className="nova-surface nova-surface--analysis p-5 rounded-3xl border border-white/10 space-y-4 relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="flex items-center space-x-2.5">
              <Key className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                {copy.apiSettings}
              </h3>
            </div>
            
            <p id="nova-api-key-description" className="text-xs text-gray-400 leading-relaxed">
              {copy.apiDescription}
            </p>

            <div className="space-y-3 pt-2">
              <div className="nova-on-dark relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => saveKey(e.target.value)}
                  placeholder={copy.apiPlaceholder}
                  aria-label={copy.apiKeyAria}
                  aria-describedby="nova-api-key-description"
                  dir={apiKey ? 'ltr' : directionFor(lang)}
                  className={`w-full rounded-xl border border-white/10 bg-black/50 py-2.5 text-xs text-white placeholder-gray-500 transition-colors focus:border-purple-500/50 font-mono ${isRtl ? 'pl-10 pr-3' : 'pl-3 pr-10'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? copy.hideApiKey : copy.showApiKey}
                  className={`absolute inset-y-0 flex min-w-11 items-center justify-center text-gray-500 transition-colors hover:text-white ${isRtl ? 'left-0' : 'right-0'}`}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={rememberApiKey}
                    disabled={!apiKey}
                    onChange={event => setKeyPersistence(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/50 accent-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span>{copy.rememberKey}</span>
                </label>
                {apiKey && (
                  <button
                    type="button"
                    onClick={clearApiKey}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-950/15 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300 transition-colors hover:border-rose-400/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {copy.clearKey}
                  </button>
                )}
              </div>

              {apiKey ? (
                <div className="nova-on-dark flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{rememberApiKey ? copy.keySaved : copy.keySession}</span>
                </div>
              ) : (
                <div className="nova-on-dark flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{copy.sandboxActive}</span>
                </div>
              )}
            </div>

            {/* AI Studio Info */}
            <div className="pt-2 border-t border-white/5">
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${copy.freeGeminiKey} (${copy.opensNewTab})`}
                className="flex min-h-11 items-center justify-between text-[10px] font-mono text-purple-400 transition-colors hover:text-purple-300"
              >
                <span>{copy.freeGeminiKey}</span>
                <ArrowRight className={`h-3 w-3 ${isRtl ? 'rotate-180' : ''}`} />
              </a>
            </div>
          </div>

          {/* Quick Stats Summary Card */}
          <div className="nova-surface nova-surface--utility p-5 rounded-3xl border border-white/10 shrink-0 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-300">
                {copy.contextualDna}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white/3 border border-white/5 rounded-xl p-2">
                <span className="text-[10px] text-gray-500">{copy.scrobbles}</span>
                <p className="font-extrabold text-white mt-0.5">{data.core_metrics.total_plays.toLocaleString(locale)}</p>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-xl p-2">
                <span className="text-[10px] text-gray-500">{copy.uniqueArtists}</span>
                <p className="font-extrabold text-white mt-0.5">{data.core_metrics.unique_artists.toLocaleString(locale)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
