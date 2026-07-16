import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Eye, Moon, Film, Gamepad2, Landmark, Music, Zap, Star, Orbit } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { pickLanguage, type Lang } from '../utils/i18n';
import SectionNarrative from './SectionNarrative';
import GenreConstellation from './GenreConstellation';

interface InnerWorldProps {
  data: MusicDnaData;
  isPersonalArchive?: boolean;
}

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

interface InnerWorldLocalCopy {
  identityTab: string;
  constellationTab: string;
  gamerTags: string[];
  lyricalThemes: Array<{ tag: string; color: string }>;
  creativePaths: string[];
  moodTags: string[];
}

const INNER_WORLD_LOCAL_COPY: Record<Lang, InnerWorldLocalCopy> = {
  es: {
    identityTab: 'Identidad Artística',
    constellationTab: 'Constelación',
    gamerTags: ['🎮 Cyberpunk', '⚔️ Fantasía oscura', '🌌 Ciencia ficción', '🤖 Retrowave', '🎸 Cultura emo'],
    lyricalThemes: [
      { tag: '💔 Amor perdido', color: '#f72585' }, { tag: '🌙 Noche urbana', color: '#7209b7' },
      { tag: '⚡ Transformación', color: '#00f2fe' }, { tag: '🌊 Melancolía', color: '#4cc9f0' },
      { tag: '🔥 Catarsis', color: '#fb923c' }, { tag: '✨ Esperanza', color: '#34d399' },
      { tag: '🎮 Escape digital', color: '#a78bfa' }, { tag: '🧬 Identidad', color: '#facc15' },
      { tag: '🌌 Nostalgia', color: '#06b6d4' }, { tag: '⚔️ Resiliencia', color: '#ef4444' },
    ],
    creativePaths: [
      '🎵 Producción musical propia con raíces en metalcore y synthwave',
      '🎨 Arte digital oscuro con estética glassmorphism',
      '🎮 Diseño de sonido para videojuegos de fantasía futurista',
      '📖 Storytelling con universos inspirados en Deafheaven/TesseracT',
      '🎤 Letras que mezclan vulnerabilidad y épica personal',
    ],
    moodTags: ['🌌 Oscuro', '✨ Catártico', '🔮 Nostálgico', '⚡ Intenso', '🎧 Profundo', '🌱 Esperanzador'],
  },
  en: {
    identityTab: 'Artistic Identity',
    constellationTab: 'Genre Constellation',
    gamerTags: ['🎮 Cyberpunk', '⚔️ Dark Fantasy', '🌌 Sci-Fi', '🤖 Retrowave', '🎸 Emo Culture'],
    lyricalThemes: [
      { tag: '💔 Lost Love', color: '#f72585' }, { tag: '🌙 Urban Night', color: '#7209b7' },
      { tag: '⚡ Transformation', color: '#00f2fe' }, { tag: '🌊 Melancholy', color: '#4cc9f0' },
      { tag: '🔥 Catharsis', color: '#fb923c' }, { tag: '✨ Hope', color: '#34d399' },
      { tag: '🎮 Digital Escape', color: '#a78bfa' }, { tag: '🧬 Identity', color: '#facc15' },
      { tag: '🌌 Nostalgia', color: '#06b6d4' }, { tag: '⚔️ Resilience', color: '#ef4444' },
    ],
    creativePaths: [
      '🎵 Own music production with metalcore and synthwave roots',
      '🎨 Dark digital art with glassmorphism aesthetic',
      '🎮 Sound design for futuristic fantasy games',
      '📖 Storytelling with Deafheaven/TesseracT-inspired universes',
      '🎤 Lyrics mixing vulnerability and personal epic',
    ],
    moodTags: ['🌌 Dark', '✨ Cathartic', '🔮 Nostalgic', '⚡ Intense', '🎧 Deep', '🌱 Hopeful'],
  },
  he: {
    identityTab: 'זהות אמנותית',
    constellationTab: 'מפת הז׳אנרים',
    gamerTags: ['🎮 Cyberpunk', '⚔️ פנטזיה אפלה', '🌌 מדע בדיוני', '🤖 Retrowave', '🎸 תרבות Emo'],
    lyricalThemes: [
      { tag: '💔 אהבה שאבדה', color: '#f72585' }, { tag: '🌙 לילה עירוני', color: '#7209b7' },
      { tag: '⚡ שינוי', color: '#00f2fe' }, { tag: '🌊 מלנכוליה', color: '#4cc9f0' },
      { tag: '🔥 קתרזיס', color: '#fb923c' }, { tag: '✨ תקווה', color: '#34d399' },
      { tag: '🎮 בריחה דיגיטלית', color: '#a78bfa' }, { tag: '🧬 זהות', color: '#facc15' },
      { tag: '🌌 נוסטלגיה', color: '#06b6d4' }, { tag: '⚔️ חוסן', color: '#ef4444' },
    ],
    creativePaths: [
      '🎵 הפקת מוזיקה מקורית עם שורשים ב־metalcore וב־synthwave',
      '🎨 אמנות דיגיטלית אפלה באסתטיקת glassmorphism',
      '🎮 עיצוב סאונד למשחקי פנטזיה עתידניים',
      '📖 סיפור עולמות בהשראת Deafheaven ו־TesseracT',
      '🎤 כתיבת מילים שמחברות בין חשיפה רגשית לאפוס אישי',
    ],
    moodTags: ['🌌 אפל', '✨ קתרזי', '🔮 נוסטלגי', '⚡ עוצמתי', '🎧 עמוק', '🌱 מלא תקווה'],
  },
};

const VISITOR_ARCHIVE_COPY: Record<Lang, { title: string; body: string; evidence: string }> = {
  en: {
    title: 'Archive-derived constellation',
    body: 'This imported archive contains listening evidence, but no trustworthy evidence about its owner’s gaming, lyrics, visual preferences, or creative intentions.',
    evidence: 'The authored flagship identity essay is hidden here. Only the genre relationships supported by this active archive are shown below.',
  },
  es: {
    title: 'Constelación derivada del archivo',
    body: 'Este archivo importado contiene evidencia de escucha, pero no evidencia fiable sobre videojuegos, letras, preferencias visuales o intenciones creativas de su propietario.',
    evidence: 'El ensayo de identidad escrito para la exposición insignia se oculta aquí. Abajo sólo aparecen relaciones de género respaldadas por este archivo activo.',
  },
  he: {
    title: 'מפת ז׳אנרים שנגזרה מהארכיון',
    body: 'הארכיון המיובא כולל עדויות האזנה, אך אינו כולל עדויות אמינות על משחקים, כתיבה, העדפות חזותיות או כוונות יצירתיות של בעליו.',
    evidence: 'מאמר הזהות שנכתב לתערוכת הדגל מוסתר כאן. למטה מוצגים רק קשרי ז׳אנר שנתמכים בארכיון הפעיל.',
  },
};

export default function InnerWorld({ data, isPersonalArchive = false }: InnerWorldProps) {
  const [viewMode, setViewMode] = useState<'identity' | 'constellation'>('identity');
  const { lang, tc, t } = useApp();
  const localCopy = pickLanguage(lang, INNER_WORLD_LOCAL_COPY);

  if (isPersonalArchive) {
    const visitorCopy = pickLanguage(lang, VISITOR_ARCHIVE_COPY);
    return (
      <div className="space-y-8 animate-fade-in" data-testid="visitor-inner-world">
        <section className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8">
          <p className="type-label mb-3" style={{ color: tc.c3 }}>🧭 {visitorCopy.title}</p>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-300">{visitorCopy.body}</p>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-gray-500">{visitorCopy.evidence}</p>
        </section>
        <GenreConstellation data={data} />
      </div>
    );
  }

  const CARDS = [
    {
      icon: Eye, color: '#00f2fe',
      title: t.innerWorld.colorPaletteTitle,
      body: () => (
        <div className="space-y-3">
          <p className="text-xs text-gray-300 leading-relaxed">
            {t.innerWorld.colorPaletteIntro}
          </p>
          <div className="flex items-center gap-3">
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
              <p className="font-semibold text-white"><bdi dir="auto">{s}</bdi></p>
              <p className="text-gray-400 text-[10px]" dir="auto"><bdi dir="auto">{a}</bdi> · {d}</p>
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
            {localCopy.gamerTags.map(tag => (
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
            <div key={name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <div><span className="text-xs font-bold text-white">{name}</span><span className="text-[10px] text-gray-400 ms-1">— {desc}</span></div>
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
          {localCopy.lyricalThemes.map(({ tag, color }) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
              style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>{tag}</span>
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
            {localCopy.creativePaths.map(item => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="text-[10px] leading-relaxed" dir="auto">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  const moodTags = localCopy.moodTags;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-end">
        {/* View Toggle Tabs */}
        <div
          className="nova-on-dark flex w-fit rounded-2xl border border-white/10 bg-black/40 p-1 z-10"
          role="group"
          aria-label={t.innerWorld.pageTitle}
        >
          <button
            type="button"
            onClick={() => setViewMode('identity')}
            aria-pressed={viewMode === 'identity'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              viewMode === 'identity'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/35 font-extrabold'
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{localCopy.identityTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('constellation')}
            aria-pressed={viewMode === 'constellation'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              viewMode === 'constellation'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/35 font-extrabold'
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>{localCopy.constellationTab}</span>
          </button>
        </div>
      </div>

      <SectionNarrative content={t.deepNarratives.inner} accent="c3" />

      {viewMode === 'constellation' ? (
        <GenreConstellation data={data} />
      ) : (
        <>
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
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}
          >
            {CARDS.map((card, i) => {
              const Icon = card.icon;
              const Body = card.body;
              return (
                <motion.div key={card.title} custom={i} variants={cardVariants} initial="initial" animate="animate"
                  className="glass-panel p-5 rounded-2xl space-y-3 border-t-2 hover:border-t-4 transition-all"
                  style={{ borderTopColor: card.color }}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: card.color }} />
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-white leading-tight">{card.title}</h4>
                  </div>
                  <Body />
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
