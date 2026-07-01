import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Eye, Moon, Film, Gamepad2, Landmark, Music, Zap, Star } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';

interface InnerWorldProps { data: MusicDnaData; }

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function InnerWorld({ data: _ }: InnerWorldProps) {
  const { lang, tc, t } = useApp();
  const L = lang === 'en';

  const CARDS = [
    {
      icon: Eye, color: '#00f2fe',
      title: t.innerWorld.colorPaletteTitle,
      body: () => (
        <div className="space-y-3">
          <p className="text-xs text-gray-300 leading-relaxed">
            {t.innerWorld.colorPaletteIntro}
          </p>
          <div className="flex items-center space-x-3">
            {[
              { color: '#00f2fe', label: t.innerWorld.colorNeonCyan,     glow: 'rgba(0,242,254,0.5)' },
              { color: '#f72585', label: t.innerWorld.colorCyberPink,    glow: 'rgba(247,37,133,0.5)' },
              { color: '#7209b7', label: t.innerWorld.colorMysticPurple, glow: 'rgba(114,9,183,0.5)' },
              { color: '#030712', label: t.innerWorld.colorAbyssBlack,   border: true },
              { color: '#4cc9f0', label: t.innerWorld.colorElectricBlue, glow: 'rgba(76,201,240,0.5)' },
            ].map(({ color, label, glow, border }) => (
              <div key={label} className="flex flex-col items-center group cursor-default">
                <div className="w-8 h-8 rounded-full transition-transform group-hover:scale-125"
                  style={{ backgroundColor: color, border: border ? '1px solid rgba(0,242,254,0.3)' : 'none', boxShadow: glow ? `0 0 12px ${glow}` : 'none' }} />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Moon, color: '#7209b7',
      title: t.innerWorld.emotionalLandscapeTitle,
      body: () => (
        <p className="text-xs text-gray-300 leading-relaxed">
          {t.innerWorld.emotionalLandscapeBody}
        </p>
      ),
    },
    {
      icon: Film, color: '#f72585',
      title: t.innerWorld.soundtrackTitle,
      body: () => (
        <div className="space-y-2 text-xs text-gray-300">
          {[
            { v: t.innerWorld.versionPast,    s: 'Love Who Loves You Back', a: 'Tokio Hotel',    c: '#4cc9f0', d: t.innerWorld.versionPastDesc },
            { v: t.innerWorld.versionPresent, s: 'In Blur',                  a: 'Deafheaven',     c: '#00f2fe', d: t.innerWorld.versionPresentDesc },
            { v: t.innerWorld.versionFuture,  s: 'Aperol Spritz',            a: 'The Kid LAROI',  c: '#34d399', d: t.innerWorld.versionFutureDesc },
          ].map(({ v, s, a, c, d }) => (
            <div key={v} className="p-2 rounded-xl border border-white/5 bg-white/3">
              <span className="text-[10px] font-mono font-bold uppercase" style={{ color: c }}>{v}</span>
              <p className="font-semibold text-white">{s}</p>
              <p className="text-gray-400 text-[10px]">{a} · {d}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Landmark, color: '#34d399',
      title: t.innerWorld.imaginaryCityTitle,
      body: () => (
        <p className="text-xs text-gray-300 leading-relaxed">
          <strong className="text-white">{t.innerWorld.imaginaryCityName}</strong>:{' '}
          {t.innerWorld.imaginaryCityBody}
        </p>
      ),
    },
    {
      icon: Gamepad2, color: '#fb923c',
      title: t.innerWorld.gamerDnaTitle,
      body: () => (
        <div className="space-y-2">
          <p className="text-xs text-gray-300 leading-relaxed">
            {t.innerWorld.gamerDnaBody}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {['🎮 Cyberpunk', '⚔️ Dark Fantasy', '🌌 Sci-Fi', '🤖 Retrowave', '🎸 Emo Culture'].map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-950/30 border border-orange-500/20 text-orange-300 font-mono">{tag}</span>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Star, color: '#a78bfa',
      title: t.innerWorld.archetypesTitle,
      body: () => (
        <div className="space-y-1.5">
          {[
            { name: t.innerWorld.archetypeExplorerName, desc: t.innerWorld.archetypeExplorerDesc, color: '#00f2fe' },
            { name: t.innerWorld.archetypeWarriorName,  desc: t.innerWorld.archetypeWarriorDesc,  color: '#f72585' },
            { name: t.innerWorld.archetypeArchitectName,desc: t.innerWorld.archetypeArchitectDesc,color: '#a78bfa' },
            { name: t.innerWorld.archetypeFuturistName, desc: t.innerWorld.archetypeFuturistDesc, color: '#34d399' },
          ].map(({ name, desc, color }) => (
            <div key={name} className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <div><span className="text-xs font-bold text-white">{name}</span><span className="text-[10px] text-gray-400 ml-1">— {desc}</span></div>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Music, color: '#06b6d4',
      title: t.innerWorld.lyricalThemesTitle,
      body: () => (
        <div className="flex flex-wrap gap-1.5">
          {(L ? [
            { tag: '💔 Lost Love', c: '#f72585' }, { tag: '🌙 Urban Night', c: '#7209b7' },
            { tag: '⚡ Transformation', c: '#00f2fe' }, { tag: '🌊 Melancholy', c: '#4cc9f0' },
            { tag: '🔥 Catharsis', c: '#fb923c' }, { tag: '✨ Hope', c: '#34d399' },
            { tag: '🎮 Digital Escape', c: '#a78bfa' }, { tag: '🧬 Identity', c: '#facc15' },
            { tag: '🌌 Nostalgia', c: '#06b6d4' }, { tag: '⚔️ Resilience', c: '#ef4444' },
          ] : [
            { tag: '💔 Amor perdido', c: '#f72585' }, { tag: '🌙 Noche urbana', c: '#7209b7' },
            { tag: '⚡ Transformación', c: '#00f2fe' }, { tag: '🌊 Melancolía', c: '#4cc9f0' },
            { tag: '🔥 Catarsis', c: '#fb923c' }, { tag: '✨ Esperanza', c: '#34d399' },
            { tag: '🎮 Escape digital', c: '#a78bfa' }, { tag: '🧬 Identidad', c: '#facc15' },
            { tag: '🌌 Nostalgia', c: '#06b6d4' }, { tag: '⚔️ Resiliencia', c: '#ef4444' },
          ]).map(({ tag, c }) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
              style={{ color: c, backgroundColor: `${c}15`, border: `1px solid ${c}30` }}>{tag}</span>
          ))}
        </div>
      ),
    },
    {
      icon: Zap, color: '#facc15',
      title: t.innerWorld.creativeIdentityTitle,
      body: () => (
        <div className="space-y-2 text-xs text-gray-300">
          <p>{t.innerWorld.creativeIdentityIntro}</p>
          <ul className="space-y-1">
            {(L ? [
              '🎵 Own music production with metalcore and synthwave roots',
              '🎨 Dark digital art with glassmorphism aesthetic',
              '🎮 Sound design for futuristic fantasy games',
              '📖 Storytelling with Deafheaven/TesseracT-inspired universes',
              '🎤 Lyrics mixing vulnerability and personal epic',
            ] : [
              '🎵 Producción musical propia con roots en metalcore y synthwave',
              '🎨 Arte digital oscuro con estética glassmorphism',
              '🎮 Diseño de sonido para videojuegos de fantasía futurista',
              '📖 Storytelling con universos inspirados en Deafheaven/TesseracT',
              '🎤 Letras que mezclan vulnerabilidad y épica personal',
            ]).map(item => (
              <li key={item} className="flex items-start space-x-1.5">
                <span className="text-[10px] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  const moodTags = L
    ? ['🌌 Dark', '✨ Cathartic', '🔮 Nostalgic', '⚡ Intense', '🎧 Deep', '🌱 Hopeful']
    : ['🌌 Oscuro', '✨ Catártico', '🔮 Nostálgico', '⚡ Intenso', '🎧 Profundo', '🌱 Esperanzador'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3">
        <Palette className="w-6 h-6" style={{ color: tc.c2 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.innerWorld.pageTitle}
        </h2>
      </div>

      {/* Universe banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl relative overflow-hidden border border-cyberPurple/20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(25)].map((_, i) => (
            <div key={i} className="absolute rounded-full animate-pulse-slow"
              style={{
                width: `${2 + (i % 3)}px`, height: `${2 + (i % 3)}px`,
                backgroundColor: [tc.c1, tc.c2, tc.c3, tc.c4][i % 4],
                left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`,
                opacity: 0.2 + (i % 4) * 0.1,
                animationDelay: `${i * 0.25}s`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center space-y-3">
          <h3 className="text-xl font-bold text-white font-mono">
            {t.innerWorld.bannerTitle}
          </h3>
          <p className="text-sm text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {t.innerWorld.bannerBody}
          </p>
          <div className="flex justify-center flex-wrap gap-2 pt-2">
            {moodTags.map(tag => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full border font-mono"
                style={{ backgroundColor: `${tc.c3}10`, borderColor: `${tc.c3}30`, color: '#c4b5fd' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          const Body = card.body;
          return (
            <motion.div key={card.title} custom={i} variants={cardVariants} initial="initial" animate="animate"
              className="glass-panel p-5 rounded-2xl space-y-3 border-t-2 hover:border-t-4 transition-all"
              style={{ borderTopColor: card.color }}>
              <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4 shrink-0" style={{ color: card.color }} />
                <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-white leading-tight">{card.title}</h4>
              </div>
              <Body />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
