import React, { Suspense, lazy, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Headphones, LayoutDashboard, CalendarDays, Trophy, BrainCircuit, Heart,
  RotateCcw, Globe, Palette, Sparkles, AlertCircle, FileText, Upload, GitCompare,
  Sun, Activity, Award, ShieldCheck, Hourglass, Gift, Radio, TabletSmartphone
} from 'lucide-react';

import defaultMusicData from './data/music_dna_compiled.json';
import { MusicDnaData } from './types';
import { AppProvider, useApp, THEMES, type Theme } from './context/AppContext';

import DynamicMuseumBackground from './components/DynamicMuseumBackground';
import ErrorBoundary from './components/ErrorBoundary';
import SectionNarrative from './components/SectionNarrative';

const HeroSection = lazy(() => import('./components/HeroSection'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const DataUploader = lazy(() => import('./components/DataUploader'));
const TopHistorico = lazy(() => import('./components/TopHistorico'));
const SpotifyVsLastfm = lazy(() => import('./components/SpotifyVsLastfm'));
const DataQualityCenter = lazy(() => import('./components/DataQualityCenter'));
const PlatformsDevices = lazy(() => import('./components/PlatformsDevices'));
const EraExplorer = lazy(() => import('./components/EraExplorer'));
const PersonalityRadar = lazy(() => import('./components/PersonalityRadar'));
const EmotionalMap = lazy(() => import('./components/EmotionalMap'));
const ObsessionDetector = lazy(() => import('./components/ObsessionDetector'));
const CulturalMap = lazy(() => import('./components/CulturalMap'));
const InnerWorld = lazy(() => import('./components/InnerWorld'));
const ArtistIdentity = lazy(() => import('./components/ArtistIdentity'));
const HiddenInsights = lazy(() => import('./components/HiddenInsights'));
const FinalReport = lazy(() => import('./components/FinalReport'));
const StatsDeepDive = lazy(() => import('./components/StatsDeepDive'));
const Achievements = lazy(() => import('./components/Achievements'));
const TimeCapsule = lazy(() => import('./components/TimeCapsule'));
const WrappedCard = lazy(() => import('./components/WrappedCard'));
const RecentPulse = lazy(() => import('./components/RecentPulse'));

type Tab =
  | 'hero' | 'dashboard' | 'eras' | 'top' | 'personality' | 'emotions'
  | 'obsessions' | 'cultural' | 'inner' | 'artist' | 'insights'
  | 'compare' | 'platforms' | 'quality' | 'statsdeep' | 'achievements'
  | 'timecapsule' | 'wrapped' | 'pulse' | 'report' | 'upload';

const pageTransition = { duration: 0.35, ease: 'easeInOut' as const };

type NavIconMotif = 'grid' | 'timeline' | 'crown' | 'pulse' | 'orbit' | 'spiral' | 'globe' | 'palette' | 'spark' | 'stack' | 'alert';
type NavGroupId = 'overview' | 'archive' | 'identity' | 'listening' | 'data' | 'export';

interface SidebarSignalIconProps {
  icon: React.ElementType;
  color: string;
  secondary: string;
  motif: NavIconMotif;
  active: boolean;
  index: number;
}

function SidebarMotif({ motif, color, secondary }: { motif: NavIconMotif; color: string; secondary: string }) {
  if (motif === 'grid') {
    return (
      <div className="absolute inset-2 grid grid-cols-2 gap-1 opacity-55">
        {Array.from({ length: 4 }, (_, idx) => (
          <span key={idx} className="rounded-[3px]" style={{ backgroundColor: idx % 2 ? color : secondary }} />
        ))}
      </div>
    );
  }

  if (motif === 'timeline') {
    return (
      <div className="absolute inset-y-2 left-1/2 flex -translate-x-1/2 flex-col items-center justify-between opacity-60">
        <span className="h-full w-px rounded-full" style={{ backgroundColor: `${color}80` }} />
        {[0, 1, 2].map(dot => (
          <span key={dot} className="absolute h-1.5 w-1.5 rounded-full" style={{
            top: `${dot * 42 + 7}%`,
            backgroundColor: dot % 2 ? secondary : color,
            boxShadow: `0 0 8px ${dot % 2 ? secondary : color}`,
          }} />
        ))}
      </div>
    );
  }

  if (motif === 'crown') {
    return (
      <>
        <span className="absolute left-2.5 top-2.5 h-4 w-1.5 rotate-[-26deg] rounded-full" style={{ backgroundColor: `${secondary}75` }} />
        <span className="absolute left-1/2 top-1.5 h-5 w-1.5 -translate-x-1/2 rounded-full" style={{ backgroundColor: `${color}75` }} />
        <span className="absolute right-2.5 top-2.5 h-4 w-1.5 rotate-[26deg] rounded-full" style={{ backgroundColor: `${secondary}75` }} />
      </>
    );
  }

  if (motif === 'pulse') {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-65" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M5 23h7l3-8 6 17 4-12 3 4h7"
          fill="none"
          stroke={secondary}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.7"
        />
      </svg>
    );
  }

  if (motif === 'orbit') {
    return (
      <>
        <span className="absolute inset-2 rounded-full border" style={{ borderColor: `${color}70` }} />
        <span className="absolute inset-3.5 rounded-full border border-dashed" style={{ borderColor: `${secondary}75` }} />
        <span className="absolute right-1.5 top-2.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: secondary }} />
      </>
    );
  }

  if (motif === 'spiral') {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M21 8c8 1 11 9 7 15-4 7-14 6-17 0-3-6 3-12 9-10 5 1 7 7 3 10-3 3-8 1-8-3"
          fill="none"
          stroke={secondary}
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  if (motif === 'globe') {
    return (
      <>
        <span className="absolute inset-2 rounded-full border" style={{ borderColor: `${color}70` }} />
        <span className="absolute left-2 right-2 top-1/2 h-px" style={{ backgroundColor: `${secondary}85` }} />
        <span className="absolute bottom-2 top-2 left-1/2 w-px" style={{ backgroundColor: `${secondary}85` }} />
      </>
    );
  }

  if (motif === 'palette') {
    return (
      <>
        <span className="absolute left-2 top-2 h-3 w-3 rounded-full" style={{ backgroundColor: `${color}80` }} />
        <span className="absolute right-2 top-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `${secondary}85` }} />
        <span className="absolute bottom-2 left-3 h-2 w-4 rounded-full" style={{ backgroundColor: `${color}60` }} />
      </>
    );
  }

  if (motif === 'spark') {
    return (
      <>
        {Array.from({ length: 6 }, (_, idx) => (
          <span key={idx} className="absolute left-1/2 top-1/2 h-1 w-4 origin-left rounded-full"
            style={{
              backgroundColor: idx % 2 ? color : secondary,
              transform: `rotate(${idx * 60}deg) translateX(5px)`,
              opacity: 0.58,
            }} />
        ))}
      </>
    );
  }

  if (motif === 'stack') {
    return (
      <>
        <span className="absolute left-2 right-2 top-2.5 h-1.5 rounded-full" style={{ backgroundColor: `${color}75` }} />
        <span className="absolute left-3 right-3 top-1/2 h-1.5 rounded-full" style={{ backgroundColor: `${secondary}80` }} />
        <span className="absolute bottom-2.5 left-2 right-2 h-1.5 rounded-full" style={{ backgroundColor: `${color}55` }} />
      </>
    );
  }

  return (
    <>
      <span className="absolute left-2 right-2 top-2 h-1 rounded-full" style={{ backgroundColor: `${color}80` }} />
      <span className="absolute left-3 right-3 top-1/2 h-1 rounded-full" style={{ backgroundColor: `${secondary}80` }} />
      <span className="absolute bottom-2 left-2 right-2 h-1 rounded-full" style={{ backgroundColor: `${color}55` }} />
    </>
  );
}

function SidebarSignalIcon({ icon: Icon, color, secondary, motif, active, index }: SidebarSignalIconProps) {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
      <span className="absolute -inset-1 rounded-[inherit] blur-md transition-opacity"
        style={{ background: `linear-gradient(135deg, ${color}55, ${secondary}35)`, opacity: active ? 0.58 : 0.22 }} />
      <span className="absolute inset-0 overflow-hidden rounded-[inherit] border"
        style={{
          borderColor: active ? `${color}72` : `${color}30`,
          background: active
            ? `linear-gradient(135deg, ${color}28, ${secondary}18)`
            : `linear-gradient(135deg, ${color}16, ${secondary}0f)`,
          boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 0 16px ${color}24` : 'inset 0 1px 0 rgba(255,255,255,0.16)',
        }}>
        <span className="absolute -right-3 -top-3 h-8 w-8 rounded-full opacity-45" style={{ backgroundColor: secondary }} />
        <span className="absolute -bottom-3 -left-3 h-8 w-8 rounded-full opacity-35" style={{ backgroundColor: color }} />
        <SidebarMotif motif={motif} color={color} secondary={secondary} />
      </span>
      <span className="relative z-10 rounded-xl border border-white/15 bg-black/20 p-1.5 backdrop-blur-sm">
        <Icon className="h-3.5 w-3.5" style={{ color, filter: active ? `drop-shadow(0 0 8px ${color})` : `drop-shadow(0 0 5px ${color}75)` }} />
      </span>
      <span className="absolute -left-1 -top-1 z-20 hidden h-4 min-w-4 items-center justify-center rounded-full px-1 text-[7px] font-black md:flex"
        style={{
          color: active ? '#020617' : color,
          backgroundColor: active ? color : 'rgba(2, 6, 23, 0.72)',
          border: `1px solid ${color}55`,
        }}>
        {index + 1}
      </span>
    </span>
  );
}

function LoadingPanel() {
  const { tc, t } = useApp();
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="glass-panel px-6 py-4 rounded-2xl flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${tc.c1} transparent ${tc.c1} ${tc.c1}` }} />
        <span className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: tc.c1 }}>
          {t.loadingModule}
        </span>
      </div>
    </div>
  );
}

// ─── Inner app uses context ────────────────────────────────────────────────────
function AppInner() {
  const { t, theme, setTheme, tc, lang, setLang } = useApp();
  const [activeTab, setActiveTab]   = useState<Tab>('hero');
  const [musicData, setMusicData]   = useState<MusicDnaData>(() => defaultMusicData as MusicDnaData);
  const [showThemes, setShowThemes] = useState(false);

  const goToTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
  }, []);

  const handleDataLoaded = (newData: MusicDnaData) => {
    setMusicData(newData);
    goToTab('dashboard');
  };

  const menuItems = [
    { id: 'dashboard',   group: 'overview',  label: t.nav.dashboard,   icon: LayoutDashboard, color: tc.c1, secondary: tc.c3, motif: 'grid' },
    { id: 'eras',        group: 'overview',  label: t.nav.eras,         icon: CalendarDays,    color: '#60a5fa', secondary: '#f59e0b', motif: 'timeline' },
    { id: 'top',         group: 'archive',   label: t.nav.top,          icon: Trophy,          color: '#facc15', secondary: '#f97316', motif: 'crown' },
    { id: 'timecapsule', group: 'archive',   label: t.nav.timeCapsule,  icon: Hourglass,       color: '#818cf8', secondary: '#f472b6', motif: 'timeline' },
    { id: 'personality', group: 'identity',  label: t.nav.personality,  icon: BrainCircuit,    color: '#a78bfa', secondary: '#22d3ee', motif: 'orbit' },
    { id: 'emotions',    group: 'identity',  label: t.nav.emotions,     icon: Heart,           color: '#fb7185', secondary: '#f0abfc', motif: 'pulse' },
    { id: 'cultural',    group: 'identity',  label: t.nav.cultural,     icon: Globe,           color: '#34d399', secondary: '#38bdf8', motif: 'globe' },
    { id: 'inner',       group: 'identity',  label: t.nav.inner,        icon: Palette,         color: '#f472b6', secondary: '#8b5cf6', motif: 'palette' },
    { id: 'artist',      group: 'identity',  label: t.nav.artist,       icon: Sparkles,        color: '#fbbf24', secondary: '#22d3ee', motif: 'spark' },
    { id: 'obsessions',  group: 'listening', label: t.nav.obsessions,   icon: RotateCcw,       color: '#fb923c', secondary: '#ef4444', motif: 'spiral' },
    { id: 'insights',    group: 'listening', label: t.nav.insights,     icon: AlertCircle,     color: '#f43f5e', secondary: '#f97316', motif: 'alert' },
    { id: 'achievements', group: 'listening', label: t.nav.achievements, icon: Award,          color: '#f59e0b', secondary: '#facc15', motif: 'crown' },
    { id: 'wrapped',     group: 'listening', label: t.nav.wrapped,      icon: Gift,            color: '#ec4899', secondary: '#facc15', motif: 'spark' },
    { id: 'pulse',       group: 'listening', label: t.nav.pulse,        icon: Radio,           color: '#22d3ee', secondary: '#10b981', motif: 'pulse' },
    { id: 'compare',     group: 'data',      label: t.nav.compare,      icon: GitCompare,      color: '#1DB954', secondary: '#e8334a', motif: 'orbit' },
    { id: 'platforms',   group: 'data',      label: t.nav.platforms,    icon: TabletSmartphone, color: '#38bdf8', secondary: '#10b981', motif: 'grid' },
    { id: 'quality',     group: 'data',      label: t.nav.dataQuality,  icon: ShieldCheck,     color: '#2dd4bf', secondary: '#60a5fa', motif: 'grid' },
    { id: 'statsdeep',   group: 'data',      label: t.nav.statsPro,     icon: Activity,        color: '#38bdf8', secondary: '#a78bfa', motif: 'pulse' },
    { id: 'report',      group: 'export',    label: t.nav.report,       icon: FileText,        color: '#c084fc', secondary: '#60a5fa', motif: 'stack' },
    { id: 'upload',      group: 'export',    label: t.nav.upload,       icon: Upload,          color: '#10b981', secondary: '#facc15', motif: 'orbit' },
  ] as const;

  const navGroups: { id: NavGroupId; label: string; color: string }[] = [
    { id: 'overview', label: t.navGroups.overview, color: tc.c1 },
    { id: 'archive', label: t.navGroups.archive, color: '#facc15' },
    { id: 'identity', label: t.navGroups.identity, color: '#a78bfa' },
    { id: 'listening', label: t.navGroups.listening, color: '#fb923c' },
    { id: 'data', label: t.navGroups.data, color: '#2dd4bf' },
    { id: 'export', label: t.navGroups.export, color: '#10b981' },
  ];

  const filteredData = musicData;

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ backgroundColor: tc.bg, color: 'var(--fg)' }}>
      <DynamicMuseumBackground activeTab={activeTab} data={musicData} />

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b px-4 py-3 flex items-center justify-between gap-3"
        style={{ backgroundColor: `${tc.bg}99`, borderBottomColor: `${tc.c1}18` }}>
        
        {/* Logo */}
        <button
          className="flex items-center space-x-3 cursor-pointer shrink-0 text-left"
          onClick={() => goToTab('hero')}
          aria-label={t.homeAria}
        >
          <div className="p-2 rounded-xl shadow-cyber" style={{ background: `linear-gradient(135deg, ${tc.c1}, ${tc.c3})` }}>
            <Headphones className="w-4 h-4 text-white" />
          </div>
          <span className="font-mono font-bold text-base text-white tracking-widest uppercase hidden sm:block">
            NOVA <span style={{ color: tc.c1 }}>MUSIC LAB</span>
          </span>
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* User badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-gray-400 border px-3 py-1 rounded-full"
            style={{ borderColor: `${tc.c1}25`, backgroundColor: `${tc.c1}08` }}>
            <span style={{ color: tc.c1 }} className="font-bold">Kevin Cusnir (Lirioth)</span>
          </div>

          {/* Language toggle */}
          <div className="flex items-center rounded-full border overflow-hidden" style={{ borderColor: `${tc.c1}30` }}>
            {(['es','en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                aria-label={l === 'en' ? 'Switch language to English' : 'Cambiar idioma a español'}
                className="px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all"
                style={lang === l
                  ? { backgroundColor: tc.c1, color: '#000' }
                  : { color: '#6b7280' }}>
                {l}
              </button>
            ))}
          </div>

          {/* Theme selector */}
          <div className="relative">
            <button onClick={() => setShowThemes(v => !v)}
              aria-haspopup="menu"
              aria-expanded={showThemes}
              aria-label={t.themeAria}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-xs font-bold transition-all"
              style={{ borderColor: `${tc.c1}40`, color: tc.c1, backgroundColor: `${tc.c1}10` }}>
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{THEMES[theme].label}</span>
            </button>
            <AnimatePresence>
              {showThemes && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 rounded-2xl border overflow-hidden z-50 min-w-[160px]"
                  role="menu"
                  style={{ backgroundColor: `${tc.bg}f0`, borderColor: `${tc.c1}25`, backdropFilter: 'blur(12px)' }}>
                  {(Object.keys(THEMES) as Theme[]).map(th => (
                    <button key={th} onClick={() => { setTheme(th); setShowThemes(false); }}
                      role="menuitem"
                      className="flex items-center gap-2 w-full px-4 py-2.5 font-mono text-xs font-bold transition-all text-left"
                      style={theme === th ? { color: THEMES[th].c1, backgroundColor: `${THEMES[th].c1}15` } : { color: '#9ca3af' }}>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: THEMES[th].c1 }} />
                      {THEMES[th].label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Load data button */}
          <button onClick={() => goToTab('upload')}
            aria-label={t.loadDataAria}
            className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs font-bold rounded-full transition-all"
            style={{ borderColor: `${tc.c1}40`, color: tc.c1 }}>
            <Upload className="w-3 h-3" />
            <span className="hidden sm:block">{t.loadData}</span>
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      {activeTab === 'hero' ? (
        <Suspense fallback={<LoadingPanel />}>
          <HeroSection
            data={musicData}
            onEnter={() => goToTab('dashboard')}
            onUpload={() => goToTab('upload')}
          />
        </Suspense>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row z-10">
          {/* Sidebar */}
          <aside className="w-full md:w-60 shrink-0 border-r p-3 md:p-4 md:sticky md:top-[68px] md:self-start md:max-h-[calc(100vh-68px)] md:overflow-y-auto"
            style={{ backgroundColor: `${tc.bg}60`, borderRightColor: `${tc.c1}10` }}>
            <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-3 pb-2 md:pb-0">
              {navGroups.map(group => {
                const groupItems = menuItems.filter(item => item.group === group.id);
                const groupActive = groupItems.some(item => item.id === activeTab);

                return (
                  <section key={group.id} className="flex shrink-0 flex-row gap-1 md:flex-col md:gap-1.5">
                    <div className="hidden md:flex items-center justify-between gap-2 px-2.5 pt-1">
                      <span
                        className="font-mono text-[9px] font-black uppercase tracking-[0.22em]"
                        style={{ color: groupActive ? group.color : '#64748b' }}
                      >
                        {group.label}
                      </span>
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: groupActive ? group.color : `${group.color}45`, boxShadow: groupActive ? `0 0 10px ${group.color}` : 'none' }}
                      />
                    </div>
                    {groupItems.map(item => {
                      const idx = menuItems.findIndex(candidate => candidate.id === item.id);
                      const active = activeTab === item.id;
                      return (
                        <button key={item.id} onClick={() => goToTab(item.id as Tab)}
                          aria-current={active ? 'page' : undefined}
                          className="group flex items-center gap-2.5 px-2.5 py-2 rounded-2xl font-mono text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 md:w-full border relative overflow-hidden"
                          style={active ? {
                            borderColor: `${item.color}60`,
                            color: item.color,
                            background: `linear-gradient(135deg, ${item.color}16, ${item.secondary}08)`,
                            boxShadow: `0 0 18px ${item.color}22`,
                          } : { borderColor: 'transparent', color: '#6b7280' }}>
                          <span className="absolute inset-y-1 left-1 w-px rounded-full opacity-0 transition-opacity group-hover:opacity-60"
                            style={{ backgroundColor: item.color }} />
                          <SidebarSignalIcon
                            icon={item.icon}
                            color={item.color}
                            secondary={item.secondary}
                            motif={item.motif}
                            active={active}
                            index={idx}
                          />
                          <span className="flex-1 text-left leading-tight">{item.label}</span>
                          {active && (
                            <span className="hidden md:block h-2 w-2 rounded-full animate-pulse shrink-0"
                              style={{ backgroundColor: item.secondary, boxShadow: `0 0 10px ${item.secondary}` }} />
                          )}
                        </button>
                      );
                    })}
                  </section>
                );
              })}
            </nav>
            <div className="hidden md:flex flex-col items-center pt-4 mt-2 border-t gap-1"
              style={{ borderTopColor: `${tc.c1}12` }}>
              <span className="font-mono text-[9px] text-gray-600">Nova Music Lab</span>
              <span className="font-mono text-[9px] font-bold" style={{ color: tc.c3 }}>✧ LIRIOTH TELTANION ✧</span>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={pageTransition}
                className="min-h-full">
                <ErrorBoundary key={activeTab}>
                  <Suspense fallback={<LoadingPanel />}>
                    {activeTab === 'dashboard'   && <Dashboard data={filteredData} />}
                    {activeTab === 'eras'        && <EraExplorer data={filteredData} />}
                    {activeTab === 'top'         && <TopHistorico data={filteredData} />}
                    {activeTab === 'compare'     && <SpotifyVsLastfm data={filteredData} />}
                    {activeTab === 'platforms'   && <PlatformsDevices data={filteredData} />}
                    {activeTab === 'quality'     && <DataQualityCenter data={filteredData} />}
                    {activeTab === 'statsdeep'   && <StatsDeepDive data={filteredData} />}
                    {activeTab === 'achievements' && <Achievements data={filteredData} />}
                    {activeTab === 'personality' && <PersonalityRadar data={filteredData} />}
                    {activeTab === 'emotions'    && <EmotionalMap data={filteredData} />}
                    {activeTab === 'obsessions'  && <ObsessionDetector data={filteredData} />}
                    {activeTab === 'cultural'    && <CulturalMap data={filteredData} />}
                    {activeTab === 'inner'       && <InnerWorld data={filteredData} />}
                    {activeTab === 'artist'      && <ArtistIdentity data={filteredData} />}
                    {activeTab === 'insights'    && <HiddenInsights data={filteredData} />}
                    {activeTab === 'timecapsule' && <TimeCapsule data={filteredData} />}
                    {activeTab === 'wrapped'     && <WrappedCard data={filteredData} />}
                    {activeTab === 'pulse'       && <RecentPulse data={filteredData} />}
                    {activeTab === 'report'      && <FinalReport data={filteredData} />}
                    {activeTab === 'upload' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6">
                          <Upload className="w-6 h-6" style={{ color: tc.c1 }} />
                          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">{t.sections.uploadTitle}</h2>
                        </div>
                        <SectionNarrative content={t.deepNarratives.upload} accent="c2" />
                        <DataUploader onDataLoaded={handleDataLoaded} />
                      </div>
                    )}
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
    </div>
  );
}

// ─── Root export wraps with AppProvider ───────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
