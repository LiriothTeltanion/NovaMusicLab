import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  AreaChart, Area, CartesianGrid, Treemap,
} from 'recharts';
import {
  Trophy, Music2, Disc3, MicVocal, BarChart2, Search, X, BookOpen, Calendar,
  ChevronRight, Clock, Info, ListMusic, MapPin, Sparkles,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { normalizeGenre } from '../utils/analytics';
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
import CoverArt from './CoverArt';
import GenreArt from './GenreArt';
import FlagArt from './FlagArt';
import MediaEmbedHub from './MediaEmbedHub';
import SectionNarrative from './SectionNarrative';
import { localizeEraLabel } from '../utils/localeText';
import { buildArtistMediaProfile } from '../utils/mediaLinks';
import {
  buildAlbumEmotionalReading,
  buildArtistEmotionalReading,
  buildArtistMoodProfile,
  buildTrackEmotionalReading,
  emotionalAxisLabels,
  EMOTIONAL_MOOD_TAXONOMY,
  type EmotionalEngineReading,
} from '../engines/emotionalEngine';
import MoodBadge from './MoodBadge';

interface TopHistoricoProps {
  data: MusicDnaData;
}

type TopTab = 'canciones' | 'artistas' | 'albums' | 'generos' | 'anos';

const tabTransition = { duration: 0.3, ease: 'easeOut' as const };

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

const ARTIST_ATLAS_COPY = {
  es: {
    dossier: 'Dossier de artista',
    curatedBadge: 'Ficha curada',
    sourceBadge: 'Enciclopedia local',
    origin: 'Origen',
    start: 'Inicio',
    archiveEvidence: 'Evidencia en tu archivo',
    archiveRole: 'Rol en el archivo',
    soundEvolution: 'Evolución sonora',
    whyMatters: 'Por qué importa aquí',
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
  },
  en: {
    dossier: 'Artist Dossier',
    curatedBadge: 'Curated profile',
    sourceBadge: 'Local encyclopedia',
    origin: 'Origin',
    start: 'Started',
    archiveEvidence: 'Evidence in your archive',
    archiveRole: 'Archive role',
    soundEvolution: 'Sound evolution',
    whyMatters: 'Why it matters here',
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
  },
} as const;

export default function TopHistorico({ data }: TopHistoricoProps) {
  const { tc, t, lang } = useApp();
  const [tab, setTab] = useState<TopTab>('artistas');
  const [search, setSearch] = useState('');
  const [selectedArtistName, setSelectedArtistName] = useState(data.top_artists[0]?.name ?? '');
  const [selectedAlbumKey, setSelectedAlbumKey] = useState(
    data.top_albums[0] ? albumKey(data.top_albums[0].artist, data.top_albums[0].title) : '',
  );
  const [selectedTrackKey, setSelectedTrackKey] = useState(
    data.top_tracks[0] ? trackKey(data.top_tracks[0].artist, data.top_tracks[0].title) : '',
  );

  const COLORS = [tc.c1, tc.c2, tc.c3, tc.c4, '#fb923c', '#a78bfa', '#34d399', '#f59e0b', '#ec4899', '#6ee7b7'];
  const artistCopy = ARTIST_ATLAS_COPY[lang];

  const tabs = [
    { id: 'artistas',  label: t.topHistorico.tabArtists,  icon: MicVocal },
    { id: 'canciones', label: t.topHistorico.tabTracks,   icon: Music2 },
    { id: 'albums',    label: t.topHistorico.tabAlbums,   icon: Disc3 },
    { id: 'generos',   label: t.topHistorico.tabGenres,   icon: BarChart2 },
    { id: 'anos',      label: t.topHistorico.tabYears,    icon: Trophy },
  ] as const;

  const fmtNum = (n: number) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');
  const q = search.toLowerCase().trim();

  /* ── Filtered lists ── */
  const filteredArtists = useMemo(() =>
    data.top_artists.filter(a => !q || a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q)),
    [data.top_artists, q]);

  /* Emotional-engine mood color per artist, for the row identity dots */
  const artistMoodColors = useMemo(() => {
    const map = new Map<string, string>();
    data.top_artists.forEach(a => {
      map.set(a.name, EMOTIONAL_MOOD_TAXONOMY[buildArtistMoodProfile(a).moodKey].color);
    });
    return map;
  }, [data.top_artists]);

  const filteredTracks = useMemo(() =>
    data.top_tracks.filter(t => !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)),
    [data.top_tracks, q]);

  const filteredAlbums = useMemo(() =>
    data.top_albums.filter(a => !q || a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)),
    [data.top_albums, q]);

  const selectedTrack = useMemo(() =>
    data.top_tracks.find(track => trackKey(track.artist, track.title) === selectedTrackKey) ?? data.top_tracks[0],
    [data.top_tracks, selectedTrackKey]);

  const selectedTrackRank = useMemo(() =>
    selectedTrack
      ? data.top_tracks.findIndex(track => trackKey(track.artist, track.title) === trackKey(selectedTrack.artist, selectedTrack.title)) + 1
      : 0,
    [data.top_tracks, selectedTrack]);

  const selectedTrackArtist = useMemo(() =>
    selectedTrack ? data.top_artists.find(artist => artist.name === selectedTrack.artist) : undefined,
    [data.top_artists, selectedTrack]);

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

  const selectedAlbum = useMemo(() =>
    data.top_albums.find(album => albumKey(album.artist, album.title) === selectedAlbumKey) ?? data.top_albums[0],
    [data.top_albums, selectedAlbumKey]);

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
    selectedAlbum ? data.top_artists.find(artist => artist.name === selectedAlbum.artist) : undefined,
    [data.top_artists, selectedAlbum]);

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

  const selectedArtist = useMemo(() =>
    data.top_artists.find(a => a.name === selectedArtistName) ?? data.top_artists[0],
    [data.top_artists, selectedArtistName]);

  const selectedProfile = useMemo(() =>
    selectedArtist ? getArtistEnrichment(selectedArtist.name) : undefined,
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
  const yearlyData = data.yearly_eras.map(e => ({ year: String(e.year), plays: e.plays, artistas: e.unique_artists }));

  const genreMap: Record<string, number> = {};
  data.top_artists.forEach(a => { const g = normalizeGenre(a.genre); genreMap[g] = (genreMap[g] || 0) + a.plays; });
  const genreData = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, plays]) => ({ name, plays }));

  /* ── Treemap ── */
  const treemapChildren = genreData.slice(0, 10).map(g => ({ name: g.name, size: g.plays, plays: g.plays }));
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
            fill="#9ca3af">{plays.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}</text>
        )}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl px-4 py-3 text-xs font-mono shadow-lg"
        style={{ backgroundColor: '#070e1c', border: `1px solid ${tc.c1}40` }}>
        <p className="text-white font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color ?? tc.c1 }}>
            {p.name}: <span className="text-white">{Number(p.value).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}</span>
          </p>
        ))}
      </div>
    );
  };

  const ListRow = ({
    rank, main, sub, plays, color, avatarName, flagCountry, onClick, active = false, coverTitle, coverKind, moodColor,
  }: {
    rank: number;
    main: string;
    sub?: string;
    plays: number;
    color: string;
    avatarName?: string;
    flagCountry?: string;
    onClick?: () => void;
    active?: boolean;
    /** When set (with coverKind), show album/track artwork instead of the artist photo. */
    coverTitle?: string;
    coverKind?: 'album' | 'track';
    /** Emotional-engine mood color: renders a glowing identity dot next to the name. */
    moodColor?: string;
  }) => {
    const rowBody = (
      <>
        <div className="flex items-center space-x-3 truncate min-w-0">
          <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-xs font-black font-mono"
            style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>
            {rank}
          </span>
          {coverTitle && coverKind && avatarName
            ? <CoverArt artist={avatarName} title={coverTitle} kind={coverKind} size={36} />
            : avatarName && <ArtistAvatar name={avatarName} size={32} />}
          <div className="truncate">
            <p className="text-sm font-bold text-white truncate leading-tight flex items-center gap-1.5">
              {moodColor && (
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: moodColor, boxShadow: `0 0 6px ${moodColor}` }} />
              )}
              {main}
            </p>
            {sub && (
              <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5">
                {flagCountry && <FlagArt country={flagCountry} size={15} />}
                {sub}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full"
            style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
            {fmtNum(plays)}
          </span>
          {onClick && (
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          )}
        </div>
      </>
    );

    const rowClassName = [
      'flex w-full items-center justify-between p-3 rounded-2xl transition-all group text-left',
      onClick ? 'hover:bg-white/5 cursor-pointer' : 'hover:bg-white/3',
      active ? 'bg-white/7 shadow-lg' : '',
    ].join(' ');

    const rowStyle = {
      border: `1px solid ${active ? `${color}66` : 'rgba(255,255,255,0.04)'}`,
      boxShadow: active ? `0 0 24px ${color}14` : undefined,
    };

    if (onClick) {
      return (
        <motion.button type="button" variants={itemVariants} onClick={onClick}
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

  const InfoBlock = ({ title, body, icon: Icon, color }: { title: string; body: string; icon: React.ElementType; color: string }) => (
    <div className="rounded-2xl p-4 bg-white/[0.035] border border-white/8">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <h4 className="text-[11px] font-mono uppercase tracking-widest font-bold" style={{ color }}>
          {title}
        </h4>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{body}</p>
    </div>
  );

  const EvidencePill = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <div className="rounded-2xl bg-white/[0.035] border border-white/8 p-3 min-h-[76px]">
      <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-black font-mono text-white" style={{ color }}>{value}</p>
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
        <div
          className={`rounded-2xl border border-white/8 p-3 ${archivedAlbum ? 'bg-white/[0.035]' : 'bg-white/[0.025]'}`}
          style={{ boxShadow: archivedAlbum ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${color}12` : undefined }}
        >
          {content}
        </div>
      </div>
    );
  };

  const TrackDossier = () => {
    if (!selectedTrack) {
      return (
        <div className="glass-panel p-6 rounded-3xl">
          <p className="text-sm text-gray-400">{artistCopy.noTrackSelected}</p>
        </div>
      );
    }

    const trackArtistName = selectedTrackProfile?.name ?? selectedTrack.artist;
    const trackDisplayCountry = selectedTrackProfile?.country[lang] ?? selectedTrackArtist?.country ?? '';
    const trackFlagCountry = selectedTrackProfile?.country.en ?? selectedTrackArtist?.country ?? '';

    return (
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest" style={{ color: tc.c2 }}>
            {artistCopy.trackDossier}
          </h3>
        </div>

        <div className="flex items-start gap-4">
          <CoverArt artist={selectedTrack.artist} title={selectedTrack.title} kind="track" size={72} />
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
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
              {selectedTrack.title}
            </h3>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              {trackFlagCountry && <FlagArt country={trackFlagCountry} size={17} />}
              <span>{trackArtistName}</span>
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

        <p className="text-sm md:text-[15px] text-gray-300 leading-relaxed">
          {selectedTrackProfile?.why_it_matters[lang] ?? artistCopy.trackContextBody}
        </p>

        <EmotionalEnginePanel
          reading={selectedTrackReading}
          title={artistCopy.trackLongRead}
          color={tc.c2}
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
              onClick={() => {
                setSelectedArtistName(selectedTrackArtist?.name ?? selectedTrack.artist);
                setTab('artistas');
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
    <div className="glass-panel p-6 rounded-3xl space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" style={{ color: tc.c1 }} />
        <h3 className="text-sm font-mono font-bold uppercase tracking-widest" style={{ color: tc.c1 }}>
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
                  <div className="absolute -inset-3 rounded-[2rem] blur-2xl opacity-50"
                    style={{ background: `linear-gradient(135deg, ${selectedMoodColor ?? tc.c1}, ${tc.c3})` }} />
                  <div className="relative rounded-[1.65rem] border bg-black/35 p-2"
                    style={{ borderColor: selectedMoodColor ? `${selectedMoodColor}45` : 'rgba(255,255,255,0.15)' }}>
                    <ArtistAvatar name={selectedArtist.name} size={88} />
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
                  <h3 className="text-3xl md:text-4xl font-black text-white leading-tight text-neon-glow">
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
                      <div
                        key={`${album.artist}-${album.title}`}
                        className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                        title={`${album.title} · ${fmtNum(album.plays)} ${artistCopy.archivePlays}`}
                      >
                        <CoverArt artist={album.artist} title={album.title} kind="album" size={56} className="rounded-2xl" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-1 text-center text-[9px] font-mono font-black text-white backdrop-blur-sm">
                          {albumMeta?.year ? `’${String(albumMeta.year).slice(-2)}` : `#${idx + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {!selectedArtistAlbums.length && (
                  <p className="text-xs text-gray-500 leading-relaxed">{artistCopy.noAlbums}</p>
                )}
              </div>
            </div>
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
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Status</p>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{selectedProfile?.status[lang] ?? artistCopy.noProfileTitle}</p>
            </div>
          </div>

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
                    <div key={`${album.artist}-${album.title}`} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{album.title}</p>
                        <p className="text-gray-500 font-mono">{albumMeta?.year ?? '-'} · #{idx + 1}</p>
                      </div>
                      <span className="font-mono font-bold shrink-0" style={{ color: tc.c2 }}>{fmtNum(album.plays)}</span>
                    </div>
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
                  <div key={`${track.artist}-${track.title}`} className="flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{track.title}</p>
                      <p className="text-gray-500 font-mono">#{idx + 1} · {track.genre}</p>
                    </div>
                    <span className="font-mono font-bold shrink-0" style={{ color: tc.c3 }}>{fmtNum(track.plays)}</span>
                  </div>
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
        <div className="glass-panel p-6 rounded-3xl">
          <p className="text-sm text-gray-400">{artistCopy.noAlbums}</p>
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
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex items-center gap-2">
          <Disc3 className="w-5 h-5" style={{ color: tc.c3 }} />
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest" style={{ color: tc.c3 }}>
            {artistCopy.albumDossier}
          </h3>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-5 md:p-6">
          <div className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              background: `radial-gradient(circle at 14% 18%, ${tc.c3}28, transparent 34%), radial-gradient(circle at 88% 10%, ${tc.c1}18, transparent 30%), linear-gradient(135deg, ${tc.c3}08, ${tc.c1}06 45%, transparent)`,
            }} />
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] gap-6 items-center">
            <div className="flex items-start gap-4 md:gap-5">
              <div className="relative shrink-0">
                <div className="absolute -inset-3 rounded-[2rem] blur-2xl opacity-50"
                  style={{ background: `linear-gradient(135deg, ${tc.c3}, ${tc.c1})` }} />
                <div className="relative rounded-[1.75rem] border border-white/15 bg-black/35 p-2">
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
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-white leading-tight">
                  {selectedAlbum.title}
                </h3>
                <p className="text-sm text-gray-400 mt-2 flex items-center gap-2 flex-wrap">
                  {albumFlagCountry && <FlagArt country={albumFlagCountry} size={17} />}
                  <span>{albumArtistName}</span>
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

        <EmotionalEnginePanel
          reading={selectedAlbumReading}
          title={artistCopy.albumLongRead}
          color={tc.c3}
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6" style={{ color: tc.c1 }} />
          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
            {t.topHistorico.title}
          </h2>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.topHistorico.searchPlaceholder}
            className="bg-white/5 border rounded-xl pl-9 pr-8 py-2 text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all w-52"
            style={{ borderColor: search ? tc.c1 : 'rgba(255,255,255,0.1)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-white transition-colors" />
            </button>
          )}
        </div>
      </div>

      <SectionNarrative content={t.deepNarratives.top} accent="c2" />

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id as TopTab)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider shrink-0 transition-all border"
              style={active ? {
                background: `linear-gradient(135deg, ${tc.c1}20, ${tc.c3}10)`,
                borderColor: tc.c1, color: tc.c1,
                boxShadow: `0 0 15px ${tc.c1}20`,
              } : { borderColor: 'rgba(255,255,255,0.08)', color: '#6b7280' }}>
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={tabTransition}>

          {/* ARTISTAS */}
          {tab === 'artistas' && (
            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-8">
              <div className="glass-panel p-6 rounded-3xl">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase tracking-widest"
                      style={{ color: tc.c1 }}>
                      {t.topHistorico.top50Artists}
                      {search && <span className="text-gray-400 ml-2">({t.topHistorico.resultsCount(filteredArtists.length)})</span>}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{artistCopy.selectedHint}</p>
                  </div>
                  <BookOpen className="w-5 h-5 shrink-0" style={{ color: tc.c1 }} />
                </div>
                <motion.div variants={listVariants} initial="initial" animate="animate"
                  className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                  {filteredArtists.slice(0, 50).map((a, idx) => (
                    <ListRow key={a.name} rank={idx + 1} main={a.name}
                      sub={`${a.country} · ${a.genre}`} plays={a.plays}
                      color={COLORS[idx % COLORS.length]} avatarName={a.name} flagCountry={a.country}
                      moodColor={artistMoodColors.get(a.name)}
                      onClick={() => setSelectedArtistName(a.name)}
                      active={selectedArtist?.name === a.name} />
                  ))}
                </motion.div>
              </div>

              <div className="space-y-6">
                <ArtistDossier />

                <div className="glass-panel p-6 rounded-3xl">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                    style={{ color: tc.c2 }}>
                    {artistCopy.topChart}
                  </h3>
                  <div className="h-[440px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.top_artists.slice(0, 20)} layout="vertical"
                        margin={{ left: 0, right: 32, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" horizontal={false} />
                        <XAxis type="number" stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                        <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11}
                          width={145} tick={{ fill: '#d1d5db' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="plays" name={t.topHistorico.playsLegend} radius={[0, 6, 6, 0]}>
                          {data.top_artists.slice(0, 20).map((artist, i) => (
                            <Cell key={artist.name} fill={selectedArtist?.name === artist.name ? tc.c1 : (i < 3 ? tc.c2 : tc.c3)} fillOpacity={selectedArtist?.name === artist.name || i < 3 ? 1 : 0.65} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CANCIONES */}
          {tab === 'canciones' && (
            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] gap-8">
              <div className="glass-panel p-6 rounded-3xl">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase tracking-widest"
                      style={{ color: tc.c2 }}>
                      {t.topHistorico.top50Tracks}
                      {search && <span className="text-gray-400 ml-2">({filteredTracks.length})</span>}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{artistCopy.selectedTrackHint}</p>
                  </div>
                  <ListMusic className="w-5 h-5 shrink-0" style={{ color: tc.c2 }} />
                </div>
                <motion.div variants={listVariants} initial="initial" animate="animate"
                  className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
                  {filteredTracks.slice(0, 50).map((track, idx) => (
                    <ListRow key={`${track.artist}-${track.title}`} rank={idx + 1} main={track.title}
                      sub={`${track.artist} · ${track.genre}`} plays={track.plays}
                      color={COLORS[idx % COLORS.length]} avatarName={track.artist}
                      coverTitle={track.title} coverKind="track"
                      onClick={() => setSelectedTrackKey(trackKey(track.artist, track.title))}
                      active={selectedTrack ? trackKey(track.artist, track.title) === trackKey(selectedTrack.artist, selectedTrack.title) : false} />
                  ))}
                </motion.div>
              </div>

              <div className="space-y-6">
                <TrackDossier />

                <div className="glass-panel p-6 rounded-3xl">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                    style={{ color: tc.c2 }}>
                    {t.topHistorico.top20Chart}
                  </h3>
                  <div className="h-[440px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.top_tracks.slice(0, 20).map(track => ({ ...track, name: track.title }))}
                        layout="vertical" margin={{ left: 0, right: 32, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" horizontal={false} />
                        <XAxis type="number" stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                        <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11}
                          width={145} tick={{ fill: '#d1d5db' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="plays" radius={[0, 6, 6, 0]}>
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ALBUMS */}
          {tab === 'albums' && (
            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] gap-8">
              <div className="glass-panel p-6 rounded-3xl">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase tracking-widest"
                      style={{ color: tc.c3 }}>
                      {t.topHistorico.top50Albums}
                      {search && <span className="text-gray-400 ml-2">({filteredAlbums.length})</span>}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{artistCopy.selectedAlbumHint}</p>
                  </div>
                  <Disc3 className="w-5 h-5 shrink-0" style={{ color: tc.c3 }} />
                </div>
                <motion.div variants={listVariants} initial="initial" animate="animate"
                  className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
                  {filteredAlbums.slice(0, 50).map((a, idx) => {
                    const albumProfile = getArtistEnrichment(a.artist);
                    const releaseYear = albumReleaseLabel(a, albumProfile);
                    return (
                      <ListRow key={`${a.artist}-${a.title}`} rank={idx + 1} main={a.title}
                        sub={releaseYear ? `${a.artist} · ${artistCopy.released} ${releaseYear}` : a.artist}
                        plays={a.plays} color={COLORS[idx % COLORS.length]} avatarName={a.artist}
                        coverTitle={a.title} coverKind="album"
                        onClick={() => setSelectedAlbumKey(albumKey(a.artist, a.title))}
                        active={selectedAlbum ? albumKey(a.artist, a.title) === albumKey(selectedAlbum.artist, selectedAlbum.title) : false} />
                    );
                  })}
                </motion.div>
              </div>

              <AlbumDossier />
            </div>
          )}

          {/* GÉNEROS */}
          {tab === 'generos' && (
            <div className="space-y-8">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c2 }}>
                  {t.topHistorico.tabGenres}
                </h3>
                <div className="flex flex-wrap gap-5">
                  {genreData.slice(0, 10).map(g => (
                    <GenreArt key={g.name} genre={g.name} size={68} showLabel />
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c1 }}>
                  {t.topHistorico.genreTreemap}
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap data={treemapChildren} dataKey="size"
                      content={<CustomTreemapContent />} isAnimationActive />
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c4 }}>
                  {t.topHistorico.genreBreakdown}
                </h3>
                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genreData} layout="vertical"
                      margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" horizontal={false} />
                      <XAxis type="number" stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                      <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={10}
                        width={160} tick={{ fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="plays" name={t.topHistorico.playsLegend} radius={[0, 6, 6, 0]}>
                        {genreData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* AÑOS */}
          {tab === 'anos' && (
            <div className="space-y-8">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-6"
                  style={{ color: tc.c1 }}>
                  {t.topHistorico.playsByYear}
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearlyData} margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="topGradYear" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={tc.c1} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={tc.c1} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="topGradArt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={tc.c3} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={tc.c3} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" />
                      <XAxis dataKey="year" stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
                      <YAxis stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="plays" name={t.topHistorico.playsLegend}
                        stroke={tc.c1} strokeWidth={2.5} fill="url(#topGradYear)"
                        dot={{ fill: tc.c1, r: 4 }} activeDot={{ r: 7 }} />
                      <Area type="monotone" dataKey="artistas" name={t.topHistorico.uniqueArtistsLegend}
                        stroke={tc.c3} strokeWidth={2} fill="url(#topGradArt)"
                        dot={{ fill: tc.c3, r: 3 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.yearly_eras.map((era, idx) => (
                  <motion.div key={era.year} variants={itemVariants} initial="initial" animate="animate"
                    transition={{ delay: idx * 0.05 }}
                    className="glass-panel p-4 rounded-2xl space-y-2 border-t-2"
                    style={{ borderTopColor: COLORS[idx % COLORS.length] }}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-base font-black text-white">{era.year}</span>
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                        {fmtNum(era.plays)}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-200 leading-tight">{localizeEraLabel(era.era_label, lang)}</p>
                    <p className="text-[10px] text-gray-500 font-mono">♪ {era.top_artist}</p>
                    <div className="pt-1 border-t border-white/5 text-[9px] text-gray-600 font-mono">
                      {t.topHistorico.eraDiversityLine(era.diversity_index, era.unique_artists)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
