import React, { Suspense, lazy, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Headphones, LayoutDashboard, CalendarDays, Trophy, BrainCircuit, Heart, 
  RotateCcw, Globe, Palette, Sparkles, AlertCircle, FileText, Upload, GitCompare,
  Sun, Activity, Award
} from 'lucide-react';

import defaultMusicData from './data/music_dna_compiled.json';
import { MusicDnaData } from './types';
import { AppProvider, useApp, THEMES, type Theme } from './context/AppContext';

import AnimatedParticles from './components/AnimatedParticles';
import ErrorBoundary from './components/ErrorBoundary';

const HeroSection = lazy(() => import('./components/HeroSection'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const DataUploader = lazy(() => import('./components/DataUploader'));
const TopHistorico = lazy(() => import('./components/TopHistorico'));
const SpotifyVsLastfm = lazy(() => import('./components/SpotifyVsLastfm'));
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

type Tab = 
  | 'hero' | 'dashboard' | 'eras' | 'top' | 'personality' | 'emotions'
  | 'obsessions' | 'cultural' | 'inner' | 'artist' | 'insights'
  | 'compare' | 'statsdeep' | 'achievements' | 'report' | 'upload';

const pageTransition = { duration: 0.35, ease: 'easeInOut' as const };

function LoadingPanel() {
  const { tc, lang } = useApp();
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="glass-panel px-6 py-4 rounded-2xl flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${tc.c1} transparent ${tc.c1} ${tc.c1}` }} />
        <span className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: tc.c1 }}>
          {lang === 'en' ? 'Loading module' : 'Cargando módulo'}
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
    { id: 'dashboard',   label: t.nav.dashboard,   icon: LayoutDashboard },
    { id: 'eras',        label: t.nav.eras,         icon: CalendarDays },
    { id: 'top',         label: t.nav.top,          icon: Trophy },
    { id: 'personality', label: t.nav.personality,  icon: BrainCircuit },
    { id: 'emotions',    label: t.nav.emotions,     icon: Heart },
    { id: 'obsessions',  label: t.nav.obsessions,   icon: RotateCcw },
    { id: 'cultural',    label: t.nav.cultural,     icon: Globe },
    { id: 'inner',       label: t.nav.inner,        icon: Palette },
    { id: 'artist',      label: t.nav.artist,       icon: Sparkles },
    { id: 'insights',    label: t.nav.insights,     icon: AlertCircle },
    { id: 'compare',     label: t.nav.compare,      icon: GitCompare },
    { id: 'statsdeep',   label: t.nav.statsPro,     icon: Activity },
    { id: 'achievements', label: t.nav.achievements, icon: Award },
    { id: 'report',      label: t.nav.report,       icon: FileText },
    { id: 'upload',      label: t.nav.upload,       icon: Upload },
  ] as const;

  const filteredData = musicData;

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ backgroundColor: tc.bg, color: 'var(--fg)' }}>
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0" />
      <AnimatedParticles count={50} intensity="subtle" className="z-0" />

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b px-4 py-3 flex items-center justify-between gap-3"
        style={{ backgroundColor: `${tc.bg}99`, borderBottomColor: `${tc.c1}18` }}>
        
        {/* Logo */}
        <button
          className="flex items-center space-x-3 cursor-pointer shrink-0 text-left"
          onClick={() => goToTab('hero')}
          aria-label={lang === 'en' ? 'Go to Nova Music Lab home' : 'Ir al inicio de Nova Music Lab'}
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
              aria-label={lang === 'en' ? 'Open theme selector' : 'Abrir selector de tema'}
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
            aria-label={lang === 'en' ? 'Load music data files' : 'Cargar archivos de datos musicales'}
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
          <HeroSection data={musicData} onEnter={() => goToTab('dashboard')} />
        </Suspense>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row z-10">
          {/* Sidebar */}
          <aside className="w-full md:w-60 shrink-0 border-r p-3 md:p-4"
            style={{ backgroundColor: `${tc.bg}60`, borderRightColor: `${tc.c1}10` }}>
            <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1 pb-2 md:pb-0">
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => goToTab(item.id as Tab)}
                    aria-current={active ? 'page' : undefined}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 md:w-full border relative"
                    style={active ? {
                      borderColor: tc.c1,
                      color: tc.c1,
                      backgroundColor: `${tc.c1}12`,
                      boxShadow: `0 0 12px ${tc.c1}20`,
                    } : { borderColor: 'transparent', color: '#6b7280' }}>
                    <span className="hidden md:flex w-4 h-4 rounded-full items-center justify-center text-[8px] shrink-0 font-black"
                      style={active ? { backgroundColor: tc.c1, color: '#000' } : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#4b5563' }}>
                      {idx + 1}
                    </span>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {active && <span className="hidden md:block w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: tc.c1 }} />}
                  </button>
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
                    {activeTab === 'statsdeep'   && <StatsDeepDive data={filteredData} />}
                    {activeTab === 'achievements' && <Achievements data={filteredData} />}
                    {activeTab === 'personality' && <PersonalityRadar data={filteredData} />}
                    {activeTab === 'emotions'    && <EmotionalMap data={filteredData} />}
                    {activeTab === 'obsessions'  && <ObsessionDetector data={filteredData} />}
                    {activeTab === 'cultural'    && <CulturalMap data={filteredData} />}
                    {activeTab === 'inner'       && <InnerWorld data={filteredData} />}
                    {activeTab === 'artist'      && <ArtistIdentity data={filteredData} />}
                    {activeTab === 'insights'    && <HiddenInsights data={filteredData} />}
                    {activeTab === 'report'      && <FinalReport data={filteredData} />}
                    {activeTab === 'upload' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6">
                          <Upload className="w-6 h-6" style={{ color: tc.c1 }} />
                          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">{t.sections.uploadTitle}</h2>
                        </div>
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
