import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronRight, ChevronLeft, Headphones, Sparkles, BarChart2 } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import SectionNarrative from './SectionNarrative';

interface EraExplorerProps {
  data: MusicDnaData;
}

const ERA_COLORS: Record<number, string> = {
  2015: '#a78bfa', 2016: '#f72585', 2017: '#06b6d4', 2018: '#fb923c',
  2019: '#ef4444', 2020: '#facc15', 2021: '#00f2fe', 2022: '#00f2fe',
  2023: '#4cc9f0', 2024: '#34d399', 2025: '#7209b7', 2026: '#f72585',
};

const ERA_INTERPRETATIONS: Record<number, string> = {
  2015: 'Los cimientos: synthwave oscuro y metal técnico como primer lenguaje musical propio. Carpenter Brut abrió un portal hacia una estética cyberpunk que nunca abandonarías.',
  2016: 'Un año de melodías pegajosas y glam. H.E.A.T y Tokio Hotel representan la búsqueda de conexión emocional a través de canciones brillantes y mela ncólicas.',
  2017: 'El misterio domina. Ghost y The Midnight construyen un año de rock cinematográfico donde la atmósfera cuenta más que el riff.',
  2018: 'Integración cultural y hard rock. El rock israelí local convive con la energía glam de Santa Cruz. Tu racha más larga: 68 días consecutivos empieza aquí.',
  2019: 'Post-hardcore vulnerable. The Word Alive y Emarosa traen voces que sangran. Un año de catarsis emocional profunda.',
  2020: 'Pandemia + caos musical. Bring Me the Horizon y Bilmuri mezclan metal con pop en bucles intensos. La diversidad baja: escuchas lo que te ancla.',
  2021: 'El año cumbre. 7.275 reproducciones. Deafheaven y la era Blackgaze: guitarras que brillan como heridas sanadas. Tu música más importante.',
  2022: '6.958 scrobbles. La era Deafheaven consolida. Las mañanas se vuelven el momento de mayor intensidad musical. In Blur como himno permanente.',
  2023: 'Reinvención: Magnolia Park y el pop-punk digital. Energía renovada, sonidos más modernos. La exploración regresa con 787 artistas únicos.',
  2024: 'Intimidad y groove. Bilmuri y Corbin Karasu en un año de madurez reconstructiva. Menos volumen, más profundidad.',
  2025: 'Emo rap e introspección. nothingnowhere. como guía de una búsqueda lírica intensa. Recuperación y reconstrucción artística.',
  2026: 'Energía fresca. The Kid LAROI y la nueva generación de rap-pop alternativo marcan el presente y el futuro de tu universo sonoro.',
};

const ERA_INTERPRETATIONS_EN: Record<number, string> = {
  2015: 'The foundations: dark synthwave and technical metal as the first personal musical language. Carpenter Brut opened a portal toward a cyberpunk aesthetic you would never leave.',
  2016: 'A year of catchy melodies and glam. H.E.A.T and Tokio Hotel represent the search for emotional connection through bright and melancholic songs.',
  2017: 'Mystery dominates. Ghost and The Midnight build a year of cinematic rock where atmosphere matters more than the riff.',
  2018: 'Cultural integration and hard rock. Local Israeli rock coexists with the glam energy of Santa Cruz. Your longest streak: 68 consecutive days begins here.',
  2019: 'Vulnerable post-hardcore. The Word Alive and Emarosa bring bleeding voices. A year of deep emotional catharsis.',
  2020: 'Pandemic + musical chaos. Bring Me the Horizon and Bilmuri blend metal with pop in intense loops. Diversity drops: you listen to what anchors you.',
  2021: 'The peak year. 7,275 plays. Deafheaven and the Blackgaze Era: guitars that shine like healed wounds. Your most important music.',
  2022: '6,958 scrobbles. The Deafheaven era solidifies. Mornings become the moment of greatest musical intensity. In Blur as a permanent anthem.',
  2023: 'Reinvention: Magnolia Park and digital pop-punk. Renewed energy, more modern sounds. Exploration returns with 787 unique artists.',
  2024: 'Intimacy and groove. Bilmuri and Corbin Karasu in a year of reconstructive maturity. Less volume, more depth.',
  2025: 'Emo rap and introspection. nothingnowhere. as a guide through intense lyrical searching. Recovery and artistic reconstruction.',
  2026: 'Fresh energy. The Kid LAROI and the new generation of alternative rap-pop mark the present and future of your sonic universe.',
};

export default function EraExplorer({ data }: EraExplorerProps) {
  const [selectedIdx, setSelectedIdx] = useState(data.yearly_eras.length - 1);
  const { lang, tc, t } = useApp();
  const L = lang === 'en';
  const eras = data.yearly_eras;
  const currentEra = eras[selectedIdx];
  const color = ERA_COLORS[currentEra.year] ?? '#00f2fe';
  const maxPlays = Math.max(...eras.map(e => e.plays));
  const fmtNum = (n: number) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');
  const interpretation = (L ? ERA_INTERPRETATIONS_EN[currentEra.year] : ERA_INTERPRETATIONS[currentEra.year])
    ?? t.eraExplorer.fallbackInterpretation(
      currentEra.year,
      currentEra.top_artist,
      fmtNum(currentEra.plays),
      currentEra.unique_artists,
      currentEra.dominant_daypart.toLowerCase(),
    );

  const daypartEmoji: Record<string, string> = {
    'Mañana 06-11': '🌅', 'Tarde 12-17': '🌞', 'Noche 18-23': '🌙', 'Madrugada 00-05': '🌌',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6" style={{ color: tc.c1 }} />
          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
            {t.eraExplorer.title}</h2>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setSelectedIdx(i => Math.max(0, i - 1))} disabled={selectedIdx === 0}
            className="p-2 bg-cyan-950/20 border border-cyan-500/20 hover:border-cyberCyan disabled:opacity-30 text-cyberCyan rounded-full transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setSelectedIdx(i => Math.min(eras.length - 1, i + 1))} disabled={selectedIdx === eras.length - 1}
            className="p-2 bg-cyan-950/20 border border-cyan-500/20 hover:border-cyberCyan disabled:opacity-30 text-cyberCyan rounded-full transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <SectionNarrative content={t.deepNarratives.eras} accent="c1" />

      {/* Visual timeline with relative play bars */}
      <div className="glass-panel p-4 rounded-2xl overflow-x-auto">
        <div className="flex space-x-2 min-w-max pb-1">
          {eras.map((era, idx) => {
            const eraColor = ERA_COLORS[era.year] ?? '#00f2fe';
            const pct = Math.round((era.plays / maxPlays) * 100);
            const active = idx === selectedIdx;
            return (
              <button key={era.year} onClick={() => setSelectedIdx(idx)}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all group ${
                  active ? 'bg-white/5 shadow-inner' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-6 bg-white/5 rounded-full overflow-hidden" style={{ height: 48 }}>
                  <motion.div
                    className="w-full rounded-full"
                    style={{ backgroundColor: eraColor, marginTop: `${100 - pct}%` }}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.04, ease: 'easeOut' }}
                  />
                </div>
                <span className={`text-[10px] font-mono font-bold ${active ? 'text-white' : 'text-gray-500'}`}
                  style={active ? { color: eraColor } : undefined}>
                  {era.year}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Era Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentEra.year}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Left: Era narrative */}
          <div className="glass-panel p-8 rounded-3xl lg:col-span-2 space-y-6 border-l-4"
            style={{ borderLeftColor: color }}>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>
                  {currentEra.year}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {daypartEmoji[currentEra.dominant_daypart] ?? '🎧'} {currentEra.dominant_daypart}
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-white">{currentEra.era_label}</h3>
              <p className="text-sm text-gray-400 font-mono">{currentEra.era_desc}</p>
            </div>

            {/* Plays bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-gray-400">
                <span>{t.eraExplorer.yearActivity}</span>
                <span style={{ color }}>{t.eraExplorer.playsCount(fmtNum(currentEra.plays))}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <motion.div className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((currentEra.plays / maxPlays) * 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl" style={{ backgroundColor: `${color}08`, border: `1px solid ${color}25` }}>
              <h4 className="text-sm font-mono font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color }}>
                <Sparkles className="w-4 h-4" />
            {t.eraExplorer.interpretiveReading}
              </h4>
              <p className="text-sm text-gray-300 font-sans italic leading-relaxed">
                "{interpretation}"
              </p>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <h4 className="text-sm font-mono font-bold text-gray-400 uppercase tracking-widest">
              {t.eraExplorer.statsFor(currentEra.year)}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t.eraExplorer.statPlays,     val: fmtNum(currentEra.plays),           color: color },
                { label: t.eraExplorer.statArtists,   val: String(currentEra.unique_artists),   color: '#f72585' },
                { label: t.eraExplorer.statTracks,    val: String(currentEra.unique_tracks),   color: '#7209b7' },
                { label: t.eraExplorer.statDiversity, val: `${currentEra.diversity_index}%`,  color: '#10b981' },
              ].map(({ label, val, color: c }) => (
                <div key={label} className="p-3 bg-white/3 border border-white/5 rounded-xl">
                  <p className="text-[10px] font-mono text-gray-400 uppercase">{label}</p>
                  <p className="text-lg font-black mt-0.5" style={{ color: c }}>{val}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-white/3 border border-white/5 rounded-xl">
                <ArtistAvatar name={currentEra.top_artist} size={32} />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-gray-400 uppercase">
                    {t.eraExplorer.flagshipArtist}
                  </p>
                  <p className="text-sm font-bold text-white truncate">{currentEra.top_artist}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/3 border border-white/5 rounded-xl">
                <Headphones className="w-4 h-4 text-cyberBlue shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-gray-400 uppercase">
                    {t.eraExplorer.anthemOfYear}
                  </p>
                  <p className="text-sm font-bold text-white truncate">{currentEra.top_track}</p>
                </div>
              </div>
            </div>

            {/* Era position in overall journey */}
            <div className="pt-3 border-t border-white/5">
              <p className="text-[10px] font-mono text-gray-500 text-center">
                {t.eraExplorer.chapterOf(selectedIdx + 1, eras.length, currentEra.year)}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* All eras mini grid */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <BarChart2 className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">{t.eraExplorer.allEras}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {eras.map((era, idx) => {
            const eraColor = ERA_COLORS[era.year] ?? '#00f2fe';
            const active = idx === selectedIdx;
            return (
              <button key={era.year} onClick={() => setSelectedIdx(idx)}
                className={`p-3 rounded-xl text-left transition-all border ${
                  active ? 'bg-white/5' : 'hover:bg-white/3 border-white/5'
                }`}
                style={active ? { borderColor: eraColor } : { borderColor: 'transparent' }}
              >
                <p className="font-mono text-sm font-black" style={{ color: eraColor }}>{era.year}</p>
                <p className="text-[10px] text-gray-300 font-bold leading-tight mt-0.5 line-clamp-2">{era.era_label}</p>
                <p className="text-[9px] text-gray-500 font-mono mt-1">{t.eraExplorer.playsCount(fmtNum(era.plays))}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
