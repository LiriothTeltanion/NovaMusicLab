import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Headphones, Heart, Printer, Music, Star, Zap } from 'lucide-react';
import { MusicDnaData } from '../types';
import CountUp from './CountUp';
import { getNightRatio, getRecords, getTwoYearPeak } from '../utils/analytics';

interface FinalReportProps { data: MusicDnaData; }

const sectionVariants = { animate: { transition: { staggerChildren: 0.15 } } };
const paraVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function SectionHeading({ roman, title, color }: { roman: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-4 pb-3 border-b border-white/5">
      <span className="font-mono text-3xl font-black opacity-20" style={{ color }}>{roman}</span>
      <h4 className="text-lg md:text-xl font-bold text-white font-mono uppercase tracking-wider"
          style={{ textShadow: `0 0 20px ${color}40` }}>{title}</h4>
    </div>
  );
}

function PullQuote({ text, color = '#00f2fe' }: { text: string; color?: string }) {
  return (
    <div className="my-2 pl-5 border-l-4 py-2 rounded-r-xl"
         style={{ borderLeftColor: color, backgroundColor: `${color}08` }}>
      <p className="text-base md:text-lg font-sans italic font-light leading-relaxed"
         style={{ color: `${color}dd` }}>{text}</p>
    </div>
  );
}

function InlineStat({ label, value, color = '#00f2fe' }: { label: string; value: string | number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full font-mono text-sm font-bold mx-0.5"
          style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
      <span>{value}</span>
      <span className="text-gray-400 font-normal text-xs">{label}</span>
    </span>
  );
}

export default function FinalReport({ data }: FinalReportProps) {
  const m = data.core_metrics;
  const topArtist = data.top_artists[0]?.name ?? 'Bring Me the Horizon';
  const topTrack  = data.top_tracks[0]?.title  ?? 'In Blur';
  const nr = getNightRatio(data);
  const records = getRecords(data);
  const peakPair = getTwoYearPeak(data.yearly_eras);

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-cyberCyan" />
          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">Tu Vida en Canciones</h2>
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-cyberCyan/10 border border-cyberCyan/30 hover:border-cyberCyan text-cyberCyan font-mono text-xs font-bold rounded-xl transition-all print:hidden">
          <Printer className="w-3.5 h-3.5" />Imprimir / PDF
        </button>
      </div>

      {/* Magazine cover */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
        className="glass-panel rounded-3xl overflow-hidden">
        <div className="relative h-52 bg-gradient-to-br from-[#050b14] via-[#0a192f] to-[#7209b7]/40 flex flex-col items-center justify-center text-center p-8 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-56 h-56 rounded-full bg-cyberCyan/8 blur-[70px]" />
            <div className="absolute bottom-0 right-1/4 w-56 h-56 rounded-full bg-cyberPink/8 blur-[70px]" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyberCyan/60 tracking-widest uppercase">
              <Headphones className="w-3 h-3" /><span>Nova Music Lab · Informe Personal 2026</span><Headphones className="w-3 h-3" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Lo que <span className="bg-gradient-to-r from-cyberCyan to-cyberPink bg-clip-text text-transparent">11 años de música</span><br/>revelan sobre mí
            </h1>
            <p className="text-sm text-gray-300 font-light">Un ensayo para <span className="text-cyberCyan font-semibold">Kevin Cusnir / Lirioth Teltanion</span></p>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-white/5 bg-white/2">
          {[
            { icon: Music,      label: 'Scrobbles', val: m.total_plays },
            { icon: Headphones, label: 'Horas',     val: m.listening_hours },
            { icon: Star,       label: 'Artistas',  val: m.unique_artists },
            { icon: Zap,        label: 'Canciones', val: m.unique_tracks },
          ].map(({ icon: Icon, label, val }, i) => (
            <div key={label} className="p-4 flex flex-col items-center text-center">
              <Icon className="w-4 h-4 text-cyberCyan mb-1 opacity-50" />
              <p className="text-base font-black text-white font-mono">
                <CountUp target={val} duration={1.8} delay={0.4 + i * 0.12} />
              </p>
              <p className="text-[10px] text-gray-500 font-mono uppercase">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Essay */}
      <motion.div variants={sectionVariants} initial="initial" animate="animate"
        className="glass-panel p-8 md:p-12 rounded-3xl space-y-10 font-sans font-light text-gray-200 leading-relaxed">

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman="I" title="El Valor de una Huella Sonora" color="#00f2fe" />
          <p className="text-sm md:text-base">
            Kevin, la música que escuchamos es el registro sísmico de nuestro mundo interior. Al analizar tus
            <InlineStat label="scrobbles" value={m.total_plays.toLocaleString('es-ES')} color="#00f2fe" />
            registrados desde 2015, no estamos leyendo estadísticas — estamos leyendo un diario emocional íntimo.
            Tus <InlineStat label="horas escuchadas" value={Math.round(m.listening_hours).toLocaleString('es-ES')} color="#f72585" />
            hablan de mudanzas, noches de hiperfijación y mañanas de energía pura.
          </p>
          <PullQuote text="Tu música no es un playlist. Es el mapa de todos los mundos que has habitado." color="#00f2fe" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-cyberCyan/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman="II" title="Las Eras: Capítulos de una Vida" color="#f72585" />
          <p className="text-sm md:text-base">
            En 2015, <strong className="text-white">Carpenter Brut</strong> abrió los primeros capítulos. En 2018, tu racha activa de{' '}
            <InlineStat label="días consecutivos" value={records.longest_streak_days || 'N/D'} color="#fb923c" /> refleja intensidad de vida sin precedentes.
            El arco {peakPair.label} es tu cumbre musical con
            <InlineStat label="scrobbles combinados" value={peakPair.plays.toLocaleString('es-ES')} color="#f72585" />.
          </p>
          <PullQuote text="'In Blur' no es solo una canción. Es el himno de una versión tuya que aprendió a brillar desde la oscuridad." color="#f72585" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-cyberPink/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman="III" title="El ADN: Quién Eres según tu Música" color="#7209b7" />
          <p className="text-sm md:text-base">
            Con <InlineStat label="artistas únicos" value={m.unique_artists.toLocaleString('es-ES')} color="#7209b7" />
            y <InlineStat label="canciones únicas" value={m.unique_tracks.toLocaleString('es-ES')} color="#a78bfa" />
            eres un <strong className="text-white">Explorador de Alta Intensidad</strong>. Tu <strong className="text-white">{nr}% de escucha nocturna</strong>{' '}
            revela que la música es también regulación emocional: silencio habitado con frecuencias.
          </p>
          <PullQuote text="No escuchas música de fondo. Escuchas como si cada canción mereciera ser recordada." color="#7209b7" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-cyberPurple/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman="IV" title="Lirioth: La Proyección Creativa" color="#10b981" />
          <p className="text-sm md:text-base">
            Tu alias <strong className="text-white">Lirioth Teltanion</strong> es la síntesis de todo lo que tu música ha construido.
            El sonido que te define — guitarras de post-hardcore, sintetizadores cyberpunk y groove alternativo —
            es una propuesta artística lista para producción musical, videojuegos, arte digital o storytelling.
          </p>
          <PullQuote text="Tu próxima era no será de consumo. Será de creación." color="#10b981" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman="V" title="Seguir Escuchando para Seguir Siendo" color="#facc15" />
          <p className="text-sm md:text-base">
            Kevin, tu historia demuestra sensibilidad emocional extraordinaria y resiliencia que sabe resurgir. Cada uno de tus{' '}
            <InlineStat label="días activos" value={m.active_days.toLocaleString('es-ES')} color="#facc15" />{' '}
            es evidencia de que la música ha sido lenguaje, terapia, identidad y futuro a la vez.{' '}
            <strong className="text-white">{topArtist}</strong> y <em>"{topTrack}"</em> siempre estarán ahí.
          </p>
        </motion.section>

        <motion.div variants={paraVariants} className="pt-8 border-t border-white/5 flex flex-col items-center space-y-3 text-center">
          <Heart className="w-6 h-6 text-cyberPink fill-cyberPink animate-pulse-slow" />
          <p className="font-mono text-sm font-bold text-white tracking-widest">✧ LIRIOTH TELTANION ✧</p>
          <p className="text-xs text-gray-500 font-mono">Nova Music Lab · Museo Personal · 2026</p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[topArtist, 'Deafheaven', 'Bilmuri', 'The Midnight', 'nothingnowhere.'].map(a => (
              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-cyberCyan/5 border border-cyberCyan/15 text-gray-400 font-mono">{a}</span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
