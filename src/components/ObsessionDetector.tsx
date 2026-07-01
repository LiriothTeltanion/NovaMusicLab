import React from 'react';
import { RotateCcw, Clock, Trophy, Flame } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';

interface ObsessionDetectorProps {
  data: MusicDnaData;
}

export default function ObsessionDetector({ data }: ObsessionDetectorProps) {
  const obsessions = data.obsessions;
  const sessions = data.sessions;
  const { lang, tc } = useApp();
  const L = lang === 'en';

  // Format date to local spanish format
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center space-x-3 mb-2">
        <RotateCcw className="w-6 h-6" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {L ? 'Musical Obsessions & Loops' : 'Obsesiones Musicales & Loops'}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Obsessions list (1 Day loops) */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-5">
          <div className="flex items-center space-x-3 mb-6">
            <Flame className="w-5 h-5 text-cyberPink animate-pulse" />
            <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
              {L ? 'Music Hyperfixations' : 'Hiperfijaciones Musicales'}</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed font-sans">
            {L
              ? 'Songs played repeatedly on loop during a single day. Reveals moments of emotional obsession or intensive focus.'
              : 'Canciones reproducidas repetidamente en bucle durante un mismo día. Revela momentos de obsesión emocional o foco intensivo.'}
          </p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {obsessions.length > 0 ? (
              obsessions.map((obs, idx) => (
                <div key={`${obs.artist}-${obs.track}-${obs.date}-${idx}`} className="flex items-center justify-between p-3 bg-cyan-950/10 border border-cyan-500/10 rounded-2xl hover:border-cyberCyan/40 transition-all">
                  <div className="truncate pr-4">
                    <p className="text-xs font-bold text-white truncate">{obs.track}</p>
                    <p className="text-[10px] text-gray-400 truncate">{obs.artist}</p>
                    <p className="text-[9px] font-mono text-cyberCyan/70 mt-1">{formatDate(obs.date)}</p>
                  </div>
                  <div className="flex items-center space-x-1 bg-cyberPink/10 px-2.5 py-1 rounded-full border border-cyberPink/20 font-mono text-xs font-black text-cyberPink shrink-0">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{obs.count}x</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-xs text-gray-500 font-mono">
                No se detectaron hiperfijaciones extremas en tus datos.
              </div>
            )}
          </div>
        </div>

        {/* Right: Session Marathons list */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-7">
          <div className="flex items-center space-x-3 mb-6">
            <Trophy className="w-5 h-5 text-cyberCyan" />
            <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
              {L ? 'Listening Marathons (Sessions)' : 'Maratones de Escucha (Sesiones)'}</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed font-sans">
            {L
              ? 'Groups of songs played sequentially with silence gaps under 60 minutes. Reveals study marathons, trips, or late-night sessions.'
              : 'Grupos de canciones reproducidas secuencialmente con intervalos de silencio menores a 60 minutos. Revela maratones de estudio, viajes o noches en vela.'}
          </p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {sessions.map((sess) => (
              <div key={sess.id} className="p-4 bg-cyan-950/10 border border-cyan-500/10 rounded-2xl hover:border-cyberPink/40 transition-all space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 block">Inicio de sesión:</span>
                    <span className="text-xs font-bold text-white">{formatDate(sess.start)} {new Date(sess.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-gray-500 block">Duración est.:</span>
                    <span className="text-xs font-mono font-bold text-cyberCyan flex items-center justify-end gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {sess.duration_min >= 60 ? `${Math.round(sess.duration_min / 60)}h` : `${Math.round(sess.duration_min)}min`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-cyan-500/10">
                  <div>
                    <span className="text-gray-400 block font-mono">Volumen:</span>
                    <span className="font-bold text-white">{sess.tracks_count} canciones</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-mono">Artista dominante:</span>
                    <span className="font-bold text-cyberPink truncate block">{sess.top_artist}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
