import React, { useId } from 'react';

import type { MusicDnaData } from '../types';
import { getArtistOriginGeography } from '../utils/analytics';
import './MuseumChapterHeader.css';

export type MuseumChapterTab =
  | 'dashboard'
  | 'aiassistant'
  | 'eras'
  | 'top'
  | 'timecapsule'
  | 'personality'
  | 'emotions'
  | 'cultural'
  | 'inner'
  | 'artist'
  | 'obsessions'
  | 'insights'
  | 'achievements'
  | 'wrapped'
  | 'pulse'
  | 'compare'
  | 'museums'
  | 'platforms'
  | 'quality'
  | 'statsdeep'
  | 'report';

type ChapterMotif =
  | 'atlas'
  | 'neural'
  | 'timeline'
  | 'crown'
  | 'hourglass'
  | 'orbit'
  | 'wave'
  | 'globe'
  | 'prism'
  | 'star'
  | 'spiral'
  | 'anomaly'
  | 'medal'
  | 'burst'
  | 'signal'
  | 'bridge'
  | 'constellation'
  | 'devices'
  | 'shield'
  | 'spectrum'
  | 'archive';

type MetricKind =
  | 'plays'
  | 'artists'
  | 'tracks'
  | 'albums'
  | 'hours'
  | 'activeDays'
  | 'years'
  | 'peakYear'
  | 'topArtist'
  | 'topArtistPlays'
  | 'topGenre'
  | 'countries'
  | 'topCountry'
  | 'obsessions'
  | 'streak'
  | 'maxDay'
  | 'matchRate'
  | 'sessions'
  | 'sources'
  | 'platforms';

interface LocalizedText {
  es: string;
  en: string;
}

interface ChapterDefinition {
  number: string;
  emoji: string;
  eyebrow: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  palette: readonly [string, string, string];
  motif: ChapterMotif;
  metrics: readonly [MetricKind, MetricKind];
}

interface MuseumChapterHeaderProps {
  activeTab: string;
  data: MusicDnaData;
  lang: 'es' | 'en';
}

interface ChapterMetric {
  label: string;
  value: string;
}

const CHAPTERS: Record<MuseumChapterTab, ChapterDefinition> = {
  dashboard: {
    number: '01', emoji: '🧭', motif: 'atlas', palette: ['#22d3ee', '#818cf8', '#f472b6'], metrics: ['plays', 'artists'],
    eyebrow: { es: 'Panorama maestro', en: 'Master overview' },
    title: { es: 'Sala de Control', en: 'The Control Room' },
    description: { es: 'Tu archivo completo se ordena como una exposición viva.', en: 'Your complete archive, arranged as a living exhibition.' },
  },
  aiassistant: {
    number: '02', emoji: '🔮', motif: 'neural', palette: ['#a78bfa', '#f72585', '#22d3ee'], metrics: ['artists', 'tracks'],
    eyebrow: { es: 'Inteligencia curatorial', en: 'Curatorial intelligence' },
    title: { es: 'Oráculo de Escucha', en: 'The Listening Oracle' },
    description: { es: 'Conversaciones guiadas por las huellas reales de tu colección.', en: 'Conversations guided by the real traces inside your collection.' },
  },
  eras: {
    number: '03', emoji: '⏳', motif: 'timeline', palette: ['#60a5fa', '#f59e0b', '#f472b6'], metrics: ['years', 'peakYear'],
    eyebrow: { es: 'Cronología personal', en: 'Personal chronology' },
    title: { es: 'Archivo de Eras', en: 'The Era Archive' },
    description: { es: 'Cada año conserva un clima, un protagonista y una transformación.', en: 'Every year preserves a mood, a protagonist and a transformation.' },
  },
  top: {
    number: '04', emoji: '🏆', motif: 'crown', palette: ['#facc15', '#f97316', '#ef4444'], metrics: ['topArtist', 'topArtistPlays'],
    eyebrow: { es: 'Colección permanente', en: 'Permanent collection' },
    title: { es: 'Panteón Sonoro', en: 'The Sonic Pantheon' },
    description: { es: 'Los nombres y canciones que ganaron un lugar permanente.', en: 'The names and songs that earned a permanent place.' },
  },
  timecapsule: {
    number: '05', emoji: '🕰️', motif: 'hourglass', palette: ['#818cf8', '#f472b6', '#38bdf8'], metrics: ['years', 'hours'],
    eyebrow: { es: 'Memoria en movimiento', en: 'Memory in motion' },
    title: { es: 'Cámara del Tiempo', en: 'The Time Chamber' },
    description: { es: 'Momentos distantes vuelven a sonar dentro de una sola línea vital.', en: 'Distant moments sound again along one continuous life line.' },
  },
  personality: {
    number: '06', emoji: '🧠', motif: 'orbit', palette: ['#a78bfa', '#22d3ee', '#f0abfc'], metrics: ['topGenre', 'artists'],
    eyebrow: { es: 'Espejo conductual', en: 'Behavioral mirror' },
    title: { es: 'Espejo de Personalidad', en: 'The Personality Mirror' },
    description: { es: 'Tus patrones musicales se convierten en rasgos, tensiones y fortalezas.', en: 'Your musical patterns become traits, tensions and strengths.' },
  },
  emotions: {
    number: '07', emoji: '💗', motif: 'wave', palette: ['#fb7185', '#f0abfc', '#818cf8'], metrics: ['topGenre', 'hours'],
    eyebrow: { es: 'Frecuencia afectiva', en: 'Emotional frequency' },
    title: { es: 'Galería Emocional', en: 'The Emotional Gallery' },
    description: { es: 'La intensidad de tu escucha dibuja un paisaje de energía y refugio.', en: 'The intensity of your listening draws a landscape of energy and refuge.' },
  },
  cultural: {
    number: '08', emoji: '🌍', motif: 'globe', palette: ['#34d399', '#38bdf8', '#fbbf24'], metrics: ['countries', 'topCountry'],
    eyebrow: { es: 'Geografía de artistas', en: 'Artist geography' },
    title: { es: 'Atlas de Orígenes', en: 'The Atlas of Origins' },
    description: { es: 'Un mapa de los lugares que alimentan tu universo musical.', en: 'A map of the places that feed your musical universe.' },
  },
  inner: {
    number: '09', emoji: '🎨', motif: 'prism', palette: ['#f472b6', '#8b5cf6', '#22d3ee'], metrics: ['hours', 'activeDays'],
    eyebrow: { es: 'Paisaje simbólico', en: 'Symbolic landscape' },
    title: { es: 'Paisaje Interior', en: 'The Inner Landscape' },
    description: { es: 'Color, arquetipos y atmósfera revelan la forma de tu mundo íntimo.', en: 'Color, archetypes and atmosphere reveal the shape of your inner world.' },
  },
  artist: {
    number: '10', emoji: '✨', motif: 'star', palette: ['#fbbf24', '#22d3ee', '#f472b6'], metrics: ['topArtist', 'topGenre'],
    eyebrow: { es: 'Alter ego creativo', en: 'Creative alter ego' },
    title: { es: 'Identidad de Artista', en: 'The Artist Identity' },
    description: { es: 'Tu historial imagina una voz, una estética y un escenario propios.', en: 'Your history imagines a voice, an aesthetic and a stage of your own.' },
  },
  obsessions: {
    number: '11', emoji: '🔁', motif: 'spiral', palette: ['#fb923c', '#ef4444', '#facc15'], metrics: ['obsessions', 'streak'],
    eyebrow: { es: 'Gravedad repetitiva', en: 'Repeat gravity' },
    title: { es: 'Bucle de Obsesiones', en: 'The Obsession Loop' },
    description: { es: 'Las repeticiones dejan de ser números y se vuelven rituales.', en: 'Repeats stop being numbers and become rituals.' },
  },
  insights: {
    number: '12', emoji: '🕵️', motif: 'anomaly', palette: ['#f43f5e', '#f97316', '#a78bfa'], metrics: ['matchRate', 'tracks'],
    eyebrow: { es: 'Señales bajo la superficie', en: 'Signals beneath the surface' },
    title: { es: 'Cámara Oculta', en: 'The Hidden Chamber' },
    description: { es: 'Anomalías y conexiones inesperadas emergen del archivo.', en: 'Anomalies and unexpected connections emerge from the archive.' },
  },
  achievements: {
    number: '13', emoji: '🥇', motif: 'medal', palette: ['#f59e0b', '#facc15', '#fb7185'], metrics: ['streak', 'maxDay'],
    eyebrow: { es: 'Hitos de escucha', en: 'Listening milestones' },
    title: { es: 'Salón de Logros', en: 'The Hall of Achievements' },
    description: { es: 'Tus extremos, constancia y récords reciben su propia vitrina.', en: 'Your extremes, consistency and records receive their own display case.' },
  },
  wrapped: {
    number: '14', emoji: '🎁', motif: 'burst', palette: ['#ec4899', '#facc15', '#8b5cf6'], metrics: ['plays', 'peakYear'],
    eyebrow: { es: 'Celebración condensada', en: 'Condensed celebration' },
    title: { es: 'Ritual Wrapped', en: 'The Wrapped Ritual' },
    description: { es: 'Una síntesis brillante de lo que más definió tu recorrido.', en: 'A vivid synthesis of what defined your journey most.' },
  },
  pulse: {
    number: '15', emoji: '📡', motif: 'signal', palette: ['#22d3ee', '#10b981', '#818cf8'], metrics: ['maxDay', 'activeDays'],
    eyebrow: { es: 'Señal en presente', en: 'Present-tense signal' },
    title: { es: 'Pulso Reciente', en: 'The Recent Pulse' },
    description: { es: 'La actividad más cercana revela hacia dónde se mueve tu gusto.', en: 'Your nearest activity reveals where your taste is moving.' },
  },
  compare: {
    number: '16', emoji: '⚖️', motif: 'bridge', palette: ['#1DB954', '#e8334a', '#38bdf8'], metrics: ['sources', 'plays'],
    eyebrow: { es: 'Fuentes en diálogo', en: 'Sources in dialogue' },
    title: { es: 'Sala de Contrastes', en: 'The Contrast Room' },
    description: { es: 'Plataformas distintas cuentan versiones complementarias de la misma historia.', en: 'Different platforms tell complementary versions of the same story.' },
  },
  museums: {
    number: '17', emoji: '🪞', motif: 'constellation', palette: ['#84cc16', '#0ea5e9', '#f472b6'], metrics: ['artists', 'albums'],
    eyebrow: { es: 'Colecciones paralelas', en: 'Parallel collections' },
    title: { es: 'Museos Paralelos', en: 'Parallel Museums' },
    description: { es: 'Dos archivos se encuentran para mostrar coincidencias y singularidades.', en: 'Two archives meet to reveal overlaps and singularities.' },
  },
  platforms: {
    number: '18', emoji: '🎛️', motif: 'devices', palette: ['#38bdf8', '#10b981', '#f59e0b'], metrics: ['platforms', 'sources'],
    eyebrow: { es: 'Infraestructura de escucha', en: 'Listening infrastructure' },
    title: { es: 'Mesa de Dispositivos', en: 'The Device Console' },
    description: { es: 'Contextos, plataformas y formatos trazan cómo llega la música a ti.', en: 'Contexts, platforms and formats trace how music reaches you.' },
  },
  quality: {
    number: '19', emoji: '🛡️', motif: 'shield', palette: ['#2dd4bf', '#60a5fa', '#a78bfa'], metrics: ['matchRate', 'tracks'],
    eyebrow: { es: 'Transparencia del archivo', en: 'Archive transparency' },
    title: { es: 'Laboratorio de Evidencia', en: 'The Evidence Lab' },
    description: { es: 'Cobertura, límites y confianza permanecen visibles junto a los hallazgos.', en: 'Coverage, limits and confidence remain visible beside every finding.' },
  },
  statsdeep: {
    number: '20', emoji: '📊', motif: 'spectrum', palette: ['#38bdf8', '#a78bfa', '#f472b6'], metrics: ['activeDays', 'sessions'],
    eyebrow: { es: 'Observación de alta resolución', en: 'High-resolution observation' },
    title: { es: 'Observatorio Estadístico', en: 'The Statistics Observatory' },
    description: { es: 'Ritmos, densidad y evolución se estudian con el máximo detalle.', en: 'Rhythm, density and evolution are studied at maximum detail.' },
  },
  report: {
    number: '21', emoji: '📜', motif: 'archive', palette: ['#c084fc', '#60a5fa', '#fbbf24'], metrics: ['plays', 'hours'],
    eyebrow: { es: 'Conclusión curatorial', en: 'Curatorial conclusion' },
    title: { es: 'Archivo Final', en: 'The Final Archive' },
    description: { es: 'La exposición termina en un retrato completo, listo para conservar.', en: 'The exhibition closes with a complete portrait, ready to preserve.' },
  },
};

export const MUSEUM_CHAPTER_TABS = Object.freeze(Object.keys(CHAPTERS) as MuseumChapterTab[]);

function formatNumber(value: number, lang: 'es' | 'en') {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 0 }).format(value);
}

function getMetric(kind: MetricKind, data: MusicDnaData, lang: 'es' | 'en'): ChapterMetric {
  const es = lang === 'es';
  const core = data.core_metrics;
  const eras = data.yearly_eras ?? [];
  const years = eras.map(era => era.year).filter(Number.isFinite);
  const minYear = years.length > 0 ? Math.min(...years) : core.max_year;
  const maxYear = years.length > 0 ? Math.max(...years) : core.max_year;
  const peakEra = [...eras].sort((a, b) => b.plays - a.plays)[0];
  const topArtist = data.top_artists?.[0];
  const sourceSummary = data.source_summary;
  const sourceCount = sourceSummary
    ? [sourceSummary.lastfm_plays, sourceSummary.spotify_plays, sourceSummary.youtube_plays, sourceSummary.apple_music_plays, sourceSummary.listenbrainz_plays]
      .filter(value => value > 0).length
    : 0;
  const platformCount = new Set((data.platform_breakdown ?? []).filter(item => item.plays > 0).map(item => item.platform)).size;

  const numeric = (value: number) => formatNumber(value, lang);

  switch (kind) {
    case 'plays': return { label: es ? 'reproducciones' : 'total plays', value: numeric(core.total_plays) };
    case 'artists': return { label: es ? 'artistas únicos' : 'unique artists', value: numeric(core.unique_artists) };
    case 'tracks': return { label: es ? 'canciones únicas' : 'unique tracks', value: numeric(core.unique_tracks) };
    case 'albums': return { label: es ? 'álbumes únicos' : 'unique albums', value: numeric(core.unique_albums) };
    case 'hours': return { label: es ? 'horas de escucha' : 'listening hours', value: numeric(core.listening_hours) };
    case 'activeDays': return { label: es ? 'días activos' : 'active days', value: numeric(core.active_days) };
    case 'years': return { label: es ? 'arco temporal' : 'time span', value: minYear === maxYear ? String(maxYear) : `${minYear}—${maxYear}` };
    case 'peakYear': return { label: es ? 'año de máxima actividad' : 'peak activity year', value: String(peakEra?.year ?? core.max_year) };
    case 'topArtist': return { label: es ? 'obra central' : 'central artist', value: topArtist?.name ?? '—' };
    case 'topArtistPlays': return { label: es ? 'plays del artista #1' : '#1 artist plays', value: numeric(topArtist?.plays ?? 0) };
    case 'topGenre': return { label: es ? 'lenguaje dominante' : 'dominant language', value: data.top_genres?.[0]?.name ?? topArtist?.genre ?? '—' };
    case 'countries': {
      const originGeography = getArtistOriginGeography(data);
      return { label: es ? 'países con origen resuelto' : 'resolved origin countries', value: numeric(originGeography.countries.length) };
    }
    case 'topCountry': {
      const originGeography = getArtistOriginGeography(data);
      return { label: es ? 'origen principal' : 'leading origin', value: originGeography.countries[0]?.country ?? '—' };
    }
    case 'obsessions': return { label: es ? 'obsesiones detectadas' : 'detected obsessions', value: numeric(data.obsessions?.length ?? 0) };
    case 'streak': return { label: es ? 'días de racha máxima' : 'longest streak days', value: numeric(data.records?.longest_streak_days ?? 0) };
    case 'maxDay': return { label: es ? 'plays en el día récord' : 'plays on the record day', value: numeric(data.records?.max_day_plays ?? 0) };
    case 'matchRate': return { label: es ? 'cobertura de coincidencias' : 'match coverage', value: `${core.match_rate_pct.toLocaleString(es ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 })}%` };
    case 'sessions': return { label: es ? 'sesiones analizadas' : 'analyzed sessions', value: numeric(data.sessions?.length ?? 0) };
    case 'sources': return { label: es ? 'fuentes con actividad' : 'active sources', value: numeric(sourceCount) };
    case 'platforms': return { label: es ? 'plataformas detectadas' : 'detected platforms', value: numeric(platformCount) };
  }
}

function MotifGeometry({ motif }: { motif: ChapterMotif }) {
  switch (motif) {
    case 'atlas': return (
      <>
        {[0, 1, 2].map(row => [0, 1, 2, 3].map(column => (
          <rect key={`${row}-${column}`} className="museum-chapter__shape" x={52 + column * 58} y={34 + row * 50} width="38" height="28" rx="8" />
        )))}
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M72 148C138 104 190 154 256 64" />
        <circle className="museum-chapter__node" cx="256" cy="64" r="8" />
      </>
    );
    case 'neural': return (
      <>
        <path className="museum-chapter__line museum-chapter__dash" d="M48 122L104 58l58 80 52-92 70 66" />
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M104 58l110-12m-52 92 122-26M48 122l114 16" />
        {[[48, 122], [104, 58], [162, 138], [214, 46], [284, 112]].map(([cx, cy], index) => (
          <circle key={cx} className={index === 2 ? 'museum-chapter__node museum-chapter__pulse' : 'museum-chapter__node'} cx={cx} cy={cy} r={index === 2 ? 13 : 8} />
        ))}
      </>
    );
    case 'timeline': return (
      <>
        <path className="museum-chapter__line museum-chapter__dash" d="M34 112H306" />
        {[54, 108, 166, 226, 286].map((cx, index) => (
          <g key={cx} className={index === 3 ? 'museum-chapter__pulse' : undefined}>
            <circle className="museum-chapter__node" cx={cx} cy="112" r={index === 3 ? 13 : 7} />
            <path className="museum-chapter__line museum-chapter__line--secondary" d={`M${cx} 88V${index % 2 ? 62 : 72}`} />
          </g>
        ))}
      </>
    );
    case 'crown': return (
      <>
        <path className="museum-chapter__shape museum-chapter__float" d="M54 142L38 62l62 40 66-68 64 68 66-40-18 80z" />
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M54 142H278M84 166h164" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="166" cy="34" r="8" />
      </>
    );
    case 'hourglass': return (
      <>
        <path className="museum-chapter__line" d="M104 34h124M104 174h124M116 36c0 48 48 54 48 68s-48 24-48 68m100-136c0 48-48 54-48 68s48 24 48 68" />
        <path className="museum-chapter__shape museum-chapter__pulse" d="M140 76h52l-26 29z" />
        <path className="museum-chapter__line museum-chapter__line--secondary museum-chapter__dash" d="M166 106v35" />
      </>
    );
    case 'orbit': return (
      <>
        <g className="museum-chapter__spin">
          <ellipse className="museum-chapter__line" cx="166" cy="106" rx="122" ry="54" transform="rotate(-18 166 106)" />
          <circle className="museum-chapter__node" cx="282" cy="79" r="9" />
        </g>
        <ellipse className="museum-chapter__line museum-chapter__line--secondary" cx="166" cy="106" rx="52" ry="92" transform="rotate(28 166 106)" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="166" cy="106" r="18" />
      </>
    );
    case 'wave': return (
      <>
        {[0, 1, 2, 3].map(index => (
          <path key={index} className={`museum-chapter__line ${index % 2 ? 'museum-chapter__line--secondary' : ''} museum-chapter__dash`} d={`M34 ${72 + index * 24}C82 ${28 + index * 30} 126 ${162 - index * 8} 174 ${92 + index * 12}S258 ${54 + index * 28} 306 ${92 + index * 12}`} />
        ))}
      </>
    );
    case 'globe': return (
      <>
        <g className="museum-chapter__float">
          <circle className="museum-chapter__line" cx="166" cy="106" r="82" />
          <ellipse className="museum-chapter__line museum-chapter__line--secondary" cx="166" cy="106" rx="35" ry="82" />
          <path className="museum-chapter__line museum-chapter__line--secondary" d="M85 106h162M102 65c38 18 90 18 128 0m-128 82c38-18 90-18 128 0" />
        </g>
        <circle className="museum-chapter__node museum-chapter__pulse" cx="218" cy="70" r="8" />
      </>
    );
    case 'prism': return (
      <>
        <path className="museum-chapter__shape museum-chapter__float" d="M146 36l70 132H76z" />
        <path className="museum-chapter__line" d="M34 104h108m75 0h90" />
        {[0, 1, 2, 3].map(index => <path key={index} className="museum-chapter__line museum-chapter__line--secondary" d={`M216 104l92 ${-46 + index * 31}`} />)}
      </>
    );
    case 'star': return (
      <>
        <path className="museum-chapter__shape museum-chapter__pulse" d="M166 30l18 52 55 1-44 33 16 53-45-31-45 31 16-53-44-33 55-1z" />
        <g className="museum-chapter__spin"><ellipse className="museum-chapter__line museum-chapter__line--secondary" cx="166" cy="104" rx="126" ry="58" transform="rotate(12 166 104)" /><circle className="museum-chapter__node" cx="287" cy="119" r="7" /></g>
      </>
    );
    case 'spiral': return <path className="museum-chapter__line museum-chapter__dash" d="M288 102c0 68-80 96-142 68-68-30-76-112-20-148 48-32 120-4 122 50 2 44-52 70-86 42-26-22-12-64 20-68 24-4 44 20 32 40-8 14-30 12-34-2" />;
    case 'anomaly': return (
      <>
        <path className="museum-chapter__line museum-chapter__dash" d="M32 122h68l16-18 18 20 22-80 24 124 22-68 18 22h88" />
        <rect className="museum-chapter__line museum-chapter__line--secondary museum-chapter__float" x="142" y="28" width="72" height="156" rx="18" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="156" cy="44" r="7" />
      </>
    );
    case 'medal': return (
      <>
        <path className="museum-chapter__shape" d="M112 28h42l12 58-52 22zM220 28h-42l-12 58 52 22z" />
        <circle className="museum-chapter__line museum-chapter__pulse" cx="166" cy="126" r="58" />
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M166 96l10 21 23 3-17 16 4 23-20-11-20 11 4-23-17-16 23-3z" />
      </>
    );
    case 'burst': return (
      <>
        <g className="museum-chapter__spin">{Array.from({ length: 12 }, (_, index) => <path key={index} className="museum-chapter__line" d="M166 30v34" transform={`rotate(${index * 30} 166 106)`} />)}</g>
        <circle className="museum-chapter__shape museum-chapter__pulse" cx="166" cy="106" r="38" />
        <circle className="museum-chapter__line museum-chapter__line--secondary" cx="166" cy="106" r="70" />
      </>
    );
    case 'signal': return (
      <>
        {[0, 1, 2].map(index => <path key={index} className={`museum-chapter__line ${index ? 'museum-chapter__line--secondary' : ''} museum-chapter__dash`} d={`M${110 - index * 26} ${142 + index * 20}a${76 + index * 26} ${76 + index * 26} 0 0 1 ${112 + index * 52} 0`} />)}
        <path className="museum-chapter__line" d="M166 104v74" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="166" cy="98" r="12" />
      </>
    );
    case 'bridge': return (
      <>
        <circle className="museum-chapter__line" cx="78" cy="108" r="42" />
        <circle className="museum-chapter__line museum-chapter__line--secondary" cx="254" cy="108" r="42" />
        <path className="museum-chapter__line museum-chapter__dash" d="M118 108c30-60 66-60 96 0m-96 0c30 60 66 60 96 0" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="166" cy="61" r="8" />
      </>
    );
    case 'constellation': return (
      <>
        <path className="museum-chapter__line museum-chapter__line--secondary museum-chapter__dash" d="M46 136L98 56l74 62 52-76 64 94-116-18-74 46z" />
        {[[46, 136], [98, 56], [172, 118], [224, 42], [288, 136], [98, 164]].map(([cx, cy], index) => <circle key={cx + cy} className={index === 2 ? 'museum-chapter__node museum-chapter__pulse' : 'museum-chapter__node'} cx={cx} cy={cy} r={index === 2 ? 11 : 7} />)}
      </>
    );
    case 'devices': return (
      <>
        <rect className="museum-chapter__line" x="50" y="48" width="170" height="108" rx="14" />
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M110 180h50m-25-24v24" />
        <rect className="museum-chapter__shape museum-chapter__float" x="214" y="76" width="68" height="112" rx="16" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="248" cy="170" r="6" />
      </>
    );
    case 'shield': return (
      <>
        <path className="museum-chapter__shape museum-chapter__float" d="M166 26l94 34v56c0 46-38 72-94 92-56-20-94-46-94-92V60z" />
        <path className="museum-chapter__line museum-chapter__pulse" d="M116 112l32 31 69-72" />
      </>
    );
    case 'spectrum': return (
      <>
        {[0, 1, 2, 3, 4, 5, 6].map(index => <rect key={index} className={index % 2 ? 'museum-chapter__shape museum-chapter__shape--secondary' : 'museum-chapter__shape'} x={42 + index * 38} y={164 - (index % 4 + 1) * 27} width="22" height={(index % 4 + 1) * 27} rx="7" />)}
        <path className="museum-chapter__line museum-chapter__dash" d="M38 94l58-30 48 44 48-68 52 46 54-32" />
      </>
    );
    case 'archive': return (
      <>
        <path className="museum-chapter__shape" d="M70 48h176l28 28v106H70z" />
        <path className="museum-chapter__line" d="M246 48v30h28M104 96h128M104 124h96M104 152h114" />
        <path className="museum-chapter__line museum-chapter__line--secondary museum-chapter__dash" d="M50 68v134h204" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="274" cy="182" r="8" />
      </>
    );
  }
}

function ChapterArtwork({ motif }: { motif: ChapterMotif }) {
  return (
    <div className="museum-chapter__art" aria-hidden="true">
      <span className="museum-chapter__halo museum-chapter__halo--one" />
      <span className="museum-chapter__halo museum-chapter__halo--two" />
      <svg viewBox="0 0 332 212" focusable="false">
        <MotifGeometry motif={motif} />
      </svg>
      <span className="museum-chapter__art-caption">NOVA / {motif.toUpperCase()}</span>
    </div>
  );
}

export default function MuseumChapterHeader({ activeTab, data, lang }: MuseumChapterHeaderProps) {
  const definition = CHAPTERS[activeTab as MuseumChapterTab];
  const reactId = useId();

  if (!definition) return null;

  const copy = <K extends keyof ChapterDefinition>(key: K) => {
    const value = definition[key];
    return typeof value === 'object' && value !== null && 'es' in value ? value[lang] : value;
  };
  const primaryMetric = getMetric(definition.metrics[0], data, lang);
  const secondaryMetric = getMetric(definition.metrics[1], data, lang);
  const topShare = Math.min(0.3, Math.max(0.02, (data.top_artists?.[0]?.plays ?? 0) / Math.max(data.core_metrics.total_plays, 1)));
  const archiveDensity = Math.min(0.9, Math.max(0.18, data.core_metrics.unique_artists / Math.max(data.core_metrics.unique_tracks, 1)));
  const tempoSeconds = Math.max(9, 17 - topShare * 24);
  const headingId = `museum-chapter-${reactId.replace(/:/g, '')}`;
  const style = {
    '--chapter-primary': definition.palette[0],
    '--chapter-secondary': definition.palette[1],
    '--chapter-tertiary': definition.palette[2],
    '--chapter-grid-opacity': 0.2 + archiveDensity * 0.34,
    '--chapter-scan-opacity': 0.08 + topShare * 0.4,
    '--chapter-halo-opacity': 0.16 + topShare * 0.6,
    '--chapter-beam-tempo': `${tempoSeconds.toFixed(1)}s`,
    '--chapter-scan-tempo': `${(tempoSeconds * 1.3).toFixed(1)}s`,
    '--chapter-ring-tempo': `${(tempoSeconds * 1.4).toFixed(1)}s`,
    '--chapter-dash-tempo': `${(tempoSeconds * 0.75).toFixed(1)}s`,
    '--chapter-spin-tempo': `${(tempoSeconds * 1.8).toFixed(1)}s`,
    '--chapter-float-tempo': `${(tempoSeconds * 0.55).toFixed(1)}s`,
    '--chapter-pulse-tempo': `${(tempoSeconds * 0.32).toFixed(1)}s`,
  } as React.CSSProperties & Record<`--${string}`, string | number>;

  return (
    <section
      className="museum-chapter"
      style={style}
      aria-labelledby={headingId}
      data-testid="museum-chapter"
      data-chapter={activeTab}
      data-motif={definition.motif}
      data-density="compact"
    >
      <div className="museum-chapter__ambient" aria-hidden="true">
        <span className="museum-chapter__beam" />
        <span className="museum-chapter__scan" />
      </div>

      <div className="museum-chapter__content">
        <div className="museum-chapter__copy">
          <p className="museum-chapter__eyebrow">
            <span className="museum-chapter__emoji" aria-hidden="true">{definition.emoji}</span>
            <span>{lang === 'es' ? 'Capítulo' : 'Chapter'} {definition.number}</span>
            <span className="museum-chapter__eyebrow-separator" aria-hidden="true">/</span>
            <span>{copy('eyebrow') as string}</span>
          </p>

          <h1 id={headingId}>{copy('title') as string}</h1>
          <p className="museum-chapter__description">{copy('description') as string}</p>
        </div>

        <dl className="museum-chapter__metrics" aria-label={lang === 'es' ? 'Señales del archivo' : 'Archive signals'}>
          {[primaryMetric, secondaryMetric].map(metric => (
            <div className="museum-chapter__metric" key={`${metric.label}-${metric.value}`}>
              <dt>{metric.label}</dt>
              <dd title={metric.value}>{metric.value}</dd>
            </div>
          ))}
        </dl>

        <ChapterArtwork motif={definition.motif} />
      </div>

      <div className="museum-chapter__footer" aria-hidden="true">
        <span>NOVA MUSIC LAB</span>
        <span className="museum-chapter__footer-line" />
        <span>{definition.number} / {MUSEUM_CHAPTER_TABS.length}</span>
      </div>
    </section>
  );
}
