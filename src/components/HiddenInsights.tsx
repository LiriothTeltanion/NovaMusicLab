import React from 'react';
import { AlertCircle, HelpCircle, HeartHandshake, ShieldAlert } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { deriveSourceSummary, getNightRatio, getRecords } from '../utils/analytics';

interface HiddenInsightsProps {
  data: MusicDnaData;
}

export default function HiddenInsights({ data }: HiddenInsightsProps) {
  const metrics = data.core_metrics;
  const topArtist = data.top_artists[0];
  const supportArtists = data.top_artists.slice(1, 3);
  const anchorTracks = data.top_tracks.slice(0, 2);
  const source = deriveSourceSummary(data);
  const records = getRecords(data);
  const nightRatio = getNightRatio(data);
  const { lang, tc } = useApp();
  const L = lang === 'en';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <AlertCircle className="w-6 h-6" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {L ? 'What Your Data Reveals That You May Not Have Noticed' : 'Lo que Revelan tus Datos y Quizás No Notabas'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Insight 1: Silent Dominance */}
        <div className="glass-panel p-8 rounded-3xl space-y-4 border-l-4 border-l-cyberCyan">
          <div className="flex items-center space-x-2 text-cyberCyan">
            <HeartHandshake className="w-5 h-5" />
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
              {L ? 'The Secret Weight of Support Artists' : 'La Importancia Secreta de Artistas de Apoyo'}
            </h4>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            {L ? 'Although ' : 'Aunque '}
            <strong className="text-white">{topArtist?.name}</strong>
            {L ? ' leads the archive, artists like ' : ' domina la cima, artistas como '}
            <strong className="text-white">{supportArtists[0]?.name ?? 'tu segundo artista'}</strong>
            {' '}({supportArtists[0]?.plays?.toLocaleString('es-ES') ?? 0} plays)
            {supportArtists[1] && <> {L ? 'and ' : 'y '}<strong className="text-white">{supportArtists[1].name}</strong> ({supportArtists[1].plays.toLocaleString('es-ES')} plays)</>}
            {L ? ' reveal the stable support layer of your listening.' : ' revelan la capa estable de apoyo de tu escucha cotidiana.'}
          </p>
        </div>

        {/* Insight 2: Platform discrepancies */}
        <div className="glass-panel p-8 rounded-3xl space-y-4 border-l-4 border-l-cyberPink">
          <div className="flex items-center space-x-2 text-cyberPink">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
              {L ? 'Source Cross-Check' : 'Cruce de Datos'}
            </h4>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed font-light">
            {L ? 'The current match/coverage rate is ' : 'La tasa actual de coincidencia/cobertura es '}
            <strong className="text-cyberCyan font-bold">{metrics.match_rate_pct}%</strong>.
            {' '}{source.source_note}
            {source.spotify_short_plays > 0 && <> {L ? 'Spotify also shows ' : 'Spotify también muestra '}<strong className="text-white">{source.spotify_short_plays.toLocaleString('es-ES')}</strong>{L ? ' short plays under 30 seconds.' : ' plays cortos bajo 30 segundos.'}</>}
          </p>
        </div>

        {/* Insight 3: Comfort loops */}
        <div className="glass-panel p-8 rounded-3xl space-y-4 border-l-4 border-l-cyberPurple">
          <div className="flex items-center space-x-2 text-cyberPurple">
            <RotateCcwIcon className="w-5 h-5" />
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
              {L ? 'Tracks That Resist Time' : 'Canciones que Resisten el Paso de los Años'}
            </h4>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            {L ? 'Tracks like ' : 'Pistas como '}
            <strong className="text-white">{anchorTracks[0]?.title ?? 'tu cancion principal'}</strong>
            {anchorTracks[0] && <> {L ? ' by ' : ' de '}<strong className="text-white">{anchorTracks[0].artist}</strong></>}
            {anchorTracks[1] && <> {L ? ' and ' : ' y '}<strong className="text-white">{anchorTracks[1].title}</strong></>}
            {L ? ' behave as emotional anchors because they survive the ranking pressure across the whole archive.' : ' funcionan como anclas emocionales porque sobreviven la presión del ranking a lo largo de todo el archivo.'}
          </p>
        </div>

        {/* Insight 4: Hour correlation */}
        <div className="glass-panel p-8 rounded-3xl space-y-4 border-l-4 border-l-green-400">
          <div className="flex items-center space-x-2 text-green-400">
            <HelpCircle className="w-5 h-5" />
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
              {L ? 'Nocturnal Emotional Regulation' : 'La Regulación Emocional Nocturna'}
            </h4>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            {L ? 'Your late-night pattern represents ' : 'Tu patrón de escucha nocturna representa '}
            <strong className="text-white">{nightRatio}%</strong>
            {L ? ' of total plays between 00:00 and 05:59. Your strongest detected streak is ' : ' de plays entre 00:00 y 05:59. Tu racha más larga detectada es de '}
            <strong className="text-white">{records.longest_streak_days}</strong>
            {L ? ' days, which suggests music is a stabilizing habit, not only entertainment.' : ' días, lo que sugiere que la música funciona como hábito estabilizador, no solo entretenimiento.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Simple internal icon proxy to avoid broken imports
function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
