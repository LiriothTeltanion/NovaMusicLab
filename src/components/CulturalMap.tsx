import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Award, Languages, Map } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';

interface CulturalMapProps {
  data: MusicDnaData;
}

const COUNTRY_META: Record<string, { flag: string; lang: string; scene: string; color: string }> = {
  'United States': { flag: '🇺🇸 US', lang: 'Inglés', scene: 'Post-Hardcore · Metalcore · Emo Rap', color: '#3b82f6' },
  'United Kingdom': { flag: '🇬🇧 UK', lang: 'Inglés', scene: 'Metalcore · Alt-Rock · Shoegaze',    color: '#ef4444' },
  'Sweden':         { flag: '🇸🇪 SE', lang: 'Inglés/Sueco', scene: 'Hard Rock · AOR · Melodic Death', color: '#facc15' },
  'Finland':        { flag: '🇫🇮 FI', lang: 'Finés/Inglés', scene: 'Glam Rock · Melodic Death Metal', color: '#06b6d4' },
  'Germany':        { flag: '🇩🇪 DE', lang: 'Alemán/Inglés', scene: 'Power Metal · Synth-Pop · Industrial', color: '#f97316' },
  'France':         { flag: '🇫🇷 FR', lang: 'Francés/Inglés', scene: 'Darksynth · Shoegaze · Ambient', color: '#8b5cf6' },
  'Israel':         { flag: '🇮🇱 IL', lang: 'Hebreo/Inglés', scene: 'Israeli Rock · Hip-Hop · Punk',  color: '#10b981' },
  'Norway':         { flag: '🇳🇴 NO', lang: 'Noruego/Inglés', scene: 'EDM · Metal · Black Metal',      color: '#a78bfa' },
  'New Zealand':    { flag: '🇳🇿 NZ', lang: 'Inglés', scene: 'Indie · Phonk · Internet Pop',           color: '#34d399' },
  'Puerto Rico':    { flag: '🇵🇷 PR', lang: 'Español', scene: 'Trap Latino · Reggaeton',               color: '#fb923c' },
  'Venezuela':      { flag: '🇻🇪 VE', lang: 'Español', scene: 'Rock Venezolano · Pop Latino',          color: '#f43f5e' },
  'Dominican Republic': { flag: '🇩🇴 DO', lang: 'Español', scene: 'Ritmos Caribeños',                  color: '#ec4899' },
};

const LANG_DATA = [
  { lang: 'Inglés',          pct: 78, color: '#00f2fe' },
  { lang: 'Español',         pct: 9,  color: '#fb923c' },
  { lang: 'Hebreo',          pct: 7,  color: '#34d399' },
  { lang: 'Alemán/Sueco',    pct: 4,  color: '#f72585' },
  { lang: 'Otros',           pct: 2,  color: '#a78bfa' },
];

const SCENE_TAGS = [
  { tag: '🤘 Post-Hardcore USA',     color: '#3b82f6' },
  { tag: '⚡ Synthwave Francia/USA', color: '#8b5cf6' },
  { tag: '🎸 Glam Rock Escandinavia',color: '#facc15' },
  { tag: '🌌 Blackgaze Global',      color: '#00f2fe' },
  { tag: '🎮 Internet Culture',      color: '#10b981' },
  { tag: '🇮🇱 Israeli Rock',         color: '#34d399' },
  { tag: '🔥 Metalcore UK/USA',      color: '#ef4444' },
  { tag: '🌙 Darksynth Cyberpunk',   color: '#f72585' },
];

export default function CulturalMap({ data }: CulturalMapProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const { lang } = useApp();
  const countries = data.countries;
  const maxPlays = Math.max(...countries.map(c => c.plays));

  const cardVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: (i: number) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.05, duration: 0.3 } }),
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center space-x-3">
        <Globe className="w-6 h-6 text-cyberCyan" />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">ADN Cultural & Geográfico</h2>
      </div>

      {/* Hero narrative */}
      <div className="glass-panel p-7 rounded-3xl border-l-4 border-l-cyberCyan relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyberCyan/5 blur-[60px] rounded-full pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <h3 className="text-xl font-bold text-white">
            {lang === 'en' ? 'Your Migrant Sonic Footprint' : 'Tu Huella Sonora Migrante'}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            {lang === 'en'
              ? `Your music reflects a uniquely globalized identity: Venezuelan roots, the Israeli experience and digital English-speaking culture coexist in perfect creative tension. You listen in 4+ languages from ${countries.length}+ countries.`
              : `Tu música refleja una identidad globalizada y única: la raíz venezolana, la experiencia israelí y la cultura digital angloparlante conviven en perfecta tensión creativa. Escuchas en 4+ idiomas desde ${countries.length}+ países.`}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {SCENE_TAGS.map(({ tag, color }) => (
              <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full font-mono font-bold"
                style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Country cards grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Map className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
            {lang === 'en' ? 'Your Artists by Country' : 'Países de tus Artistas'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {countries.map((c, idx) => {
            const meta = COUNTRY_META[c.country] ?? { flag: '🌐', lang: 'Varios', scene: 'Variado', color: '#6b7280' };
            const pct = Math.round((c.plays / maxPlays) * 100);
            const isSelected = selected === c.country;
            return (
              <motion.button
                key={c.country}
                custom={idx}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                onClick={() => setSelected(isSelected ? null : c.country)}
                className={`glass-panel p-4 rounded-2xl text-left transition-all border-2 w-full ${isSelected ? 'scale-[1.02]' : ''}`}
                style={{ borderColor: isSelected ? meta.color : 'transparent' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black font-mono"
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}>
                    {meta.flag}
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ color: meta.color, backgroundColor: `${meta.color}15` }}>
                    {c.plays.toLocaleString('es-ES')}
                  </span>
                </div>
                <p className="text-sm font-bold text-white leading-tight">{c.country}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{meta.lang}</p>
                <div className="mt-2.5 h-1.5 rounded-full bg-white/5">
                  <motion.div className="h-full rounded-full"
                    style={{ backgroundColor: meta.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.05, ease: 'easeOut' }}
                  />
                </div>
                {isSelected && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="text-[10px] text-gray-300 mt-2.5 leading-relaxed">{meta.scene}</motion.p>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Language distribution */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center gap-2 mb-5">
          <Languages className="w-5 h-5 text-cyberPink" />
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">Distribución de Idiomas</h3>
        </div>
        <div className="space-y-3">
          {LANG_DATA.map(({ lang, pct, color }, i) => (
            <div key={lang} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-300 font-bold">{lang}</span>
                <span style={{ color }}>{pct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/5">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.3 + i * 0.1, ease: 'easeOut' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div className="glass-panel p-6 rounded-3xl border border-cyberCyan/15 flex items-start gap-4">
        <Award className="w-5 h-5 text-cyberCyan shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-xs font-mono font-bold text-cyberCyan uppercase tracking-wider">{lang === 'en' ? 'Cultural DNA Conclusion' : 'Conclusión del ADN Cultural'}</p>
          <p className="text-sm text-gray-300 leading-relaxed">
            {lang === 'en'
              ? "Your musical profile refuses to be boxed into a single border. It's a liquid blend where Nordic melancholic guitars, Hebrew rock, cyberpunk synthwave and English-speaking alternative groove coexist. This diversity is your greatest creative strength."
              : 'Tu perfil musical se niega a ser encasillado. Es una mezcla líquida donde conviven guitarras nórdicas, rock en hebreo, synthwave cyberpunk y groove alternativo angloparlante. Esta diversidad es tu mayor fortaleza creativa.'}
          </p>
        </div>
      </div>
    </div>
  );
}
