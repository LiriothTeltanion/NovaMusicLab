import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, Trophy, BrainCircuit, Heart,
  RotateCcw, Globe, Palette, Sparkles, AlertCircle, FileText, Upload, GitCompare,
  Sun, Activity, Award, ShieldCheck, Hourglass, Gift, Radio, TabletSmartphone, Compass, Users,
  ChevronDown, Bot, SlidersHorizontal, Link2, Check
} from 'lucide-react';

import { loadDefaultDataset } from './data/defaultDataset';
import type { ArtistGenreCatalogEntry, GenreAssignment, MusicDnaData } from './types';
import {
  claimDatasetMutationIntent,
  clearDatasetResult,
  loadDatasetResult,
  saveDatasetResult,
  type DatasetClearResult,
  type DatasetIntentClaimResult,
  type DatasetSaveResult,
  type DatasetStorageFailure,
} from './utils/datasetStorage';
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
import type {
  DatasetOperationCoordinator,
  DatasetOperationKind,
  DatasetOperationToken,
} from './components/DataUploader';
import {
  DEFAULT_MOTION_MODE,
  MUSEUM_VISUAL_IDENTITY,
  MOTION_MODES,
  MOTION_STORAGE_KEY,
  isMotionMode,
  type MotionMode,
  type NavIconMotif,
} from './components/museumVisualIdentity';
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

export function nextMotionMode(current: MotionMode): MotionMode {
  return MOTION_MODES[(MOTION_MODES.indexOf(current) + 1) % MOTION_MODES.length];
}

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
      <span aria-hidden="true" className="absolute -left-1.5 -top-1.5 z-20 hidden h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-black md:flex"
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
        : 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start font-mono text-xs font-bold transition-colors hover:bg-white/5'}
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
  restoreFailure: DatasetStorageFailure | null;
}

type PersistenceNotice =
  | { kind: 'save-success' }
  | { kind: 'save-failure'; failure: DatasetStorageFailure }
  | { kind: 'restore-failure'; failure: DatasetStorageFailure }
  | { kind: 'clear-success' }
  | { kind: 'clear-success-fallback' }
  | { kind: 'clear-failure'; failure: DatasetStorageFailure };

function unexpectedRestoreFailure(): DatasetStorageFailure {
  return {
    ok: false,
    status: 'error',
    operation: 'load',
    reason: 'transaction-failed',
    recoverable: true,
    errorName: 'UnexpectedError',
  };
}

async function resolveAppBoot(): Promise<AppBoot> {
  let restoreResult;
  try {
    restoreResult = await loadDatasetResult();
  } catch {
    restoreResult = unexpectedRestoreFailure();
  }

  if (restoreResult.ok && restoreResult.status === 'loaded') {
    const rec = restoreResult.record;
    return {
      data: rec.data,
      genreAssignments: rec.genreAssignments ?? [],
      storedMeta: { savedAt: rec.savedAt, sourceLabel: rec.sourceLabel },
      restoredAt: rec.savedAt,
      restoreFailure: null,
    };
  }

  // Bundled-data loading is deliberately isolated from storage restoration.
  // A failed chunk now produces a retryable gate instead of a false restore
  // warning or an infinite loading screen.
  const data = await loadDefaultDataset();
  return {
    data,
    genreAssignments: [],
    storedMeta: null,
    restoredAt: null,
    restoreFailure: restoreResult.ok ? null : restoreResult,
  };
}

function AppDataGate() {
  const [boot, setBoot] = useState<AppBoot | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBoot(null);
    setLoadError(false);
    void resolveAppBoot()
      .then(resolved => { if (!cancelled) setBoot(resolved); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [attempt]);

  if (loadError) return <DatasetLoadErrorPanel onRetry={() => setAttempt(value => value + 1)} />;
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
  const [motionMode, setMotionMode] = useState<MotionMode>(() => {
    try {
      const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
      return isMotionMode(stored) ? stored : DEFAULT_MOTION_MODE;
    } catch {
      return DEFAULT_MOTION_MODE;
    }
  });
  const effectiveMotionMode: MotionMode = reduceMotion ? 'static' : motionMode;
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
  const [persistenceNotice, setPersistenceNotice] = useState<PersistenceNotice | null>(() => (
    boot.restoreFailure ? { kind: 'restore-failure', failure: boot.restoreFailure } : null
  ));
  const [showTour, setShowTour] = useState(() => {
    try { return window.localStorage.getItem(TOUR_STORAGE_KEY) !== 'true'; } catch { return true; }
  });
  const mainContentRef = useRef<HTMLElement>(null);
  const mobileUtilitiesButtonRef = useRef<HTMLButtonElement>(null);
  const mobileUtilitiesPanelRef = useRef<HTMLDivElement>(null);
  const previousTabRef = useRef<Tab>(activeTab);
  const copyResetTimerRef = useRef<number | null>(null);
  const persistenceRevisionRef = useRef(0);
  const datasetOperationRef = useRef<{
    nextId: number;
    active: DatasetOperationToken | null;
    intentClaim: Promise<DatasetIntentClaimResult> | null;
  }>({ nextId: 0, active: null, intentClaim: null });
  const [activeDatasetOperation, setActiveDatasetOperation] = useState<DatasetOperationToken | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem(MOTION_STORAGE_KEY, motionMode); } catch { /* private browsing */ }
  }, [motionMode]);

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

  const menuItems: MenuItem[] = React.useMemo(() => {
    const items: Array<Omit<MenuItem, 'color' | 'secondary' | 'motif'>> = [
      { id: 'dashboard',    group: 'overview',  label: t.nav.dashboard,    icon: LayoutDashboard },
      { id: 'aiassistant',  group: 'overview',  label: t.nav.aiAssistant,  icon: Bot },
      { id: 'eras',         group: 'overview',  label: t.nav.eras,         icon: CalendarDays },
      { id: 'top',          group: 'archive',   label: t.nav.top,          icon: Trophy },
      { id: 'timecapsule',  group: 'archive',   label: t.nav.timeCapsule,  icon: Hourglass },
      { id: 'personality',  group: 'identity',  label: t.nav.personality,  icon: BrainCircuit },
      { id: 'emotions',     group: 'identity',  label: t.nav.emotions,     icon: Heart },
      { id: 'cultural',     group: 'identity',  label: t.nav.cultural,     icon: Globe },
      { id: 'inner',        group: 'identity',  label: t.nav.inner,        icon: Palette },
      { id: 'artist',       group: 'identity',  label: t.nav.artist,       icon: Sparkles },
      { id: 'obsessions',   group: 'listening', label: t.nav.obsessions,   icon: RotateCcw },
      { id: 'insights',     group: 'listening', label: t.nav.insights,     icon: AlertCircle },
      { id: 'achievements', group: 'listening', label: t.nav.achievements, icon: Award },
      { id: 'wrapped',      group: 'listening', label: t.nav.wrapped,      icon: Gift },
      { id: 'pulse',        group: 'listening', label: t.nav.pulse,        icon: Radio },
      { id: 'compare',      group: 'data',      label: t.nav.compare,      icon: GitCompare },
      { id: 'museums',      group: 'data',      label: t.nav.museums,      icon: Users },
      { id: 'platforms',    group: 'data',      label: t.nav.platforms,    icon: TabletSmartphone },
      { id: 'quality',      group: 'data',      label: t.nav.dataQuality,  icon: ShieldCheck },
      { id: 'statsdeep',    group: 'data',      label: t.nav.statsPro,     icon: Activity },
      { id: 'report',       group: 'export',    label: t.nav.report,       icon: FileText },
      { id: 'upload',       group: 'export',    label: t.nav.upload,       icon: Upload },
    ];

    return items.map(item => {
      const visual = MUSEUM_VISUAL_IDENTITY[item.id];
      return {
        ...item,
        color: visual.palette[0],
        secondary: visual.palette[1],
        motif: visual.navMotif,
      };
    });
  }, [t.nav]);

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

  useEffect(() => {
    if (!persistenceNotice) return;
    const id = window.setTimeout(() => setPersistenceNotice(null), 10_000);
    return () => window.clearTimeout(id);
  }, [persistenceNotice]);

  const acquireDatasetOperation = useCallback((kind: DatasetOperationKind): DatasetOperationToken | null => {
    const state = datasetOperationRef.current;
    if (state.active) return null;

    const operation = { id: state.nextId + 1, kind };
    state.nextId = operation.id;
    state.active = operation;
    // Start the cross-tab claim before parsing or clearing does asynchronous
    // work. Its durable token decides whether the eventual mutation is still
    // the newest user intent in any open Nova tab/PWA window.
    state.intentClaim = claimDatasetMutationIntent(kind === 'import' ? 'save' : 'clear');
    // The ref is acquired first so two events in the same render frame cannot
    // both enter. State then lets a newly mounted lazy uploader observe the lock.
    setActiveDatasetOperation(operation);
    return operation;
  }, []);

  const isDatasetOperationCurrent = useCallback((operation: DatasetOperationToken): boolean => (
    datasetOperationRef.current.active?.id === operation.id
      && datasetOperationRef.current.active.kind === operation.kind
  ), []);

  const releaseDatasetOperation = useCallback((operation: DatasetOperationToken) => {
    if (!isDatasetOperationCurrent(operation)) return;
    datasetOperationRef.current.active = null;
    datasetOperationRef.current.intentClaim = null;
    setActiveDatasetOperation(current => current?.id === operation.id ? null : current);
  }, [isDatasetOperationCurrent]);

  const resolveDatasetOperationIntent = useCallback(async (
    operation: DatasetOperationToken,
  ): Promise<DatasetIntentClaimResult | null> => {
    const state = datasetOperationRef.current;
    if (!isDatasetOperationCurrent(operation) || !state.intentClaim) return null;
    const claim = await state.intentClaim;
    return isDatasetOperationCurrent(operation) ? claim : null;
  }, [isDatasetOperationCurrent]);

  const datasetOperationCoordinator = useMemo<DatasetOperationCoordinator>(() => ({
    active: activeDatasetOperation,
    acquire: acquireDatasetOperation,
    isCurrent: isDatasetOperationCurrent,
    release: releaseDatasetOperation,
  }), [
    acquireDatasetOperation,
    activeDatasetOperation,
    isDatasetOperationCurrent,
    releaseDatasetOperation,
  ]);

  const handleDataLoaded = async (
    newData: MusicDnaData,
    sourceLabel?: string,
    restoredGenreAssignments: GenreAssignment[] = [],
    operation?: DatasetOperationToken,
  ): Promise<DatasetSaveResult | void> => {
    if (!operation || !isDatasetOperationCurrent(operation)) return;
    const revision = ++persistenceRevisionRef.current;
    setBaseMusicData(newData);
    setGenreAssignments(restoredGenreAssignments);
    setIsPersonalArchive(true);
    // The newly active archive differs from any previously persisted record.
    // Clear its persistence badge until this exact write has completed.
    setStoredMeta(null);
    setPersistenceNotice(null);
    goToTab('dashboard');
    const label = sourceLabel ?? 'Upload';
    const intentClaim = await resolveDatasetOperationIntent(operation);
    if (!intentClaim) return;
    if (!intentClaim.ok) {
      if (revision === persistenceRevisionRef.current && isDatasetOperationCurrent(operation)) {
        setPersistenceNotice({ kind: 'save-failure', failure: intentClaim });
      }
      return intentClaim;
    }
    const result = await saveDatasetResult(
      newData,
      label,
      restoredGenreAssignments,
      intentClaim.intent,
    );
    if (revision !== persistenceRevisionRef.current || !isDatasetOperationCurrent(operation)) return result;
    if (result.ok) {
      setStoredMeta({ savedAt: result.record.savedAt, sourceLabel: result.record.sourceLabel });
      setPersistenceNotice({ kind: 'save-success' });
    } else {
      setPersistenceNotice({ kind: 'save-failure', failure: result });
    }
    return result;
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
    setStoredMeta(null);
    setPersistenceNotice(null);
    const revision = ++persistenceRevisionRef.current;
    void saveDatasetResult(nextBaseData, label, nextAssignments).then(result => {
      if (revision !== persistenceRevisionRef.current) return;
      if (result.ok) {
        setStoredMeta({ savedAt: result.record.savedAt, sourceLabel: result.record.sourceLabel });
        setPersistenceNotice({ kind: 'save-success' });
      } else {
        setPersistenceNotice({ kind: 'save-failure', failure: result });
      }
    });
  }, [baseMusicData, lang, storedMeta?.sourceLabel]);

  const handleClearStored = useCallback(async (
    operation?: DatasetOperationToken,
  ): Promise<DatasetClearResult | void> => {
    if (!operation || !isDatasetOperationCurrent(operation)) return;
    const revision = ++persistenceRevisionRef.current;
    const intentClaim = await resolveDatasetOperationIntent(operation);
    if (!intentClaim) return;
    if (!intentClaim.ok) {
      if (revision === persistenceRevisionRef.current && isDatasetOperationCurrent(operation)) {
        setPersistenceNotice({ kind: 'clear-failure', failure: intentClaim });
      }
      return intentClaim;
    }
    const result = await clearDatasetResult(intentClaim.intent);
    if (revision !== persistenceRevisionRef.current || !isDatasetOperationCurrent(operation)) return result;
    if (!result.ok) {
      setPersistenceNotice({ kind: 'clear-failure', failure: result });
      return result;
    }

    // The record is already gone from disk. Reflect that truth immediately;
    // if the lazy flagship chunk is unavailable, retain the in-memory archive
    // as tab-only rather than claiming the deleted record is still saved.
    setStoredMeta(null);
    setRestoredAt(null);
    let defaultData: MusicDnaData;
    try {
      defaultData = await loadDefaultDataset();
    } catch {
      if (revision === persistenceRevisionRef.current && isDatasetOperationCurrent(operation)) {
        setIsPersonalArchive(true);
        setPersistenceNotice({ kind: 'clear-success-fallback' });
      }
      return result;
    }
    if (revision !== persistenceRevisionRef.current || !isDatasetOperationCurrent(operation)) return result;
    setIsPersonalArchive(false);
    setGenreAssignments([]);
    setBaseMusicData(defaultData);
    setPersistenceNotice({ kind: 'clear-success' });
    return result;
  }, [isDatasetOperationCurrent, resolveDatasetOperationIntent]);

  const renderNavItem = (item: typeof menuItems[number], group: typeof navGroups[number]) => {
    const idx = menuItems.findIndex(candidate => candidate.id === item.id);
    const active = activeTab === item.id;
    return (
      <button key={item.id} onClick={() => goToTab(item.id as Tab)}
        aria-current={active ? 'page' : undefined}
        aria-label={`${item.label} - ${group.label}`}
        title={`${item.label} · ${group.label}`}
        className="nova-sidebar__item group flex items-center gap-2.5 px-2.5 py-2 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 md:w-full border relative overflow-visible text-start"
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
        <span className="nova-sidebar__label flex-1 text-start leading-tight">{item.label}</span>
        <span className="nova-sidebar__tooltip" aria-hidden="true">
          <strong>{item.label}</strong>
          <small>{group.label}</small>
        </span>
        {active && (
          <span className="nova-sidebar__active-dot hidden md:block h-2 w-2 rounded-full animate-pulse shrink-0"
            style={{ backgroundColor: item.secondary, boxShadow: `0 0 10px ${item.secondary}` }} />
        )}
      </button>
    );
  };

  const filteredData = musicData;
  const languageUi = languageUiFor(lang);
  const motionUi = pickLanguage(lang, {
    en: {
      control: 'Motion atmosphere',
      expressive: 'Expressive',
      calm: 'Calm',
      static: 'Static',
      system: 'System reduced motion is active',
    },
    es: {
      control: 'Atmósfera de movimiento',
      expressive: 'Expresiva',
      calm: 'Calma',
      static: 'Estática',
      system: 'El movimiento reducido del sistema está activo',
    },
    he: {
      control: 'אווירת תנועה',
      expressive: 'מלאה',
      calm: 'רגועה',
      static: 'סטטית',
      system: 'הפחתת התנועה של המערכת פעילה',
    },
  });
  const motionModeLabel = motionUi[effectiveMotionMode];
  const motionControlLabel = reduceMotion
    ? `${motionUi.control}: ${motionModeLabel}. ${motionUi.system}`
    : `${motionUi.control}: ${motionModeLabel}`;
  const cycleMotionMode = () => setMotionMode(current => nextMotionMode(current));
  const persistenceUi = pickLanguage(lang, {
    en: {
      saveSuccess: 'Archive saved locally in this browser.',
      saveUnavailable: 'This archive is active in this tab, but this browser cannot save it locally. Export a backup before leaving.',
      saveQuota: 'This archive is active in this tab, but local storage is full. Export a backup, free browser storage and retry.',
      saveInvalid: 'This archive is active in this tab, but it did not pass the local persistence check.',
      saveStale: 'A newer archive action in another Nova tab took priority. This older import stays in this tab only and did not overwrite saved data.',
      saveError: 'This archive is active in this tab, but the local save failed. Your previously saved archive was left untouched.',
      restoreUnavailable: 'Local storage is unavailable. The demo archive opened; no saved archive was read.',
      restoreInvalid: 'A saved local record is invalid. It was left untouched for recovery, and the demo archive opened.',
      restoreError: 'The saved archive could not be read. It was left untouched, and the demo archive opened.',
      clearSuccess: 'Local archive cleared. The flagship demo is active again.',
      clearSuccessFallback: 'The saved copy was cleared. This archive remains only in the current tab because the flagship demo could not load; export a backup before leaving.',
      clearStale: 'Clear stopped because another Nova tab started a newer archive action. No saved data was changed by this older request.',
      clearFailure: 'The local archive could not be cleared. It remains active and no data was changed.',
    },
    es: {
      saveSuccess: 'Archivo guardado localmente en este navegador.',
      saveUnavailable: 'Este archivo está activo en esta pestaña, pero el navegador no puede guardarlo localmente. Exporta una copia antes de salir.',
      saveQuota: 'Este archivo está activo en esta pestaña, pero el almacenamiento local está lleno. Exporta una copia, libera espacio y vuelve a intentarlo.',
      saveInvalid: 'Este archivo está activo en esta pestaña, pero no superó la validación de persistencia local.',
      saveStale: 'Una acción de archivo más reciente en otra pestaña de Nova tuvo prioridad. Esta importación antigua queda solo en esta pestaña y no sobrescribió los datos guardados.',
      saveError: 'Este archivo está activo en esta pestaña, pero falló el guardado local. El archivo guardado anteriormente no fue modificado.',
      restoreUnavailable: 'El almacenamiento local no está disponible. Se abrió la demo y no se leyó ningún archivo guardado.',
      restoreInvalid: 'Un registro local guardado no es válido. Se conservó intacto para recuperarlo y se abrió la demo.',
      restoreError: 'No se pudo leer el archivo guardado. Se conservó intacto y se abrió la demo.',
      clearSuccess: 'Archivo local borrado. La exposición de demostración vuelve a estar activa.',
      clearSuccessFallback: 'La copia guardada fue borrada. Este archivo sigue sólo en la pestaña actual porque no se pudo cargar la demo; exporta una copia antes de salir.',
      clearStale: 'El borrado se detuvo porque otra pestaña de Nova inició una acción de archivo más reciente. Esta solicitud antigua no modificó los datos guardados.',
      clearFailure: 'No se pudo borrar el archivo local. Sigue activo y no se modificó ningún dato.',
    },
    he: {
      saveSuccess: 'הארכיון נשמר מקומית בדפדפן הזה.',
      saveUnavailable: 'הארכיון פעיל בכרטיסייה הזאת, אבל הדפדפן אינו יכול לשמור אותו מקומית. כדאי לייצא גיבוי לפני היציאה.',
      saveQuota: 'הארכיון פעיל בכרטיסייה הזאת, אבל האחסון המקומי מלא. כדאי לייצא גיבוי, לפנות מקום ולנסות שוב.',
      saveInvalid: 'הארכיון פעיל בכרטיסייה הזאת, אבל לא עבר את בדיקת השמירה המקומית.',
      saveStale: 'פעולת ארכיון חדשה יותר בכרטיסיית Nova אחרת קיבלה קדימות. הייבוא הישן נשאר בכרטיסייה הזאת בלבד ולא החליף נתונים שמורים.',
      saveError: 'הארכיון פעיל בכרטיסייה הזאת, אבל השמירה המקומית נכשלה. הארכיון שנשמר קודם נשאר ללא שינוי.',
      restoreUnavailable: 'האחסון המקומי אינו זמין. ארכיון ההדגמה נפתח ולא נקרא ארכיון שמור.',
      restoreInvalid: 'רשומה מקומית שמורה אינה תקינה. היא נשמרה ללא שינוי לצורך שחזור וארכיון ההדגמה נפתח.',
      restoreError: 'לא הצלחנו לקרוא את הארכיון השמור. הוא נשמר ללא שינוי וארכיון ההדגמה נפתח.',
      clearSuccess: 'הארכיון המקומי נוקה. תצוגת הדגל לדוגמה פעילה שוב.',
      clearSuccessFallback: 'העותק השמור נמחק. הארכיון נשאר רק בכרטיסייה הנוכחית כי תערוכת הדגל לא נטענה; כדאי לייצא גיבוי לפני היציאה.',
      clearStale: 'הניקוי נעצר כי כרטיסיית Nova אחרת התחילה פעולת ארכיון חדשה יותר. הבקשה הישנה לא שינתה נתונים שמורים.',
      clearFailure: 'לא הצלחנו לנקות את הארכיון המקומי. הוא נשאר פעיל ולא בוצע שינוי בנתונים.',
    },
  });
  const persistenceMessage = (() => {
    if (!persistenceNotice) return null;
    if (persistenceNotice.kind === 'save-success') return persistenceUi.saveSuccess;
    if (persistenceNotice.kind === 'clear-success') return persistenceUi.clearSuccess;
    if (persistenceNotice.kind === 'clear-success-fallback') return persistenceUi.clearSuccessFallback;
    if (persistenceNotice.kind === 'clear-failure') {
      return persistenceNotice.failure.reason === 'stale-intent'
        ? persistenceUi.clearStale
        : persistenceUi.clearFailure;
    }
    if (persistenceNotice.kind === 'restore-failure') {
      if (persistenceNotice.failure.status === 'unavailable') return persistenceUi.restoreUnavailable;
      if (persistenceNotice.failure.status === 'invalid') return persistenceUi.restoreInvalid;
      return persistenceUi.restoreError;
    }
    if (persistenceNotice.failure.status === 'unavailable') return persistenceUi.saveUnavailable;
    if (persistenceNotice.failure.status === 'invalid') return persistenceUi.saveInvalid;
    if (persistenceNotice.failure.reason === 'stale-intent') return persistenceUi.saveStale;
    if (persistenceNotice.failure.reason === 'quota-exceeded') return persistenceUi.saveQuota;
    return persistenceUi.saveError;
  })();
  const persistenceSucceeded = persistenceNotice?.kind === 'save-success' || persistenceNotice?.kind === 'clear-success';

  return (
    <MotionConfig reducedMotion={effectiveMotionMode === 'static' ? 'always' : 'user'}>
    <div
      className="nova-app-root relative flex min-h-screen min-w-0 flex-col"
      data-motion={effectiveMotionMode}
      data-room={activeTab}
      style={{ backgroundColor: tc.bg, color: 'var(--fg)' }}
    >
      {activeTab !== 'hero' ? (
        <Suspense fallback={null}>
          <InteractiveBackdrop data={musicData} motionMode={effectiveMotionMode} />
        </Suspense>
      ) : null}
      <DynamicMuseumBackground activeTab={activeTab} data={musicData} motionMode={effectiveMotionMode} />

      {/* ── Navbar ── */}
      <header data-testid="museum-app-header" className="nova-app-header sticky top-0 z-40 flex w-full flex-nowrap items-center justify-between gap-2 border-b px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3"
        style={{ backgroundColor: `${tc.bg}99`, borderBottomColor: `${tc.c1}18` }}>
        
        {/* Logo */}
        <button
          className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center gap-3 text-start"
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
          <button
            type="button"
            onClick={cycleMotionMode}
            disabled={reduceMotion}
            data-testid="motion-mode-control"
            data-motion-mode={effectiveMotionMode}
            aria-label={motionControlLabel}
            title={motionControlLabel}
            className="nova-header-primary-action hidden min-h-11 items-center gap-2 rounded-full border px-3 font-mono text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: `${tc.c3}38`, color: tc.c3, backgroundColor: `${tc.c3}0c` }}
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span>{motionModeLabel}</span>
          </button>
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
              className="nova-language-select min-h-11 w-16 cursor-pointer appearance-none bg-transparent px-2 text-center font-mono text-xs font-bold uppercase"
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
                  className="nova-anchor-end absolute top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-2xl border"
                  role="menu"
                  style={{ backgroundColor: `${tc.bg}f0`, borderColor: `${tc.c1}25`, backdropFilter: 'blur(12px)' }}>
                  {(Object.keys(THEMES) as Theme[]).map(th => (
                    <button key={th} onClick={() => { setTheme(th); setShowThemes(false); }}
                      role="menuitem"
                      className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-start font-mono text-xs font-bold transition-all"
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
                  className="nova-anchor-end absolute top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border p-2 shadow-cyber"
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
                    onClick={cycleMotionMode}
                    disabled={reduceMotion}
                    data-motion-mode={effectiveMotionMode}
                    aria-label={motionControlLabel}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start font-mono text-xs font-bold transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ color: tc.c3 }}
                  >
                    <Activity className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{motionUi.control}</span>
                    <strong>{motionModeLabel}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowMobileUtilities(false); setShowTour(true); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start font-mono text-xs font-bold transition-colors hover:bg-white/5"
                    style={{ color: tc.c3 }}
                  >
                    <Compass className="h-4 w-4 shrink-0" />
                    <span>{t.onboarding.reopenLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => goToTab('upload')}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start font-mono text-xs font-bold transition-colors hover:bg-white/5"
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
            isArchivePersisted={Boolean(storedMeta)}
            onOpenAssistant={() => goToTab('aiassistant')}
            motionMode={effectiveMotionMode}
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
                      className="nova-sidebar__group-trigger relative hidden w-full cursor-pointer items-center justify-between gap-2 overflow-visible rounded-lg px-2.5 pb-1 pt-1.5 text-start font-mono transition-colors hover:bg-white/5 md:flex"
                    >
                      <span
                        className="nova-sidebar__group-label text-xs font-black uppercase tracking-[0.18em] transition-colors"
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
                      <span className="nova-sidebar__tooltip" aria-hidden="true">
                        <strong>{group.label}</strong>
                        <small>{isExpanded ? '−' : '+'}</small>
                      </span>
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
                      style={{ overflow: isExpanded ? 'visible' : 'hidden' }}
                      className="hidden md:flex flex-col gap-1.5"
                    >
                      {groupItems.map(item => renderNavItem(item, group))}
                    </motion.div>
                  </section>
                );
              })}
            </nav>
            <div className="nova-sidebar__brand hidden flex-col items-center gap-1 border-t pt-4 mt-2 md:flex"
              style={{ borderTopColor: `${tc.c1}12` }}>
              <span className="font-mono text-xs text-gray-600">Nova Music Lab</span>
              {!isPersonalArchive && (
                <span className="font-mono text-xs font-bold" style={{ color: tc.c3 }}>✧ LIRIOTH TELTANION ✧</span>
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
                    {activeTab === 'eras'        && <EraExplorer data={filteredData} isPersonalArchive={isPersonalArchive} />}
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
                    {activeTab === 'cultural'    && <CulturalMap data={filteredData} isPersonalArchive={isPersonalArchive} />}
                    {activeTab === 'inner'       && <InnerWorld data={filteredData} isPersonalArchive={isPersonalArchive} />}
                    {activeTab === 'artist'      && <ArtistIdentity data={filteredData} isPersonalArchive={isPersonalArchive} />}
                    {activeTab === 'insights'    && <HiddenInsights data={filteredData} />}
                    {activeTab === 'timecapsule' && <TimeCapsule data={filteredData} />}
                    {activeTab === 'wrapped'     && <WrappedCard data={filteredData} />}
                    {activeTab === 'pulse'       && <RecentPulse data={filteredData} isPersonalArchive={isPersonalArchive} />}
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
                          operationCoordinator={datasetOperationCoordinator}
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
            className={`nova-restore-toast fixed z-[60] glass-panel flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-start shadow-cyber ${activeTab === 'hero' ? '' : 'nova-restore-toast--above-dock'}`}
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

      <AnimatePresence>
        {persistenceNotice && persistenceMessage && (
          <motion.button
            data-testid="persistence-notice"
            data-notice-tone={persistenceSucceeded ? 'success' : 'error'}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: 'easeOut' as const }}
            onClick={() => setPersistenceNotice(null)}
            className={`nova-restore-toast fixed z-[61] glass-panel flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-start shadow-cyber ${activeTab === 'hero' ? '' : 'nova-restore-toast--above-dock'}`}
            style={{
              borderColor: persistenceSucceeded ? `${tc.c1}55` : '#fb7185',
              backgroundColor: persistenceSucceeded ? `${tc.c1}12` : '#4c0519',
              color: persistenceSucceeded ? 'var(--fg)' : '#ffffff',
            }}
            aria-live={persistenceSucceeded ? 'polite' : 'assertive'}
          >
            {persistenceSucceeded
              ? <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: tc.c1 }} aria-hidden="true" />
              : <AlertCircle className="h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />}
            <span
              className="max-w-sm text-xs leading-relaxed"
              style={{ color: persistenceSucceeded ? 'var(--fg)' : '#ffffff' }}
            >
              {persistenceMessage}
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
    </MotionConfig>
  );
}

function DatasetLoadErrorPanel({ onRetry }: { onRetry: () => void }) {
  const { lang, tc } = useApp();
  const copy = pickLanguage(lang, {
    en: {
      title: 'The museum archive could not load',
      body: 'The bundled exhibition is temporarily unavailable. Your browser storage was not changed. Retry the download to enter the museum.',
      retry: 'Retry archive load',
    },
    es: {
      title: 'No se pudo cargar el archivo del museo',
      body: 'La exposición incluida no está disponible temporalmente. El almacenamiento del navegador no fue modificado. Reintenta la descarga para entrar al museo.',
      retry: 'Reintentar la carga',
    },
    he: {
      title: 'לא הצלחנו לטעון את ארכיון המוזיאון',
      body: 'תערוכת ברירת המחדל אינה זמינה כרגע. האחסון בדפדפן לא השתנה. יש לנסות לטעון שוב כדי להיכנס למוזיאון.',
      retry: 'ניסיון טעינה נוסף',
    },
  });

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4" role="alert" data-testid="dataset-load-error">
      <section className="glass-panel w-full max-w-lg rounded-3xl border p-6 text-start shadow-2xl"
        style={{ borderColor: '#fb718555', boxShadow: '0 24px 80px rgba(136, 19, 55, 0.28)' }}>
        <div className="flex items-start gap-4">
          <span className="rounded-2xl border border-rose-400/30 bg-rose-950/40 p-3 text-rose-200" aria-hidden="true">
            <AlertCircle className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-mono text-base font-black uppercase tracking-wider text-white">{copy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">{copy.body}</p>
            <button type="button" onClick={onRetry}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-black uppercase tracking-wider transition-transform hover:scale-[1.03]"
              style={{ borderColor: `${tc.c1}55`, color: tc.c1, backgroundColor: `${tc.c1}12` }}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {copy.retry}
            </button>
          </div>
        </div>
      </section>
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
