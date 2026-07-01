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
  const { lang, tc } = useApp();
  const L = lang === 'en';

  const CARDS = [
    {
      icon: Eye, color: '#00f2fe',
      title: L ? 'Internal Color Palette' : 'Paleta de Colores Interna',
      body: () => (
        <div className="space-y-3">
          <p className="text-xs text-gray-300 leading-relaxed">
            {L
              ? 'Your visual spectrum is nocturnal and hybrid, built on Darksynth, Blackgaze and Synthwave:'
              : 'Tu espectro visual es nocturno e híbrido, construido sobre Darksynth, Blackgaze y Synthwave:'}
          </p>
          <div className="flex items-center space-x-3">
            {[
              { color: '#00f2fe', label: L ? 'Neon Cyan'      : 'Cian Neón',      glow: 'rgba(0,242,254,0.5)' },
              { color: '#f72585', label: L ? 'Cyber Pink'     : 'Rosa Cyber',     glow: 'rgba(247,37,133,0.5)' },
              { color: '#7209b7', label: L ? 'Mystic Purple'  : 'Morado',         glow: 'rgba(114,9,183,0.5)' },
              { color: '#030712', label: L ? 'Abyss Black'    : 'Negro Abismo',   border: true },
              { color: '#4cc9f0', label: L ? 'Electric Blue'  : 'Azul Eléctrico', glow: 'rgba(76,201,240,0.5)' },
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
      title: L ? 'Emotional Landscape' : 'Paisaje Emocional',
      body: () => (
        <p className="text-xs text-gray-300 leading-relaxed">
          {L
            ? 'An endless highway surrounded by black skyscrapers with neon cyan holograms. It rains constantly, but on the horizon a luminous dawn appears. Catharsis in motion: intensity advancing toward the light.'
            : 'Una autopista interminable bajo rascacielos negros con hologramas de neón cian. Llueve de forma constante, pero en el horizonte se asoma un amanecer luminoso y difuso. Catarsis en movimiento.'}
        </p>
      ),
    },
    {
      icon: Film, color: '#f72585',
      title: L ? 'Soundtrack of Your Versions' : 'Banda Sonora de tus Versiones',
      body: () => (
        <div className="space-y-2 text-xs text-gray-300">
          {[
            { v: L ? 'Past Version' : 'Versión Pasada',    s: 'Love Who Loves You Back', a: 'Tokio Hotel',    c: '#4cc9f0', d: L ? 'Melodic search for connection' : 'Búsqueda melódica de conexión' },
            { v: L ? 'Present Version':'Versión Presente', s: 'In Blur',                  a: 'Deafheaven',     c: '#00f2fe', d: L ? 'Maturity and glowing melancholy' : 'Madurez y melancolía que brilla' },
            { v: L ? 'Future Version' :'Versión Futura',   s: 'Aperol Spritz',            a: 'The Kid LAROI',  c: '#34d399', d: L ? 'Energy, lightness and movement' : 'Energía, ligereza y movimiento' },
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
      title: L ? 'Imaginary City' : 'Ciudad Imaginaria',
      body: () => (
        <p className="text-xs text-gray-300 leading-relaxed">
          <strong className="text-white">{L ? '"Neópolis Lirioth"' : '"Neópolis Lirioth"'}</strong>:{' '}
          {L
            ? 'A fortress suspended in space, digital gothic architecture with glassmorphism. Silent in its streets but full of experimental radio frequencies in its neon reactor core.'
            : 'Un bastión suspendido en el espacio, arquitectura gótica digital con glassmorphism. Silencioso en sus calles pero rebosante de frecuencias experimentales en su núcleo reactor de neón.'}
        </p>
      ),
    },
    {
      icon: Gamepad2, color: '#fb923c',
      title: L ? 'Gamer & Fantasy DNA' : 'ADN Gamer & Fantasía',
      body: () => (
        <div className="space-y-2">
          <p className="text-xs text-gray-300 leading-relaxed">
            {L
              ? 'Your music connects with futuristic RPG worlds (Cyberpunk 2077, Hades, NieR) and dark epic fantasy. Synthesizers are your "final boss music".'
              : 'Tu música conecta con mundos de rol futuristas (Cyberpunk 2077, Hades, NieR) y oscuridad fantasy épica. Los sintetizadores son tu "música de fondo de misión final".'}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {(L
              ? ['🎮 Cyberpunk', '⚔️ Dark Fantasy', '🌌 Sci-Fi', '🤖 Retrowave', '🎸 Emo Culture']
              : ['🎮 Cyberpunk', '⚔️ Dark Fantasy', '🌌 Sci-Fi', '🤖 Retrowave', '🎸 Emo Culture']
            ).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-950/30 border border-orange-500/20 text-orange-300 font-mono">{tag}</span>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Star, color: '#a78bfa',
      title: L ? 'Identity Archetypes' : 'Arquetipos de tu Identidad',
      body: () => (
        <div className="space-y-1.5">
          {[
            { name: L ? 'The Melancholic Explorer'  : 'El Explorador Melancólico',  desc: L ? 'Seeks beauty in darkness'          : 'Busca belleza en la oscuridad',       color: '#00f2fe' },
            { name: L ? 'The Emotional Warrior'     : 'El Guerrero Emocional',      desc: L ? 'Catharsis as fuel'                 : 'Catarsis como combustible',           color: '#f72585' },
            { name: L ? 'The Sonic Architect'       : 'El Arquitecto Sonoro',       desc: L ? 'Builds worlds with frequencies'    : 'Construye mundos con frecuencias',    color: '#a78bfa' },
            { name: L ? 'The Nostalgic Futurist'    : 'El Futurista Nostálgico',    desc: L ? 'Looks forward from the past'       : 'Mira hacia adelante desde el pasado', color: '#34d399' },
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
      title: L ? 'Recurring Lyrical Themes' : 'Temas Líricos Recurrentes',
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
      title: L ? 'Creative Identity → Art' : 'Identidad Creativa → Arte',
      body: () => (
        <div className="space-y-2 text-xs text-gray-300">
          <p>{L ? 'Your music can become:' : 'Tu música puede convertirse en:'}</p>
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
          {L ? 'Your Inner Universe' : 'Tu Universo Interior'}
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
            {L ? '"Neópolis Lirioth" ✧ Your Sonic Universe' : '"Neópolis Lirioth" ✧ Tu Universo Sonoro'}
          </h3>
          <p className="text-sm text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {L
              ? 'A personal space where melodic metalcore becomes architecture, synthwave becomes lighting, and blackgaze becomes the night sky. This universe is yours: dark, beautiful, constantly evolving.'
              : 'Un espacio personal donde el metalcore melódico se convierte en arquitectura, el synthwave en iluminación y el blackgaze en el cielo nocturno. Este universo es tuyo: oscuro, hermoso, en constante evolución.'}
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
