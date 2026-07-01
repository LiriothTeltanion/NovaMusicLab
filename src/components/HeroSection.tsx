import React from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Play, Disc, Headphones, Clock, Calendar } from 'lucide-react';
import { MusicDnaData } from '../types';
import CountUpCmp from './CountUp';
import { useApp } from '../context/AppContext';
import AnimatedParticles from './AnimatedParticles';

interface HeroSectionProps {
  data: MusicDnaData;
  onEnter: () => void;
}

/** Count-up using native requestAnimationFrame — reliable across React versions */
function CountUp({ target, duration = 1.8, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  return <CountUpCmp target={target} duration={duration} delay={delay} />;
}

export default function HeroSection({ data, onEnter }: HeroSectionProps) {
  const metrics = data.core_metrics;
  const topArtist = data.top_artists[0];
  const topTrack = data.top_tracks[0];
  const { lang } = useApp();
  const L = lang === 'en';

  const handleEnter = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      colors: ['#00f2fe', '#f72585', '#7209b7', '#4cc9f0', '#ffffff'],
      startVelocity: 35,
      gravity: 0.9,
      ticks: 200,
    });
    setTimeout(onEnter, 400);
  };

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 py-12 md:py-20 text-center select-none overflow-hidden">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyberCyan/10 blur-[120px] animate-cloud-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-cyberPink/10 blur-[120px] animate-cloud-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyberPurple/5 blur-[80px] pointer-events-none" />

      {/* 60 animated particles with shapes and glow */}
      <AnimatedParticles count={60} intensity="medium" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="z-10 max-w-4xl space-y-8"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-cyberCyan/30 bg-cyberCyan/5 text-xs font-mono font-bold text-[#e0fbfc] tracking-wider uppercase animate-pulse-slow"
        >
          <span>{L ? '✨ 11 Years of Musical Biography' : '✨ 11 Años de Biografía Sonora'}</span>
          <span className="w-1.5 h-1.5 bg-cyberCyan rounded-full" />
          <span>Spotify + Last.fm</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-3"
        >
          <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight leading-none">
            <span className="bg-gradient-to-r from-white via-cyberCyan to-cyberPink bg-clip-text text-transparent">
              NOVA MUSIC LAB
            </span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold font-mono text-cyberBlue/90 tracking-wide text-neon-glow">
            {L ? '✧ Musical Universe of Lirioth ✧' : '✧ El Universo Musical de Lirioth ✧'}
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-base md:text-xl text-gray-300 max-w-2xl mx-auto font-sans font-light leading-relaxed"
        >
          {L
            ? 'An ornamental, emotional and statistical space that explores your identity, your life stages and your transformative bands. Your music is not just a playlist — it is the soundtrack of your own evolution.'
            : 'Un espacio ornamental, emocional y estadístico que explora tu identidad, tus etapas de vida y tus bandas de transformación. Tu música no es solo una lista de reproducción; es la banda sonora de tu propia evolución.'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="glass-panel p-6 md:p-8 rounded-3xl max-w-3xl mx-auto border-l-4 border-l-cyberCyan/80 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Headphones className="w-24 h-24 text-cyberCyan" />
          </div>
          <p className="text-sm md:text-base text-[#dbf7ff] font-sans italic leading-relaxed text-left">
            {L ? (
              <>"Your musical core is built with layers of catharsis, neon nights, luminous shoegaze and melodic post-hardcore. Data suggests you recurrently return to your emotional anchors like{' '}
                <span className="text-cyberCyan font-semibold not-italic">{topArtist?.name}</span> to recharge your strength,
                and to refuge songs like{' '}
                <span className="text-cyberPink font-semibold not-italic">'{topTrack?.title}'</span> by{' '}
                <span className="text-cyberPink font-semibold not-italic">{topTrack?.artist}</span> to heal and build imaginary worlds."</>
            ) : (
              <>"Tu núcleo musical está construido con capas de catarsis, noches de neón, shoegaze luminoso y post-hardcore melódico. Los datos sugieren que vuelves recurrentemente a tus anclas emocionales como{' '}
                <span className="text-cyberCyan font-semibold not-italic">{topArtist?.name}</span> para recargar tu fuerza
                y a canciones refugio como{' '}
                <span className="text-cyberPink font-semibold not-italic">'{topTrack?.title}'</span> de{' '}
                <span className="text-cyberPink font-semibold not-italic">{topTrack?.artist}</span> para sanar y crear mundos imaginarios."</>
            )}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-3xl mx-auto pt-4"
        >
          {[
            { icon: Headphones, color: 'text-cyberCyan',   label: L ? 'Scrobbles'       : 'Scrobbles',       val: metrics.total_plays,     d: 0.8 },
            { icon: Clock,      color: 'text-cyberPink',   label: L ? 'Hours'           : 'Horas',            val: metrics.listening_hours, d: 0.9 },
            { icon: Disc,       color: 'text-cyberPurple', label: L ? 'Artists'         : 'Artistas',         val: metrics.unique_artists,  d: 1.0 },
            { icon: Play,       color: 'text-cyberBlue',   label: L ? 'Tracks'          : 'Canciones',        val: metrics.unique_tracks,   d: 1.1 },
            { icon: Calendar,   color: 'text-green-400',   label: L ? 'Listening Days'  : 'Días Escuchados',  val: metrics.listening_days,  d: 1.2, span: true },
          ].map(({ icon: Icon, color, label, val, d, span }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: d, duration: 0.4 }}
              className={`glass-panel p-4 rounded-2xl flex flex-col justify-center items-center text-center ${span ? 'col-span-2 md:col-span-1' : ''}`}
            >
              <Icon className={`w-5 h-5 ${color} mb-1`} />
              <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">{label}</span>
              <span className="text-xl md:text-2xl font-black text-white mt-1">
                <CountUp target={val} duration={1.6} delay={d - 0.7} />
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          className="pt-6"
        >
          {/* Animated waveform above button */}
          <div className="flex items-end justify-center gap-1 mb-4 h-8">
            {[0.3, 0.7, 1.0, 0.6, 0.9, 0.4, 0.8, 1.0, 0.5, 0.7, 0.3, 0.6, 0.9, 0.4, 0.7].map((h, i) => (
              <div key={i} className="waveform-bar"
                style={{
                  height: `${h * 100}%`,
                  backgroundColor: i % 3 === 0 ? 'var(--c1)' : i % 3 === 1 ? 'var(--c2)' : 'var(--c3)',
                  animationDelay: `${i * 0.08}s`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
          <button
            onClick={handleEnter}
            className="group px-8 py-3.5 bg-gradient-to-r from-cyberCyan to-cyberPurple text-white font-mono font-bold rounded-full text-base tracking-wider hover:shadow-cyber hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center space-x-3 mx-auto"
          >
            <span>{L ? 'ENTER THE SOUND MUSEUM' : 'ENTRAR AL MUSEO SONORO'}</span>
            <Play className="w-4 h-4 fill-white group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
