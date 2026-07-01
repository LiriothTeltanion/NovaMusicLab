import React from 'react';
import { Sparkles, Music, Image as ImageIcon, Disc } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';

interface ArtistIdentityProps {
  data: MusicDnaData;
}

export default function ArtistIdentity({ data }: ArtistIdentityProps) {
  const profile = data.artist_profile;
  const ep = profile.ep_concept;
  const { tc, t } = useApp();

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <Sparkles className="w-6 h-6 animate-pulse" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.artistIdentity.title}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Branding and Sound Profile */}
        <div className="glass-panel p-8 rounded-3xl lg:col-span-7 space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-cyberCyan uppercase tracking-widest block">
              {t.artistIdentity.suggestedAlias}</span>
            <h3 className="text-3xl font-black text-white text-neon-glow">{profile.alias}</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-cyberPink uppercase tracking-wider block">
                {t.artistIdentity.possibleSound}</span>
              <p className="text-sm text-gray-300 font-sans leading-relaxed">{profile.sound}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[#0a0f1d] border border-cyan-500/10 rounded-xl">
                <span className="text-[10px] font-mono text-gray-400 uppercase">{t.artistIdentity.idealTempo}</span>
                <p className="text-sm font-bold text-white mt-1">{profile.tempo}</p>
              </div>
              <div className="p-3 bg-[#0a0f1d] border border-cyan-500/10 rounded-xl">
                <span className="text-[10px] font-mono text-gray-400 uppercase">{t.artistIdentity.keyInfluences}</span>
                <p className="text-xs font-bold text-cyberCyan mt-1 truncate">{profile.influences.slice(0, 3).join(', ')}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-mono font-bold text-cyberPurple uppercase tracking-wider block">
                {t.artistIdentity.visualAesthetic}
              </span>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                <strong className="text-white">{t.artistIdentity.outfitAndLights}</strong>{' '}
                {t.artistIdentity.outfitAndLightsDesc}
              </p>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                <strong className="text-white">{t.artistIdentity.concertConcept}</strong>{' '}
                {t.artistIdentity.concertConceptDesc(profile.live_show)}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: First EP Concept & Album Art Mockup */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center space-x-2 mb-4" style={{ color: tc.c2 }}>
              <Disc className="w-5 h-5" />
              <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
                {t.artistIdentity.firstEpConcept}
              </h4>
            </div>
            <h4 className="text-xl font-bold text-white font-mono tracking-wide mb-1">"{ep.title}"</h4>
            <p className="text-xs text-gray-400 mb-4">{ep.description}</p>
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">
                {t.artistIdentity.tracklist}
              </span>
              <div className="space-y-1.5">
                {ep.tracklist.map((track, i) => (
                  <div key={track} className="flex items-center space-x-2 p-2 rounded-xl text-xs font-mono truncate border border-white/5 bg-white/3 hover:bg-white/5 transition-all group">
                    <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: tc.c1 }}>{String(i + 1).padStart(2, '0')}</span>
                    <Music className="w-3 h-3 shrink-0" style={{ color: tc.c2 }} />
                    <span className="truncate text-gray-300 group-hover:text-white transition-colors">{track}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Album art mockup */}
          <div className="mt-6 p-6 rounded-2xl flex flex-col items-center justify-center text-center py-10 relative overflow-hidden group cursor-default"
            style={{ background: `linear-gradient(135deg, #0a192f, ${tc.c3}30)`, border: `1px solid ${tc.c1}30` }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${tc.c1}08` }} />
            <div className="relative z-10 space-y-2">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${tc.c1}20, ${tc.c3}20)`, border: `1px solid ${tc.c1}30` }}>
                <ImageIcon className="w-8 h-8 animate-pulse" style={{ color: tc.c1 }} />
              </div>
              <p className="text-xs font-mono font-bold text-white tracking-widest uppercase">{ep.title}</p>
              <p className="text-[9px] font-mono font-semibold mt-1" style={{ color: tc.c2 }}>LIRIOTH TELTANION</p>
              <p className="text-[9px] text-gray-600 font-mono">{t.artistIdentity.albumArtConcept}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
