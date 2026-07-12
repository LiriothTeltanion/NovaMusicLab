import React, { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Loader2, Shuffle, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { buildEmotionalMapEngineProfile } from '../engines/emotionalEngine';
import { buildArtistProfile } from '../utils/identityEngine';
import MoodArtCanvas from './MoodArtCanvas';
import { MOOD_ICONS } from './MoodBadge';

interface MuseumPosterProps {
  data: MusicDnaData;
}

/**
 * Exportable museum poster: deterministic mood art as the backdrop, key
 * archive numbers and the permanent collection on top. Everything drawn is
 * same-origin (generated canvas + text), so the PNG export never taints.
 */
export default function MuseumPoster({ data }: MuseumPosterProps) {
  const { tc, t, lang } = useApp();
  const copy = t.museumPoster;
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [variation, setVariation] = useState(0);
  const locale = lang === 'en' ? 'en-US' : 'es-ES';

  const engine = useMemo(() => buildEmotionalMapEngineProfile(data.top_artists, 24), [data.top_artists]);
  const dominant = engine.dominantMood;
  const topMoods = engine.distribution.slice(0, 3);
  const years = data.yearly_eras.map(e => e.year);
  const yearSpan = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—';
  const fmt = (n: number) => n.toLocaleString(locale);
  const seed = `${data.top_artists.slice(0, 5).map(a => a.name).join('|')}::poster::v${variation}`;
  const alias = useMemo(() => buildArtistProfile(data.top_artists, data.top_tracks, lang).alias, [data.top_artists, data.top_tracks, lang]);
  const DominantIcon = MOOD_ICONS[dominant.icon];

  const stats = [
    { label: copy.statPlays, value: fmt(data.core_metrics.total_plays) },
    { label: copy.statArtists, value: fmt(data.core_metrics.unique_artists) },
    { label: copy.statHours, value: fmt(Math.round(data.core_metrics.listening_hours)) },
    { label: copy.statYears, value: yearSpan },
  ];

  const handleDownload = async () => {
    if (!posterRef.current || downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        // Google Fonts stylesheets are cross-origin: skip font embedding so
        // html-to-image doesn't spam SecurityErrors (same as WrappedCard).
        skipFonts: true,
        filter: (node) => !(node instanceof HTMLElement && node.dataset && node.dataset.noExport !== undefined),
      });
      const link = document.createElement('a');
      link.download = `nova-museum-poster-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c3 }}>
          {copy.eyebrow}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" style={{ color: tc.c3 }} />
          <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">{copy.title}</h3>
        </div>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">{copy.intro}</p>
      </div>

      {/* Poster canvas (exported node) */}
      <div className="mx-auto w-full max-w-[440px]">
        <div
          ref={posterRef}
          className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/15"
          style={{ backgroundColor: '#04070e' }}
        >
          <div className="absolute inset-0">
            <MoodArtCanvas moodKey={dominant.key} seed={seed} width={480} height={640} />
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,4,10,0.55) 0%, rgba(2,4,10,0.18) 38%, rgba(2,4,10,0.82) 100%)' }} />

          <div className="relative z-10 flex h-full flex-col justify-between p-6">
            <div>
              <p className="text-[9px] font-mono font-black uppercase tracking-[0.3em]" style={{ color: dominant.color }}>
                NOVA MUSIC LAB
              </p>
              <h4 className="mt-1 text-3xl font-black leading-none tracking-tight text-white" style={{ textShadow: `0 0 24px ${dominant.color}66` }}>
                {copy.posterHeading}
              </h4>
              <p className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-gray-300">
                {copy.curatedBy(alias)}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {stats.map(stat => (
                  <div key={stat.label} className="rounded-xl border border-white/15 bg-black/35 px-2 py-2 text-center backdrop-blur-[2px]">
                    <p className="text-sm font-black font-mono leading-tight text-white">{stat.value}</p>
                    <p className="mt-0.5 text-[8px] font-mono uppercase tracking-widest text-gray-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/40 p-3.5 backdrop-blur-[2px]">
                <p className="text-[8px] font-mono font-black uppercase tracking-[0.24em] text-gray-400">
                  {copy.topArtistsLabel}
                </p>
                <ol className="mt-2 space-y-1">
                  {data.top_artists.slice(0, 5).map((artist, idx) => (
                    <li key={artist.name} className="flex items-baseline gap-2">
                      <span className="w-4 text-[10px] font-mono font-black" style={{ color: dominant.color }}>
                        {idx + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{artist.name}</span>
                      <span className="text-[9px] font-mono text-gray-400">{fmt(artist.plays)}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-mono font-black uppercase tracking-[0.24em] text-gray-400">
                    {copy.moodMixLabel}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {topMoods.map(item => (
                      <div key={item.mood.key} className="flex items-center gap-2">
                        <span className="w-14 truncate text-[9px] font-mono font-bold" style={{ color: item.mood.color }}>
                          {item.mood.shortLabel[lang]}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.mood.color }} />
                        </div>
                        <span className="text-[8px] font-mono text-gray-400">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
                  style={{ color: dominant.color, borderColor: `${dominant.color}55`, backgroundColor: `${dominant.color}18` }}
                >
                  <DominantIcon className="h-5 w-5" />
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {data.top_genres.slice(0, 3).map(genre => (
                  <span key={genre.name} className="rounded-full border border-white/20 bg-black/35 px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider text-gray-200">
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-gray-500">
                {copy.footer(new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls (never exported) */}
      <div data-no-export className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all hover:scale-[1.03] disabled:opacity-60"
          style={{ color: tc.c1, borderColor: `${tc.c1}45`, backgroundColor: `${tc.c1}12` }}
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? copy.downloading : copy.downloadButton}
        </button>
        <button
          onClick={() => setVariation(v => v + 1)}
          className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all hover:scale-[1.03]"
          style={{ color: tc.c3, borderColor: `${tc.c3}45`, backgroundColor: `${tc.c3}12` }}
        >
          <Shuffle className="h-4 w-4" />
          {copy.variationButton}
        </button>
      </div>

      {downloadError && (
        <div className="mx-auto flex max-w-[440px] items-start gap-2 rounded-2xl border border-red-500/30 bg-red-950/20 p-3 text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <span className="text-xs">{copy.downloadError}</span>
        </div>
      )}
    </section>
  );
}
