import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { Sparkles, Mic2, Music2, Clock, Download, Loader2 } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import CoverArt from './CoverArt';
import MethodologyPanel from './MethodologyPanel';
import SectionNarrative from './SectionNarrative';
import { localizeDaypart, localizeEraLabel } from '../utils/localeText';
import { fetchBase64Image } from '../utils/imageLoader';
import artistImages from '../data/artist_images.json';
import albumImages from '../data/album_images.json';
import trackImages from '../data/track_images.json';
import { localeFor } from '../utils/i18n';

type ArtMap = Record<string, { thumb: string; source: string }>;
const ARTISTS = artistImages as Record<string, { thumb: string; source: string }>;
const ALBUMS = albumImages as ArtMap;
const TRACKS = trackImages as ArtMap;


interface WrappedCardProps {
  data: MusicDnaData;
}

export default function WrappedCard({ data }: WrappedCardProps) {
  const { tc, t, lang, setActiveTab, setSelectedArtistName, setSelectedTrackKey, setTopSubTab } = useApp();
  const eras = data.yearly_eras;
  const cardRef = useRef<HTMLDivElement>(null);

  const locale = localeFor(lang);
  const fmtNum = (n: number) => Math.round(n).toLocaleString(locale);

  // Default = year with most plays
  const defaultYear = useMemo(() => {
    if (eras.length === 0) return new Date().getFullYear();
    return eras.reduce((best, e) => (e.plays > best.plays ? e : best), eras[0]).year;
  }, [eras]);

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<{
    artist: string | null;
    track: string | null;
  } | null>(null);

  const era = eras.find((e) => e.year === selectedYear) ?? eras[0];

  if (!era) return null;

  const localizedEraLabel = localizeEraLabel(era.era_label, lang);
  const localizedDaypart = localizeDaypart(era.dominant_daypart, lang);

  const handleSelectYear = (year: number) => {
    if (year === selectedYear) return;
    setSelectedYear(year);
    setDownloadError(false);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.55 },
      colors: [tc.c1, tc.c2, tc.c3, tc.c4, '#ffffff'],
      startVelocity: 30,
      gravity: 0.9,
      ticks: 160,
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      // 1. Resolve remote image URLs
      const artistKey = era.top_artist.trim().toLowerCase();
      const artistUrl = ARTISTS[artistKey]?.thumb;

      const trackKey = `${era.top_artist.toLowerCase()}|||${era.top_track.toLowerCase()}`;
      const trackUrl = TRACKS[trackKey]?.thumb ?? ALBUMS[trackKey]?.thumb;

      // 2. Fetch base64 representations in parallel
      const [artistBase64, trackBase64] = await Promise.all([
        artistUrl ? fetchBase64Image(artistUrl) : Promise.resolve(null),
        trackUrl ? fetchBase64Image(trackUrl) : Promise.resolve(null),
      ]);

      // 3. Inject base64 into state to trigger component update
      setPreloadedImages({
        artist: artistBase64,
        track: trackBase64,
      });

      // 4. Wait for React render & paint cycle
      await new Promise((resolve) => window.requestAnimationFrame(() => window.setTimeout(resolve, 300)));

      // 5. Perform clean PNG canvas capture
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        filter: (node) => !(node instanceof HTMLElement && node.dataset && node.dataset.noExport !== undefined),
      });

      const link = document.createElement('a');
      link.download = `nova-wrapped-${era.year}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('WrappedCard PNG export failed:', err);
      setDownloadError(true);
    } finally {
      setPreloadedImages(null);
      setDownloading(false);
    }
  };

  const stats = [
    { label: t.wrapped.statPlays, value: fmtNum(era.plays), accent: tc.c1 },
    { label: t.wrapped.statArtists, value: fmtNum(era.unique_artists), accent: tc.c2 },
    { label: t.wrapped.statTracks, value: fmtNum(era.unique_tracks), accent: tc.c4 },
    {
      label: t.wrapped.statDiversity,
      value: `${era.diversity_index.toLocaleString(locale, { maximumFractionDigits: 1 })}%`,
      accent: tc.c2,
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <SectionNarrative content={t.deepNarratives.wrapped} accent="c1" />

      {/* Year selector pills */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {eras.map((e) => {
          const active = e.year === selectedYear;
          return (
            <button
              key={e.year}
              onClick={() => handleSelectYear(e.year)}
              className="px-4 py-1.5 rounded-full font-mono text-xs font-bold tracking-wider border transition-all duration-300 hover:scale-105"
              style={
                active
                  ? { backgroundColor: `${tc.c1}22`, borderColor: tc.c1, color: tc.c1, boxShadow: `0 0 18px ${tc.c1}44` }
                  : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#9ca3af' }
              }
            >
              {e.year}
            </button>
          );
        })}
      </motion.div>

      <MethodologyPanel
        eyebrow={t.wrapped.methodEyebrow}
        title={t.wrapped.methodTitle}
        subtitle={t.wrapped.methodSubtitle}
        accent="c1"
        stats={[
          {
            label: t.wrapped.methodStats.selectedYear,
            value: String(era.year),
          },
          {
            label: t.wrapped.methodStats.selectionRule,
            value: t.wrapped.methodStats.selectionRuleValue,
          },
          {
            label: t.wrapped.methodStats.source,
            value: t.wrapped.methodStats.sourceValue,
          },
          {
            label: t.wrapped.methodStats.export,
            value: t.wrapped.methodStats.exportValue,
          },
        ]}
        points={t.wrapped.methodPoints}
      />

      <div className="glass-panel p-5 rounded-3xl border-l-4" style={{ borderLeftColor: tc.c2 }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" style={{ color: tc.c2 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
            {t.wrapped.selectedInsightTitle}
          </h3>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          {t.wrapped.selectedInsightBody(era.year, fmtNum(era.plays), era.top_artist, era.top_track)}
        </p>
      </div>

      {/* The shareable card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
        className="max-w-md mx-auto"
      >
        <div
          ref={cardRef}
          className="relative w-full rounded-[2rem] overflow-hidden"
          style={{
            // Explicit inline background: backdrop-filter glass does not capture well in html-to-image
            background: `linear-gradient(165deg, ${tc.c3}59 0%, ${tc.bg} 38%, ${tc.bg} 66%, ${tc.c3}40 100%)`,
            border: `1px solid ${tc.c1}45`,
            boxShadow: `0 0 60px ${tc.c1}1f, inset 0 0 90px ${tc.c3}1a`,
          }}
        >
          {/* Decorative glows (plain gradients — capture-safe) */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${tc.c1}2e 0%, transparent 70%)` }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${tc.c2}26 0%, transparent 70%)` }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={era.year}
              variants={container}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="relative z-10 p-8 flex flex-col space-y-6"
            >
              {/* Eyebrow */}
              <motion.div variants={item} className="flex items-center justify-between">
                <span
                  className="font-mono text-[10px] font-black tracking-[0.35em] uppercase"
                  style={{ color: tc.c1 }}
                >
                  NOVA MUSIC LAB
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tc.c2, boxShadow: `0 0 10px ${tc.c2}` }}
                />
              </motion.div>

              {/* Headline + era chip */}
              <motion.div variants={item} className="space-y-3">
                <h3
                  className="text-4xl font-extrabold tracking-tight leading-tight"
                  style={{ color: '#ffffff', textShadow: `0 0 24px ${tc.c1}55` }}
                >
                  {t.wrapped.cardHeadline(era.year)}
                </h3>
                <div
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${tc.c2}1a`, border: `1px solid ${tc.c2}59`, color: tc.c2 }}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{localizedEraLabel}</span>
                </div>
              </motion.div>

              {/* Top artist */}
              <motion.div
                variants={item}
                className="rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform active:scale-[0.99] hover:border-white/20 border border-transparent"
                style={{ backgroundColor: `${tc.c1}0d`, borderColor: `${tc.c1}26` }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedArtistName(era.top_artist); setTopSubTab('artists'); setActiveTab('top'); } }}
                onClick={() => {
                  setSelectedArtistName(era.top_artist);
                  setTopSubTab('artists');
                  setActiveTab('top');
                }}
              >
                <div
                  className="flex items-center space-x-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-3"
                  style={{ color: '#9ca3af' }}
                >
                  <Mic2 className="w-3.5 h-3.5" style={{ color: tc.c1 }} />
                  <span>{t.wrapped.topArtistLabel}</span>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Cross-origin photo: excluded from PNG export via data-no-export, unless preloaded */}
                  <div className="shrink-0" {...(!preloadedImages ? { 'data-no-export': true } : {})}>
                    <ArtistAvatar
                      name={era.top_artist}
                      size={72}
                      overrideSrc={preloadedImages?.artist || undefined}
                      tooltip={!preloadedImages}
                    />
                  </div>
                  {/* Plain-text name always visible so the exported PNG stays complete */}
                  <p
                    className="text-2xl font-extrabold leading-tight break-words"
                    style={{ color: '#ffffff' }}
                  >
                    {era.top_artist}
                  </p>
                </div>
              </motion.div>

              {/* Anthem */}
              <motion.div
                variants={item}
                className="rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform active:scale-[0.99] hover:border-white/20 border border-transparent"
                style={{ backgroundColor: `${tc.c2}0d`, borderColor: `${tc.c2}26` }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedArtistName(era.top_artist); setSelectedTrackKey(`${era.top_artist.toLowerCase()}|||${era.top_track.toLowerCase()}`); setTopSubTab('tracks'); setActiveTab('top'); } }}
                onClick={() => {
                  setSelectedArtistName(era.top_artist);
                  setSelectedTrackKey(`${era.top_artist.toLowerCase()}|||${era.top_track.toLowerCase()}`);
                  setTopSubTab('tracks');
                  setActiveTab('top');
                }}
              >
                <div
                  className="flex items-center space-x-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-2"
                  style={{ color: '#9ca3af' }}
                >
                  <Music2 className="w-3.5 h-3.5" style={{ color: tc.c2 }} />
                  <span>{t.wrapped.anthemLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Cross-origin cover: excluded from PNG export via data-no-export, unless preloaded */}
                  <div className="shrink-0" {...(!preloadedImages ? { 'data-no-export': true } : {})}>
                    <CoverArt
                      artist={era.top_artist}
                      title={era.top_track}
                      kind="track"
                      size={44}
                      overrideSrc={preloadedImages?.track || undefined}
                    />
                  </div>
                  <p className="text-lg font-bold leading-snug break-words" style={{ color: '#ffffff' }}>
                    {era.top_track}
                  </p>
                </div>
              </motion.div>

              {/* 4-stat grid */}
              <motion.div variants={item} className="grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl p-3.5 text-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${s.accent}30` }}
                  >
                    <p className="font-mono text-xl font-black leading-none" style={{ color: s.accent }}>
                      {s.value}
                    </p>
                    <p
                      className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] mt-2"
                      style={{ color: '#9ca3af' }}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </motion.div>

              {/* Dominant daypart */}
              <motion.div
                variants={item}
                className="flex items-center justify-center space-x-2 font-mono text-xs font-bold uppercase tracking-wider"
                style={{ color: '#d1d5db' }}
              >
                <Clock className="w-4 h-4" style={{ color: tc.c4 }} />
                <span style={{ color: '#9ca3af' }}>{t.wrapped.daypartLabel}</span>
                <span style={{ color: tc.c4 }}>{localizedDaypart}</span>
              </motion.div>

              {/* Footer */}
              <motion.div
                variants={item}
                className="pt-4 flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.3em]"
                style={{ borderTop: `1px solid ${tc.c1}26`, color: '#6b7280' }}
              >
                <span>{t.wrapped.footerBrand}</span>
                <span style={{ color: tc.c1 }}>{era.year}</span>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Download button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center space-y-3"
      >
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-full font-mono text-xs font-black uppercase tracking-wider transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-wait"
          style={{
            backgroundColor: `${tc.c1}1a`,
            border: `1px solid ${tc.c1}66`,
            color: tc.c1,
            boxShadow: `0 0 24px ${tc.c1}33`,
          }}
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.wrapped.downloading}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>{t.wrapped.downloadPng}</span>
            </>
          )}
        </button>

        {downloadError && (
          <p className="text-xs font-mono" style={{ color: tc.c2 }}>
            {t.wrapped.downloadError}
          </p>
        )}
      </motion.div>
    </div>
  );
}
