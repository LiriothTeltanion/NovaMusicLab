import React from 'react';
import { RotateCcw, Clock, Trophy, Flame } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import SectionNarrative from './SectionNarrative';

interface ObsessionDetectorProps {
  data: MusicDnaData;
}

export default function ObsessionDetector({ data }: ObsessionDetectorProps) {
  const obsessions = data.obsessions;
  const sessions = data.sessions;
  const { tc, t, lang } = useApp();

  // Format date to the active language's locale
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center space-x-3 mb-2">
        <RotateCcw className="w-6 h-6" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.obsessionDetector.title}</h2>
      </div>

      <SectionNarrative content={t.deepNarratives.obsessions} accent="c2" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Obsessions list (1 Day loops) */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-5">
          <div className="flex items-center space-x-3 mb-6">
            <Flame className="w-5 h-5 text-cyberPink animate-pulse" />
            <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
              {t.obsessionDetector.hyperfixationsTitle}</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed font-sans">
            {t.obsessionDetector.hyperfixationsDesc}
          </p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {obsessions.length > 0 ? (
              obsessions.map((obs, idx) => (
                <div key={`${obs.artist}-${obs.track}-${obs.date}-${idx}`} className="flex items-center justify-between p-3 bg-cyan-950/10 border border-cyan-500/10 rounded-2xl hover:border-cyberCyan/40 transition-all">
                  <div className="flex items-center space-x-3 truncate pr-4">
                    <ArtistAvatar name={obs.artist} size={32} />
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">{obs.track}</p>
                      <p className="text-[10px] text-gray-400 truncate">{obs.artist}</p>
                      <p className="text-[9px] font-mono text-cyberCyan/70 mt-1">{formatDate(obs.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-cyberPink/10 px-2.5 py-1 rounded-full border border-cyberPink/20 font-mono text-xs font-black text-cyberPink shrink-0">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{obs.count}x</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-xs text-gray-500 font-mono">
                {t.obsessionDetector.noHyperfixations}
              </div>
            )}
          </div>
        </div>

        {/* Right: Session Marathons list */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-7">
          <div className="flex items-center space-x-3 mb-6">
            <Trophy className="w-5 h-5 text-cyberCyan" />
            <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
              {t.obsessionDetector.marathonsTitle}</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed font-sans">
            {t.obsessionDetector.marathonsDesc}
          </p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {sessions.map((sess) => (
              <div key={sess.id} className="p-4 bg-cyan-950/10 border border-cyan-500/10 rounded-2xl hover:border-cyberPink/40 transition-all space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 block">{t.obsessionDetector.sessionStart}</span>
                    <span className="text-xs font-bold text-white">{formatDate(sess.start)} {new Date(sess.start).toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-ES', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-gray-500 block">{t.obsessionDetector.estDuration}</span>
                    <span className="text-xs font-mono font-bold text-cyberCyan flex items-center justify-end gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {sess.duration_min >= 60 ? `${Math.round(sess.duration_min / 60)}h` : `${Math.round(sess.duration_min)}min`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-cyan-500/10">
                  <div>
                    <span className="text-gray-400 block font-mono">{t.obsessionDetector.volume}</span>
                    <span className="font-bold text-white">{sess.tracks_count} {t.obsessionDetector.volumeUnit}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-mono">{t.obsessionDetector.dominantArtist}</span>
                    <span className="font-bold text-cyberPink truncate flex items-center gap-1.5 mt-0.5">
                      <ArtistAvatar name={sess.top_artist} size={20} />
                      {sess.top_artist}
                    </span>
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
