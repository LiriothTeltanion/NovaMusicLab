import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  AreaChart, Area, CartesianGrid, Treemap,
} from 'recharts';
import {
  Trophy, Music2, Disc3, MicVocal, BarChart2, Search, X, BookOpen, Calendar,
  ChevronRight, Clock, Info, ListMusic, MapPin, Sparkles, Users, ExternalLink, Globe2,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { localeFor } from '../utils/i18n';
import { buildGenreDistribution, getDatasetCoverage } from '../utils/chartIntegrity';
import {
  albumReleaseLabel,
  getAlbumEnrichment,
  getArtistArchiveAlbums,
  getArtistArchiveTracks,
  getArtistCatalogStats,
  getArtistEnrichment,
  getArtistEraSignals,
  getRelatedArchiveArtists,
  summarizeArtistEvidence,
} from '../utils/artistEnrichment';
import ArtistAvatar from './ArtistAvatar';
import BrandIcon from './BrandIcon';
import CoverArt from './CoverArt';
import GenreArt from './GenreArt';
import FlagArt from './FlagArt';
import MediaEmbedHub from './MediaEmbedHub';
import { axisProps, ChartCanvas, ChartFrame, gridStroke, SWAP_POSES, SWAP_TRANSITION, useChartAnimation } from './chartKit';
import { localizeEraLabel } from '../utils/localeText';
import { localizeGenreName } from '../utils/localizedDatasetText';
import { buildArtistMediaProfile, getCuratedArtistMedia } from '../utils/mediaLinks';
import { getArtistBandMembers, getOfflineArtistKnowledge } from '../utils/offlineArtistKnowledge';
import ArtistPhotoCarousel from './ArtistPhotoCarousel';
import memberEnrichment from '../data/member_enrichment.json';

const MEMBER_ENRICHMENT = memberEnrichment as Record<string, { name: string; photo?: string; birthDate?: string; age?: number | null; links?: Record<string, string> }>;
import {
  buildAlbumEmotionalReading,
  buildArtistEmotionalReading,
  buildArtistMoodProfile,
  buildMusicItemMoodProfile,
  buildTrackEmotionalReading,
  emotionalAxisLabels,
  EMOTIONAL_MOOD_TAXONOMY,
  type EmotionalEngineReading,
  type EmotionalMoodKey,
} from '../engines/emotionalEngine';
import MoodBadge, { MOOD_ICONS } from './MoodBadge';
import MobileDetailDrawer from './MobileDetailDrawer';

function getLinkLabel(url: string, officialWebsiteLabel: string): string {
  const lowercase = url.toLowerCase();
  if (lowercase.includes('wikipedia.org')) return 'Wikipedia';
  if (lowercase.includes('wikidata.org')) return 'Wikidata';
  if (lowercase.includes('bandcamp.com')) return 'Bandcamp';
  if (lowercase.includes('spotify.com')) return 'Spotify';
  if (lowercase.includes('youtube.com') || lowercase.includes('youtu.be')) return 'YouTube';
  if (lowercase.includes('discogs.com')) return 'Discogs';
  if (lowercase.includes('musicbrainz.org')) return 'MusicBrainz';
  return officialWebsiteLabel;
}

function getLinkColor(url: string, defaultColor: string): { color: string; borderColor: string; backgroundColor: string } {
  const lowercase = url.toLowerCase();
  if (lowercase.includes('wikipedia.org')) {
    return { color: '#e5e7eb', borderColor: 'rgba(255, 255, 255, 0.18)', backgroundColor: 'rgba(255, 255, 255, 0.05)' };
  }
  if (lowercase.includes('wikidata.org')) {
    return { color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)', backgroundColor: 'rgba(96, 165, 250, 0.08)' };
  }
  if (lowercase.includes('bandcamp.com')) {
    return { color: '#22d3ee', borderColor: 'rgba(34, 211, 238, 0.3)', backgroundColor: 'rgba(34, 211, 238, 0.08)' };
  }
  if (lowercase.includes('spotify.com')) {
    return { color: '#1DB954', borderColor: 'rgba(29, 185, 84, 0.3)', backgroundColor: 'rgba(29, 185, 84, 0.08)' };
  }
  if (lowercase.includes('youtube.com') || lowercase.includes('youtu.be')) {
    return { color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)', backgroundColor: 'rgba(248, 113, 113, 0.08)' };
  }
  if (lowercase.includes('discogs.com')) {
    return { color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', backgroundColor: 'rgba(251, 191, 36, 0.08)' };
  }
  return { color: defaultColor, borderColor: `${defaultColor}35`, backgroundColor: `${defaultColor}10` };
}

function getRoleIcon(roles: string[]): string {
  const r = roles.join(' ').toLowerCase();
  if (r.includes('vocals') || r.includes('singer') || r.includes('lyrics') || r.includes('voice')) return '🎤';
  if (r.includes('guitar')) return '🎸';
  if (r.includes('bass')) return '🎸';
  if (r.includes('drum') || r.includes('percussion') || r.includes('drummer')) return '🥁';
  if (r.includes('keyboard') || r.includes('piano') || r.includes('synthesizer') || r.includes('organ')) return '🎹';
  if (r.includes('violin') || r.includes('viola') || r.includes('cello') || r.includes('double bass')) return '🎻';
  if (r.includes('trumpet') || r.includes('trombone') || r.includes('sax') || r.includes('flute')) return '🎷';
  return '🎵';
}

interface TopHistoricoProps {
  data: MusicDnaData;
}

type TopTab = 'canciones' | 'artistas' | 'albums' | 'generos' | 'anos';
type MobileDossierKind = 'artist' | 'track' | 'album';

// Sub-tab swaps ride the app-wide shared chart/panel transition (chartKit).
const tabTransition = SWAP_TRANSITION;

const listVariants = { animate: { transition: { staggerChildren: 0.04 } } };
const itemVariants = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

function albumKey(artist: string, title: string) {
  return `${artist}::${title}`;
}

function trackKey(artist: string, title: string) {
  return `${artist}::${title}`;
}

type RowMoodProfile = {
  moodKey: EmotionalMoodKey;
  confidence: number;
  color: string;
};

const ARTIST_ATLAS_COPY = {
  es: {
    dossier: 'Dossier de artista',
    backToRanking: 'Volver al ranking',
    curatedBadge: 'Ficha curada',
    sourceBadge: 'Enciclopedia local',
    origin: 'Origen',
    start: 'Inicio',
    archiveEvidence: 'Evidencia en tu archivo',
    archiveRole: 'Rol en el archivo',
    soundEvolution: 'Evolución sonora',
    whyMatters: 'Por qué importa aquí',
    verifiedBackground: '🧬 Fondo verificado',
    verifiedBackgroundHint: 'Hechos compactos desde el cerebro offline: MusicBrainz, Wikidata y fuentes curadas cuando el match automático sería débil.',
    publicProfile: 'Perfil público',
    membersAndRoles: 'Miembros y roles',
    sourceLinks: 'Fuentes / enlaces',
    noMemberData: 'Sin miembros documentados en la ficha estructurada.',
    openSource: 'Abrir fuente',
    listeningPath: 'Ruta de escucha profunda',
    listeningPathHint: 'Una lectura guiada en tres pasos: primero lo que tu archivo ya repite, luego el giro de carrera y al final el capítulo más reciente.',
    archiveAnchor: 'Ancla del archivo',
    evolutionPivot: 'Punto de evolución',
    currentChapter: 'Capítulo actual',
    archiveAnchorBody: 'Empieza por la pieza que más aparece en tu propio historial; funciona como puerta emocional antes de entrar al catálogo completo.',
    evolutionPivotBody: 'Este capítulo ayuda a escuchar cómo cambió el lenguaje del artista: producción, intensidad, melodía o ambición conceptual.',
    currentChapterBody: 'Cierra con el punto más reciente de la ficha para entender hacia dónde quedó apuntando la identidad del proyecto.',
    trackLabel: 'canción',
    trackDossier: 'Dossier de canción',
    trackAtlas: 'Ficha de canción',
    selectedTrackHint: 'Haz clic en cualquier canción para abrir su ficha, lectura emocional y estación de escucha.',
    trackContext: 'Lectura de la canción',
    trackContextBody: 'Una canción del top funciona como la unidad mínima de memoria: no solo representa gusto, también revela qué frase, energía o textura volvió suficientes veces como para quedarse.',
    replayRole: 'Rol de repetición',
    emotionalFunction: 'Función emocional',
    artistConnection: 'Conexión con el artista',
    trackRank: 'puesto del top',
    trackPlaysMetric: 'plays de canción',
    trackGenreMetric: 'género',
    artistAlbumGravity: 'Álbumes del artista en tu archivo',
    artistTrackNeighbors: 'Más canciones de este artista',
    trackAlbumHint: 'Estos álbumes son señales a nivel de artista; el dataset no trae metadatos exactos canción-álbum, así que la app muestra la gravedad de álbumes dentro de tu archivo.',
    trackNeighborsHint: 'Canciones cercanas del mismo artista dentro de tu top histórico.',
    openAlbumDossier: 'Abrir dossier de álbum',
    openTrackDossier: 'Abrir dossier de canción',
    noTrackSelected: 'Selecciona una canción del ranking para abrir su dossier.',
    trackReplayCore: 'Núcleo de repetición',
    trackReplayCoreBody: 'Está en la zona más alta del archivo: probablemente funciona como himno central, acceso rápido a una emoción o pieza que define una etapa.',
    trackReplayHigh: 'Loop de confianza',
    trackReplayHighBody: 'Tiene suficiente repetición para leerse como canción de regreso: aparece cuando buscas una textura conocida, estable o intensamente reconocible.',
    trackReplayMid: 'Señal persistente',
    trackReplayMidBody: 'Su presencia no parece casual: sostiene una línea estética dentro del archivo aunque no sea el centro absoluto del ranking.',
    trackReplayDeep: 'Marca de catálogo',
    trackReplayDeepBody: 'Funciona como huella secundaria: menos dominante que los himnos principales, pero importante para entender el mapa completo de gustos.',
    trackEmotionHeavy: 'La lectura emocional apunta a tensión, catarsis, impulso físico y contraste entre peso y melodía.',
    trackEmotionSynth: 'La lectura emocional apunta a nostalgia luminosa, movimiento nocturno, velocidad mental y atmósfera cinematográfica.',
    trackEmotionEmo: 'La lectura emocional apunta a vulnerabilidad directa, memoria afectiva, confesión y necesidad de cercanía.',
    trackEmotionPop: 'La lectura emocional apunta a claridad melódica, repetición inmediata y energía social o expansiva.',
    trackEmotionDefault: 'La lectura emocional viene de la mezcla entre género, repetición y artista: una señal personal más que una etiqueta fija.',
    albumLabel: 'álbum',
    curatedAlbumLabel: 'álbum curado',
    albumDossier: 'Dossier de álbum',
    albumAtlas: 'Ficha de álbum',
    selectedAlbumHint: 'Haz clic en cualquier álbum para abrir su ficha, contexto y estación de escucha.',
    albumContext: 'Contexto del álbum',
    albumArchiveRole: 'Rol del álbum en tu archivo',
    artistBridge: 'Puente con el artista',
    catalogRole: 'Rol en la línea de catálogo',
    releaseYear: 'año de salida',
    playsRank: 'puesto del top',
    artistInArchive: 'plays del artista',
    catalogChapter: 'capítulo de catálogo',
    relatedArtistTracks: 'Canciones del artista en tu archivo',
    artistAlbumsNearby: 'Álbumes cercanos del artista',
    albumTracksHint: 'Estas canciones no siempre pertenecen al álbum; muestran cómo el mismo artista aparece en tu top de canciones.',
    openArtistDossier: 'Abrir dossier de artista',
    noAlbumContext: 'Este álbum todavía no tiene contexto curado exacto. La app muestra su peso dentro del archivo y lo conecta con la ficha del artista cuando existe.',
    albumArchiveRoleBody: 'Su peso aquí viene de escucha sostenida a nivel de álbum: una señal más lenta y deliberada que una sola canción en loop.',
    earlyCatalogRole: 'Aparece como una etapa temprana de la línea curada: útil para escuchar el punto de partida del lenguaje del artista.',
    middleCatalogRole: 'Funciona como capítulo de transformación: ayuda a entender el cambio de producción, emoción o ambición del artista.',
    lateCatalogRole: 'Representa un capítulo tardío o reciente: sirve para medir hacia dónde se movió la identidad del artista.',
    unknownCatalogRole: 'Todavía no está ubicado dentro de la línea curada, pero su presencia en el top confirma peso real dentro del archivo.',
    keyAlbums: 'Álbumes clave',
    archiveAlbums: 'Álbumes en tu archivo',
    topTracks: 'Canciones fuertes en tu archivo',
    eraSignals: 'Años donde domina',
    relatedArtists: 'Artistas conectados en tu archivo',
    relatedHint: 'La conexión se calcula por géneros compartidos, país y peso dentro de tu ranking histórico.',
    catalogFootprint: 'Huella de catálogo',
    emotionalEngine: 'Motor emocional',
    artistLongBio: 'Biografía emocional extendida',
    albumLongRead: 'Lectura extendida del álbum',
    trackLongRead: 'Lectura extendida de canción',
    primaryEmotion: 'Emoción primaria',
    secondaryEmotion: 'Capa secundaria',
    emotionalIntensity: 'Intensidad',
    emotionalAxis: 'Ejes emocionales',
    emotionalEvidence: 'Evidencia del motor',
    recommendedUse: 'Uso recomendado',
    emotionalEngineNote: 'Calculado desde género, ranking, plays, álbumes, canciones cercanas, eras dominadas y ficha local cuando existe.',
    moodLens: 'Lente emocional',
    moodConfidence: 'confianza del mood',
    moodRitual: 'Ritual sugerido',
    albumMoodBody: 'Esta capa traduce la lectura del álbum en identidad visual: color, atmósfera y una función clara dentro del museo.',
    trackMoodBody: 'Esta capa convierte la repetición de la canción en una señal visual inmediata: qué estado activa y cómo usarla mejor.',
    moodFilter: 'Filtro emocional',
    moodFilterCompactHint: 'Toca para refinar el archivo',
    moodFilterHint: 'Filtra artistas, canciones y álbumes por estado emocional dominante. El ranking se mantiene como una lectura del archivo, pero la lista se vuelve navegable por mood.',
    allMoods: 'Todos',
    catalogRange: 'Rango curado',
    archiveCovers: 'Portadas del archivo',
    visualSignal: 'señal visual',
    knownAlbums: 'álbumes con contexto',
    yearsShort: 'años',
    sameCountry: 'mismo país',
    sharedStyle: 'estilo compartido',
    hasProfile: 'ficha lista',
    topChart: 'Comparativa Top 20',
    archivePlays: 'plays en tu archivo',
    noProfileTitle: 'Biografía pendiente',
    noProfileBody: 'Este artista todavía no tiene ficha curada. La app muestra lo que ya existe en el archivo y queda listo para completar la biografía después.',
    noAlbums: 'No hay álbumes de este artista en el top de álbumes.',
    noTracks: 'No hay canciones de este artista en el top de canciones.',
    noEras: 'Todavía no aparece como artista dominante de un año completo.',
    selectedHint: 'Haz clic en cualquier artista para abrir su ficha.',
    released: 'año',
    albumCount: 'álbumes detectados',
    trackCount: 'canciones detectadas',
    eraCount: 'eras dominadas',
    albumPlays: 'plays en álbumes',
    trackPlays: 'plays en canciones',
    curatedNote: 'Esta ficha es una capa editorial local: mezcla datos públicos de carrera con evidencia de tu propio historial. Más adelante puede conectarse a Spotify, MusicBrainz o imágenes generadas por Claude.',
    lineupTitle: 'Formación',
    lineupHint: 'Miembros documentados en MusicBrainz: instrumento y años de actividad. Los puntos encendidos marcan integrantes actuales.',
    lineupCurrent: 'actual',
    lineupPast: 'pasado',
    lineupSince: (year: string) => `desde ${year}`,
    lineupSpan: (from: string, to: string) => `${from}–${to}`,
    lineupMore: (count: number) => `+${count} integrantes más en la historia de la banda`,
    officialWebsite: 'Sitio oficial',
    curatedKnowledgeSummary: (source: string, origin: string, description: string, background: string) =>
      `Perfil local verificado desde ${source}: ${origin}. ${description} ${background}`,
    wikidataKnowledgeSummary: (id: string, description: string) => `Ficha pública ${id}: ${description}.`,
    ageLabel: (age: number) => `Edad: ${age} años`,
    rolesLabel: 'Roles',
    statusLabel: 'Estado',
    clearSearch: 'Limpiar búsqueda',
    wholeArchive: 'Archivo completo',
    countedListensOther: 'escuchas contadas · categoría Otros explícita',
    yearlySubtitle: (maxDate?: string | null) => `Una métrica por vez, con su propia escala${maxDate ? ` · observado hasta ${maxDate}` : ''}.`,
    yearlySummary: (label: string) => `${label} se muestra por separado para que el volumen de escuchas no aplaste el conteo de artistas.`,
    yearLabel: 'Año',
    yearlyMetricAria: 'Métrica del gráfico anual',
  },
  en: {
    dossier: 'Artist Dossier',
    backToRanking: 'Back to ranking',
    curatedBadge: 'Curated profile',
    sourceBadge: 'Local encyclopedia',
    origin: 'Origin',
    start: 'Started',
    archiveEvidence: 'Evidence in your archive',
    archiveRole: 'Archive role',
    soundEvolution: 'Sound evolution',
    whyMatters: 'Why it matters here',
    verifiedBackground: '🧬 Verified background',
    verifiedBackgroundHint: 'Compact facts from the offline brain: MusicBrainz, Wikidata and curated sources when automatic matching would be weak.',
    publicProfile: 'Public profile',
    membersAndRoles: 'Members and roles',
    sourceLinks: 'Sources / links',
    noMemberData: 'No documented members in the structured profile.',
    openSource: 'Open source',
    listeningPath: 'Deep listening path',
    listeningPathHint: 'A three-step reading: first what your archive already repeats, then the career pivot, and finally the most recent chapter.',
    archiveAnchor: 'Archive anchor',
    evolutionPivot: 'Evolution pivot',
    currentChapter: 'Current chapter',
    archiveAnchorBody: 'Start with the item your own history already repeats most; it works as the emotional doorway before the full catalog.',
    evolutionPivotBody: 'This chapter helps you hear how the artist changed language: production, intensity, melody or conceptual ambition.',
    currentChapterBody: 'Close with the newest curated point to understand where the project identity is currently pointing.',
    trackLabel: 'track',
    trackDossier: 'Track Dossier',
    trackAtlas: 'Track profile',
    selectedTrackHint: 'Click any track to open its profile, emotional reading and listening station.',
    trackContext: 'Track reading',
    trackContextBody: 'A top track works as the smallest memory unit: it does not only represent taste, it reveals which phrase, energy or texture returned enough times to stay.',
    replayRole: 'Replay role',
    emotionalFunction: 'Emotional function',
    artistConnection: 'Artist connection',
    trackRank: 'top rank',
    trackPlaysMetric: 'track plays',
    trackGenreMetric: 'genre',
    artistAlbumGravity: 'Artist albums in your archive',
    artistTrackNeighbors: 'More tracks by this artist',
    trackAlbumHint: 'These albums are artist-level signals; the dataset does not include exact track-to-album metadata, so the app shows album gravity inside your archive.',
    trackNeighborsHint: 'Nearby songs by the same artist inside your historical top.',
    openAlbumDossier: 'Open album dossier',
    openTrackDossier: 'Open track dossier',
    noTrackSelected: 'Select a track from the ranking to open its dossier.',
    trackReplayCore: 'Replay core',
    trackReplayCoreBody: 'It sits at the very top of the archive: likely a central anthem, a shortcut into an emotion, or a track that defines a period.',
    trackReplayHigh: 'Trusted loop',
    trackReplayHighBody: 'It has enough repetition to read as a return song: something you revisit when you need a known, stable or highly recognizable texture.',
    trackReplayMid: 'Persistent signal',
    trackReplayMidBody: 'Its presence does not feel accidental: it carries an aesthetic line inside the archive even if it is not the absolute center of the ranking.',
    trackReplayDeep: 'Catalog mark',
    trackReplayDeepBody: 'It works as a secondary footprint: less dominant than the main anthems, but still useful for understanding the full taste map.',
    trackEmotionHeavy: 'The emotional reading points toward tension, catharsis, physical drive and contrast between weight and melody.',
    trackEmotionSynth: 'The emotional reading points toward bright nostalgia, night movement, mental speed and cinematic atmosphere.',
    trackEmotionEmo: 'The emotional reading points toward direct vulnerability, affective memory, confession and the need for closeness.',
    trackEmotionPop: 'The emotional reading points toward melodic clarity, immediate repetition and social or expansive energy.',
    trackEmotionDefault: 'The emotional reading comes from the mix of genre, repetition and artist: a personal signal more than a fixed label.',
    albumLabel: 'album',
    curatedAlbumLabel: 'curated album',
    albumDossier: 'Album Dossier',
    albumAtlas: 'Album profile',
    selectedAlbumHint: 'Click any album to open its profile, context and listening station.',
    albumContext: 'Album context',
    albumArchiveRole: 'Album role in your archive',
    artistBridge: 'Bridge to the artist',
    catalogRole: 'Catalog-line role',
    releaseYear: 'release year',
    playsRank: 'top rank',
    artistInArchive: 'artist plays',
    catalogChapter: 'catalog chapter',
    relatedArtistTracks: 'Artist tracks in your archive',
    artistAlbumsNearby: 'Nearby albums by this artist',
    albumTracksHint: 'These tracks do not always belong to the album; they show how the same artist appears in your track top.',
    openArtistDossier: 'Open artist dossier',
    noAlbumContext: 'This album does not have exact curated context yet. The app shows its archive weight and connects it with the artist profile when available.',
    albumArchiveRoleBody: 'Its weight here comes from sustained album-level listening: a slower and more deliberate signal than a single track on loop.',
    earlyCatalogRole: 'Appears as an early phase in the curated line: useful for hearing the artist language at its starting point.',
    middleCatalogRole: 'Works as a transformation chapter: it helps explain the artist change in production, emotion or ambition.',
    lateCatalogRole: 'Represents a late or recent chapter: useful for measuring where the artist identity moved.',
    unknownCatalogRole: 'It is not placed in the curated line yet, but its presence in the top confirms real weight inside the archive.',
    keyAlbums: 'Key albums',
    archiveAlbums: 'Albums in your archive',
    topTracks: 'Strong tracks in your archive',
    eraSignals: 'Years where they dominate',
    relatedArtists: 'Connected artists in your archive',
    relatedHint: 'Connections are calculated from shared genre language, country and weight inside your historical ranking.',
    catalogFootprint: 'Catalog footprint',
    emotionalEngine: 'Emotional engine',
    artistLongBio: 'Extended emotional biography',
    albumLongRead: 'Extended album reading',
    trackLongRead: 'Extended track reading',
    primaryEmotion: 'Primary emotion',
    secondaryEmotion: 'Secondary layer',
    emotionalIntensity: 'Intensity',
    emotionalAxis: 'Emotional axes',
    emotionalEvidence: 'Engine evidence',
    recommendedUse: 'Recommended use',
    emotionalEngineNote: 'Calculated from genre, rank, plays, albums, nearby tracks, dominant eras and the local profile when available.',
    moodLens: 'Emotional lens',
    moodConfidence: 'mood confidence',
    moodRitual: 'Suggested ritual',
    albumMoodBody: 'This layer translates the album reading into visual identity: color, atmosphere and a clear function inside the museum.',
    trackMoodBody: 'This layer turns track repetition into an immediate visual signal: which state it activates and how to use it better.',
    moodFilter: 'Emotional filter',
    moodFilterCompactHint: 'Tap to refine the archive',
    moodFilterHint: 'Filter artists, tracks and albums by dominant emotional state. The ranking stays as an archive reading, but the list becomes navigable by mood.',
    allMoods: 'All',
    catalogRange: 'Curated range',
    archiveCovers: 'Archive covers',
    visualSignal: 'visual signal',
    knownAlbums: 'albums with context',
    yearsShort: 'yrs',
    sameCountry: 'same country',
    sharedStyle: 'shared style',
    hasProfile: 'profile ready',
    topChart: 'Top 20 Comparison',
    archivePlays: 'plays in your archive',
    noProfileTitle: 'Biography pending',
    noProfileBody: 'This artist does not have a curated profile yet. The app shows the archive evidence already available and is ready for a fuller biography later.',
    noAlbums: 'No albums by this artist appear in the album top yet.',
    noTracks: 'No tracks by this artist appear in the track top yet.',
    noEras: 'They do not appear as the dominant artist of a full year yet.',
    selectedHint: 'Click any artist to open their profile.',
    released: 'year',
    albumCount: 'albums detected',
    trackCount: 'tracks detected',
    eraCount: 'eras dominated',
    albumPlays: 'album plays',
    trackPlays: 'track plays',
    curatedNote: 'This profile is a local editorial layer: it blends public career facts with evidence from your own history. Later it can connect to Spotify, MusicBrainz or Claude-generated art.',
    lineupTitle: 'Lineup',
    lineupHint: 'Members documented in MusicBrainz: instrument and active years. Lit dots mark current members.',
    lineupCurrent: 'current',
    lineupPast: 'past',
    lineupSince: (year: string) => `since ${year}`,
    lineupSpan: (from: string, to: string) => `${from}–${to}`,
    lineupMore: (count: number) => `+${count} more members across the band's history`,
    officialWebsite: 'Official website',
    curatedKnowledgeSummary: (source: string, origin: string, description: string, background: string) =>
      `Verified local profile from ${source}: ${origin}. ${description} ${background}`,
    wikidataKnowledgeSummary: (id: string, description: string) => `Public profile ${id}: ${description}.`,
    ageLabel: (age: number) => `Age: ${age}`,
    rolesLabel: 'Roles',
    statusLabel: 'Status',
    clearSearch: 'Clear search',
    wholeArchive: 'Whole archive',
    countedListensOther: 'counted listens · explicit Other category',
    yearlySubtitle: (maxDate?: string | null) => `One metric at a time, with its own scale${maxDate ? ` · observed through ${maxDate}` : ''}.`,
    yearlySummary: (label: string) => `${label} is shown independently so listen volume never flattens the artist count.`,
    yearLabel: 'Year',
    yearlyMetricAria: 'Year chart metric',
  },
  he: {
    dossier: 'תיק האמן',
    backToRanking: 'חזרה לדירוג',
    curatedBadge: 'פרופיל בעריכה מקומית',
    sourceBadge: 'אנציקלופדיה מקומית',
    origin: 'מוצא',
    start: 'תחילת פעילות',
    archiveEvidence: 'עדויות מהארכיון שלך',
    archiveRole: 'תפקיד בארכיון',
    soundEvolution: 'התפתחות מוזיקלית',
    whyMatters: 'למה זה משמעותי כאן',
    verifiedBackground: '🧬 רקע מאומת',
    verifiedBackgroundHint: 'עובדות תמציתיות ממאגר הידע הלא־מקוון: MusicBrainz,‏ Wikidata ומקורות בעריכה מקומית במקרים שבהם ההתאמה האוטומטית אינה ודאית.',
    publicProfile: 'פרופיל ציבורי',
    membersAndRoles: 'חברי ההרכב ותפקידים',
    sourceLinks: 'מקורות וקישורים',
    noMemberData: 'לא נמצאו חברי הרכב מתועדים בפרופיל המובנה.',
    openSource: 'פתיחת המקור',
    listeningPath: 'מסלול להאזנה מעמיקה',
    listeningPathHint: 'קריאה מודרכת בשלושה שלבים: קודם מה שהארכיון שלך כבר מחזיר שוב ושוב, אחר כך נקודת המפנה בקריירה, ולבסוף הפרק העדכני ביותר.',
    archiveAnchor: 'עוגן הארכיון',
    evolutionPivot: 'נקודת מפנה',
    currentChapter: 'הפרק הנוכחי',
    archiveAnchorBody: 'כדאי להתחיל בפריט שמופיע בתדירות הגבוהה ביותר בהיסטוריית ההאזנה שלך; הוא משמש שער רגשי לפני הכניסה לקטלוג המלא.',
    evolutionPivotBody: 'הפרק הזה מאפשר לשמוע כיצד השפה של האמן השתנתה — בהפקה, בעוצמה, במלודיה או בשאיפה הרעיונית.',
    currentChapterBody: 'לסיום, הנקודה העדכנית ביותר בפרופיל מראה לאן הזהות של הפרויקט מכוונת כיום.',
    trackLabel: 'שיר',
    trackDossier: 'תיק השיר',
    trackAtlas: 'פרופיל השיר',
    selectedTrackHint: 'בחירה בשיר תפתח את הפרופיל שלו, את הקריאה הרגשית ואת תחנת ההאזנה.',
    trackContext: 'קריאת השיר',
    trackContextBody: 'שיר מוביל הוא יחידת הזיכרון הקטנה ביותר: הוא אינו מבטא רק טעם, אלא חושף איזו שורה, אנרגיה או מרקם חזרו מספיק פעמים כדי להישאר.',
    replayRole: 'תפקיד החזרה',
    emotionalFunction: 'תפקיד רגשי',
    artistConnection: 'הקשר לאמן',
    trackRank: 'מיקום בדירוג',
    trackPlaysMetric: 'השמעות לשיר',
    trackGenreMetric: 'ז׳אנר',
    artistAlbumGravity: 'אלבומי האמן בארכיון שלך',
    artistTrackNeighbors: 'שירים נוספים מאת האמן',
    trackAlbumHint: 'האלבומים האלה הם סימנים ברמת האמן. מערך הנתונים אינו כולל שיוך מדויק בין כל שיר לאלבום, ולכן מוצג משקל האלבומים של האמן בתוך הארכיון שלך.',
    trackNeighborsHint: 'שירים סמוכים של אותו אמן בתוך הדירוג ההיסטורי.',
    openAlbumDossier: 'פתיחת תיק האלבום',
    openTrackDossier: 'פתיחת תיק השיר',
    noTrackSelected: 'יש לבחור שיר מהדירוג כדי לפתוח את התיק שלו.',
    trackReplayCore: 'ליבת החזרה',
    trackReplayCoreBody: 'השיר נמצא בצמרת הארכיון: כנראה המנון מרכזי, קיצור דרך למצב רגשי או יצירה שמגדירה תקופה.',
    trackReplayHigh: 'שיר שחוזרים אליו',
    trackReplayHighBody: 'מספר החזרות מצביע על שיר מוכר ובטוח שחוזרים אליו כשצריך מרקם יציב או מזוהה מיד.',
    trackReplayMid: 'אות מתמשך',
    trackReplayMidBody: 'הנוכחות שלו אינה מקרית: הוא מחזיק קו אסתטי בתוך הארכיון, גם אם אינו במרכז המוחלט של הדירוג.',
    trackReplayDeep: 'חותם קטלוגי',
    trackReplayDeepBody: 'זהו חותם משני — פחות דומיננטי מההמנונים המרכזיים, אך חשוב להבנת מפת הטעם המלאה.',
    trackEmotionHeavy: 'הקריאה הרגשית מצביעה על מתח, קתרזיס, דחף גופני והניגוד שבין כובד למלודיה.',
    trackEmotionSynth: 'הקריאה הרגשית מצביעה על נוסטלגיה זוהרת, תנועה לילית, מהירות מחשבתית ואווירה קולנועית.',
    trackEmotionEmo: 'הקריאה הרגשית מצביעה על פגיעוּת ישירה, זיכרון רגשי, וידוי וצורך בקרבה.',
    trackEmotionPop: 'הקריאה הרגשית מצביעה על בהירות מלודית, משיכה מיידית לחזרה ואנרגיה חברתית או מרחיבה.',
    trackEmotionDefault: 'הקריאה הרגשית נוצרת מהשילוב בין ז׳אנר, חזרתיות וזהות האמן — אות אישי יותר מתווית קבועה.',
    albumLabel: 'אלבום',
    curatedAlbumLabel: 'אלבום עם הקשר ערוך',
    albumDossier: 'תיק האלבום',
    albumAtlas: 'פרופיל האלבום',
    selectedAlbumHint: 'בחירה באלבום תפתח את הפרופיל, ההקשר ותחנת ההאזנה שלו.',
    albumContext: 'הקשר האלבום',
    albumArchiveRole: 'תפקיד האלבום בארכיון שלך',
    artistBridge: 'החיבור לאמן',
    catalogRole: 'תפקיד ברצף הקטלוגי',
    releaseYear: 'שנת יציאה',
    playsRank: 'מיקום בדירוג',
    artistInArchive: 'השמעות של האמן',
    catalogChapter: 'פרק בקטלוג',
    relatedArtistTracks: 'שירי האמן בארכיון שלך',
    artistAlbumsNearby: 'אלבומים סמוכים של האמן',
    albumTracksHint: 'השירים האלה אינם בהכרח חלק מהאלבום; הם מראים כיצד אותו אמן מופיע בדירוג השירים שלך.',
    openArtistDossier: 'פתיחת תיק האמן',
    noAlbumContext: 'עדיין אין לאלבום הזה הקשר מדויק בעריכה מקומית. האפליקציה מציגה את משקלו בארכיון ומקשרת אותו לפרופיל האמן, כאשר הוא קיים.',
    albumArchiveRoleBody: 'משקלו נובע מהאזנה עקבית ברמת האלבום — אות איטי ומכוון יותר משיר יחיד שחוזר בלופ.',
    earlyCatalogRole: 'זהו שלב מוקדם ברצף הקטלוגי הערוך, ולכן הוא עוזר לשמוע את השפה של האמן בנקודת ההתחלה.',
    middleCatalogRole: 'זהו פרק של שינוי, שמאפשר להבין את המעבר בהפקה, ברגש או בשאיפה האמנותית.',
    lateCatalogRole: 'זהו פרק מאוחר או עדכני, שמראה לאן הזהות של האמן התקדמה.',
    unknownCatalogRole: 'האלבום עדיין אינו משויך לרצף הקטלוגי הערוך, אך מיקומו בדירוג מעיד על משקל אמיתי בארכיון.',
    keyAlbums: 'אלבומי מפתח',
    archiveAlbums: 'אלבומים בארכיון שלך',
    topTracks: 'שירים בולטים בארכיון שלך',
    eraSignals: 'שנות דומיננטיות',
    relatedArtists: 'אמנים קשורים בארכיון שלך',
    relatedHint: 'הקשרים מחושבים לפי ז׳אנרים משותפים, ארץ מוצא ומשקל בדירוג ההיסטורי שלך.',
    catalogFootprint: 'טביעת רגל קטלוגית',
    emotionalEngine: 'המנוע הרגשי',
    artistLongBio: 'ביוגרפיה רגשית מורחבת',
    albumLongRead: 'קריאה מורחבת של האלבום',
    trackLongRead: 'קריאה מורחבת של השיר',
    primaryEmotion: 'רגש מרכזי',
    secondaryEmotion: 'רובד משני',
    emotionalIntensity: 'עוצמה רגשית',
    emotionalAxis: 'צירים רגשיים',
    emotionalEvidence: 'עדויות מהמנוע',
    recommendedUse: 'שימוש מומלץ',
    emotionalEngineNote: 'החישוב מבוסס על ז׳אנר, דירוג, השמעות, אלבומים, שירים סמוכים, שנים דומיננטיות והפרופיל המקומי, כאשר הוא קיים.',
    moodLens: 'עדשת מצב הרוח',
    moodConfidence: 'רמת הביטחון בזיהוי',
    moodRitual: 'טקס מוצע',
    albumMoodBody: 'הרובד הזה מתרגם את קריאת האלבום לזהות חזותית: צבע, אווירה ותפקיד ברור בתוך המוזיאון.',
    trackMoodBody: 'הרובד הזה הופך את החזרתיות של השיר לאות חזותי מיידי: איזה מצב הוא מפעיל וכיצד להשתמש בו בצורה מיטבית.',
    moodFilter: 'סינון לפי מצב רוח',
    moodFilterCompactHint: 'אפשר לצמצם את הארכיון',
    moodFilterHint: 'הסינון מציג אמנים, שירים ואלבומים לפי מצב הרוח הדומיננטי. הדירוג נשמר, אך אפשר לנווט בארכיון דרך מצבים רגשיים.',
    allMoods: 'הכול',
    catalogRange: 'טווח הקטלוג הערוך',
    archiveCovers: 'עטיפות מהארכיון',
    visualSignal: 'אות חזותי',
    knownAlbums: 'אלבומים עם הקשר',
    yearsShort: 'שנים',
    sameCountry: 'אותה ארץ מוצא',
    sharedStyle: 'סגנון משותף',
    hasProfile: 'פרופיל זמין',
    topChart: 'השוואת 20 המובילים',
    archivePlays: 'השמעות בארכיון שלך',
    noProfileTitle: 'הביוגרפיה עדיין בהכנה',
    noProfileBody: 'עדיין אין לאמן הזה פרופיל בעריכה מקומית. האפליקציה מציגה את העדויות שכבר קיימות בארכיון, והפרופיל מוכן להשלמה בהמשך.',
    noAlbums: 'לא נמצאו אלבומים של האמן בדירוג האלבומים.',
    noTracks: 'לא נמצאו שירים של האמן בדירוג השירים.',
    noEras: 'האמן עדיין אינו מוביל שנה מלאה בארכיון.',
    selectedHint: 'בחירה באמן תפתח את הפרופיל שלו.',
    released: 'שנת יציאה',
    albumCount: 'אלבומים שזוהו',
    trackCount: 'שירים שזוהו',
    eraCount: 'שנים דומיננטיות',
    albumPlays: 'השמעות אלבומים',
    trackPlays: 'השמעות שירים',
    curatedNote: 'הפרופיל הוא שכבת עריכה מקומית שמשלבת עובדות ציבוריות על הקריירה עם עדויות מהיסטוריית ההאזנה שלך. בהמשך אפשר לחבר אותו ל-Spotify,‏ MusicBrainz או לאמנות שנוצרה באמצעות Claude.',
    lineupTitle: 'הרכב',
    lineupHint: 'חברי הרכב המתועדים ב-MusicBrainz, כולל כלי נגינה ושנות פעילות. נקודות מוארות מסמנות חברים נוכחיים.',
    lineupCurrent: 'נוכחי',
    lineupPast: 'לשעבר',
    lineupSince: (year: string) => `מאז ${year}`,
    lineupSpan: (from: string, to: string) => `${from}–${to}`,
    lineupMore: (count: number) => `עוד ${count} חברי הרכב לאורך ההיסטוריה של הלהקה`,
    officialWebsite: 'האתר הרשמי',
    curatedKnowledgeSummary: (source: string, origin: string, description: string, background: string) =>
      `פרופיל מקומי מאומת ממקור ${source}: ${origin}. ${description} ${background}`,
    wikidataKnowledgeSummary: (id: string, description: string) => `פרופיל ציבורי ${id}: ${description}.`,
    ageLabel: (age: number) => `גיל: ${age}`,
    rolesLabel: 'תפקידים',
    statusLabel: 'סטטוס',
    clearSearch: 'ניקוי החיפוש',
    wholeArchive: 'כל הארכיון',
    countedListensOther: 'השמעות שנספרו · כולל קטגוריית ״אחר״ מפורשת',
    yearlySubtitle: (maxDate?: string | null) => `מדד אחד בכל פעם, בסולם עצמאי${maxDate ? ` · הנתונים נצפו עד ${maxDate}` : ''}.`,
    yearlySummary: (label: string) => `${label} מוצג בנפרד, כדי שנפח ההאזנה לא ישטח את מספר האמנים.`,
    yearLabel: 'שנה',
    yearlyMetricAria: 'המדד בתרשים השנתי',
  },
} as const;

export default function TopHistorico({ data }: TopHistoricoProps) {
  const { tc, t, lang } = useApp();
  const chartAnimation = useChartAnimation();
  const {
    selectedArtistName: globalArtist, setSelectedArtistName,
    selectedAlbumKey: globalAlbum, setSelectedAlbumKey,
    selectedTrackKey: globalTrack, setSelectedTrackKey,
    topSubTab, setTopSubTab
  } = useApp();

  const [tab, setTabState] = useState<TopTab>('artistas');
  const [yearMetric, setYearMetric] = useState<'plays' | 'artistas'>('plays');
  const [search, setSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState<EmotionalMoodKey | 'all'>('all');
  const [moodFilterExpanded, setMoodFilterExpanded] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia
      ? true
      : window.matchMedia('(min-width: 768px)').matches);
  const [mobileDossier, setMobileDossier] = useState<MobileDossierKind | null>(null);
  const mobileDossierTriggerRef = useRef<HTMLElement | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  const closeMobileDossier = useCallback(() => setMobileDossier(null), []);
  const openMobileDossier = useCallback((kind: MobileDossierKind, trigger?: HTMLElement) => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 1279px)').matches) {
      if (trigger) {
        mobileDossierTriggerRef.current = trigger;
      } else if (mobileDossier === null) {
        mobileDossierTriggerRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      }
      setMobileDossier(kind);
    }
  }, [mobileDossier]);

  // Sync local tab state from global topSubTab
  useEffect(() => {
    if (topSubTab === 'artists') setTabState('artistas');
    else if (topSubTab === 'albums') setTabState('albums');
    else if (topSubTab === 'tracks') setTabState('canciones');
    else if (topSubTab === 'genres') setTabState('generos');
    else if (topSubTab === 'years') setTabState('anos');
  }, [topSubTab]);

  useEffect(() => {
    const activeButton = tabListRef.current?.querySelector<HTMLElement>(`[data-top-tab="${tab}"]`);
    activeButton?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'auto' });
  }, [tab]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(min-width: 768px)');
    const syncLayout = () => setMoodFilterExpanded(media.matches);
    syncLayout();
    media.addEventListener('change', syncLayout);
    return () => media.removeEventListener('change', syncLayout);
  }, []);

  const setTab = (t: TopTab) => {
    setMobileDossier(null);
    setTabState(t);
    if (t === 'artistas') setTopSubTab('artists');
    else if (t === 'albums') setTopSubTab('albums');
    else if (t === 'canciones') setTopSubTab('tracks');
    else if (t === 'generos') setTopSubTab('genres');
    else if (t === 'anos') setTopSubTab('years');
  };

  // Initialize global defaults if empty
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!globalArtist && data.top_artists[0]?.name) {
      setSelectedArtistName(data.top_artists[0].name);
    }
    if (!globalAlbum && data.top_albums[0]) {
      setSelectedAlbumKey(albumKey(data.top_albums[0].artist, data.top_albums[0].title));
    }
    if (!globalTrack && data.top_tracks[0]) {
      setSelectedTrackKey(trackKey(data.top_tracks[0].artist, data.top_tracks[0].title));
    }
  }, [data, globalArtist, globalAlbum, globalTrack, setSelectedArtistName, setSelectedAlbumKey, setSelectedTrackKey]);

  const selectedArtistName = globalArtist || (data.top_artists[0]?.name ?? '');
  const selectedAlbumKey = globalAlbum || (data.top_albums[0] ? albumKey(data.top_albums[0].artist, data.top_albums[0].title) : '');
  const selectedTrackKey = globalTrack || (data.top_tracks[0] ? trackKey(data.top_tracks[0].artist, data.top_tracks[0].title) : '');

  const COLORS = [tc.c1, tc.c2, tc.c3, tc.c4, '#fb923c', '#a78bfa', '#34d399', '#f59e0b', '#ec4899', '#6ee7b7'];
  const artistCopy = ARTIST_ATLAS_COPY[lang];
  const moodEntries = Object.values(EMOTIONAL_MOOD_TAXONOMY);
  const locale = localeFor(lang);

  const tabs = [
    { id: 'artistas',  label: t.topHistorico.tabArtists,  icon: MicVocal },
    { id: 'canciones', label: t.topHistorico.tabTracks,   icon: Music2 },
    { id: 'albums',    label: t.topHistorico.tabAlbums,   icon: Disc3 },
    { id: 'generos',   label: t.topHistorico.tabGenres,   icon: BarChart2 },
    { id: 'anos',      label: t.topHistorico.tabYears,    icon: Trophy },
  ] as const;

  const fmtNum = (n: number) => Math.round(n).toLocaleString(locale);
  const fmtList = useCallback((items: string[], max = 4) => items.slice(0, max).join(', '), []);
  // Diacritic-insensitive search: "sigur ros" must find "Sigur Rós", and an
  // NFD-encoded uploaded name must match its NFC twin.
  const searchable = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = searchable(search.trim());

  const artistLookup = useMemo(() =>
    new Map(data.top_artists.map(artist => [artist.name, artist])),
    [data.top_artists]);

  const buildTrackRowMood = useCallback((track: MusicDnaData['top_tracks'][number], index: number): RowMoodProfile => {
    const artist = artistLookup.get(track.artist);
    const moodProfile = buildMusicItemMoodProfile(`${track.genre} ${artist?.genre ?? ''} ${track.artist} ${track.title}`, track.plays, {
      catharsis: index < 10 ? 16 : index < 25 ? 9 : 4,
      energy: track.plays > 500 ? 8 : 2,
    });
    const mood = EMOTIONAL_MOOD_TAXONOMY[moodProfile.moodKey];

    return {
      moodKey: moodProfile.moodKey,
      confidence: moodProfile.confidence,
      color: mood.color,
    };
  }, [artistLookup]);

  const buildAlbumRowMood = useCallback((
    album: MusicDnaData['top_albums'][number],
    index: number,
    profile: ReturnType<typeof getArtistEnrichment>,
    albumMeta: ReturnType<typeof getAlbumEnrichment>,
  ): RowMoodProfile => {
    const artist = artistLookup.get(album.artist);
    const moodProfile = buildMusicItemMoodProfile([
      artist?.genre,
      profile?.signature_moods.en.join(' '),
      profile?.signature_moods.es.join(' '),
      profile?.signature_moods.he.join(' '),
      albumMeta?.description.en,
      albumMeta?.description.es,
      albumMeta?.description.he,
      album.artist,
      album.title,
    ].filter(Boolean).join(' '), album.plays, {
      focus: 10,
      nostalgia: albumMeta?.year && albumMeta.year < 2018 ? 12 : 4,
      catharsis: Math.max(0, 10 - (index + 1)),
    });
    const mood = EMOTIONAL_MOOD_TAXONOMY[moodProfile.moodKey];

    return {
      moodKey: moodProfile.moodKey,
      confidence: moodProfile.confidence,
      color: mood.color,
    };
  }, [artistLookup]);

  const artistMoodProfiles = useMemo(() => {
    const map = new Map<string, RowMoodProfile>();
    data.top_artists.forEach(a => {
      const profile = buildArtistMoodProfile(a);
      const mood = EMOTIONAL_MOOD_TAXONOMY[profile.moodKey];
      map.set(a.name, {
        moodKey: profile.moodKey,
        confidence: profile.confidence,
        color: mood.color,
      });
    });
    return map;
  }, [data.top_artists]);

  const artistRanks = useMemo(() =>
    new Map(data.top_artists.map((artist, index) => [artist.name, index + 1])),
    [data.top_artists]);

  const trackRowMoods = useMemo(() =>
    new Map(data.top_tracks.map((track, index) => [trackKey(track.artist, track.title), buildTrackRowMood(track, index)])),
    [buildTrackRowMood, data.top_tracks]);

  const trackRanks = useMemo(() =>
    new Map(data.top_tracks.map((track, index) => [trackKey(track.artist, track.title), index + 1])),
    [data.top_tracks]);

  const albumRowMoods = useMemo(() =>
    new Map(data.top_albums.map((album, index) => {
      const profile = getArtistEnrichment(album.artist);
      return [
        albumKey(album.artist, album.title),
        buildAlbumRowMood(album, index, profile, getAlbumEnrichment(profile, album.title)),
      ];
    })),
    [buildAlbumRowMood, data.top_albums]);

  const albumRanks = useMemo(() =>
    new Map(data.top_albums.map((album, index) => [albumKey(album.artist, album.title), index + 1])),
    [data.top_albums]);

  /* ── Filtered lists ── */
  const filteredArtists = useMemo(() =>
    data.top_artists.filter(a => {
      const matchesSearch = !q || searchable(a.name).includes(q) || searchable(a.genre).includes(q);
      const matchesMood = selectedMood === 'all' || artistMoodProfiles.get(a.name)?.moodKey === selectedMood;
      return matchesSearch && matchesMood;
    }),
    [artistMoodProfiles, data.top_artists, q, selectedMood]);

  const filteredTracks = useMemo(() =>
    data.top_tracks.filter(track => {
      const matchesSearch = !q || searchable(track.title).includes(q) || searchable(track.artist).includes(q);
      const matchesMood = selectedMood === 'all' || trackRowMoods.get(trackKey(track.artist, track.title))?.moodKey === selectedMood;
      return matchesSearch && matchesMood;
    }),
    [data.top_tracks, q, selectedMood, trackRowMoods]);

  const filteredAlbums = useMemo(() =>
    data.top_albums.filter(album => {
      const matchesSearch = !q || searchable(album.title).includes(q) || searchable(album.artist).includes(q);
      const matchesMood = selectedMood === 'all'
        || albumRowMoods.get(albumKey(album.artist, album.title))?.moodKey === selectedMood;
      return matchesSearch && matchesMood;
    }),
    [albumRowMoods, data.top_albums, q, selectedMood]);

  const selectedTrack = useMemo(() =>
    filteredTracks.find(track => trackKey(track.artist, track.title) === selectedTrackKey) ?? filteredTracks[0],
    [filteredTracks, selectedTrackKey]);

  const selectedTrackRank = useMemo(() =>
    selectedTrack
      ? data.top_tracks.findIndex(track => trackKey(track.artist, track.title) === trackKey(selectedTrack.artist, selectedTrack.title)) + 1
      : 0,
    [data.top_tracks, selectedTrack]);

  const selectedTrackArtist = useMemo(() =>
    selectedTrack ? artistLookup.get(selectedTrack.artist) : undefined,
    [artistLookup, selectedTrack]);

  const selectedTrackProfile = useMemo(() =>
    selectedTrack ? getArtistEnrichment(selectedTrack.artist) : undefined,
    [selectedTrack]);

  const selectedTrackArtistTracks = useMemo(() =>
    selectedTrack ? getArtistArchiveTracks(data, selectedTrack.artist, selectedTrackProfile) : [],
    [data, selectedTrack, selectedTrackProfile]);

  const selectedTrackArtistAlbums = useMemo(() =>
    selectedTrack ? getArtistArchiveAlbums(data, selectedTrack.artist, selectedTrackProfile) : [],
    [data, selectedTrack, selectedTrackProfile]);

  const selectedTrackArtistEras = useMemo(() =>
    selectedTrack ? getArtistEraSignals(data, selectedTrack.artist, selectedTrackProfile) : [],
    [data, selectedTrack, selectedTrackProfile]);

  const selectedTrackEvidence = summarizeArtistEvidence(
    selectedTrackArtistAlbums,
    selectedTrackArtistTracks,
    selectedTrackArtistEras,
    fmtNum,
  );

  const selectedTrackMediaProfile = useMemo(() =>
    selectedTrack
      ? buildArtistMediaProfile(selectedTrackProfile?.name ?? selectedTrack.artist, selectedTrack, selectedTrackArtistAlbums[0])
      : undefined,
    [selectedTrack, selectedTrackArtistAlbums, selectedTrackProfile]);

  const selectedTrackReplay = (() => {
    if (!selectedTrackRank || selectedTrackRank <= 3) {
      return { label: artistCopy.trackReplayCore, body: artistCopy.trackReplayCoreBody, color: tc.c1 };
    }
    if (selectedTrackRank <= 10) {
      return { label: artistCopy.trackReplayHigh, body: artistCopy.trackReplayHighBody, color: tc.c2 };
    }
    if (selectedTrackRank <= 25) {
      return { label: artistCopy.trackReplayMid, body: artistCopy.trackReplayMidBody, color: tc.c3 };
    }
    return { label: artistCopy.trackReplayDeep, body: artistCopy.trackReplayDeepBody, color: tc.c4 };
  })();

  const selectedTrackEmotionBody = (() => {
    const genreSignal = selectedTrack?.genre.toLowerCase() ?? '';
    if (/(blackgaze|metalcore|post-hardcore|death|metal|hardcore|djenta|djent)/.test(genreSignal)) {
      return artistCopy.trackEmotionHeavy;
    }
    if (/(synth|wave|electronic|retro|industrial|dance)/.test(genreSignal)) {
      return artistCopy.trackEmotionSynth;
    }
    if (/(emo|pop punk|post emo|sad|ambient|shoegaze)/.test(genreSignal)) {
      return artistCopy.trackEmotionEmo;
    }
    if (/(pop|rap|hip hop|r&b|funk|indie)/.test(genreSignal)) {
      return artistCopy.trackEmotionPop;
    }
    return artistCopy.trackEmotionDefault;
  })();

  const selectedTrackReading = useMemo(() =>
    selectedTrack
      ? buildTrackEmotionalReading({
        track: selectedTrack,
        artist: selectedTrackArtist,
        profile: selectedTrackProfile,
        rank: selectedTrackRank,
        artistTracks: selectedTrackArtistTracks,
        artistAlbums: selectedTrackArtistAlbums,
        eras: selectedTrackArtistEras,
      })
      : undefined,
    [
      selectedTrack,
      selectedTrackArtist,
      selectedTrackProfile,
      selectedTrackRank,
      selectedTrackArtistTracks,
      selectedTrackArtistAlbums,
      selectedTrackArtistEras,
    ]);

  const selectedTrackMoodColor = selectedTrackReading
    ? EMOTIONAL_MOOD_TAXONOMY[selectedTrackReading.moodKey].color
    : tc.c2;

  const selectedAlbum = useMemo(() =>
    filteredAlbums.find(album => albumKey(album.artist, album.title) === selectedAlbumKey) ?? filteredAlbums[0],
    [filteredAlbums, selectedAlbumKey]);

  const selectedAlbumProfile = useMemo(() =>
    selectedAlbum ? getArtistEnrichment(selectedAlbum.artist) : undefined,
    [selectedAlbum]);

  const selectedAlbumMeta = useMemo(() =>
    selectedAlbum ? getAlbumEnrichment(selectedAlbumProfile, selectedAlbum.title) : undefined,
    [selectedAlbum, selectedAlbumProfile]);

  const selectedAlbumRank = useMemo(() =>
    selectedAlbum ? data.top_albums.findIndex(album => albumKey(album.artist, album.title) === albumKey(selectedAlbum.artist, selectedAlbum.title)) + 1 : 0,
    [data.top_albums, selectedAlbum]);

  const selectedAlbumArtist = useMemo(() =>
    selectedAlbum ? artistLookup.get(selectedAlbum.artist) : undefined,
    [artistLookup, selectedAlbum]);

  const selectedAlbumArtistTracks = useMemo(() =>
    selectedAlbum ? getArtistArchiveTracks(data, selectedAlbum.artist, selectedAlbumProfile) : [],
    [data, selectedAlbum, selectedAlbumProfile]);

  const selectedAlbumSiblingAlbums = useMemo(() =>
    selectedAlbum
      ? getArtistArchiveAlbums(data, selectedAlbum.artist, selectedAlbumProfile)
        .filter(album => albumKey(album.artist, album.title) !== albumKey(selectedAlbum.artist, selectedAlbum.title))
      : [],
    [data, selectedAlbum, selectedAlbumProfile]);

  const selectedAlbumCatalogIndex = selectedAlbumProfile && selectedAlbumMeta
    ? selectedAlbumProfile.key_albums.findIndex(album => album.title === selectedAlbumMeta.title)
    : -1;

  const selectedAlbumCatalogRole = (() => {
    if (!selectedAlbumProfile || !selectedAlbumMeta || selectedAlbumCatalogIndex < 0) return artistCopy.unknownCatalogRole;
    if (selectedAlbumCatalogIndex === 0) return artistCopy.earlyCatalogRole;
    if (selectedAlbumCatalogIndex === selectedAlbumProfile.key_albums.length - 1) return artistCopy.lateCatalogRole;
    return artistCopy.middleCatalogRole;
  })();

  const selectedAlbumMediaProfile = useMemo(() =>
    selectedAlbum
      ? buildArtistMediaProfile(selectedAlbumProfile?.name ?? selectedAlbum.artist, selectedAlbumArtistTracks[0], selectedAlbum)
      : undefined,
    [selectedAlbum, selectedAlbumArtistTracks, selectedAlbumProfile]);

  const selectedAlbumReading = useMemo(() =>
    selectedAlbum
      ? buildAlbumEmotionalReading({
        album: selectedAlbum,
        artist: selectedAlbumArtist,
        profile: selectedAlbumProfile,
        albumMeta: selectedAlbumMeta,
        rank: selectedAlbumRank,
        artistTracks: selectedAlbumArtistTracks,
        catalogIndex: selectedAlbumCatalogIndex,
      })
      : undefined,
    [
      selectedAlbum,
      selectedAlbumArtist,
      selectedAlbumProfile,
      selectedAlbumMeta,
      selectedAlbumRank,
      selectedAlbumArtistTracks,
      selectedAlbumCatalogIndex,
    ]);

  const selectedAlbumMoodColor = selectedAlbumReading
    ? EMOTIONAL_MOOD_TAXONOMY[selectedAlbumReading.moodKey].color
    : tc.c3;

  const selectedArtist = useMemo(() =>
    filteredArtists.find(a => a.name === selectedArtistName) ?? filteredArtists[0],
    [filteredArtists, selectedArtistName]);

  const selectedProfile = useMemo(() =>
    selectedArtist ? getArtistEnrichment(selectedArtist.name) : undefined,
    [selectedArtist]);

  const selectedKnowledge = useMemo(() =>
    selectedArtist ? getOfflineArtistKnowledge(selectedArtist.name) : undefined,
    [selectedArtist]);

  const selectedLineup = useMemo(() =>
    selectedArtist ? getArtistBandMembers(selectedArtist.name) : [],
    [selectedArtist]);

  const selectedArtistMood = useMemo(() =>
    selectedArtist ? buildArtistMoodProfile(selectedArtist) : null,
    [selectedArtist]);
  const selectedMoodColor = selectedArtistMood
    ? EMOTIONAL_MOOD_TAXONOMY[selectedArtistMood.moodKey].color
    : null;

  const selectedArtistAlbums = useMemo(() =>
    selectedArtist ? getArtistArchiveAlbums(data, selectedArtist.name, selectedProfile) : [],
    [data, selectedArtist, selectedProfile]);

  const selectedArtistTracks = useMemo(() =>
    selectedArtist ? getArtistArchiveTracks(data, selectedArtist.name, selectedProfile) : [],
    [data, selectedArtist, selectedProfile]);

  const selectedArtistEras = useMemo(() =>
    selectedArtist ? getArtistEraSignals(data, selectedArtist.name, selectedProfile) : [],
    [data, selectedArtist, selectedProfile]);

  const selectedEvidence = summarizeArtistEvidence(selectedArtistAlbums, selectedArtistTracks, selectedArtistEras, fmtNum);
  const selectedCatalogStats = getArtistCatalogStats(selectedProfile);

  const selectedRelatedArtists = useMemo(() =>
    selectedArtist ? getRelatedArchiveArtists(data, selectedArtist.name, selectedProfile) : [],
    [data, selectedArtist, selectedProfile]);

  const selectedMediaProfile = useMemo(() =>
    selectedArtist
      ? buildArtistMediaProfile(selectedProfile?.name ?? selectedArtist.name, selectedArtistTracks[0], selectedArtistAlbums[0])
      : undefined,
    [selectedArtist, selectedArtistAlbums, selectedArtistTracks, selectedProfile]);

  const selectedArtistReading = useMemo(() =>
    selectedArtist
      ? buildArtistEmotionalReading({
        artist: selectedArtist,
        profile: selectedProfile,
        albums: selectedArtistAlbums,
        tracks: selectedArtistTracks,
        eras: selectedArtistEras,
      })
      : undefined,
    [selectedArtist, selectedProfile, selectedArtistAlbums, selectedArtistTracks, selectedArtistEras]);

  const selectedDisplayCountry = selectedProfile?.country[lang] ?? selectedArtist?.country ?? '';
  const selectedFlagCountry = selectedProfile?.country.en ?? selectedArtist?.country ?? '';

  const selectedKnowledgeSummary = useMemo(() => {
    if (!selectedKnowledge) return undefined;

    const wd = selectedKnowledge.wikidata;
    const curated = selectedKnowledge.curated;
    const mb = selectedKnowledge.musicbrainz;
    const description = curated
      ? artistCopy.curatedKnowledgeSummary(
        curated.sourceName,
        curated.origin,
        curated.description,
        curated.background,
      )
      : wd?.description
        ? artistCopy.wikidataKnowledgeSummary(wd.id, wd.description)
        : mb?.disambiguation
          ? `${mb.disambiguation}.`
          : artistCopy.noProfileBody;
    const facts = [
      curated?.origin ?? wd?.formationPlaces?.[0] ?? mb?.beginArea,
      curated?.country ?? wd?.countries?.[0] ?? mb?.area ?? selectedKnowledge.archive.country,
      wd?.genres?.length ? fmtList(wd.genres, 5) : '',
      wd?.recordLabels?.length ? fmtList(wd.recordLabels, 3) : '',
      wd?.occupations?.length ? fmtList(wd.occupations, 3) : '',
      selectedKnowledge.releaseGroups.length ? `${selectedKnowledge.releaseGroups.length} ${artistCopy.knownAlbums}` : '',
    ].filter(Boolean);
    const members = [
      ...(wd?.members ?? []),
      ...(wd?.instruments ?? []),
    ].filter(Boolean);
    const media = getCuratedArtistMedia(selectedKnowledge.name);
    const rawLinks = [
      ...(curated?.sourceUrls ?? []),
      ...(wd?.officialWebsites ?? []),
      ...(wd?.url ? [wd.url] : []),
      ...(media?.spotifyArtistUrl ? [media.spotifyArtistUrl] : []),
      ...(media?.youtubeChannelUrl ? [media.youtubeChannelUrl] : []),
      ...(media?.officialSiteUrl ? [media.officialSiteUrl] : []),
      `https://bandcamp.com/search?q=${encodeURIComponent(selectedKnowledge.name)}`,
      `https://www.discogs.com/search/?q=${encodeURIComponent(selectedKnowledge.name)}&type=artist`
    ];
    // Deduplicate and filter links
    const links = Array.from(new Set(rawLinks)).filter((url, idx, self) => {
      const isSearchBc = url.includes('bandcamp.com/search');
      if (isSearchBc && self.some(s => s.includes('bandcamp.com') && !s.includes('search'))) {
        return false;
      }
      return true;
    });

    return { description, facts, members, links };
  }, [artistCopy, fmtList, selectedKnowledge]);

  const selectedListeningPath = (() => {
    if (!selectedArtist) return [];

    const keyAlbums = selectedProfile?.key_albums ?? [];
    const firstKeyAlbum = keyAlbums[0];
    const middleKeyAlbum = keyAlbums.length ? keyAlbums[Math.floor((keyAlbums.length - 1) / 2)] : undefined;
    const latestKeyAlbum = keyAlbums.length ? keyAlbums[keyAlbums.length - 1] : undefined;
    const topTrack = selectedArtistTracks[0];
    const topAlbum = selectedArtistAlbums[0];

    const path: Array<{
      label: string;
      title: string;
      meta: string;
      body: string;
      icon: React.ElementType;
      color: string;
    }> = [];

    const anchorTitle = topTrack?.title ?? topAlbum?.title ?? firstKeyAlbum?.title;
    if (anchorTitle) {
      path.push({
        label: artistCopy.archiveAnchor,
        title: anchorTitle,
        meta: topTrack
          ? `${artistCopy.trackLabel} · ${topTrack.genre} · ${fmtNum(topTrack.plays)} ${artistCopy.archivePlays}`
          : topAlbum
            ? `${artistCopy.albumLabel} · ${fmtNum(topAlbum.plays)} ${artistCopy.archivePlays}`
            : `${artistCopy.curatedAlbumLabel} · ${firstKeyAlbum?.year}`,
        body: artistCopy.archiveAnchorBody,
        icon: ListMusic,
        color: tc.c1,
      });
    }

    if (middleKeyAlbum && middleKeyAlbum.title !== firstKeyAlbum?.title) {
      path.push({
        label: artistCopy.evolutionPivot,
        title: middleKeyAlbum.title,
        meta: `${artistCopy.curatedAlbumLabel} · ${middleKeyAlbum.year}`,
        body: middleKeyAlbum.description[lang] || artistCopy.evolutionPivotBody,
        icon: Clock,
        color: tc.c2,
      });
    }

    if (latestKeyAlbum && latestKeyAlbum.title !== firstKeyAlbum?.title && latestKeyAlbum.title !== middleKeyAlbum?.title) {
      path.push({
        label: artistCopy.currentChapter,
        title: latestKeyAlbum.title,
        meta: `${artistCopy.curatedAlbumLabel} · ${latestKeyAlbum.year}`,
        body: latestKeyAlbum.description[lang] || artistCopy.currentChapterBody,
        icon: Disc3,
        color: tc.c3,
      });
    }

    return path;
  })();

  /* ── Charts data ── */
  // Memoized: local search state re-renders this component on every keystroke,
  // and none of these depend on the search box.
  const yearCoverage = useMemo(
    () => getDatasetCoverage({ daily_plays: data.daily_plays }),
    [data.daily_plays],
  );
  const yearlyData = useMemo(() =>
    data.yearly_eras.map(e => ({
      year: yearCoverage.isPartialYear && e.year === yearCoverage.maxYear ? `${e.year} YTD` : String(e.year),
      plays: e.plays,
      artistas: e.unique_artists,
    })),
    [data.yearly_eras, yearCoverage.isPartialYear, yearCoverage.maxYear]);
  const selectedYearMetric = yearMetric === 'plays'
    ? { label: t.topHistorico.playsLegend, color: tc.c1 }
    : { label: t.topHistorico.uniqueArtistsLegend, color: tc.c3 };

  const genreDistribution = useMemo(
    () => buildGenreDistribution(data.top_genres, data.core_metrics.total_plays, 15),
    [data.core_metrics.total_plays, data.top_genres],
  );
  const genreData = useMemo(
    () => genreDistribution.rows.map(row => ({
      ...row,
      genre: row.name,
      name: localizeGenreName(row.name, lang),
    })),
    [genreDistribution.rows, lang],
  );

  /* ── Treemap ── */
  const treemapChildren = useMemo(
    () => buildGenreDistribution(data.top_genres, data.core_metrics.total_plays, 10).rows
      .map(row => ({
        ...row,
        genre: row.name,
        name: localizeGenreName(row.name, lang),
        size: row.plays,
      })),
    [data.core_metrics.total_plays, data.top_genres, lang],
  );
  const TREEMAP_COLORS = COLORS;

  const CustomTreemapContent = ({ x, y, width, height, index, name, plays }: any) => {
    if (!plays || width < 40 || height < 25) return null;
    const color = TREEMAP_COLORS[index % TREEMAP_COLORS.length];
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={8} ry={8}
          style={{ fill: `${color}22`, stroke: `${color}55`, strokeWidth: 1 }} />
        {width > 55 && (
          <text x={x + 8} y={y + 18} fontSize={10} fontFamily="monospace" fontWeight="bold"
            fill={color}>{name}</text>
        )}
        {width > 55 && height > 38 && (
          <text x={x + 8} y={y + 32} fontSize={9} fontFamily="monospace"
            fill="#9ca3af">{plays.toLocaleString(locale)}</text>
        )}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="nova-chart-tooltip rounded-xl px-4 py-3 text-xs font-mono shadow-lg"
        style={{ border: `1px solid ${tc.c1}40` }}>
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color ?? tc.c1 }}>
            {p.name}: <span className="nova-chart-tooltip__value">{Number(p.value).toLocaleString(locale)}</span>
          </p>
        ))}
      </div>
    );
  };

  const ListRow = ({
    rank, main, sub, plays, color, avatarName, flagCountry, onClick, active = false, coverTitle, coverKind, moodColor, moodKey, moodConfidence, ariaLabel,
  }: {
    rank: number;
    main: string;
    sub?: string;
    plays: number;
    color: string;
    avatarName?: string;
    flagCountry?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    active?: boolean;
    /** When set (with coverKind), show album/track artwork instead of the artist photo. */
    coverTitle?: string;
    coverKind?: 'album' | 'track';
    /** Emotional-engine mood color: renders a glowing identity dot next to the name. */
    moodColor?: string;
    /** Emotional-engine mood identity: renders the canonical bilingual mood badge. */
    moodKey?: EmotionalMoodKey;
    moodConfidence?: number;
    ariaLabel?: string;
  }) => {
    const rowBody = (
      <>
        <div className="flex items-center gap-3 truncate min-w-0">
          <span className="type-metric w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-xs font-black"
            style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>
            {rank}
          </span>
          {coverTitle && coverKind && avatarName
            ? <CoverArt artist={avatarName} title={coverTitle} kind={coverKind} size={36} />
            : avatarName && <ArtistAvatar name={avatarName} size={32} tooltip={false} />}
          <div className="truncate" dir="auto">
            <p className="type-meta font-bold text-white truncate flex items-center gap-1.5" dir="auto">
              {moodColor && (
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: moodColor, boxShadow: `0 0 6px ${moodColor}` }} />
              )}
              {main}
            </p>
            {sub && (
              <p className="type-meta text-gray-400 truncate flex items-center gap-1.5">
                {flagCountry && <FlagArt country={flagCountry} size={15} />}
                {moodKey && (
                  <MoodBadge moodKey={moodKey} confidence={moodConfidence} size="sm" className="shrink-0" />
                )}
                <span className="truncate" dir="auto">{sub}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ms-3">
          <span className="type-metric text-xs font-bold px-3 py-1 rounded-full"
            style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
            {fmtNum(plays)}
          </span>
          {onClick && (
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors rtl:rotate-180" />
          )}
        </div>
      </>
    );

    const rowClassName = [
      'flex w-full items-center justify-between p-3 rounded-2xl transition-all group text-start',
      onClick ? 'nova-surface--interactive hover:bg-white/5 cursor-pointer' : 'hover:bg-white/3',
      active ? 'bg-white/7 shadow-lg' : '',
    ].join(' ');

    const rowStyle = {
      border: `1px solid ${active ? `${color}66` : 'rgba(255,255,255,0.04)'}`,
      boxShadow: active ? `0 0 24px ${color}14` : undefined,
    };

    if (onClick) {
      return (
        <motion.button type="button" variants={itemVariants} onClick={onClick}
          aria-label={ariaLabel ?? [main, sub, `${fmtNum(plays)} ${t.topHistorico.playsLegend}`].filter(Boolean).join(' - ')}
          className={rowClassName} style={rowStyle}>
          {rowBody}
        </motion.button>
      );
    }

    return (
      <motion.div variants={itemVariants}
        className={rowClassName}
        style={rowStyle}>
        {rowBody}
      </motion.div>
    );
  };

  const selectedMoodLabel = selectedMood === 'all'
    ? artistCopy.allMoods
    : EMOTIONAL_MOOD_TAXONOMY[selectedMood].shortLabel[lang];

  const MoodButtons = () => (
    <div
      className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible"
      role="group"
      aria-label={artistCopy.moodFilter}
    >
      <button
        type="button"
        onClick={() => setSelectedMood('all')}
        aria-pressed={selectedMood === 'all'}
        className="type-kicker nova-surface--interactive inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 transition-all"
        style={selectedMood === 'all'
          ? { color: '#020617', backgroundColor: tc.c1, borderColor: tc.c1, boxShadow: `0 0 18px ${tc.c1}28` }
          : { color: tc.c1, backgroundColor: `${tc.c1}10`, borderColor: `${tc.c1}30` }}>
        <Sparkles className="h-3.5 w-3.5" />
        {artistCopy.allMoods}
      </button>
      {moodEntries.map(mood => {
        const Icon = MOOD_ICONS[mood.icon] ?? Sparkles;
        const active = selectedMood === mood.key;
        return (
          <button
            key={mood.key}
            type="button"
            onClick={() => setSelectedMood(active ? 'all' : mood.key)}
            aria-pressed={active}
            className="type-kicker nova-surface--interactive inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 transition-all"
            style={active
              ? { color: '#020617', backgroundColor: mood.color, borderColor: mood.color, boxShadow: `0 0 18px ${mood.color}32` }
              : { color: mood.color, backgroundColor: `${mood.color}10`, borderColor: `${mood.color}32` }}
            title={mood.description[lang]}
          >
            <Icon className="h-3.5 w-3.5" />
            {mood.shortLabel[lang]}
          </button>
        );
      })}
    </div>
  );

  const MoodFilterBar = () => (
    <details
      open={moodFilterExpanded}
      onToggle={event => {
        if (typeof window === 'undefined' || !window.matchMedia?.('(min-width: 768px)').matches) {
          setMoodFilterExpanded(event.currentTarget.open);
        }
      }}
      className="nova-surface nova-surface--utility group relative overflow-hidden rounded-2xl"
    >
      <summary
        aria-label={`${artistCopy.moodFilter}: ${selectedMoodLabel}`}
        className="nova-surface--interactive flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 md:hidden [&::-webkit-details-marker]:hidden"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
            style={{ color: tc.c1, backgroundColor: `${tc.c1}16`, border: `1px solid ${tc.c1}35` }}>
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="type-kicker block" style={{ color: tc.c1 }}>{selectedMoodLabel}</span>
            <span className="type-meta block truncate text-gray-500">{artistCopy.moodFilterCompactHint}</span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-90" />
      </summary>
      <div className="relative border-t border-white/5 px-3 pb-3 pt-3 md:block md:border-0 md:p-3">
        <div className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(circle at 8% 10%, ${tc.c1}18, transparent 28%), radial-gradient(circle at 90% 10%, ${tc.c3}14, transparent 26%)`,
          }} />
        <div className="relative z-10 flex flex-col gap-3">
          <div className="hidden max-w-3xl items-start gap-3 md:flex">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
              style={{ color: tc.c1, backgroundColor: `${tc.c1}16`, border: `1px solid ${tc.c1}35` }}>
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="type-kicker" style={{ color: tc.c1 }}>{artistCopy.moodFilter}</h3>
              <p className="type-meta mt-1 max-w-4xl text-gray-500">{artistCopy.moodFilterHint}</p>
            </div>
          </div>
          <p className="type-meta text-gray-500 md:hidden">{artistCopy.moodFilterHint}</p>
          <MoodButtons />
        </div>
      </div>
    </details>
  );

  const InfoBlock = ({ title, body, icon: Icon, color }: { title: string; body: string; icon: React.ElementType; color: string }) => (
    <div className="rounded-2xl p-4 bg-white/[0.035] border border-white/8">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <h4 className="type-kicker" style={{ color }}>
          {title}
        </h4>
      </div>
      <p className="type-body text-gray-300">{body}</p>
    </div>
  );

  const EvidencePill = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <div className="rounded-2xl bg-white/[0.035] border border-white/8 p-3 min-h-[76px]">
      <p className="type-meta text-gray-500 mb-1">{label}</p>
      <p className="type-metric text-lg font-black text-white" style={{ color }}>{value}</p>
    </div>
  );

  const EmotionalEnginePanel = ({
    reading,
    title,
    color,
  }: {
    reading?: EmotionalEngineReading;
    title: string;
    color: string;
  }) => {
    if (!reading) return null;

    const axisEntries = Object.entries(reading.axis) as Array<[keyof typeof reading.axis, number]>;

    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 md:p-5 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background: `radial-gradient(circle at 12% 12%, ${color}22, transparent 34%), radial-gradient(circle at 86% 16%, ${tc.c4}18, transparent 30%)`,
          }} />
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color }} />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color }}>
                  {artistCopy.emotionalEngine}
                </h3>
              </div>
              <p className="text-lg md:text-xl font-black text-white mt-1">{title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-2 max-w-3xl">
                {artistCopy.emotionalEngineNote}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left min-w-[220px]">
              <EvidencePill label={artistCopy.primaryEmotion} value={reading.primaryEmotion[lang]} color={color} />
              <EvidencePill label={artistCopy.secondaryEmotion} value={reading.secondaryEmotion[lang]} color={tc.c3} />
              <EvidencePill label={artistCopy.emotionalIntensity} value={reading.intensityLabel[lang]} color={tc.c4} />
            </div>
          </div>

          <p className="text-sm md:text-[15px] text-gray-300 leading-relaxed">
            {reading.longNarrative[lang]}
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)] gap-4">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4" style={{ color }} />
                <h4 className="text-[11px] font-mono uppercase tracking-widest font-bold" style={{ color }}>
                  {artistCopy.emotionalAxis}
                </h4>
              </div>
              <div className="space-y-2.5">
                {axisEntries.map(([axis, value], index) => {
                  const axisColor = COLORS[index % COLORS.length];
                  return (
                    <div key={axis}>
                      <div className="flex items-center justify-between gap-3 text-[11px] font-mono mb-1">
                        <span className="uppercase tracking-widest text-gray-400">{emotionalAxisLabels[axis][lang]}</span>
                        <span className="font-black" style={{ color: axisColor }}>{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: axisColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4" style={{ color: tc.c4 }} />
                <h4 className="text-[11px] font-mono uppercase tracking-widest font-bold" style={{ color: tc.c4 }}>
                  {artistCopy.emotionalEvidence}
                </h4>
              </div>
              <ul className="space-y-2">
                {reading.evidence[lang].map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2 text-xs text-gray-400 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                <p className="text-[10px] font-mono uppercase tracking-widest font-bold mb-2" style={{ color: tc.c2 }}>
                  {artistCopy.recommendedUse}
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">{reading.listeningUse[lang]}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MoodInsightCard = ({
    reading,
    body,
    accent,
  }: {
    reading?: EmotionalEngineReading;
    body: string;
    accent: string;
  }) => {
    if (!reading) return null;

    const mood = EMOTIONAL_MOOD_TAXONOMY[reading.moodKey];
    const Icon = MOOD_ICONS[mood.icon] ?? Sparkles;

    return (
      <div className="relative overflow-hidden rounded-3xl border bg-white/[0.025] p-4 md:p-5"
        style={{ borderColor: `${mood.color}35`, boxShadow: `0 0 24px ${mood.color}12` }}>
        <div className="absolute inset-0 pointer-events-none opacity-75"
          style={{
            background: `radial-gradient(circle at 10% 10%, ${mood.color}24, transparent 36%), radial-gradient(circle at 92% 12%, ${accent}16, transparent 30%)`,
          }} />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(220px,0.42fr)] gap-4 items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ color: mood.color, backgroundColor: `${mood.color}18`, border: `1px solid ${mood.color}40` }}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: mood.color }}>
                  {artistCopy.moodLens}
                </p>
                <p className="text-lg font-black text-white leading-tight">{mood.title[lang]}</p>
              </div>
              <MoodBadge moodKey={reading.moodKey} confidence={reading.moodConfidence} />
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{body}</p>
            <p className="text-xs text-gray-500 leading-relaxed mt-3">{mood.description[lang]}</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/25 p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                {artistCopy.moodConfidence}
              </p>
              <span className="text-sm font-mono font-black" style={{ color: mood.color }}>
                {Math.round(reading.moodConfidence)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/8 overflow-hidden mb-4">
              <div className="h-full rounded-full"
                style={{ width: `${reading.moodConfidence}%`, backgroundColor: mood.color, boxShadow: `0 0 12px ${mood.color}` }} />
            </div>
            <p className="text-[10px] font-mono font-black uppercase tracking-widest mb-2" style={{ color: accent }}>
              {artistCopy.moodRitual}
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">{mood.ritual[lang]}</p>
          </div>
        </div>
      </div>
    );
  };

  const TimelineAlbum = ({ album, index }: { album: NonNullable<typeof selectedProfile>['key_albums'][number]; index: number }) => {
    const archivedAlbum = selectedArtistAlbums.find(a => getAlbumEnrichment(selectedProfile, a.title)?.title === album.title);
    const color = COLORS[index % COLORS.length];
    const albumArtist = archivedAlbum?.artist ?? selectedArtist?.name ?? selectedProfile?.name ?? '';
    const content = (
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <CoverArt artist={albumArtist} title={album.title} kind="album" size={58} className="rounded-2xl" />
          <span className="absolute -right-2 -top-2 rounded-lg px-1.5 py-0.5 text-[9px] font-mono font-black"
            style={{ color: '#020617', backgroundColor: color }}>
            {album.year}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white">{album.title}</h4>
            {archivedAlbum && (
              <span className="text-[9px] font-mono font-black uppercase tracking-widest rounded-full px-2 py-0.5"
                style={{ color: tc.c1, backgroundColor: `${tc.c1}15`, border: `1px solid ${tc.c1}30` }}>
                {fmtNum(archivedAlbum.plays)} {artistCopy.archivePlays}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mt-2">{album.description[lang]}</p>
          {archivedAlbum && (
            <p className="mt-3 text-[10px] font-mono font-black uppercase tracking-widest" style={{ color }}>
              {artistCopy.openAlbumDossier}
            </p>
          )}
        </div>
      </div>
    );

    return (
      <div className="relative pl-6 pb-5 last:pb-0">
        <div className="absolute left-[5px] top-2 bottom-0 w-px bg-white/10" />
        <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2"
          style={{ borderColor: color, backgroundColor: '#07101f', boxShadow: `0 0 14px ${color}55` }} />
        {archivedAlbum ? (
          <button
            type="button"
            onClick={() => {
              setSelectedAlbumKey(albumKey(archivedAlbum.artist, archivedAlbum.title));
              setTab('albums');
              openMobileDossier('album');
            }}
            className="w-full rounded-2xl border border-white/8 bg-white/[0.035] p-3 text-left transition-all hover:bg-white/[0.06]"
            style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${color}12` }}
          >
            {content}
          </button>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
            {content}
          </div>
        )}
      </div>
    );
  };

  const TrackDossier = () => {
    if (!selectedTrack) {
      return (
        <div className="nova-surface nova-surface--analysis p-6 rounded-3xl">
          <p className="type-body text-gray-400">{artistCopy.noTrackSelected}</p>
        </div>
      );
    }

    const trackArtistName = selectedTrackProfile?.name ?? selectedTrack.artist;
    const trackDisplayCountry = selectedTrackProfile?.country[lang] ?? selectedTrackArtist?.country ?? '';
    const trackFlagCountry = selectedTrackProfile?.country.en ?? selectedTrackArtist?.country ?? '';

    return (
      <div className="nova-surface nova-surface--analysis p-6 rounded-3xl space-y-6">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="type-kicker" style={{ color: tc.c2 }}>
            {artistCopy.trackDossier}
          </h3>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-5 md:p-6">
          <div className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              background: `radial-gradient(circle at 12% 18%, ${selectedTrackMoodColor}28, transparent 34%), radial-gradient(circle at 88% 8%, ${tc.c2}18, transparent 30%), linear-gradient(135deg, ${selectedTrackMoodColor}08, ${tc.c2}06 45%, transparent)`,
            }} />
          <div className="relative z-10 flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-3 rounded-[1.75rem] blur-2xl opacity-50"
                style={{ background: `linear-gradient(135deg, ${selectedTrackMoodColor}, ${tc.c2})` }} />
              <div className="relative rounded-[1.45rem] border bg-black/35 p-2"
                style={{ borderColor: `${selectedTrackMoodColor}45` }}>
                <CoverArt artist={selectedTrack.artist} title={selectedTrack.title} kind="track" size={72} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ color: tc.c2, backgroundColor: `${tc.c2}18`, border: `1px solid ${tc.c2}35` }}>
                  {artistCopy.trackAtlas}
                </span>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ color: selectedTrackReplay.color, backgroundColor: `${selectedTrackReplay.color}18`, border: `1px solid ${selectedTrackReplay.color}35` }}>
                  {selectedTrackReplay.label}
                </span>
                {selectedTrackReading && (
                  <MoodBadge moodKey={selectedTrackReading.moodKey} confidence={selectedTrackReading.moodConfidence} />
                )}
              </div>
              <h3 className="type-title text-white" dir="auto">
                {selectedTrack.title}
              </h3>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                {trackFlagCountry && <FlagArt country={trackFlagCountry} size={17} />}
                <bdi>{trackArtistName}</bdi>
                {trackDisplayCountry && (
                  <>
                    <span className="text-gray-600">/</span>
                    <span>{trackDisplayCountry}</span>
                  </>
                )}
                <span className="text-gray-600">/</span>
                <span>{selectedTrack.genre}</span>
                <span className="text-gray-600">/</span>
                <span>{fmtNum(selectedTrack.plays)} {artistCopy.archivePlays}</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm md:text-[15px] text-gray-300 leading-relaxed">
          {selectedTrackProfile?.why_it_matters[lang] ?? artistCopy.trackContextBody}
        </p>

        <MoodInsightCard
          reading={selectedTrackReading}
          body={artistCopy.trackMoodBody}
          accent={tc.c2}
        />

        <EmotionalEnginePanel
          reading={selectedTrackReading}
          title={artistCopy.trackLongRead}
          color={selectedTrackMoodColor}
        />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <EvidencePill label={artistCopy.trackPlaysMetric} value={fmtNum(selectedTrack.plays)} color={tc.c1} />
          <EvidencePill label={artistCopy.trackRank} value={selectedTrackRank ? `#${selectedTrackRank}` : '-'} color={tc.c2} />
          <EvidencePill label={artistCopy.trackGenreMetric} value={selectedTrack.genre} color={tc.c3} />
          <EvidencePill label={artistCopy.artistInArchive} value={selectedTrackArtist ? fmtNum(selectedTrackArtist.plays) : '-'} color={tc.c4} />
          <EvidencePill label={artistCopy.trackCount} value={selectedTrackEvidence.trackCount} color="#fb923c" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <InfoBlock
            title={artistCopy.trackContext}
            body={artistCopy.trackContextBody}
            icon={Music2}
            color={tc.c1}
          />
          <InfoBlock
            title={artistCopy.replayRole}
            body={selectedTrackReplay.body}
            icon={Clock}
            color={selectedTrackReplay.color}
          />
          <InfoBlock
            title={artistCopy.emotionalFunction}
            body={selectedTrackReading?.listeningUse[lang] ?? selectedTrackEmotionBody}
            icon={Sparkles}
            color={tc.c3}
          />
        </div>

        <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <MicVocal className="w-4 h-4" style={{ color: tc.c4 }} />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c4 }}>
                  {artistCopy.artistConnection}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-3xl">
                {selectedTrackProfile?.archive_role[lang] ?? artistCopy.noProfileBody}
              </p>
            </div>
            <button
              type="button"
              aria-label={`${artistCopy.openArtistDossier} - ${selectedTrackArtist?.name ?? selectedTrack.artist}`}
              onClick={() => {
                setSelectedArtistName(selectedTrackArtist?.name ?? selectedTrack.artist);
                setTab('artistas');
                openMobileDossier('artist');
              }}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-mono font-black uppercase tracking-widest border transition-all hover:bg-white/10"
              style={{ color: tc.c4, borderColor: `${tc.c4}45`, backgroundColor: `${tc.c4}12` }}
            >
              <MicVocal className="w-3.5 h-3.5" />
              {artistCopy.openArtistDossier}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4" style={{ color: tc.c2 }} />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c2 }}>
                    {artistCopy.artistTrackNeighbors}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{artistCopy.trackNeighborsHint}</p>
              </div>
            </div>
            <div className="space-y-2">
              {selectedTrackArtistTracks.length ? selectedTrackArtistTracks.slice(0, 6).map((track, idx) => {
                const active = trackKey(track.artist, track.title) === trackKey(selectedTrack.artist, selectedTrack.title);
                return (
                  <button
                    key={`${track.artist}-${track.title}`}
                    type="button"
                    aria-label={`${track.title} - ${track.artist} - ${track.genre} - ${fmtNum(track.plays)} ${t.topHistorico.playsLegend}`}
                    onClick={() => setSelectedTrackKey(trackKey(track.artist, track.title))}
                    className="w-full flex items-center justify-between gap-3 text-xs text-left rounded-xl px-2 py-2 hover:bg-white/[0.05] transition-all"
                    style={active ? { backgroundColor: `${tc.c2}12`, border: `1px solid ${tc.c2}30` } : { border: '1px solid transparent' }}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{track.title}</p>
                      <p className="text-gray-500 font-mono">#{idx + 1} · {track.genre}</p>
                    </div>
                    <span className="font-mono font-bold shrink-0" style={{ color: tc.c2 }}>{fmtNum(track.plays)}</span>
                  </button>
                );
              }) : (
                <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noTracks}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Disc3 className="w-4 h-4" style={{ color: tc.c3 }} />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c3 }}>
                    {artistCopy.artistAlbumGravity}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{artistCopy.trackAlbumHint}</p>
              </div>
            </div>
            <div className="space-y-2">
              {selectedTrackArtistAlbums.length ? selectedTrackArtistAlbums.slice(0, 5).map((album) => {
                const albumMeta = getAlbumEnrichment(selectedTrackProfile, album.title);
                return (
                  <button
                    key={`${album.artist}-${album.title}`}
                    type="button"
                    onClick={() => {
                      setSelectedAlbumKey(albumKey(album.artist, album.title));
                      setTab('albums');
                      openMobileDossier('album');
                    }}
                    className="w-full flex items-center justify-between gap-3 text-xs text-left rounded-xl px-2 py-2 hover:bg-white/[0.05] transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{album.title}</p>
                      <p className="text-gray-500 font-mono">
                        {albumMeta?.year ?? '-'} · {artistCopy.openAlbumDossier}
                      </p>
                    </div>
                    <span className="font-mono font-bold shrink-0" style={{ color: tc.c3 }}>{fmtNum(album.plays)}</span>
                  </button>
                );
              }) : (
                <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noAlbums}</p>
              )}
            </div>
          </div>
        </div>

        {selectedTrackArtistEras.length > 0 && (
          <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4" style={{ color: tc.c1 }} />
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c1 }}>
                {artistCopy.eraSignals}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedTrackArtistEras.slice(0, 4).map(era => (
                <div key={era.year} className="rounded-xl bg-white/[0.035] border border-white/8 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono font-black text-white">{era.year}</p>
                    <span className="text-[10px] font-mono text-gray-400">{fmtNum(era.plays)}</span>
                  </div>
                  <p className="text-xs font-bold mt-1" style={{ color: tc.c1 }}>{localizeEraLabel(era.era_label, lang)}</p>
                  <p className="text-[11px] text-gray-500 mt-1 truncate">♪ {era.top_track}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTrackMediaProfile && (
          <MediaEmbedHub profile={selectedTrackMediaProfile} />
        )}
      </div>
    );
  };

  const ArtistDossier = () => (
    <div className="nova-surface nova-surface--analysis p-6 rounded-3xl space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" style={{ color: tc.c1 }} />
        <h3 className="type-kicker" style={{ color: tc.c1 }}>
          {artistCopy.dossier}
        </h3>
      </div>
      {selectedArtist ? (
        <>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="absolute inset-0 pointer-events-none opacity-80"
              style={{
                background: `radial-gradient(circle at 12% 12%, ${tc.c1}24, transparent 34%), radial-gradient(circle at 88% 20%, ${tc.c3}20, transparent 32%), linear-gradient(135deg, ${tc.c1}08, ${tc.c2}05 45%, transparent)`,
              }} />
            <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
              style={{ background: `linear-gradient(0deg, ${tc.c1}10, transparent)` }} />

            <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6 items-center">
              <div className="flex items-start gap-4 md:gap-5">
                <div className="relative shrink-0">
                  {/* Aura tinted by the artist's emotional-engine mood */}
                  <div className="absolute -inset-4 rounded-[2.25rem] blur-2xl opacity-50"
                    style={{ background: `linear-gradient(135deg, ${selectedMoodColor ?? tc.c1}, ${tc.c3})` }} />
                  <div className="relative rounded-[2rem] border bg-black/35 p-2.5 pb-3.5"
                    style={{ borderColor: selectedMoodColor ? `${selectedMoodColor}45` : 'rgba(255,255,255,0.15)' }}>
                    <ArtistPhotoCarousel name={selectedArtist.name} size={144} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ color: tc.c1, backgroundColor: `${tc.c1}18`, border: `1px solid ${tc.c1}35` }}>
                      {artistCopy.curatedBadge}
                    </span>
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-gray-400 border border-white/10 bg-white/5">
                      {artistCopy.sourceBadge}
                    </span>
                    {selectedProfile && (
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ color: tc.c4, backgroundColor: `${tc.c4}14`, border: `1px solid ${tc.c4}35` }}>
                        {artistCopy.visualSignal}
                      </span>
                    )}
                    {selectedArtistMood && (
                      <MoodBadge moodKey={selectedArtistMood.moodKey} confidence={selectedArtistMood.confidence} />
                    )}
                  </div>
                  <h3 className="type-title text-white text-neon-glow" dir="auto">
                    {selectedProfile?.name ?? selectedArtist.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-2 flex items-center gap-2 flex-wrap">
                    {selectedFlagCountry && <FlagArt country={selectedFlagCountry} size={17} />}
                    {selectedDisplayCountry && (
                      <>
                        <span>{selectedDisplayCountry}</span>
                        <span className="text-gray-600">/</span>
                      </>
                    )}
                    <span>{selectedArtist.genre}</span>
                    <span className="text-gray-600">/</span>
                    <span>{fmtNum(selectedArtist.plays)} {t.topHistorico.playsLegend.toLowerCase()}</span>
                  </p>

                  {selectedProfile && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedProfile.signature_moods[lang].slice(0, 4).map((mood, idx) => (
                        <span key={mood} className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                          style={{
                            color: COLORS[idx % COLORS.length],
                            backgroundColor: `${COLORS[idx % COLORS.length]}14`,
                            borderColor: `${COLORS[idx % COLORS.length]}35`,
                          }}>
                          {mood}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                    {artistCopy.archiveCovers}
                  </p>
                  <Disc3 className="w-4 h-4" style={{ color: tc.c1 }} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {selectedArtistAlbums.slice(0, 4).map((album, idx) => {
                    const albumMeta = getAlbumEnrichment(selectedProfile, album.title);
                    return (
                      <button
                        type="button"
                        aria-label={`${album.title} - ${album.artist} - ${fmtNum(album.plays)} ${artistCopy.archivePlays}`}
                        onClick={() => {
                          setSelectedAlbumKey(albumKey(album.artist, album.title));
                          setTab('albums');
                          openMobileDossier('album');
                        }}
                        key={`${album.artist}-${album.title}`}
                        className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-transform hover:scale-[1.03]"
                        title={`${album.title} · ${fmtNum(album.plays)} ${artistCopy.archivePlays}`}
                      >
                        <CoverArt artist={album.artist} title={album.title} kind="album" size={56} className="rounded-2xl" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-1 text-center text-[9px] font-mono font-black text-white backdrop-blur-sm">
                          {albumMeta?.year ? `’${String(albumMeta.year).slice(-2)}` : `#${idx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!selectedArtistAlbums.length && (
                  <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noAlbums}</p>
                )}
              </div>
            </div>

            {/* Band lineup from MusicBrainz artist-rels */}
            {selectedLineup.length > 0 && (
              <div className="relative z-10 mt-5 rounded-3xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: selectedMoodColor ?? tc.c1 }}>
                    👥 {artistCopy.lineupTitle}
                  </p>
                  <span className="text-[10px] font-mono text-gray-500">
                    {selectedLineup.filter(m => m.current).length}/{selectedLineup.length}
                  </span>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-gray-500">{artistCopy.lineupHint}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {selectedLineup.slice(0, 9).map(member => {
                    const enrichment = MEMBER_ENRICHMENT[member.name.toLowerCase()];
                    return (
                      <div key={member.name} className="group relative flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 transition-all hover:bg-white/[0.07] hover:border-white/15 cursor-help">
                        <ArtistAvatar name={member.name} size={28} tooltip={false} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white" dir="auto">{member.name}</p>
                          <p className="truncate text-[10px] font-mono text-gray-500 flex items-center gap-1">
                            <span className="shrink-0">{getRoleIcon(member.roles)}</span>
                            <span className="truncate">{member.roles.slice(0, 2).join(' · ') || (member.current ? artistCopy.lineupCurrent : artistCopy.lineupPast)}</span>
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <span
                            className="ms-auto block h-1.5 w-1.5 rounded-full"
                            title={member.current ? artistCopy.lineupCurrent : artistCopy.lineupPast}
                            style={{
                              backgroundColor: member.current ? '#22c55e' : '#6b7280',
                              boxShadow: member.current ? '0 0 6px #22c55e' : 'none',
                            }}
                          />
                          <span className="text-[9px] font-mono text-gray-500">
                            {member.begin
                              ? member.current
                                ? artistCopy.lineupSince(member.begin.slice(0, 4))
                                : artistCopy.lineupSpan(member.begin.slice(0, 4), (member.end ?? '').slice(0, 4))
                              : member.current ? artistCopy.lineupCurrent : artistCopy.lineupPast}
                          </span>
                        </div>

                        {/* Cyberpunk Glassmorphic Hover Tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2.5 w-56 -translate-x-1/2 scale-95 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                          <div className="rounded-xl border border-white/15 bg-black/95 p-3 shadow-2xl backdrop-blur-md text-start">
                            <div className="flex items-center gap-2 mb-2">
                              <ArtistAvatar name={member.name} size={36} tooltip={false} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-white truncate" dir="auto">{member.name}</p>
                                {enrichment?.age && (
                                  <p className="text-[10px] font-mono text-cyan-400">
                                    {artistCopy.ageLabel(enrichment.age)}
                                  </p>
                                )}
                                {enrichment?.birthDate && !enrichment?.age && (
                                  <p className="text-[10px] font-mono text-gray-400">
                                    🎂 {enrichment.birthDate}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="border-t border-white/10 pt-2 mb-2">
                              <p className="text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                                {artistCopy.rolesLabel}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {member.roles.slice(0, 5).map(r => (
                                  <span key={r} className="text-[8px] font-mono bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-gray-300">
                                    {getRoleIcon([r])} {r}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {enrichment?.links && Object.keys(enrichment.links).length > 0 && (
                              <div className="border-t border-white/10 pt-2 flex items-center gap-1.5 justify-end">
                                {Object.entries(enrichment.links).map(([platform, url]) => {
                                  const style = getLinkColor(url, tc.c4);
                                  return (
                                    <a key={platform} href={url} target="_blank" rel="noreferrer"
                                      className="rounded-full w-5 h-5 flex items-center justify-center border transition-all hover:scale-110 active:scale-95"
                                      style={{ color: style.color, borderColor: style.borderColor, backgroundColor: style.backgroundColor }}
                                      title={platform}
                                    >
                                      <BrandIcon name={platform} size={10} color={style.color} />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
                {selectedLineup.length > 9 && (
                  <p className="mt-2 text-[10px] font-mono text-gray-500">{artistCopy.lineupMore(selectedLineup.length - 9)}</p>
                )}
              </div>
            )}
          </div>

          <p className="text-sm md:text-[15px] text-gray-300 leading-relaxed">
            {selectedProfile?.bio[lang] ?? artistCopy.noProfileBody}
          </p>

          <EmotionalEnginePanel
            reading={selectedArtistReading}
            title={artistCopy.artistLongBio}
            color={tc.c1}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/[0.035] border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4" style={{ color: tc.c2 }} />
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{artistCopy.origin}</p>
              </div>
              <p className="text-sm font-bold text-white">{selectedProfile?.origin[lang] ?? selectedDisplayCountry}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.035] border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" style={{ color: tc.c3 }} />
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{artistCopy.start}</p>
              </div>
              <p className="text-sm font-bold text-white">{selectedProfile?.start_year ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.035] border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: tc.c4 }} />
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{artistCopy.statusLabel}</p>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{selectedProfile?.status[lang] ?? artistCopy.noProfileTitle}</p>
            </div>
          </div>

          {selectedKnowledgeSummary && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4" style={{ color: tc.c2 }} />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c2 }}>
                      {artistCopy.verifiedBackground}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-3xl">
                    {artistCopy.verifiedBackgroundHint}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)] gap-4">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest mb-2" style={{ color: tc.c2 }}>
                    {artistCopy.publicProfile}
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {selectedKnowledgeSummary.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedKnowledgeSummary.facts.slice(0, 8).map((fact, idx) => (
                      <span key={`${fact}-${idx}`} className="rounded-full border px-2.5 py-1 text-[10px] font-mono font-bold"
                        style={{
                          color: COLORS[idx % COLORS.length],
                          borderColor: `${COLORS[idx % COLORS.length]}35`,
                          backgroundColor: `${COLORS[idx % COLORS.length]}10`,
                        }}>
                        {fact}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" style={{ color: tc.c3 }} />
                      <p className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: tc.c3 }}>
                        {artistCopy.membersAndRoles}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedKnowledgeSummary.members.length ? selectedKnowledgeSummary.members.slice(0, 10).map((member, idx) => (
                        <span key={`${member}-${idx}`} className="rounded-full border px-2.5 py-1 text-[10px] font-mono font-bold"
                          style={{ color: tc.c3, borderColor: `${tc.c3}35`, backgroundColor: `${tc.c3}10` }}>
                          {member}
                        </span>
                      )) : (
                        <span className="text-xs text-gray-500">{artistCopy.noMemberData}</span>
                      )}
                    </div>
                  </div>

                  {selectedKnowledgeSummary.links.length > 0 && (
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ExternalLink className="w-4 h-4" style={{ color: tc.c4 }} />
                        <p className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: tc.c4 }}>
                          {artistCopy.sourceLinks}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedKnowledgeSummary.links.slice(0, 8).map((url) => {
                          const linkStyle = getLinkColor(url, tc.c4);
                          const platformName = getLinkLabel(url, artistCopy.officialWebsite);
                          return (
                            <a key={url} href={url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-mono font-bold transition-all hover:scale-[1.04] active:scale-95 shadow-sm hover:shadow-md"
                              style={{
                                color: linkStyle.color,
                                borderColor: linkStyle.borderColor,
                                backgroundColor: linkStyle.backgroundColor,
                              }}>
                              <BrandIcon name={platformName} size={11} color={linkStyle.color} />
                              <span>{platformName}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedProfile && (
            <div className="flex flex-wrap gap-2">
              {selectedProfile.signature_moods[lang].map((mood, idx) => (
                <span key={mood} className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                  style={{
                    color: COLORS[idx % COLORS.length],
                    backgroundColor: `${COLORS[idx % COLORS.length]}14`,
                    borderColor: `${COLORS[idx % COLORS.length]}35`,
                  }}>
                  {mood}
                </span>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" style={{ color: tc.c2 }} />
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest" style={{ color: tc.c2 }}>
                {artistCopy.archiveEvidence}
              </h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <EvidencePill label={artistCopy.albumCount} value={selectedEvidence.albumCount} color={tc.c1} />
              <EvidencePill label={artistCopy.trackCount} value={selectedEvidence.trackCount} color={tc.c2} />
              <EvidencePill label={artistCopy.eraCount} value={selectedEvidence.eraCount} color={tc.c3} />
              <EvidencePill label={artistCopy.albumPlays} value={selectedEvidence.albumPlaysLabel} color={tc.c4} />
              <EvidencePill label={artistCopy.trackPlays} value={selectedEvidence.trackPlaysLabel} color="#fb923c" />
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: tc.c4 }} />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c4 }}>
                  {artistCopy.catalogFootprint}
                </h3>
              </div>
              {selectedCatalogStats.firstYear && selectedCatalogStats.lastYear && (
                <span className="text-[10px] font-mono font-bold rounded-full px-2.5 py-1"
                  style={{ color: tc.c4, backgroundColor: `${tc.c4}15`, border: `1px solid ${tc.c4}30` }}>
                  {artistCopy.catalogRange}: {selectedCatalogStats.firstYear}-{selectedCatalogStats.lastYear}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <EvidencePill label={artistCopy.knownAlbums} value={selectedCatalogStats.albumCount} color={tc.c1} />
              <EvidencePill label={artistCopy.start} value={selectedProfile?.start_year ?? '-'} color={tc.c2} />
              <EvidencePill label={artistCopy.catalogRange} value={selectedCatalogStats.firstYear && selectedCatalogStats.lastYear ? `${selectedCatalogStats.spanYears} ${artistCopy.yearsShort}` : '-'} color={tc.c3} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <InfoBlock title={artistCopy.archiveRole} body={selectedProfile?.archive_role[lang] ?? artistCopy.noProfileBody} icon={BookOpen} color={tc.c1} />
            <InfoBlock title={artistCopy.soundEvolution} body={selectedProfile?.sound_evolution[lang] ?? artistCopy.noProfileBody} icon={Clock} color={tc.c2} />
            <InfoBlock title={artistCopy.whyMatters} body={selectedProfile?.why_it_matters[lang] ?? artistCopy.noProfileBody} icon={Sparkles} color={tc.c3} />
          </div>

          {selectedListeningPath.length > 0 && (
            <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ListMusic className="w-4 h-4" style={{ color: tc.c1 }} />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c1 }}>
                      {artistCopy.listeningPath}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-3xl">{artistCopy.listeningPathHint}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {selectedListeningPath.map(({ label, title, meta, body, icon: Icon, color }, idx) => (
                  <div key={`${label}-${title}`} className="rounded-2xl bg-white/[0.035] border border-white/8 p-4 min-h-[180px]">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black font-mono"
                        style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}35` }}>
                        {idx + 1}
                      </span>
                      <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest font-bold mb-2" style={{ color }}>
                      {label}
                    </p>
                    <h4 className="text-sm font-black text-white leading-snug">{title}</h4>
                    <p className="text-[11px] font-mono text-gray-500 mt-1">{meta}</p>
                    <p className="text-xs text-gray-400 leading-relaxed mt-3">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedMediaProfile && (
            <MediaEmbedHub profile={selectedMediaProfile} />
          )}

          {selectedProfile && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Disc3 className="w-4 h-4" style={{ color: tc.c1 }} />
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest" style={{ color: tc.c1 }}>
                  {artistCopy.keyAlbums}
                </h3>
              </div>
              <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
                {selectedProfile.key_albums.map((album, idx) => (
                  <TimelineAlbum key={`${album.title}-${album.year}`} album={album} index={idx} />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Disc3 className="w-4 h-4" style={{ color: tc.c2 }} />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c2 }}>
                  {artistCopy.archiveAlbums}
                </h3>
              </div>
              <div className="space-y-2">
                {selectedArtistAlbums.length ? selectedArtistAlbums.slice(0, 6).map((album, idx) => {
                  const albumMeta = getAlbumEnrichment(selectedProfile, album.title);
                  return (
                    <button
                      key={`${album.artist}-${album.title}`}
                      type="button"
                      onClick={() => {
                        setSelectedAlbumKey(albumKey(album.artist, album.title));
                        setTab('albums');
                        openMobileDossier('album');
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{album.title}</p>
                        <p className="text-gray-500 font-mono">{albumMeta?.year ?? '-'} · #{idx + 1}</p>
                      </div>
                      <span className="font-mono font-bold shrink-0" style={{ color: tc.c2 }}>{fmtNum(album.plays)}</span>
                    </button>
                  );
                }) : (
                  <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noAlbums}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListMusic className="w-4 h-4" style={{ color: tc.c3 }} />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c3 }}>
                  {artistCopy.topTracks}
                </h3>
              </div>
              <div className="space-y-2">
                {selectedArtistTracks.length ? selectedArtistTracks.slice(0, 6).map((track, idx) => (
                  <button
                    key={`${track.artist}-${track.title}`}
                    type="button"
                    onClick={() => {
                      setSelectedTrackKey(trackKey(track.artist, track.title));
                      setTab('canciones');
                      openMobileDossier('track');
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{track.title}</p>
                      <p className="text-gray-500 font-mono">#{idx + 1} · {track.genre}</p>
                    </div>
                    <span className="font-mono font-bold shrink-0" style={{ color: tc.c3 }}>{fmtNum(track.plays)}</span>
                  </button>
                )) : (
                  <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noTracks}</p>
                )}
              </div>
            </div>
          </div>

          {selectedRelatedArtists.length > 0 && (
            <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MicVocal className="w-4 h-4" style={{ color: tc.c1 }} />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c1 }}>
                      {artistCopy.relatedArtists}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-2xl">{artistCopy.relatedHint}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {selectedRelatedArtists.map((item, idx) => (
                  <button key={item.artist.name} type="button" onClick={() => setSelectedArtistName(item.artist.name)}
                    aria-label={`${item.artist.name} - ${item.artist.genre} - ${fmtNum(item.artist.plays)} ${t.topHistorico.playsLegend}`}
                    className="rounded-2xl bg-white/[0.035] border border-white/8 p-3 text-left hover:bg-white/[0.06] transition-all group">
                    <div className="flex items-center gap-3">
                      <ArtistAvatar name={item.artist.name} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{item.artist.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{item.artist.genre}</p>
                      </div>
                      <span className="text-[10px] font-mono font-black rounded-lg px-2 py-1 shrink-0"
                        style={{ color: COLORS[idx % COLORS.length], backgroundColor: `${COLORS[idx % COLORS.length]}18` }}>
                        {fmtNum(item.artist.plays)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {item.sharedGenres.slice(0, 2).map(token => (
                        <span key={token} className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border"
                          style={{ color: tc.c2, borderColor: `${tc.c2}35`, backgroundColor: `${tc.c2}12` }}>
                          {artistCopy.sharedStyle}: {token}
                        </span>
                      ))}
                      {item.sameCountry && (
                        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border"
                          style={{ color: tc.c3, borderColor: `${tc.c3}35`, backgroundColor: `${tc.c3}12` }}>
                          {artistCopy.sameCountry}
                        </span>
                      )}
                      {item.hasProfile && (
                        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border"
                          style={{ color: tc.c4, borderColor: `${tc.c4}35`, backgroundColor: `${tc.c4}12` }}>
                          {artistCopy.hasProfile}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4" style={{ color: tc.c4 }} />
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c4 }}>
                {artistCopy.eraSignals}
              </h3>
            </div>
            {selectedArtistEras.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedArtistEras.map(era => (
                  <div key={era.year} className="rounded-xl bg-white/[0.035] border border-white/8 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono font-black text-white">{era.year}</p>
                      <span className="text-[10px] font-mono text-gray-400">{fmtNum(era.plays)}</span>
                    </div>
                    <p className="text-xs font-bold mt-1" style={{ color: tc.c4 }}>{localizeEraLabel(era.era_label, lang)}</p>
                    <p className="text-[11px] text-gray-500 mt-1 truncate">♪ {era.top_track}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noEras}</p>
            )}
          </div>

          <div className="rounded-2xl p-4 bg-white/[0.025] border border-white/8 text-xs text-gray-500 leading-relaxed">
            {artistCopy.curatedNote}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400">{artistCopy.noProfileBody}</p>
      )}
    </div>
  );

  const AlbumDossier = () => {
    if (!selectedAlbum) {
      return (
        <div className="nova-surface nova-surface--analysis p-6 rounded-3xl">
          <p className="type-body text-gray-400">{artistCopy.noAlbums}</p>
        </div>
      );
    }

    const albumArtistName = selectedAlbumProfile?.name ?? selectedAlbum.artist;
    const albumDisplayCountry = selectedAlbumProfile?.country[lang] ?? selectedAlbumArtist?.country ?? '';
    const albumFlagCountry = selectedAlbumProfile?.country.en ?? selectedAlbumArtist?.country ?? '';
    const catalogChapter = selectedAlbumCatalogIndex >= 0 && selectedAlbumProfile
      ? `${selectedAlbumCatalogIndex + 1}/${selectedAlbumProfile.key_albums.length}`
      : '-';

    return (
      <div className="nova-surface nova-surface--analysis p-6 rounded-3xl space-y-6">
        <div className="flex items-center gap-2">
          <Disc3 className="w-5 h-5" style={{ color: tc.c3 }} />
          <h3 className="type-kicker" style={{ color: tc.c3 }}>
            {artistCopy.albumDossier}
          </h3>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-5 md:p-6">
          <div className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              background: `radial-gradient(circle at 14% 18%, ${selectedAlbumMoodColor}28, transparent 34%), radial-gradient(circle at 88% 10%, ${tc.c1}18, transparent 30%), linear-gradient(135deg, ${selectedAlbumMoodColor}08, ${tc.c1}06 45%, transparent)`,
            }} />
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] gap-6 items-center">
            <div className="flex items-start gap-4 md:gap-5">
              <div className="relative shrink-0">
                <div className="absolute -inset-3 rounded-[2rem] blur-2xl opacity-50"
                  style={{ background: `linear-gradient(135deg, ${selectedAlbumMoodColor}, ${tc.c1})` }} />
                <div className="relative rounded-[1.75rem] border bg-black/35 p-2"
                  style={{ borderColor: `${selectedAlbumMoodColor}45` }}>
                  <CoverArt artist={selectedAlbum.artist} title={selectedAlbum.title} kind="album" size={96} className="rounded-3xl" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ color: tc.c3, backgroundColor: `${tc.c3}18`, border: `1px solid ${tc.c3}35` }}>
                    {artistCopy.albumAtlas}
                  </span>
                  {selectedAlbumMeta && (
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ color: tc.c1, backgroundColor: `${tc.c1}18`, border: `1px solid ${tc.c1}35` }}>
                      {selectedAlbumMeta.year}
                    </span>
                  )}
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ color: '#fb923c', backgroundColor: '#fb923c18', border: '1px solid #fb923c35' }}>
                    {catalogChapter}
                  </span>
                  {selectedAlbumReading && (
                    <MoodBadge moodKey={selectedAlbumReading.moodKey} confidence={selectedAlbumReading.moodConfidence} />
                  )}
                </div>
                <h3 className="type-title text-white" dir="auto">
                  {selectedAlbum.title}
                </h3>
                <p className="text-sm text-gray-400 mt-2 flex items-center gap-2 flex-wrap">
                  {albumFlagCountry && <FlagArt country={albumFlagCountry} size={17} />}
                  <bdi>{albumArtistName}</bdi>
                  {albumDisplayCountry && (
                    <>
                      <span className="text-gray-600">/</span>
                      <span>{albumDisplayCountry}</span>
                    </>
                  )}
                  <span className="text-gray-600">/</span>
                  <span>{fmtNum(selectedAlbum.plays)} {artistCopy.archivePlays}</span>
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500 mb-3">
                {artistCopy.artistAlbumsNearby}
              </p>
              <div className="flex -space-x-3">
                {[selectedAlbum, ...selectedAlbumSiblingAlbums].slice(0, 4).map(album => (
                  <CoverArt
                    key={`${album.artist}-${album.title}`}
                    artist={album.artist}
                    title={album.title}
                    kind="album"
                    size={54}
                    className="rounded-2xl ring-2 ring-black/60"
                  />
                ))}
              </div>
              <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                {selectedAlbumCatalogRole}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm md:text-[15px] text-gray-300 leading-relaxed">
          {selectedAlbumMeta?.description[lang] ?? artistCopy.noAlbumContext}
        </p>

        <MoodInsightCard
          reading={selectedAlbumReading}
          body={artistCopy.albumMoodBody}
          accent={tc.c3}
        />

        <EmotionalEnginePanel
          reading={selectedAlbumReading}
          title={artistCopy.albumLongRead}
          color={selectedAlbumMoodColor}
        />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <EvidencePill label={artistCopy.albumPlays} value={fmtNum(selectedAlbum.plays)} color={tc.c1} />
          <EvidencePill label={artistCopy.releaseYear} value={selectedAlbumMeta?.year ?? '-'} color={tc.c2} />
          <EvidencePill label={artistCopy.playsRank} value={selectedAlbumRank ? `#${selectedAlbumRank}` : '-'} color={tc.c3} />
          <EvidencePill label={artistCopy.artistInArchive} value={selectedAlbumArtist ? fmtNum(selectedAlbumArtist.plays) : '-'} color={tc.c4} />
          <EvidencePill label={artistCopy.catalogChapter} value={catalogChapter} color="#fb923c" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <InfoBlock
            title={artistCopy.albumContext}
            body={selectedAlbumMeta?.description[lang] ?? artistCopy.noAlbumContext}
            icon={BookOpen}
            color={tc.c1}
          />
          <InfoBlock
            title={artistCopy.albumArchiveRole}
            body={artistCopy.albumArchiveRoleBody}
            icon={Disc3}
            color={tc.c2}
          />
          <InfoBlock
            title={artistCopy.catalogRole}
            body={selectedAlbumCatalogRole}
            icon={Clock}
            color={tc.c3}
          />
        </div>

        <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: tc.c4 }} />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c4 }}>
                  {artistCopy.artistBridge}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-3xl">
                {selectedAlbumProfile?.why_it_matters[lang] ?? artistCopy.noProfileBody}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedArtistName(selectedAlbumArtist?.name ?? selectedAlbum.artist);
                setTab('artistas');
                openMobileDossier('artist');
              }}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-mono font-black uppercase tracking-widest border transition-all hover:bg-white/10"
              style={{ color: tc.c4, borderColor: `${tc.c4}45`, backgroundColor: `${tc.c4}12` }}
            >
              <MicVocal className="w-3.5 h-3.5" />
              {artistCopy.openArtistDossier}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4" style={{ color: tc.c2 }} />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c2 }}>
                    {artistCopy.relatedArtistTracks}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{artistCopy.albumTracksHint}</p>
              </div>
            </div>
            <div className="space-y-2">
              {selectedAlbumArtistTracks.length ? selectedAlbumArtistTracks.slice(0, 5).map((track, idx) => (
                <div key={`${track.artist}-${track.title}`} className="flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{track.title}</p>
                    <p className="text-gray-500 font-mono">#{idx + 1} · {track.genre}</p>
                  </div>
                  <span className="font-mono font-bold shrink-0" style={{ color: tc.c2 }}>{fmtNum(track.plays)}</span>
                </div>
              )) : (
                <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noTracks}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Disc3 className="w-4 h-4" style={{ color: tc.c3 }} />
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: tc.c3 }}>
                {artistCopy.artistAlbumsNearby}
              </h3>
            </div>
            <div className="space-y-2">
              {selectedAlbumSiblingAlbums.length ? selectedAlbumSiblingAlbums.slice(0, 5).map((album, idx) => {
                const albumMeta = getAlbumEnrichment(selectedAlbumProfile, album.title);
                return (
                  <button
                    key={`${album.artist}-${album.title}`}
                    type="button"
                    onClick={() => setSelectedAlbumKey(albumKey(album.artist, album.title))}
                    className="w-full flex items-center justify-between gap-3 text-xs text-left rounded-xl px-2 py-2 hover:bg-white/[0.05] transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{album.title}</p>
                      <p className="text-gray-500 font-mono">{albumMeta?.year ?? '-'} · #{idx + 1}</p>
                    </div>
                    <span className="font-mono font-bold shrink-0" style={{ color: tc.c3 }}>{fmtNum(album.plays)}</span>
                  </button>
                );
              }) : (
                <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noAlbums}</p>
              )}
            </div>
          </div>
        </div>

        {selectedAlbumMediaProfile && (
          <MediaEmbedHub profile={selectedAlbumMediaProfile} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* The museum chapter header owns the page title and narrative. This compact
          control deck lets the ranking itself enter the viewport sooner. */}
      <div className="nova-surface nova-surface--utility flex flex-col gap-2 rounded-2xl p-2 lg:flex-row lg:items-center">
        <div ref={tabListRef} className="flex min-w-0 flex-1 overflow-x-auto gap-1.5 pb-1 lg:pb-0" role="group"
          aria-label={t.topHistorico.title}>
          {tabs.map(tabItem => {
            const Icon = tabItem.icon;
            const active = tab === tabItem.id;
            return (
              <button key={tabItem.id} type="button" data-top-tab={tabItem.id} onClick={() => setTab(tabItem.id as TopTab)}
                aria-pressed={active}
                className="type-kicker nova-surface--interactive flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 py-2 transition-all"
                style={active ? {
                  background: `linear-gradient(135deg, ${tc.c1}20, ${tc.c3}10)`,
                  borderColor: tc.c1, color: tc.c1,
                  boxShadow: `0 0 15px ${tc.c1}20`,
                } : { borderColor: 'rgba(255,255,255,0.08)', color: '#6b7280' }}>
                <Icon className="w-3.5 h-3.5" />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.topHistorico.searchPlaceholder}
            aria-label={t.topHistorico.searchPlaceholder}
            className="type-meta min-h-11 w-full rounded-xl border bg-white/5 py-2 ps-9 pe-11 text-white placeholder-gray-500 transition-all lg:w-56"
            style={{ borderColor: search ? tc.c1 : 'rgba(255,255,255,0.1)' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              aria-label={artistCopy.clearSearch}
              className="nova-surface--interactive absolute end-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-white transition-colors" />
            </button>
          )}
        </div>
      </div>

      <h2 className="sr-only">{tabs.find(item => item.id === tab)?.label}</h2>

      {(tab === 'artistas' || tab === 'canciones' || tab === 'albums') && (
        <MoodFilterBar />
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={SWAP_POSES.initial} animate={SWAP_POSES.animate}
          exit={SWAP_POSES.exit} transition={tabTransition}>

          {/* ARTISTAS */}
          {tab === 'artistas' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:items-start">
              <div className="nova-surface nova-surface--utility p-5 rounded-3xl">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="type-kicker" style={{ color: tc.c1 }}>
                      {t.topHistorico.top50Artists}
                      {search && <span className="text-gray-400 ml-2">({t.topHistorico.resultsCount(filteredArtists.length)})</span>}
                    </h3>
                    <p className="type-meta text-gray-500 mt-2">{artistCopy.selectedHint}</p>
                  </div>
                  <BookOpen className="w-5 h-5 shrink-0" style={{ color: tc.c1 }} />
                </div>
                <motion.div variants={listVariants} initial="initial" animate="animate"
                  className="max-h-[58dvh] space-y-2 overflow-y-auto pr-1 xl:max-h-[620px]">
                  {filteredArtists.length === 0 && (
                    <p className="type-body type-muted py-6 text-center">{t.topHistorico.resultsCount(0)}</p>
                  )}
                  {filteredArtists.slice(0, 50).map((a, idx) => {
                    const mood = artistMoodProfiles.get(a.name);
                    const originalRank = artistRanks.get(a.name) ?? idx + 1;
                    return (
                      <ListRow key={a.name} rank={originalRank} main={a.name}
                        sub={`${a.country} · ${a.genre}`} plays={a.plays}
                        color={COLORS[(originalRank - 1) % COLORS.length]} avatarName={a.name} flagCountry={a.country}
                        moodColor={mood?.color}
                        ariaLabel={`${originalRank}. ${a.name} - ${a.country} - ${a.genre} - ${fmtNum(a.plays)} ${t.topHistorico.playsLegend}`}
                        onClick={(event) => {
                          setSelectedArtistName(a.name);
                          openMobileDossier('artist', event.currentTarget);
                        }}
                        active={selectedArtist?.name === a.name} />
                    );
                  })}
                </motion.div>
              </div>

              <div className="hidden space-y-6 xl:block">
                <ArtistDossier />

                <details className="nova-surface nova-surface--analysis group overflow-hidden rounded-3xl">
                  <summary className="nova-surface--interactive flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4" style={{ color: tc.c2 }} />
                      <span className="type-kicker" style={{ color: tc.c2 }}>{artistCopy.topChart}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-90" />
                  </summary>
                  <ChartCanvas
                    label={artistCopy.topChart}
                    className="min-h-[520px] border-t border-white/5 px-4 pb-5 pt-4"
                    style={{ height: Math.max(520, data.top_artists.slice(0, 20).length * 32 + 48) }}
                  >
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart accessibilityLayer data={data.top_artists.slice(0, 20)} layout="vertical"
                        margin={{ left: 0, right: 32, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(tc.c1, tc.mode)} horizontal={false} />
                        <XAxis type="number" {...axisProps(tc.mode)} />
                        <YAxis type="category" dataKey="name" width={168} interval={0} {...axisProps(tc.mode)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="plays" name={t.topHistorico.playsLegend} radius={[0, 6, 6, 0]} {...chartAnimation}>
                          {data.top_artists.slice(0, 20).map((artist, i) => (
                            <Cell key={artist.name} fill={selectedArtist?.name === artist.name ? tc.c1 : (i < 3 ? tc.c2 : tc.c3)} fillOpacity={selectedArtist?.name === artist.name || i < 3 ? 1 : 0.65} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCanvas>
                </details>
              </div>
            </div>
          )}

          {/* CANCIONES */}
          {tab === 'canciones' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start">
              <div className="nova-surface nova-surface--utility p-5 rounded-3xl">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="type-kicker" style={{ color: tc.c2 }}>
                      {t.topHistorico.top50Tracks}
                      {search && <span className="text-gray-400 ml-2">({filteredTracks.length})</span>}
                    </h3>
                    <p className="type-meta text-gray-500 mt-2">{artistCopy.selectedTrackHint}</p>
                  </div>
                  <ListMusic className="w-5 h-5 shrink-0" style={{ color: tc.c2 }} />
                </div>
                <motion.div variants={listVariants} initial="initial" animate="animate"
                  className="max-h-[58dvh] space-y-2 overflow-y-auto pr-1 xl:max-h-[720px]">
                  {filteredTracks.length === 0 && (
                    <p className="type-body type-muted py-6 text-center">{t.topHistorico.resultsCount(0)}</p>
                  )}
                  {filteredTracks.slice(0, 50).map((track, idx) => {
                    const key = trackKey(track.artist, track.title);
                    const mood = trackRowMoods.get(key);
                    const originalRank = trackRanks.get(key) ?? idx + 1;
                    return (
                      <ListRow key={`${track.artist}-${track.title}`} rank={originalRank} main={track.title}
                        sub={`${track.artist} · ${track.genre}`} plays={track.plays}
                        color={COLORS[(originalRank - 1) % COLORS.length]} avatarName={track.artist}
                        coverTitle={track.title} coverKind="track"
                        moodColor={mood?.color} moodKey={mood?.moodKey} moodConfidence={mood?.confidence}
                        ariaLabel={`${originalRank}. ${track.title} - ${track.artist} - ${track.genre} - ${fmtNum(track.plays)} ${t.topHistorico.playsLegend}`}
                        onClick={(event) => {
                          setSelectedTrackKey(trackKey(track.artist, track.title));
                          openMobileDossier('track', event.currentTarget);
                        }}
                        active={selectedTrack ? trackKey(track.artist, track.title) === trackKey(selectedTrack.artist, selectedTrack.title) : false} />
                    );
                  })}
                </motion.div>
              </div>

              <div className="hidden space-y-6 xl:block">
                <TrackDossier />

                <details className="nova-surface nova-surface--analysis group overflow-hidden rounded-3xl">
                  <summary className="nova-surface--interactive flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4" style={{ color: tc.c2 }} />
                      <span className="type-kicker" style={{ color: tc.c2 }}>{t.topHistorico.top20Chart}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-90" />
                  </summary>
                  <ChartCanvas
                    label={t.topHistorico.top20Chart}
                    className="min-h-[520px] border-t border-white/5 px-4 pb-5 pt-4"
                    style={{ height: Math.max(520, data.top_tracks.slice(0, 20).length * 32 + 48) }}
                  >
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart accessibilityLayer data={data.top_tracks.slice(0, 20).map(track => ({ ...track, name: track.title }))}
                        layout="vertical" margin={{ left: 0, right: 32, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(tc.c2, tc.mode)} horizontal={false} />
                        <XAxis type="number" {...axisProps(tc.mode)} />
                        <YAxis type="category" dataKey="name" width={168} interval={0} {...axisProps(tc.mode)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="plays" radius={[0, 6, 6, 0]} {...chartAnimation}>
                          {data.top_tracks.slice(0, 20).map((track, i) => {
                            const isActive = selectedTrack
                              ? trackKey(track.artist, track.title) === trackKey(selectedTrack.artist, selectedTrack.title)
                              : false;
                            return (
                              <Cell key={`${track.artist}-${track.title}`}
                                fill={isActive ? tc.c1 : (i < 3 ? tc.c2 : tc.c3)}
                                fillOpacity={isActive || i < 3 ? 1 : 0.7} />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCanvas>
                </details>
              </div>
            </div>
          )}

          {/* ALBUMS */}
          {tab === 'albums' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start">
              <div className="nova-surface nova-surface--utility p-5 rounded-3xl">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="type-kicker" style={{ color: tc.c3 }}>
                      {t.topHistorico.top50Albums}
                      {search && <span className="text-gray-400 ml-2">({filteredAlbums.length})</span>}
                    </h3>
                    <p className="type-meta text-gray-500 mt-2">{artistCopy.selectedAlbumHint}</p>
                  </div>
                  <Disc3 className="w-5 h-5 shrink-0" style={{ color: tc.c3 }} />
                </div>
                <motion.div variants={listVariants} initial="initial" animate="animate"
                  className="max-h-[58dvh] space-y-2 overflow-y-auto pr-1 xl:max-h-[720px]">
                  {filteredAlbums.length === 0 && (
                    <p className="type-body type-muted py-6 text-center">{t.topHistorico.resultsCount(0)}</p>
                  )}
                  {filteredAlbums.slice(0, 50).map((a, idx) => {
                    const albumProfile = getArtistEnrichment(a.artist);
                    const releaseYear = albumReleaseLabel(a, albumProfile);
                    const key = albumKey(a.artist, a.title);
                    const mood = albumRowMoods.get(key);
                    const originalRank = albumRanks.get(key) ?? idx + 1;
                    return (
                      <ListRow key={`${a.artist}-${a.title}`} rank={originalRank} main={a.title}
                        sub={releaseYear ? `${a.artist} · ${artistCopy.released} ${releaseYear}` : a.artist}
                        plays={a.plays} color={COLORS[(originalRank - 1) % COLORS.length]} avatarName={a.artist}
                        coverTitle={a.title} coverKind="album"
                        moodColor={mood?.color} moodKey={mood?.moodKey} moodConfidence={mood?.confidence}
                        ariaLabel={`${originalRank}. ${a.title} - ${a.artist}${releaseYear ? ` - ${artistCopy.released} ${releaseYear}` : ''} - ${fmtNum(a.plays)} ${t.topHistorico.playsLegend}`}
                        onClick={(event) => {
                          setSelectedAlbumKey(albumKey(a.artist, a.title));
                          openMobileDossier('album', event.currentTarget);
                        }}
                        active={selectedAlbum ? albumKey(a.artist, a.title) === albumKey(selectedAlbum.artist, selectedAlbum.title) : false} />
                    );
                  })}
                </motion.div>
              </div>

              <div className="hidden xl:block">
                <AlbumDossier />
              </div>
            </div>
          )}

          {/* GÉNEROS */}
          {tab === 'generos' && (
            <div className="space-y-6">
              <div className="nova-surface nova-surface--utility p-6 rounded-3xl">
                <h3 className="type-kicker mb-5" style={{ color: tc.c2 }}>
                  {t.topHistorico.tabGenres}
                </h3>
                <p className="type-caption type-muted -mt-3 mb-5">
                  🧭 {artistCopy.wholeArchive} · {genreDistribution.totalPlays.toLocaleString(locale)} {artistCopy.countedListensOther}
                </p>
                <div className="flex flex-wrap gap-5">
                  {genreData.slice(0, 10).map(g => (
                    <GenreArt key={g.genre} genre={g.genre} label={g.name} size={68} showLabel />
                  ))}
                </div>
              </div>

              <div className="nova-surface nova-surface--analysis p-6 rounded-3xl">
                <h3 className="type-kicker mb-5" style={{ color: tc.c1 }}>
                  {t.topHistorico.genreTreemap}
                </h3>
                <ChartCanvas label={t.topHistorico.genreTreemap} className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <Treemap data={treemapChildren} dataKey="size"
                      content={<CustomTreemapContent />} {...chartAnimation} />
                  </ResponsiveContainer>
                </ChartCanvas>
              </div>

              <div className="nova-surface nova-surface--analysis p-6 rounded-3xl">
                <h3 className="type-kicker mb-5" style={{ color: tc.c4 }}>
                  {t.topHistorico.genreBreakdown}
                </h3>
                <ChartCanvas
                  label={t.topHistorico.genreBreakdown}
                  className="min-h-[420px] min-w-0"
                  style={{ height: Math.max(420, genreData.length * 32 + 48) }}
                >
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart accessibilityLayer data={genreData} layout="vertical"
                      margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(tc.c2, tc.mode)} horizontal={false} />
                      <XAxis type="number" {...axisProps(tc.mode)} />
                      <YAxis type="category" dataKey="name" width={176} interval={0} {...axisProps(tc.mode)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="plays" name={t.topHistorico.playsLegend} radius={[0, 6, 6, 0]} {...chartAnimation}>
                        {genreData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCanvas>
              </div>
            </div>
          )}

          {/* AÑOS */}
          {tab === 'anos' && (
            <div className="space-y-6">
              <div className="nova-surface nova-surface--analysis p-6 rounded-3xl">
                <ChartFrame
                  title={t.topHistorico.playsByYear}
                  subtitle={artistCopy.yearlySubtitle(yearCoverage.maxDate)}
                  summary={artistCopy.yearlySummary(selectedYearMetric.label)}
                  status={yearCoverage.isPartialYear ? ['exact', 'ytd'] : 'exact'}
                  tableRows={yearlyData}
                  tableColumns={[
                    { key: 'year', label: artistCopy.yearLabel },
                    { key: 'plays', label: t.topHistorico.playsLegend },
                    { key: 'artistas', label: t.topHistorico.uniqueArtistsLegend },
                  ]}
                  fileName="nova-top-years.csv"
                >
                  <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={artistCopy.yearlyMetricAria}>
                    {(['plays', 'artistas'] as const).map(metric => {
                      const active = yearMetric === metric;
                      const label = metric === 'plays' ? t.topHistorico.playsLegend : t.topHistorico.uniqueArtistsLegend;
                      const color = metric === 'plays' ? tc.c1 : tc.c3;
                      return (
                        <button
                          key={metric}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setYearMetric(metric)}
                          className="min-h-11 rounded-full border px-4 py-2 text-[10px] font-mono font-black uppercase tracking-wider transition-colors"
                          style={{
                            borderColor: `${color}${active ? '70' : '28'}`,
                            backgroundColor: active ? `${color}18` : 'transparent',
                            color: active ? color : 'var(--type-ink-muted)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                <ChartCanvas className="h-80">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart accessibilityLayer data={yearlyData} margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="topGradYear" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedYearMetric.color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={selectedYearMetric.color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(tc.c1, tc.mode)} />
                      <XAxis dataKey="year" {...axisProps(tc.mode)} />
                      <YAxis allowDecimals={false} {...axisProps(tc.mode)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area {...chartAnimation} type="monotone" dataKey={yearMetric} name={selectedYearMetric.label}
                        stroke={selectedYearMetric.color} strokeWidth={2.5} fill="url(#topGradYear)"
                        dot={{ fill: selectedYearMetric.color, r: 4 }} activeDot={{ r: 7 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCanvas>
                </ChartFrame>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.yearly_eras.map((era, idx) => (
                  <motion.div key={era.year} variants={itemVariants} initial="initial" animate="animate"
                    transition={{ delay: idx * 0.05 }}
                    className="nova-surface nova-surface--utility p-4 rounded-2xl space-y-2 border-t-2"
                    style={{ borderTopColor: COLORS[idx % COLORS.length] }}>
                    <div className="flex justify-between items-center">
                      <span className="type-metric text-base font-black text-white">{era.year}</span>
                      <span className="type-metric text-xs font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                        {fmtNum(era.plays)}
                      </span>
                    </div>
                    <p className="type-meta font-bold text-gray-200">{localizeEraLabel(era.era_label, lang)}</p>
                    <p className="type-meta text-gray-500">♪ {era.top_artist}</p>
                    <div className="type-meta pt-1 border-t border-white/5 text-gray-600">
                      {t.topHistorico.eraDiversityLine(era.diversity_index, era.unique_artists)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      <MobileDetailDrawer
        open={mobileDossier !== null}
        title={mobileDossier === 'track'
          ? `${artistCopy.trackDossier}${selectedTrack ? ` · ${selectedTrack.title}` : ''}`
          : mobileDossier === 'album'
            ? `${artistCopy.albumDossier}${selectedAlbum ? ` · ${selectedAlbum.title}` : ''}`
            : `${artistCopy.dossier}${selectedArtist ? ` · ${selectedArtist.name}` : ''}`}
        closeLabel={artistCopy.backToRanking}
        onClose={closeMobileDossier}
        returnFocusTarget={mobileDossierTriggerRef.current}
      >
        {mobileDossier === 'track' && <TrackDossier />}
        {mobileDossier === 'album' && <AlbumDossier />}
        {mobileDossier === 'artist' && <ArtistDossier />}
      </MobileDetailDrawer>
    </div>
  );
}
