import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, Trophy, BrainCircuit, Heart,
  RotateCcw, Globe, Palette, Sparkles, AlertCircle, FileText, Upload, GitCompare,
  Sun, Activity, Award, ShieldCheck, Hourglass, Gift, Radio, TabletSmartphone, Compass, Users,
  ChevronDown, Bot, SlidersHorizontal, Link2, Check
} from 'lucide-react';

import { loadDefaultDataset } from './data/defaultDataset';
import type { ArtistGenreCatalogEntry, GenreAssignment, MusicDnaData } from './types';
import { clearDataset, loadDataset, saveDataset } from './utils/datasetStorage';
import { applyGenreAssignments } from './utils/genreAssignments';
import {
  buildDeepLink,
  buildShareUrl,
  parseDeepLink,
  syncDeepLinkHistory,
  type AppTab,
  type DeepLinkState,
} from './utils/deepLinks';
import {
  LANGUAGE_OPTIONS,
  directionFor,
  languageUiFor,
  localeFor,
  pickLanguage,
  type Lang,
} from './utils/i18n';
import { AppProvider, useApp, THEMES, type Theme } from './context/AppContext';

import DynamicMuseumBackground from './components/DynamicMuseumBackground';
import ErrorBoundary from './components/ErrorBoundary';
import CreatorCvLink from './components/CreatorCvLink';
import NovaMark from './components/NovaMark';
import SectionNarrative from './components/SectionNarrative';
import {
  MobileMuseumRoomDock,
  MuseumRoomProgressRail,
  MuseumRoomTransition,
  type MuseumRoomItem,
} from './components/MuseumRoomNavigator';

// Lazy: not needed for the very first paint (skipped entirely for returning
// visitors who already dismissed it), and its MoodArtCanvas dependency would
// otherwise bloat the main bundle every visitor downloads immediately.
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));

// Lazy: pulls in emotionalEngine -> offlineArtistKnowledge, which bundles the
// full offline_artist_knowledge.json + artist_enrichment.json (~800KB raw).
// Eagerly importing this decorative background doubled the main bundle.
const InteractiveBackdrop = lazy(() => import('./components/InteractiveBackdrop'));

// Lazy: the cinematic prelude is deliberately absent from the hero. Keeping
// its room-specific copy and SVG motifs in a separate chunk protects the
// initial landing-page payload.
const MuseumChapterHeader = lazy(() => import('./components/MuseumChapterHeader'));

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
const MuseumComparator = lazy(() => import('./components/MuseumComparator'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));

type Tab = AppTab;

type RoomWidth = 'reading' | 'analytics' | 'explorer';

const EXPLORER_ROOMS = new Set<Tab>(['top', 'cultural', 'artist', 'compare', 'museums']);
const ANALYTICS_ROOMS = new Set<Tab>([
  'dashboard', 'eras', 'statsdeep', 'achievements', 'emotions',
  'obsessions', 'inner', 'platforms', 'quality', 'pulse',
]);

function roomWidthFor(tab: Tab): RoomWidth {
  if (EXPLORER_ROOMS.has(tab)) return 'explorer';
  if (ANALYTICS_ROOMS.has(tab)) return 'analytics';
  return 'reading';
}

const pageTransition = { duration: 0.35, ease: 'easeInOut' as const };
const TOUR_STORAGE_KEY = 'nml_tour_seen';

type NavIconMotif = 'grid' | 'timeline' | 'crown' | 'pulse' | 'orbit' | 'spiral' | 'globe' | 'palette' | 'spark' | 'stack' | 'alert';
type NavGroupId = 'overview' | 'archive' | 'identity' | 'listening' | 'data' | 'export';

interface MenuItem {
  id: Tab;
  group: NavGroupId;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  secondary: string;
  motif: NavIconMotif;
}

interface NavGroup {
  id: NavGroupId;
  label: string;
  color: string;
}

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
      <span aria-hidden="true" className="absolute -left-1 -top-1 z-20 hidden h-4 min-w-4 items-center justify-center rounded-full px-1 text-[7px] font-black md:flex"
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
    <div className="min-h-[46vh] flex items-center justify-center px-4" aria-live="polite">
      <div className="glass-panel relative w-full max-w-md overflow-hidden rounded-3xl border px-5 py-5 shadow-2xl"
        style={{ borderColor: `${tc.c1}26`, boxShadow: `0 22px 60px ${tc.c1}12` }}>
        <div className="absolute inset-0 pointer-events-none opacity-80"
          style={{
            background: `radial-gradient(circle at 18% 10%, ${tc.c1}20, transparent 32%), radial-gradient(circle at 86% 20%, ${tc.c3}1f, transparent 30%), linear-gradient(135deg, ${tc.c1}08, transparent 45%, ${tc.c4}08)`,
          }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0">
            <motion.span
              aria-hidden="true"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' as const }}
              className="absolute inset-0 rounded-full border border-dashed"
              style={{ borderColor: `${tc.c1}55` }}
            />
            <span className="absolute inset-1.5 overflow-hidden rounded-2xl bg-black/30">
              <NovaMark className="h-full w-full" size="100%" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em]" style={{ color: tc.c1 }}>
              {t.loadingModule}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-400">
              {t.loadingModuleBody}
            </p>
          </div>
        </div>
        <div className="relative z-10 mt-5 grid grid-cols-3 gap-2" aria-hidden="true">
          {[tc.c1, tc.c3, tc.c4].map((color, idx) => (
            <span key={color} className="h-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: color,
                opacity: idx === 1 ? 0.55 : 0.8,
                animationDelay: `${idx * 160}ms`,
                boxShadow: `0 0 14px ${color}55`,
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}

type CopyLinkStatus = 'idle' | 'copied' | 'error';

interface CopyLinkLabels {
  copy: string;
  copyAria: string;
  copied: string;
  copiedAria: string;
  error: string;
  errorAria: string;
}

export async function writeClipboardText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Permissions and embedded browsers can reject the modern API even when
      // it exists. Continue through the local, synchronous fallback below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand?.('copy')) throw new Error('Clipboard copy was rejected');
  } finally {
    textarea.remove();
  }
}

function CopyDeepLinkButton({
  status,
  labels,
  accent,
  variant,
  onCopy,
}: {
  status: CopyLinkStatus;
  labels: CopyLinkLabels;
  accent: string;
  variant: 'header' | 'menu';
  onCopy: () => void;
}) {
  const copied = status === 'copied';
  const visualLabel = copied ? labels.copied : status === 'error' ? labels.error : labels.copy;
  const ariaLabel = copied ? labels.copiedAria : status === 'error' ? labels.errorAria : labels.copyAria;

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={ariaLabel}
      data-testid={`copy-deep-link-${variant}`}
      className={variant === 'header'
        ? 'nova-header-wide-action hidden min-h-11 min-w-11 items-center gap-1.5 rounded-full border px-3 font-mono text-xs font-bold transition-all'
        : 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-mono text-xs font-bold transition-colors hover:bg-white/5'}
      style={variant === 'header'
        ? { borderColor: `${accent}40`, color: accent, backgroundColor: copied ? `${accent}18` : `${accent}08` }
        : { color: accent }}
    >
      {copied
        ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
        : <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{visualLabel}</span>
    </button>
  );
}

export function resetRoomViewport(container: HTMLElement | null) {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  if (!container) return;

  const heading = container.querySelector<HTMLElement>('h1')
    ?? container.querySelector<HTMLElement>('h2');
  const focusTarget = heading ?? container;
  if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
  focusTarget.focus({ preventScroll: true });
}

function RoomReadyFocus({ activeTab, containerRef }: {
  activeTab: Tab;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    let settleFrame = 0;
    const layoutFrame = window.requestAnimationFrame(() => {
      settleFrame = window.requestAnimationFrame(() => resetRoomViewport(containerRef.current));
    });
    return () => {
      window.cancelAnimationFrame(layoutFrame);
      window.cancelAnimationFrame(settleFrame);
    };
  }, [activeTab, containerRef]);

  return null;
}

// ─── Boot gate: resolve the initial dataset before mounting the app ───────────
// The bundled archive is a dynamic import (its own chunk), and a returning
// visitor's own IndexedDB dataset takes priority - so the app shell paints
// immediately and the ~150KB default dataset is only fetched when needed.
interface AppBoot {
  data: MusicDnaData;
  genreAssignments: GenreAssignment[];
  storedMeta: { savedAt: string; sourceLabel: string } | null;
  restoredAt: string | null;
}

function AppDataGate() {
  const [boot, setBoot] = useState<AppBoot | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDataset()
      .then((rec): Promise<AppBoot> | AppBoot => {
        if (rec) {
          return {
            data: rec.data,
            genreAssignments: rec.genreAssignments ?? [],
            storedMeta: { savedAt: rec.savedAt, sourceLabel: rec.sourceLabel },
            restoredAt: rec.savedAt,
          };
        }
        return loadDefaultDataset().then((data): AppBoot => ({ data, genreAssignments: [], storedMeta: null, restoredAt: null }));
      })
      .catch((): Promise<AppBoot> => loadDefaultDataset().then(data => ({ data, genreAssignments: [], storedMeta: null, restoredAt: null })))
      .then(resolved => { if (!cancelled && resolved) setBoot(resolved); });
    return () => { cancelled = true; };
  }, []);

  if (!boot) return <LoadingPanel />;
  return <AppInner boot={boot} />;
}

// ─── Inner app uses context ────────────────────────────────────────────────────
function AppInner({ boot }: { boot: AppBoot }) {
  const {
    t,
    theme,
    setTheme,
    tc,
    lang,
    setLang,
    activeTab,
    setActiveTab,
    topSubTab,
    setTopSubTab,
    selectedArtistName,
    setSelectedArtistName,
    selectedAlbumKey,
    setSelectedAlbumKey,
    selectedTrackKey,
    setSelectedTrackKey,
  } = useApp();
  const reduceMotion = Boolean(useReducedMotion());
  const [baseMusicData, setBaseMusicData] = useState<MusicDnaData>(() => boot.data);
  const [genreAssignments, setGenreAssignments] = useState<GenreAssignment[]>(() => boot.genreAssignments);
  const musicData = useMemo(
    () => applyGenreAssignments(baseMusicData, genreAssignments),
    [baseMusicData, genreAssignments],
  );
  const [showThemes, setShowThemes] = useState(false);
  const [showMobileUtilities, setShowMobileUtilities] = useState(false);
  const [copyLinkStatus, setCopyLinkStatus] = useState<CopyLinkStatus>('idle');
  const [storedMeta, setStoredMeta] = useState<{ savedAt: string; sourceLabel: string } | null>(boot.storedMeta);
  const [isPersonalArchive, setIsPersonalArchive] = useState(Boolean(boot.storedMeta));
  const [restoredAt, setRestoredAt] = useState<string | null>(boot.restoredAt);
  const [showTour, setShowTour] = useState(() => {
    try { return window.localStorage.getItem(TOUR_STORAGE_KEY) !== 'true'; } catch { return true; }
  });
  const mainContentRef = useRef<HTMLElement>(null);
  const mobileUtilitiesButtonRef = useRef<HTMLButtonElement>(null);
  const mobileUtilitiesPanelRef = useRef<HTMLDivElement>(null);
  const previousTabRef = useRef<Tab>(activeTab);
  const copyResetTimerRef = useRef<number | null>(null);

  const deepLinkState = React.useMemo<DeepLinkState>(() => ({
    tab: activeTab,
    topSubTab,
    selectedArtistName,
    selectedAlbumKey,
    selectedTrackKey,
  }), [activeTab, topSubTab, selectedArtistName, selectedAlbumKey, selectedTrackKey]);
  const currentDeepLink = React.useMemo(() => buildDeepLink(deepLinkState), [deepLinkState]);
  const copyLinkLabels: CopyLinkLabels = pickLanguage(lang, {
    en: {
        copy: 'Copy link',
        copyAria: 'Copy a link to this view',
        copied: 'Link copied',
        copiedAria: 'Link copied to the clipboard',
        error: 'Try again',
        errorAria: 'The link could not be copied. Try again',
      },
    es: {
        copy: 'Copiar enlace',
        copyAria: 'Copiar un enlace a esta vista',
        copied: 'Enlace copiado',
        copiedAria: 'Enlace copiado al portapapeles',
        error: 'Reintentar',
        errorAria: 'No se pudo copiar el enlace. Inténtalo de nuevo',
      },
    he: {
        copy: 'העתקת קישור',
        copyAria: 'העתקת קישור לתצוגה הזאת',
        copied: 'הקישור הועתק',
        copiedAria: 'הקישור הועתק ללוח',
        error: 'ניסיון נוסף',
        errorAria: 'לא הצלחנו להעתיק את הקישור. אפשר לנסות שוב',
      },
  });

  // Collapsible nav group state
  const [expandedGroups, setExpandedGroups] = useState<Record<NavGroupId, boolean>>({
    overview: true,
    archive: true,
    identity: true,
    listening: false,
    data: false,
    export: false
  });

  // Spotlight Hover Coordinates Tracker
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.glass-panel') as HTMLElement;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      target.style.setProperty('--mouse-x', `${x}px`);
      target.style.setProperty('--mouse-y', `${y}px`);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useEffect(() => {
    if (!showMobileUtilities) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (mobileUtilitiesButtonRef.current?.contains(target) || mobileUtilitiesPanelRef.current?.contains(target)) return;
      setShowMobileUtilities(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setShowMobileUtilities(false);
      mobileUtilitiesButtonRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMobileUtilities]);

  useEffect(() => () => {
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = null;
    }
    setCopyLinkStatus('idle');
  }, [currentDeepLink]);

  const handleCopyDeepLink = useCallback(async () => {
    try {
      await writeClipboardText(buildShareUrl(window.location, deepLinkState));
      setCopyLinkStatus('copied');
    } catch {
      setCopyLinkStatus('error');
    }

    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
    }
    copyResetTimerRef.current = window.setTimeout(() => {
      setCopyLinkStatus('idle');
      copyResetTimerRef.current = null;
    }, 2_400);
  }, [deepLinkState]);

  const menuItems: MenuItem[] = React.useMemo(() => [
    { id: 'dashboard',   group: 'overview',  label: t.nav.dashboard,   icon: LayoutDashboard, color: tc.c1, secondary: tc.c3, motif: 'grid' },
    { id: 'aiassistant', group: 'overview',  label: t.nav.aiAssistant,  icon: Bot,             color: '#a78bfa', secondary: '#f72585', motif: 'orbit' },
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
    { id: 'museums',     group: 'data',      label: t.nav.museums,      icon: Users,           color: '#84cc16', secondary: '#0ea5e9', motif: 'orbit' },
    { id: 'platforms',   group: 'data',      label: t.nav.platforms,    icon: TabletSmartphone, color: '#38bdf8', secondary: '#10b981', motif: 'grid' },
    { id: 'quality',     group: 'data',      label: t.nav.dataQuality,  icon: ShieldCheck,     color: '#2dd4bf', secondary: '#60a5fa', motif: 'grid' },
    { id: 'statsdeep',   group: 'data',      label: t.nav.statsPro,     icon: Activity,        color: '#38bdf8', secondary: '#a78bfa', motif: 'pulse' },
    { id: 'report',      group: 'export',    label: t.nav.report,       icon: FileText,        color: '#c084fc', secondary: '#60a5fa', motif: 'stack' },
    { id: 'upload',      group: 'export',    label: t.nav.upload,       icon: Upload,          color: '#10b981', secondary: '#facc15', motif: 'orbit' },
  ], [t.nav, tc]);

  const navGroups: NavGroup[] = React.useMemo(() => [
    { id: 'overview', label: t.navGroups.overview, color: tc.c1 },
    { id: 'archive', label: t.navGroups.archive, color: '#facc15' },
    { id: 'identity', label: t.navGroups.identity, color: '#a78bfa' },
    { id: 'listening', label: t.navGroups.listening, color: '#fb923c' },
    { id: 'data', label: t.navGroups.data, color: '#2dd4bf' },
    { id: 'export', label: t.navGroups.export, color: '#10b981' },
  ], [t.navGroups, tc.c1]);

  const roomNavigationItems: MuseumRoomItem[] = React.useMemo(() => menuItems.map(item => ({
    id: item.id,
    label: item.label,
    groupLabel: navGroups.find(group => group.id === item.group)?.label ?? item.group,
    color: item.color,
    secondary: item.secondary,
    icon: item.icon,
    isChapter: item.id !== 'upload',
  })), [menuItems, navGroups]);

  useEffect(() => {
    syncDeepLinkHistory(
      window.history,
      window.location.hash,
      previousTabRef.current,
      deepLinkState,
    );
    previousTabRef.current = activeTab;
  }, [activeTab, deepLinkState]);

  useEffect(() => {
    const applyHash = () => {
      const next = parseDeepLink(window.location.hash);
      const canonicalHash = buildDeepLink(next);

      if (window.location.hash !== canonicalHash) {
        window.history.replaceState(null, '', canonicalHash);
      }

      setShowThemes(false);
      setShowMobileUtilities(false);
      setActiveTab(next.tab);
      setTopSubTab(next.topSubTab);
      setSelectedArtistName(next.selectedArtistName);
      setSelectedAlbumKey(next.selectedAlbumKey);
      setSelectedTrackKey(next.selectedTrackKey);
    };

    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [
    setActiveTab,
    setSelectedAlbumKey,
    setSelectedArtistName,
    setSelectedTrackKey,
    setTopSubTab,
  ]);

  useEffect(() => {
    const activeItem = menuItems.find(item => item.id === activeTab);
    if (!activeItem) return;
    setExpandedGroups(previous => (
      previous[activeItem.group]
        ? previous
        : { ...previous, [activeItem.group]: true }
    ));
  }, [activeTab, menuItems]);

  const toggleGroup = useCallback((groupId: NavGroupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const goToTab = useCallback((tab: Tab) => {
    setShowThemes(false);
    setShowMobileUtilities(false);
    setActiveTab(tab);
    const item = menuItems.find(i => i.id === tab);
    if (item) {
      setExpandedGroups(prev => ({ ...prev, [item.group]: true }));
    }
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [menuItems, setActiveTab]);

  const navigateRoom = useCallback((roomId: string) => {
    goToTab(roomId as Tab);
  }, [goToTab]);

  const closeTour = useCallback(() => {
    setShowTour(false);
    try { window.localStorage.setItem(TOUR_STORAGE_KEY, 'true'); } catch { /* private browsing */ }
  }, []);

  // (IndexedDB restore happens in AppDataGate before this component mounts.)

  // Auto-dismiss the restore toast.
  useEffect(() => {
    if (!restoredAt) return;
    const id = window.setTimeout(() => setRestoredAt(null), 9000);
    return () => window.clearTimeout(id);
  }, [restoredAt]);

  const handleDataLoaded = (
    newData: MusicDnaData,
    sourceLabel?: string,
    restoredGenreAssignments: GenreAssignment[] = [],
  ) => {
    setBaseMusicData(newData);
    setGenreAssignments(restoredGenreAssignments);
    setIsPersonalArchive(true);
    goToTab('dashboard');
    const label = sourceLabel ?? 'Upload';
    void saveDataset(newData, label, restoredGenreAssignments).then(ok => {
      if (ok) setStoredMeta({ savedAt: new Date().toISOString(), sourceLabel: label });
    });
  };

  const handleGenreAssignmentsChange = useCallback((
    nextAssignments: GenreAssignment[],
    catalog: ArtistGenreCatalogEntry[],
  ) => {
    const nextBaseData = baseMusicData.artist_genre_catalog?.length
      ? baseMusicData
      : { ...baseMusicData, artist_genre_catalog: catalog };
    const label = storedMeta?.sourceLabel ?? pickLanguage(lang, {
      en: 'Nova Music Lab · local genre curation',
      es: 'Nova Music Lab · curaduría local de géneros',
      he: 'Nova Music Lab · אוצרות ז׳אנרים מקומית',
    });

    setBaseMusicData(nextBaseData);
    setGenreAssignments(nextAssignments);
    setIsPersonalArchive(true);
    void saveDataset(nextBaseData, label, nextAssignments).then(ok => {
      if (ok) setStoredMeta({ savedAt: new Date().toISOString(), sourceLabel: label });
    });
  }, [baseMusicData, lang, storedMeta?.sourceLabel]);

  const handleClearStored = useCallback(() => {
    void clearDataset();
    setStoredMeta(null);
    setIsPersonalArchive(false);
    setRestoredAt(null);
    setGenreAssignments([]);
    void loadDefaultDataset().then(setBaseMusicData);
  }, []);

  const renderNavItem = (item: typeof menuItems[number], group: typeof navGroups[number]) => {
    const idx = menuItems.findIndex(candidate => candidate.id === item.id);
    const active = activeTab === item.id;
    return (
      <button key={item.id} onClick={() => goToTab(item.id as Tab)}
        aria-current={active ? 'page' : undefined}
        aria-label={`${item.label} - ${group.label}`}
        title={`${item.label} · ${group.label}`}
        className="nova-sidebar__item group flex items-center gap-2.5 px-2.5 py-2 rounded-2xl font-mono text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 md:w-full border relative overflow-hidden text-left"
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
        <span className="nova-sidebar__label flex-1 text-left leading-tight">{item.label}</span>
        {active && (
          <span className="nova-sidebar__active-dot hidden md:block h-2 w-2 rounded-full animate-pulse shrink-0"
            style={{ backgroundColor: item.secondary, boxShadow: `0 0 10px ${item.secondary}` }} />
        )}
      </button>
    );
  };

  const filteredData = musicData;
  const languageUi = languageUiFor(lang);

  return (
    <div className="nova-app-root relative flex min-h-screen min-w-0 flex-col" style={{ backgroundColor: tc.bg, color: 'var(--fg)' }}>
      <Suspense fallback={null}>
        <InteractiveBackdrop data={musicData} />
      </Suspense>
      <DynamicMuseumBackground activeTab={activeTab} data={musicData} />

      {/* ── Navbar ── */}
      <header data-testid="museum-app-header" className="nova-app-header sticky top-0 z-40 flex w-full flex-nowrap items-center justify-between gap-2 border-b px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3"
        style={{ backgroundColor: `${tc.bg}99`, borderBottomColor: `${tc.c1}18` }}>
        
        {/* Logo */}
        <button
          className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center space-x-3 text-left"
          onClick={() => goToTab('hero')}
          aria-label={t.homeAria}
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-2xl border bg-black/35 shadow-cyber"
            style={{ borderColor: `${tc.c1}45`, boxShadow: `0 0 20px ${tc.c1}24` }}>
            <NovaMark className="h-full w-full" size="100%" />
          </div>
          <span className="font-display text-base font-bold uppercase tracking-[0.14em] text-white hidden sm:block">
            NOVA <span style={{ color: tc.c1 }}>MUSIC LAB</span>
          </span>
        </button>

        {/* Right controls */}
        <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1 md:gap-2">
          {/* Creator profile remains available throughout the museum, without
              implying that an uploaded archive belongs to Kevin. */}
          <CreatorCvLink lang={lang} variant="header" accent={tc.c1} className="nova-header-primary-action" />
          <CopyDeepLinkButton
            status={copyLinkStatus}
            labels={copyLinkLabels}
            accent={tc.c1}
            variant="header"
            onCopy={handleCopyDeepLink}
          />
          {/* Language toggle */}
          <div
            className="hidden items-center overflow-hidden rounded-full border xl:flex"
            style={{ borderColor: `${tc.c1}30` }}
            role="group"
            aria-label={languageUi.groupLabel}
          >
            {LANGUAGE_OPTIONS.map(option => (
              <button key={option.code} onClick={() => setLang(option.code)}
                aria-label={languageUi.switchTo[option.code]}
                aria-pressed={lang === option.code}
                className="min-h-11 min-w-11 px-2 font-mono text-xs font-bold uppercase transition-all sm:px-3"
                style={lang === option.code
                  ? { backgroundColor: tc.c1, color: '#000' }
                  : { color: '#6b7280' }}>
                {option.shortLabel}
              </button>
            ))}
          </div>
          <label className="relative grid min-h-11 min-w-14 place-items-center rounded-full border xl:hidden"
            style={{ borderColor: `${tc.c1}30`, color: tc.c1, backgroundColor: `${tc.c1}08` }}>
            <span className="sr-only">{languageUi.selectLabel}</span>
            <select
              value={lang}
              onChange={event => setLang(event.target.value as Lang)}
              aria-label={languageUi.selectLabel}
              dir={directionFor(lang)}
              className="min-h-11 w-16 cursor-pointer appearance-none bg-transparent px-2 text-center font-mono text-xs font-bold uppercase outline-none"
              style={{ color: tc.c1 }}
            >
              {LANGUAGE_OPTIONS.map(option => (
                <option key={option.code} value={option.code}>
                  {option.emoji} {option.shortLabel}
                </option>
              ))}
            </select>
          </label>

          {/* Theme selector */}
          <div className="nova-header-wide-action relative hidden">
            <button onClick={() => { setShowMobileUtilities(false); setShowThemes(v => !v); }}
              aria-haspopup="menu"
              aria-expanded={showThemes}
              aria-label={t.themeAria}
              className="flex min-h-11 items-center gap-1.5 rounded-full border px-3 font-mono text-xs font-bold transition-all"
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
                      className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-left font-mono text-xs font-bold transition-all"
                      style={theme === th ? { color: THEMES[th].c1, backgroundColor: `${THEMES[th].c1}15` } : { color: '#9ca3af' }}>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: THEMES[th].c1 }} />
                      {THEMES[th].label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reopen welcome tour */}
          <button onClick={() => setShowTour(true)}
            aria-label={t.onboarding.reopenAria}
            className="nova-header-wide-action hidden min-h-11 items-center gap-1.5 rounded-full border px-3 font-mono text-xs font-bold transition-all"
            style={{ borderColor: `${tc.c3}35`, color: tc.c3 }}>
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:block">{t.onboarding.reopenLabel}</span>
          </button>

          {/* Load data button */}
          <button onClick={() => goToTab('upload')}
            aria-label={t.loadDataAria}
            className="nova-header-wide-action hidden min-h-11 items-center gap-1.5 rounded-full border px-3 font-mono text-xs font-bold transition-all"
            style={{ borderColor: `${tc.c1}40`, color: tc.c1 }}>
            <Upload className="w-3 h-3" />
            <span className="hidden sm:block">{t.loadData}</span>
          </button>

          {/* Mobile: theme, tour and data live in one calm utility surface. */}
          <div className="relative 2xl:hidden">
            <button
              ref={mobileUtilitiesButtonRef}
              type="button"
              onClick={() => { setShowThemes(false); setShowMobileUtilities(open => !open); }}
              aria-haspopup="dialog"
              aria-expanded={showMobileUtilities}
              aria-controls="mobile-utilities"
              aria-label={pickLanguage(lang, {
                es: 'Abrir controles rápidos',
                en: 'Open quick controls',
                he: 'פתיחת פקדים מהירים',
              })}
              className="grid min-h-11 min-w-11 place-items-center rounded-full border transition-all"
              style={{ borderColor: `${tc.c1}40`, color: tc.c1, backgroundColor: `${tc.c1}10` }}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {showMobileUtilities && (
                <motion.div
                  ref={mobileUtilitiesPanelRef}
                  id="mobile-utilities"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: reduceMotion ? 0 : 0.15 }}
                  role="dialog"
                  aria-label={pickLanguage(lang, {
                    es: 'Controles rápidos',
                    en: 'Quick controls',
                    he: 'פקדים מהירים',
                  })}
                  className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border p-2 shadow-cyber"
                  style={{ backgroundColor: `${tc.bg}f5`, borderColor: `${tc.c1}30`, backdropFilter: 'blur(18px)' }}
                >
                  <label className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-mono text-xs font-bold" style={{ color: 'var(--fg)' }}>
                    <Sun className="h-4 w-4 shrink-0" style={{ color: tc.c1 }} />
                    <span className="flex-1">{t.themeAria}</span>
                    <select
                      value={theme}
                      onChange={event => {
                        setTheme(event.target.value as Theme);
                        setShowMobileUtilities(false);
                      }}
                      aria-label={t.themeAria}
                      className="min-h-11 max-w-32 rounded-xl border bg-transparent px-2 text-right font-mono text-xs font-bold"
                      style={{ borderColor: `${tc.c1}35`, color: tc.c1 }}
                    >
                      {(Object.keys(THEMES) as Theme[]).map(th => (
                        <option key={th} value={th}>{THEMES[th].label}</option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => { setShowMobileUtilities(false); setShowTour(true); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-mono text-xs font-bold transition-colors hover:bg-white/5"
                    style={{ color: tc.c3 }}
                  >
                    <Compass className="h-4 w-4 shrink-0" />
                    <span>{t.onboarding.reopenLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => goToTab('upload')}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-mono text-xs font-bold transition-colors hover:bg-white/5"
                    style={{ color: tc.c1 }}
                  >
                    <Upload className="h-4 w-4 shrink-0" />
                    <span>{t.loadData}</span>
                  </button>

                  <CopyDeepLinkButton
                    status={copyLinkStatus}
                    labels={copyLinkLabels}
                    accent={tc.c1}
                    variant="menu"
                    onCopy={handleCopyDeepLink}
                  />

                  <CreatorCvLink lang={lang} variant="menu" accent={tc.c1} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {copyLinkStatus === 'copied'
              ? copyLinkLabels.copiedAria
              : copyLinkStatus === 'error'
                ? copyLinkLabels.errorAria
                : ''}
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      {activeTab === 'hero' ? (
        <Suspense fallback={<LoadingPanel />}>
          <HeroSection
            data={musicData}
            onEnter={() => goToTab('dashboard')}
            onUpload={() => goToTab('upload')}
            isPersonalArchive={isPersonalArchive}
            onOpenAssistant={() => goToTab('aiassistant')}
          />
        </Suspense>
      ) : (
        <div data-testid="museum-app-shell" className="nova-app-shell z-10 flex w-full min-w-0 flex-1 flex-col md:flex-row">
          {/* Sidebar */}
          <aside data-testid="museum-sidebar" className="nova-app-sidebar hidden shrink-0 md:sticky md:block md:self-start md:overflow-y-auto"
            style={{ backgroundColor: `${tc.bg}60`, borderInlineEndColor: `${tc.c1}10` }}>
            <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-3 pb-2 md:pb-0">
              {navGroups.map(group => {
                const groupItems = menuItems.filter(item => item.group === group.id);
                const groupActive = groupItems.some(item => item.id === activeTab);
                const isExpanded = expandedGroups[group.id];

                return (
                  <section key={group.id} className="flex shrink-0 flex-row gap-1 md:flex-col md:gap-1.5">
                    <button
                      id={`sidebar-group-trigger-${group.id}`}
                      onClick={() => toggleGroup(group.id)}
                      aria-label={group.label}
                      aria-expanded={isExpanded}
                      aria-controls={`sidebar-group-${group.id}`}
                      className="nova-sidebar__group-trigger hidden w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 pb-1 pt-1.5 text-left font-mono transition-colors hover:bg-white/5 md:flex"
                    >
                      <span
                        className="nova-sidebar__group-label text-[9px] font-black uppercase tracking-[0.22em] transition-colors"
                        style={{ color: groupActive ? group.color : '#64748b' }}
                      >
                        {group.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: groupActive ? group.color : `${group.color}45`,
                            boxShadow: groupActive ? `0 0 10px ${group.color}` : 'none'
                          }}
                        />
                        <ChevronDown
                          className="w-3 h-3 text-gray-500 transition-transform duration-200"
                          style={{
                            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            color: groupActive ? group.color : '#64748b'
                          }}
                        />
                      </div>
                    </button>

                    {/* Mobile items container */}
                    <div className="flex md:hidden flex-row gap-1">
                      {groupItems.map(item => renderNavItem(item, group))}
                    </div>

                    {/* Desktop items container (collapsible) */}
                    <motion.div
                      id={`sidebar-group-${group.id}`}
                      aria-labelledby={`sidebar-group-trigger-${group.id}`}
                      aria-hidden={!isExpanded}
                      inert={!isExpanded}
                      initial={false}
                      animate={{
                        height: isExpanded ? 'auto' : 0,
                        opacity: isExpanded ? 1 : 0
                      }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="hidden md:flex flex-col gap-1.5 overflow-hidden"
                    >
                      {groupItems.map(item => renderNavItem(item, group))}
                    </motion.div>
                  </section>
                );
              })}
            </nav>
            <div className="nova-sidebar__brand hidden flex-col items-center gap-1 border-t pt-4 mt-2 md:flex"
              style={{ borderTopColor: `${tc.c1}12` }}>
              <span className="font-mono text-[9px] text-gray-600">Nova Music Lab</span>
              {!isPersonalArchive && (
                <span className="font-mono text-[9px] font-bold" style={{ color: tc.c3 }}>✧ LIRIOTH TELTANION ✧</span>
              )}
            </div>
          </aside>

          {/* Content */}
          <main
            ref={mainContentRef}
            tabIndex={-1}
            data-testid="museum-room-main"
            data-room-width={roomWidthFor(activeTab)}
            className="nova-room-main relative mx-auto min-w-0 flex-1 p-4 pb-28 focus:outline-none md:p-8"
          >
            <MuseumRoomTransition items={roomNavigationItems} activeId={activeTab} />
            <MuseumRoomProgressRail items={roomNavigationItems} activeId={activeTab} lang={lang} onNavigate={navigateRoom} />
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
                transition={reduceMotion ? { duration: 0 } : pageTransition}
                className="min-h-full">
                <Suspense fallback={<LoadingPanel />}>
                  <MuseumChapterHeader activeTab={activeTab} data={filteredData} lang={lang} />
                  <ErrorBoundary key={activeTab}>
                    {activeTab === 'dashboard'   && <Dashboard data={filteredData} />}
                    {activeTab === 'aiassistant' && <AIAssistant data={filteredData} />}
                    {activeTab === 'eras'        && <EraExplorer data={filteredData} />}
                    {activeTab === 'top'         && <TopHistorico data={filteredData} />}
                    {activeTab === 'compare'     && <SpotifyVsLastfm data={filteredData} />}
                    {activeTab === 'museums'     && <MuseumComparator data={filteredData} primaryLabel={storedMeta?.sourceLabel ?? filteredData.project} />}
                    {activeTab === 'platforms'   && <PlatformsDevices data={filteredData} />}
                    {activeTab === 'quality'     && (
                      <DataQualityCenter
                        data={filteredData}
                        genreAssignments={genreAssignments}
                        useBundledGenreCatalog={!isPersonalArchive && !baseMusicData.artist_genre_catalog?.length}
                        onGenreAssignmentsChange={handleGenreAssignmentsChange}
                      />
                    )}
                    {activeTab === 'statsdeep'   && <StatsDeepDive data={filteredData} />}
                    {activeTab === 'achievements' && <Achievements data={filteredData} />}
                    {activeTab === 'personality' && <PersonalityRadar data={filteredData} />}
                    {activeTab === 'emotions'    && <EmotionalMap data={filteredData} />}
                    {activeTab === 'obsessions'  && <ObsessionDetector data={filteredData} />}
                    {activeTab === 'cultural'    && <CulturalMap data={filteredData} />}
                    {activeTab === 'inner'       && <InnerWorld data={filteredData} />}
                    {activeTab === 'artist'      && <ArtistIdentity data={filteredData} isPersonalArchive={isPersonalArchive} />}
                    {activeTab === 'insights'    && <HiddenInsights data={filteredData} />}
                    {activeTab === 'timecapsule' && <TimeCapsule data={filteredData} />}
                    {activeTab === 'wrapped'     && <WrappedCard data={filteredData} />}
                    {activeTab === 'pulse'       && <RecentPulse data={filteredData} />}
                    {activeTab === 'report'      && <FinalReport data={filteredData} isPersonalArchive={isPersonalArchive} />}
                    {activeTab === 'upload' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6">
                          <Upload className="w-6 h-6" style={{ color: tc.c1 }} />
                          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">{t.sections.uploadTitle}</h2>
                        </div>
                        <SectionNarrative content={t.deepNarratives.upload} accent="c2" />
                        <DataUploader
                          onDataLoaded={handleDataLoaded}
                          currentData={baseMusicData}
                          genreAssignments={genreAssignments}
                          storedMeta={storedMeta}
                          onClearStored={handleClearStored}
                        />
                      </div>
                    )}
                  </ErrorBoundary>
                  <RoomReadyFocus activeTab={activeTab} containerRef={mainContentRef} />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>

          <MobileMuseumRoomDock
            items={roomNavigationItems}
            activeId={activeTab}
            lang={lang}
            onNavigate={navigateRoom}
          />
        </div>
      )}

      {/* ── Restore toast ── */}
      <AnimatePresence>
        {restoredAt && (
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: 'easeOut' as const }}
            onClick={() => setRestoredAt(null)}
            className={`nova-restore-toast fixed z-[60] glass-panel flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-cyber ${activeTab === 'hero' ? '' : 'nova-restore-toast--above-dock'}`}
            style={{ borderColor: `${tc.c1}40` }}
            aria-live="polite"
          >
            <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: tc.c1 }} />
            <span className="max-w-xs text-xs leading-relaxed" style={{ color: 'var(--fg)' }}>
              {t.uploader.restoredNotice(
                new Date(restoredAt).toLocaleDateString(localeFor(lang), {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })
              )}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {showTour && (
        <Suspense fallback={null}>
          <OnboardingTour
            open
            onClose={closeTour}
            onFinish={() => goToTab(activeTab === 'hero' ? 'dashboard' : activeTab)}
          />
        </Suspense>
      )}
    </div>
  );
}

// ─── Root export wraps with AppProvider ───────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppDataGate />
    </AppProvider>
  );
}
