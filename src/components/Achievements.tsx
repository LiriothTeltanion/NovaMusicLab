import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid,
} from 'recharts';
import {
  Trophy, Star, Flame, Zap, Clock, Music2, Globe, Heart,
  TrendingUp, Award, Target, Crown, Headphones,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import CountUp from './CountUp';
import ArtistAvatar from './ArtistAvatar';
import { getNightRatio, getPeakYear, getRecords } from '../utils/analytics';

interface AchievementsProps { data: MusicDnaData; }

interface Achievement {
  id: string;
  icon: React.ElementType;
  label_es: string;
  label_en: string;
  value: string | number;
  unit_es: string;
  unit_en: string;
  desc_es: string;
  desc_en: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  numericVal?: number;
  avatarName?: string;
}

const TIER_COLORS = {
  bronze:   { glow: '#cd7f32', text: '#e8a87c', bg: '#2a1500' },
  silver:   { glow: '#c0c0c0', text: '#e8e8e8', bg: '#1a1a1a' },
  gold:     { glow: '#ffd700', text: '#ffe566', bg: '#1a1400' },
  platinum: { glow: '#e5e4e2', text: '#f0f0f0', bg: '#111214' },
  legendary:{ glow: '#a020f0', text: '#d070ff', bg: '#120030' },
};

const TIER_ORDER = ['legendary', 'platinum', 'gold', 'silver', 'bronze'] as const;

const TIER_POINTS: Record<Achievement['tier'], number> = {
  legendary: 500,
  platinum: 300,
  gold: 200,
  silver: 100,
  bronze: 50,
};

export default function Achievements({ data }: AchievementsProps) {
  const { lang, tc, t } = useApp();
  const L = lang === 'en';
  const tierLabel = useCallback(
    (tier: keyof typeof t.achievements.tiers) => t.achievements.tiers[tier],
    [t]
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary'>('all');

  const fmtNum = useCallback(
    (n: number) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES'),
    [lang]
  );

  const achievements: Achievement[] = useMemo(() => {
    const m = data.core_metrics;
    const records = getRecords(data);
    const peakYear = getPeakYear(data);
    const nightRatio = getNightRatio(data);
    const topArtist = data.top_artists[0];

    return [
    {
      id: 'scrobble_master', icon: Headphones, tier: 'legendary',
      label_es: 'Maestro del Scrobble', label_en: 'Scrobble Master',
      value: fmtNum(m.total_plays), numericVal: m.total_plays,
      unit_es: 'reproducciones totales', unit_en: 'total plays',
      desc_es: `Tu archivo contiene ${fmtNum(m.total_plays)} reproducciones. Es una autobiografia sonora lo bastante grande como para detectar eras, rituales y patrones reales.`,
      desc_en: `Your archive contains ${fmtNum(m.total_plays)} plays. It is large enough to detect real eras, rituals and behavioral patterns.`,
    },
    {
      id: 'time_lord', icon: Clock, tier: 'platinum',
      label_es: 'Señor del Tiempo', label_en: 'Time Lord',
      value: fmtNum(m.listening_hours), numericVal: m.listening_hours,
      unit_es: 'horas de música escuchada', unit_en: 'hours of music listened',
      desc_es: `${fmtNum(m.listening_hours)} horas equivalen a ${fmtNum(m.listening_days)} dias completos de musica continua.`,
      desc_en: `${fmtNum(m.listening_hours)} hours equals ${fmtNum(m.listening_days)} full days of continuous music.`,
    },
    {
      id: 'explorer', icon: Globe, tier: 'gold',
      label_es: 'Gran Explorador', label_en: 'Grand Explorer',
      value: fmtNum(m.unique_artists), numericVal: m.unique_artists,
      unit_es: 'artistas únicos descubiertos', unit_en: 'unique artists discovered',
      desc_es: `Con ${fmtNum(m.unique_artists)} artistas unicos, tu mapa musical ya funciona como una ciudad completa de escenas y microclimas.`,
      desc_en: `With ${fmtNum(m.unique_artists)} unique artists, your music map behaves like a full city of scenes and microclimates.`,
    },
    {
      id: 'diverse', icon: Music2, tier: 'gold',
      label_es: 'Coleccionista Sonoro', label_en: 'Sound Collector',
      value: fmtNum(m.unique_tracks), numericVal: m.unique_tracks,
      unit_es: 'canciones únicas escuchadas', unit_en: 'unique tracks listened',
      desc_es: `${fmtNum(m.unique_tracks)} canciones unicas convierten tu historial en una biblioteca personal de alto detalle.`,
      desc_en: `${fmtNum(m.unique_tracks)} unique tracks turn your history into a detailed personal library.`,
    },
    {
      id: 'streak_king', icon: Flame, tier: 'platinum',
      label_es: 'Rey de la Racha', label_en: 'Streak King',
      value: String(records.longest_streak_days),  numericVal: records.longest_streak_days,
      unit_es: 'días consecutivos de escucha', unit_en: 'consecutive listening days',
      desc_es: `Tu racha mas larga detectada es de ${records.longest_streak_days} dias consecutivos.`,
      desc_en: `Your longest detected streak is ${records.longest_streak_days} consecutive days.`,
    },
    {
      id: 'night_owl', icon: Star, tier: 'silver',
      label_es: 'Búho Nocturno', label_en: 'Night Owl',
      value: `${nightRatio}%`, numericVal: nightRatio,
      unit_es: 'de escucha en madrugada (00–05h)', unit_en: 'listening in late night (00–05h)',
      desc_es: 'Tu madrugada musical revela que usas la música como regulador emocional y herramienta creativa nocturna.',
      desc_en: 'Your late-night music reveals you use music as an emotional regulator and nocturnal creative tool.',
    },
    {
      id: 'marathon_runner', icon: Zap, tier: 'gold',
      label_es: 'Corredor de Maratón', label_en: 'Marathon Runner',
      value: String(Math.round(records.longest_session_minutes)),  numericVal: Math.round(records.longest_session_minutes),
      unit_es: `minutos en sesión más larga (${records.longest_session_tracks} canciones)`, unit_en: `minutes in longest session (${records.longest_session_tracks} songs)`,
      desc_es: `Tu sesion mas larga detectada dura ${fmtNum(records.longest_session_minutes)} minutos y contiene ${records.longest_session_tracks} canciones.`,
      desc_en: `Your longest detected session lasts ${fmtNum(records.longest_session_minutes)} minutes and contains ${records.longest_session_tracks} songs.`,
    },
    {
      id: 'peak_year', icon: TrendingUp, tier: 'legendary',
      label_es: 'Año de Leyenda', label_en: 'Legendary Year',
      value: String(peakYear?.year ?? 'N/D'), numericVal: Number(peakYear?.year ?? 0),
      unit_es: `tu año cumbre — ${fmtNum(peakYear?.plays ?? 0)} plays`, unit_en: `your peak year — ${fmtNum(peakYear?.plays ?? 0)} plays`,
      desc_es: `${peakYear?.year ?? 'Tu año cumbre'} concentra ${fmtNum(peakYear?.plays ?? 0)} reproducciones y marca la maxima intensidad del dataset actual.`,
      desc_en: `${peakYear?.year ?? 'Your peak year'} contains ${fmtNum(peakYear?.plays ?? 0)} plays and marks the strongest intensity in the current dataset.`,
    },
    {
      id: 'loyal_fan', icon: Heart, tier: 'gold', avatarName: topArtist?.name,
      label_es: 'Fan Incondicional', label_en: 'Unconditional Fan',
      value: fmtNum(topArtist?.plays ?? 0), numericVal: topArtist?.plays ?? 0,
      unit_es: `plays de ${topArtist?.name ?? 'tu artista principal'}`, unit_en: `${topArtist?.name ?? 'your top artist'} plays`,
      desc_es: `${topArtist?.name ?? 'Tu artista principal'} lidera el historial con ${fmtNum(topArtist?.plays ?? 0)} plays.`,
      desc_en: `${topArtist?.name ?? 'Your top artist'} leads the archive with ${fmtNum(topArtist?.plays ?? 0)} plays.`,
    },
    {
      id: 'consistency', icon: Target, tier: 'silver',
      label_es: 'Constante y Firme', label_en: 'Steady & Consistent',
      value: fmtNum(m.active_days), numericVal: m.active_days,
      unit_es: 'días activos de escucha', unit_en: 'active listening days',
      desc_es: `${fmtNum(m.active_days)} dias activos convierten la musica en un habito medible, no solo en consumo ocasional.`,
      desc_en: `${fmtNum(m.active_days)} active days make music a measurable habit, not just occasional consumption.`,
    },
    {
      id: 'global_citizen', icon: Award, tier: 'silver',
      label_es: 'Ciudadano Global', label_en: 'Global Citizen',
      value: `${data.countries.length}+`,
      unit_es: 'países de origen de tus artistas', unit_en: 'countries of origin of your artists',
      desc_es: `El dataset registra ${data.countries.length} paises o regiones de escucha/artistas, segun la fuente cargada.`,
      desc_en: `The dataset registers ${data.countries.length} countries or regions, depending on the loaded source.`,
    },
    {
      id: 'decade_master', icon: Crown, tier: 'legendary',
      label_es: 'Maestro de la Década', label_en: 'Decade Master',
      value: '11',
      unit_es: 'años de historia musical documentada', unit_en: 'years of documented music history',
      desc_es: '2015 a 2026: una década y un año de datos continuos. Una autobiografía sonora única en el mundo.',
      desc_en: '2015 to 2026: a decade and a year of continuous data. A unique sonic autobiography in the world.',
    },
    ];
  }, [data, fmtNum]);

  const tierOrder = TIER_ORDER;

  const filtered = useMemo(
    () => (filter === 'all' ? achievements : achievements.filter(a => a.tier === filter)),
    [achievements, filter]
  );
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)),
    [filtered]
  );

  const stats = useMemo(() => ({
    legendary: achievements.filter(a => a.tier === 'legendary').length,
    platinum:  achievements.filter(a => a.tier === 'platinum').length,
    gold:      achievements.filter(a => a.tier === 'gold').length,
    silver:    achievements.filter(a => a.tier === 'silver').length,
    bronze:    achievements.filter(a => a.tier === 'bronze').length,
  }), [achievements]);

  const radarData = useMemo(() => [
    { metric: t.achievements.radarMetrics.volume,      val: 95 },
    { metric: t.achievements.radarMetrics.diversity,   val: 84 },
    { metric: t.achievements.radarMetrics.consistency, val: 78 },
    { metric: t.achievements.radarMetrics.exploration, val: 82 },
    { metric: t.achievements.radarMetrics.dedication,  val: 96 },
    { metric: t.achievements.radarMetrics.nostalgia,   val: 88 },
  ], [t]);

  const containerV = { animate: { transition: { staggerChildren: 0.06 } } };
  const cardV = {
    initial: { opacity: 0, scale: 0.88, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
  };

  const tierPointData = useMemo(() => TIER_ORDER.slice(0, 4).map(tier => ({
    tier: tierLabel(tier as keyof typeof t.achievements.tiers),
    points: achievements.filter(a => a.tier === tier).length * TIER_POINTS[tier as Achievement['tier']],
  })), [achievements, tierLabel]);
  const totalPoints = useMemo(
    () => achievements.reduce((sum, ach) => sum + TIER_POINTS[ach.tier], 0),
    [achievements]
  );

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Trophy className="w-7 h-7" style={{ color: '#ffd700', filter: 'drop-shadow(0 0 8px #ffd70060)' }} />
          <div>
            <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
              {t.achievements.title}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {t.achievements.subtitle(achievements.length)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', ...tierOrder] as const).map(tier => (
            <button key={tier} onClick={() => setFilter(tier as any)}
              className="px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase transition-all border"
              style={filter === tier
                ? { borderColor: tier === 'all' ? tc.c1 : TIER_COLORS[tier as keyof typeof TIER_COLORS]?.glow ?? tc.c1, color: tier === 'all' ? tc.c1 : TIER_COLORS[tier as keyof typeof TIER_COLORS]?.text ?? '#fff', backgroundColor: `${tier === 'all' ? tc.c1 : TIER_COLORS[tier as keyof typeof TIER_COLORS]?.glow ?? tc.c1}20` }
                : { borderColor: 'rgba(255,255,255,0.08)', color: '#6b7280' }}>
              {tier === 'all' ? t.achievements.filterAll : tierLabel(tier as keyof typeof t.achievements.tiers) ?? tier}
            </button>
          ))}
        </div>
      </div>

      {/* Tier summary strip */}
      <div className="grid grid-cols-5 gap-3">
        {tierOrder.map(tier => {
          const count = stats[tier as keyof typeof stats];
          const colors = TIER_COLORS[tier as keyof typeof TIER_COLORS];
          return (
            <div key={tier} className="glass-panel p-3 rounded-2xl text-center border-t-2" style={{ borderTopColor: colors.glow }}>
              <p className="text-xl font-black font-mono" style={{ color: colors.text }}>{count}</p>
              <p className="text-[9px] font-mono text-gray-400 uppercase tracking-wider mt-0.5">
                {tierLabel(tier as keyof typeof t.achievements.tiers)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Achievement cards grid */}
      <motion.div variants={containerV} initial="initial" animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sorted.map((ach) => {
          const Icon = ach.icon;
          const colors = TIER_COLORS[ach.tier];
          const isSelected = selected === ach.id;
          return (
            <motion.div key={ach.id} variants={cardV}
              onClick={() => setSelected(isSelected ? null : ach.id)}
              className="glass-panel p-5 rounded-2xl cursor-pointer transition-all relative overflow-hidden border"
              style={{
                borderColor: isSelected ? colors.glow : 'rgba(255,255,255,0.06)',
                background: isSelected ? colors.bg : undefined,
              }}>
              {/* Tier glow */}
              {isSelected && (
                <div className="absolute inset-0 pointer-events-none rounded-2xl"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${colors.glow}15, transparent 70%)` }} />
              )}
              {/* Shine effect */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-30"
                style={{ background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)` }} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  {ach.avatarName ? (
                    <ArtistAvatar name={ach.avatarName} size={40} />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${colors.glow}20`, border: `1px solid ${colors.glow}40` }}>
                      <Icon className="w-5 h-5" style={{ color: colors.glow }} />
                    </div>
                  )}
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ color: colors.text, backgroundColor: `${colors.glow}20`, border: `1px solid ${colors.glow}40` }}>
                    {tierLabel(ach.tier).toUpperCase()}
                  </span>
                </div>

                <p className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {L ? ach.label_en : ach.label_es}
                </p>
                <p className="text-2xl font-black font-mono mt-1" style={{ color: colors.text }}>
                  {ach.numericVal && !isNaN(ach.numericVal) ? (
                    <CountUp target={ach.numericVal} duration={1.5} delay={0.1} />
                  ) : ach.value}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                  {L ? ach.unit_en : ach.unit_es}
                </p>

                <AnimatePresence>
                  {isSelected && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                      className="text-xs text-gray-300 mt-3 pt-3 border-t font-sans leading-relaxed"
                      style={{ borderTopColor: `${colors.glow}20` }}>
                      {L ? ach.desc_en : ach.desc_es}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Radar + Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest mb-5">
            {t.achievements.radarTitle}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="metric" stroke="#9ca3af" fontSize={11} tick={{ fill: '#9ca3af' }} />
                <Radar name={t.achievements.yourProfile} dataKey="val"
                  stroke={tc.c1} fill={tc.c1} fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest mb-5">
            {t.achievements.pointsByTier}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierPointData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" horizontal={false} />
                <XAxis dataKey="tier" stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ backgroundColor: '#070e1c', borderColor: `${tc.c1}40`, borderRadius: '12px' }} />
                <Bar dataKey="points" name={t.achievements.pointsLegend} radius={[6, 6, 0, 0]}>
                  {[TIER_COLORS.legendary.glow, TIER_COLORS.platinum.glow, TIER_COLORS.gold.glow, TIER_COLORS.silver.glow].map((color, i) => (
                    <Cell key={i} fill={color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm font-mono font-bold mt-3" style={{ color: TIER_COLORS.legendary.text }}>
            {t.achievements.totalPoints(fmtNum(totalPoints))}
          </p>
        </div>
      </div>
    </div>
  );
}
