import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid,
} from 'recharts';
import {
  Star, Flame, Zap, Clock, Music2, Globe, Heart,
  TrendingUp, Award, Target, Crown, Headphones,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import CountUp from './CountUp';
import ArtistAvatar from './ArtistAvatar';
import { getNightRatio, getPeakYear, getRecords } from '../utils/analytics';
import { localeFor, pickLanguage, type Lang } from '../utils/i18n';
import SectionNarrative from './SectionNarrative';
import { axisProps, barCursor, ChartGradients, GlassTooltip, gridStroke, useChartAnimation } from './chartKit';

interface AchievementsProps { data: MusicDnaData; }

interface Achievement {
  id: string;
  icon: React.ElementType;
  copy: Record<Lang, {
    label: string;
    unit: string;
    description: string;
  }>;
  value: string | number;
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

const bidiIsolate = (value: string | number) => `\u2068${value}\u2069`;

export default function Achievements({ data }: AchievementsProps) {
  const { lang, tc, t, setActiveTab, setSelectedArtistName, setTopSubTab } = useApp();
  const chartAnimation = useChartAnimation();
  const localCopy = pickLanguage(lang, {
    es: { filterAria: 'Filtrar logros por nivel', viewDossier: 'Ver Expediente', unavailable: 'N/D' },
    en: { filterAria: 'Filter achievements by tier', viewDossier: 'View Dossier', unavailable: 'N/A' },
    he: { filterAria: 'סינון הישגים לפי דרגה', viewDossier: 'פתח את תיק האמן', unavailable: 'לא זמין' },
  });
  const tierLabel = useCallback(
    (tier: keyof typeof t.achievements.tiers) => t.achievements.tiers[tier],
    [t]
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary'>('all');

  const fmtNum = useCallback(
    (n: number) => Math.round(n).toLocaleString(localeFor(lang)),
    [lang]
  );

  const achievements: Achievement[] = useMemo(() => {
    const m = data.core_metrics;
    const records = getRecords(data);
    const peakYear = getPeakYear(data);
    const nightRatio = getNightRatio(data);
    const topArtist = data.top_artists[0];

    const peakYearLabel = peakYear?.year ?? localCopy.unavailable;
    const topArtistName = topArtist?.name;

    return [
      {
        id: 'scrobble_master', icon: Headphones, tier: 'legendary',
        value: fmtNum(m.total_plays), numericVal: m.total_plays,
        copy: {
          es: { label: 'Maestro del Scrobble', unit: 'reproducciones totales', description: `Tu archivo contiene ${fmtNum(m.total_plays)} reproducciones. Es una autobiografía sonora lo bastante grande como para detectar eras, rituales y patrones reales.` },
          en: { label: 'Scrobble Master', unit: 'total plays', description: `Your archive contains ${fmtNum(m.total_plays)} plays. It is large enough to detect real eras, rituals and behavioral patterns.` },
          he: { label: 'מאסטר ה־Scrobble', unit: 'השמעות בסך הכול', description: `הארכיון שלך מכיל ${bidiIsolate(fmtNum(m.total_plays))} השמעות. זו אוטוביוגרפיה צלילית גדולה מספיק כדי לזהות תקופות, טקסים ודפוסי התנהגות אמיתיים.` },
        },
      },
      {
        id: 'time_lord', icon: Clock, tier: 'platinum',
        value: fmtNum(m.listening_hours), numericVal: m.listening_hours,
        copy: {
          es: { label: 'Señor del Tiempo', unit: 'horas de música escuchada', description: `${fmtNum(m.listening_hours)} horas equivalen a ${fmtNum(m.listening_days)} días completos de música continua.` },
          en: { label: 'Time Lord', unit: 'hours of music listened', description: `${fmtNum(m.listening_hours)} hours equals ${fmtNum(m.listening_days)} full days of continuous music.` },
          he: { label: 'אדון הזמן', unit: 'שעות של מוזיקה', description: `${bidiIsolate(fmtNum(m.listening_hours))} שעות שוות ל־${bidiIsolate(fmtNum(m.listening_days))} ימים מלאים של מוזיקה רציפה.` },
        },
      },
      {
        id: 'explorer', icon: Globe, tier: 'gold',
        value: fmtNum(m.unique_artists), numericVal: m.unique_artists,
        copy: {
          es: { label: 'Gran Explorador', unit: 'artistas únicos descubiertos', description: `Con ${fmtNum(m.unique_artists)} artistas únicos, tu mapa musical ya funciona como una ciudad completa de escenas y microclimas.` },
          en: { label: 'Grand Explorer', unit: 'unique artists discovered', description: `With ${fmtNum(m.unique_artists)} unique artists, your music map behaves like a full city of scenes and microclimates.` },
          he: { label: 'החוקר הגדול', unit: 'אמנים ייחודיים שגילית', description: `עם ${bidiIsolate(fmtNum(m.unique_artists))} אמנים ייחודיים, המפה המוזיקלית שלך כבר מתפקדת כעיר שלמה של סצנות ומיקרו־אקלים.` },
        },
      },
      {
        id: 'diverse', icon: Music2, tier: 'gold',
        value: fmtNum(m.unique_tracks), numericVal: m.unique_tracks,
        copy: {
          es: { label: 'Coleccionista Sonoro', unit: 'canciones únicas escuchadas', description: `${fmtNum(m.unique_tracks)} canciones únicas convierten tu historial en una biblioteca personal de alto detalle.` },
          en: { label: 'Sound Collector', unit: 'unique tracks listened', description: `${fmtNum(m.unique_tracks)} unique tracks turn your history into a detailed personal library.` },
          he: { label: 'אספן הסאונד', unit: 'שירים ייחודיים ששמעת', description: `${bidiIsolate(fmtNum(m.unique_tracks))} שירים ייחודיים הופכים את ההיסטוריה שלך לספרייה אישית מפורטת במיוחד.` },
        },
      },
      {
        id: 'streak_king', icon: Flame, tier: 'platinum',
        value: String(records.longest_streak_days), numericVal: records.longest_streak_days,
        copy: {
          es: { label: 'Rey de la Racha', unit: 'días consecutivos de escucha', description: `Tu racha más larga detectada es de ${records.longest_streak_days} días consecutivos.` },
          en: { label: 'Streak King', unit: 'consecutive listening days', description: `Your longest detected streak is ${records.longest_streak_days} consecutive days.` },
          he: { label: 'מלך הרצף', unit: 'ימי האזנה רצופים', description: `רצף ההאזנה הארוך ביותר שזוהה אצלך נמשך ${bidiIsolate(records.longest_streak_days)} ימים רצופים.` },
        },
      },
      {
        id: 'night_owl', icon: Star, tier: 'silver',
        value: `${nightRatio}%`, numericVal: nightRatio,
        copy: {
          es: { label: 'Búho Nocturno', unit: 'de escucha en madrugada (00–05h)', description: 'Tu madrugada musical revela que usas la música como regulador emocional y herramienta creativa nocturna.' },
          en: { label: 'Night Owl', unit: 'listening in late night (00–05h)', description: 'Your late-night music reveals you use music as an emotional regulator and nocturnal creative tool.' },
          he: { label: 'ינשוף לילה', unit: 'מההאזנה בשעות הקטנות (00–05)', description: 'ההאזנה שלך בשעות הקטנות מגלה שאתה משתמש במוזיקה לוויסות רגשי וככלי יצירתי לילי.' },
        },
      },
      {
        id: 'marathon_runner', icon: Zap, tier: 'gold',
        value: String(Math.round(records.longest_session_minutes)), numericVal: Math.round(records.longest_session_minutes),
        copy: {
          es: { label: 'Corredor de Maratón', unit: `minutos en sesión más larga (${records.longest_session_tracks} canciones)`, description: `Tu sesión más larga detectada dura ${fmtNum(records.longest_session_minutes)} minutos y contiene ${records.longest_session_tracks} canciones.` },
          en: { label: 'Marathon Runner', unit: `minutes in longest session (${records.longest_session_tracks} songs)`, description: `Your longest detected session lasts ${fmtNum(records.longest_session_minutes)} minutes and contains ${records.longest_session_tracks} songs.` },
          he: { label: 'רץ המרתון', unit: `דקות בסשן הארוך ביותר (${bidiIsolate(records.longest_session_tracks)} שירים)`, description: `הסשן הארוך ביותר שזוהה אצלך נמשך ${bidiIsolate(fmtNum(records.longest_session_minutes))} דקות וכולל ${bidiIsolate(records.longest_session_tracks)} שירים.` },
        },
      },
      {
        id: 'peak_year', icon: TrendingUp, tier: 'legendary',
        // No numericVal: years must render as "2021", never as "2,021".
        value: String(peakYearLabel),
        copy: {
          es: { label: 'Año de Leyenda', unit: `tu año cumbre — ${fmtNum(peakYear?.plays ?? 0)} plays`, description: `${peakYear?.year ?? 'Tu año cumbre'} concentra ${fmtNum(peakYear?.plays ?? 0)} reproducciones y marca la máxima intensidad del dataset actual.` },
          en: { label: 'Legendary Year', unit: `your peak year — ${fmtNum(peakYear?.plays ?? 0)} plays`, description: `${peakYear?.year ?? 'Your peak year'} contains ${fmtNum(peakYear?.plays ?? 0)} plays and marks the strongest intensity in the current dataset.` },
          he: { label: 'שנת האגדה', unit: `שנת השיא שלך — ${bidiIsolate(fmtNum(peakYear?.plays ?? 0))} השמעות`, description: `${bidiIsolate(peakYear?.year ?? 'שנת השיא שלך')} מרכזת ${bidiIsolate(fmtNum(peakYear?.plays ?? 0))} השמעות ומסמנת את העוצמה הגבוהה ביותר במערך הנתונים הנוכחי.` },
        },
      },
      {
        id: 'loyal_fan', icon: Heart, tier: 'gold', avatarName: topArtistName,
        value: fmtNum(topArtist?.plays ?? 0), numericVal: topArtist?.plays ?? 0,
        copy: {
          es: { label: 'Fan Incondicional', unit: `plays de ${topArtistName ?? 'tu artista principal'}`, description: `${topArtistName ?? 'Tu artista principal'} lidera el historial con ${fmtNum(topArtist?.plays ?? 0)} plays.` },
          en: { label: 'Unconditional Fan', unit: `${topArtistName ?? 'your top artist'} plays`, description: `${topArtistName ?? 'Your top artist'} leads the archive with ${fmtNum(topArtist?.plays ?? 0)} plays.` },
          he: { label: 'מעריץ ללא תנאים', unit: `${bidiIsolate(topArtistName ?? 'האמן המוביל שלך')} — השמעות`, description: `${bidiIsolate(topArtistName ?? 'האמן המוביל שלך')} מוביל את הארכיון עם ${bidiIsolate(fmtNum(topArtist?.plays ?? 0))} השמעות.` },
        },
      },
      {
        id: 'consistency', icon: Target, tier: 'silver',
        value: fmtNum(m.active_days), numericVal: m.active_days,
        copy: {
          es: { label: 'Constante y Firme', unit: 'días activos de escucha', description: `${fmtNum(m.active_days)} días activos convierten la música en un hábito medible, no solo en consumo ocasional.` },
          en: { label: 'Steady & Consistent', unit: 'active listening days', description: `${fmtNum(m.active_days)} active days make music a measurable habit, not just occasional consumption.` },
          he: { label: 'עקבי ואיתן', unit: 'ימי האזנה פעילים', description: `${bidiIsolate(fmtNum(m.active_days))} ימים פעילים הופכים את המוזיקה להרגל מדיד, ולא רק לצריכה מזדמנת.` },
        },
      },
      {
        id: 'global_citizen', icon: Award, tier: 'silver',
        value: `${data.countries.length}+`,
        copy: {
          es: { label: 'Ciudadano Global', unit: 'países de origen de tus artistas', description: `El dataset registra ${data.countries.length} países o regiones de escucha/artistas, según la fuente cargada.` },
          en: { label: 'Global Citizen', unit: 'countries of origin of your artists', description: `The dataset registers ${data.countries.length} countries or regions, depending on the loaded source.` },
          he: { label: 'אזרח העולם', unit: 'מדינות המוצא של האמנים שלך', description: `מערך הנתונים מתעד ${bidiIsolate(data.countries.length)} מדינות או אזורים, בהתאם למקור שנטען.` },
        },
      },
      {
        id: 'decade_master', icon: Crown, tier: 'legendary',
        value: '11',
        copy: {
          es: { label: 'Maestro de la Década', unit: 'años de historia musical documentada', description: '2015 a 2026: una década y un año de datos continuos. Una autobiografía sonora única en el mundo.' },
          en: { label: 'Decade Master', unit: 'years of documented music history', description: '2015 to 2026: a decade and a year of continuous data. A unique sonic autobiography in the world.' },
          he: { label: 'מאסטר העשור', unit: 'שנים של היסטוריה מוזיקלית מתועדת', description: `${bidiIsolate('2015–2026')}: עשור ושנה של נתונים רציפים. אוטוביוגרפיה צלילית יחידה במינה.` },
        },
      },
    ];
  }, [data, fmtNum, localCopy.unavailable]);

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-gray-400 font-mono">
          {t.achievements.subtitle(achievements.length)}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={localCopy.filterAria}>
          {(['all', ...tierOrder] as const).map(tier => (
            <button key={tier} type="button" onClick={() => setFilter(tier as any)}
              aria-pressed={filter === tier}
              className="min-h-11 px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase transition-all border"
              style={filter === tier
                ? { borderColor: tier === 'all' ? tc.c1 : TIER_COLORS[tier as keyof typeof TIER_COLORS]?.glow ?? tc.c1, color: tier === 'all' ? tc.c1 : TIER_COLORS[tier as keyof typeof TIER_COLORS]?.text ?? '#fff', backgroundColor: `${tier === 'all' ? tc.c1 : TIER_COLORS[tier as keyof typeof TIER_COLORS]?.glow ?? tc.c1}20` }
                : { borderColor: 'rgba(255,255,255,0.08)', color: '#6b7280' }}>
              {tier === 'all' ? t.achievements.filterAll : tierLabel(tier as keyof typeof t.achievements.tiers) ?? tier}
            </button>
          ))}
        </div>
      </div>

      <SectionNarrative content={t.deepNarratives.achievements} accent="c2" />

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
          const achievementCopy = pickLanguage(lang, ach.copy);
          return (
            <motion.article key={ach.id} variants={cardV}
              className={`glass-panel p-5 rounded-2xl transition-all relative overflow-hidden border hover:scale-[1.02] ${ach.tier === 'legendary' ? 'tier-shine' : ''}`}
              style={{
                borderColor: isSelected ? colors.glow : `${colors.glow}30`,
                background: isSelected ? colors.bg : undefined,
                boxShadow: `0 0 ${ach.tier === 'legendary' ? 26 : 16}px ${colors.glow}${ach.tier === 'legendary' ? '2e' : '14'}`,
              }}>
              {/* Tier glow — always on, stronger when selected */}
              <div className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(circle at 50% 0%, ${colors.glow}${isSelected ? '18' : '0c'}, transparent 70%)` }} />
              {/* Shine line */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-40"
                style={{ background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)` }} />

              <button
                type="button"
                onClick={() => setSelected(isSelected ? null : ach.id)}
                aria-expanded={isSelected}
                aria-controls={`achievement-details-${ach.id}`}
                className="relative z-10 block w-full cursor-pointer text-start"
              >
                <div className="flex items-start justify-between mb-3">
                  {ach.avatarName ? (
                    <ArtistAvatar name={ach.avatarName} size={40} />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${colors.glow}38, ${colors.glow}10)`,
                        border: `1px solid ${colors.glow}45`,
                        boxShadow: `inset 0 0 12px ${colors.glow}18`,
                      }}>
                      <Icon className="w-5 h-5" style={{ color: colors.glow, filter: `drop-shadow(0 0 5px ${colors.glow}90)` }} />
                    </div>
                  )}
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ color: colors.text, backgroundColor: `${colors.glow}20`, border: `1px solid ${colors.glow}40` }}>
                    {tierLabel(ach.tier).toUpperCase()}
                  </span>
                </div>

                <p className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {achievementCopy.label}
                </p>
                <p className="nova-number-ltr text-2xl font-black font-mono mt-1" dir="ltr" style={{ color: colors.text }}>
                  {ach.numericVal && !isNaN(ach.numericVal)
                    ? <CountUp target={ach.numericVal} duration={1.5} delay={0.1} />
                    : ach.value}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono" dir="auto">
                  {achievementCopy.unit}
                </p>
              </button>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    id={`achievement-details-${ach.id}`}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                    className="relative z-10 mt-3 flex flex-col gap-2 border-t pt-3 text-xs leading-relaxed text-gray-300 font-sans"
                    style={{ borderTopColor: `${colors.glow}20` }}>
                    <p dir="auto">{achievementCopy.description}</p>
                    {ach.avatarName && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArtistName(ach.avatarName || '');
                          setTopSubTab('artists');
                          setActiveTab('top');
                        }}
                        className="mt-1 flex min-h-11 w-fit items-center gap-1 text-start text-[10px] font-mono font-black uppercase tracking-wider transition-all duration-200 hover:translate-x-0.5 rtl:hover:-translate-x-0.5 hover:underline"
                        style={{ color: colors.glow }}
                      >
                        🔍 {localCopy.viewDossier}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
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
              <RadarChart accessibilityLayer data={radarData}>
                <PolarGrid stroke={gridStroke(tc.c1, tc.mode)} />
                <PolarAngleAxis dataKey="metric" stroke="#9ca3af" fontSize={11} tick={{ fill: tc.mode === 'light' ? '#475569' : '#9ca3af' }} />
                <Radar {...chartAnimation} name={t.achievements.yourProfile} dataKey="val"
                  stroke={tc.c1} strokeWidth={2} fill={tc.c1} fillOpacity={0.22}
                  dot={{ fill: tc.c1, r: 3, strokeWidth: 0 }} />
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
              <BarChart accessibilityLayer data={tierPointData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <ChartGradients specs={[TIER_COLORS.legendary.glow, TIER_COLORS.platinum.glow, TIER_COLORS.gold.glow, TIER_COLORS.silver.glow].map((color, i) => ({
                  id: `tierGrad-${i}`, color, from: 0.95, to: 0.28,
                }))} />
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(tc.c1, tc.mode)} horizontal={false} />
                <XAxis dataKey="tier" {...axisProps(tc.mode)} />
                <YAxis {...axisProps(tc.mode)} />
                <Tooltip cursor={barCursor(tc.c1)} content={<GlassTooltip accent={tc.c1} />} />
                <Bar dataKey="points" name={t.achievements.pointsLegend} radius={[6, 6, 0, 0]} {...chartAnimation}>
                  {[TIER_COLORS.legendary.glow, TIER_COLORS.platinum.glow, TIER_COLORS.gold.glow, TIER_COLORS.silver.glow].map((color, i) => (
                    <Cell key={i} fill={`url(#tierGrad-${i})`} stroke={color} strokeOpacity={0.6} strokeWidth={1} />
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
