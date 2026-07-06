import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Loader2, Trash2, Upload, Users, Heart, Activity,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { parseMusicSources, ParseError } from '../utils/parser';
import { parseExport } from '../utils/datasetStorage';
import { compareArtistOverlap, compareCoreMetrics, compareMoodProfiles, type CoreMetricKey } from '../utils/museumCompare';
import ArtistAvatar from './ArtistAvatar';
import MoodBadge from './MoodBadge';

interface MuseumComparatorProps {
  data: MusicDnaData;
  primaryLabel: string;
}

const METRIC_HERO_KEYS: Record<CoreMetricKey, 'scrobbles' | 'artists' | 'tracks' | 'hours' | 'days'> = {
  total_plays: 'scrobbles',
  unique_artists: 'artists',
  unique_tracks: 'tracks',
  listening_hours: 'hours',
  active_days: 'days',
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('read-error'));
    reader.readAsText(file);
  });
}

export default function MuseumComparator({ data, primaryLabel }: MuseumComparatorProps) {
  const { t, tc, lang } = useApp();
  const copy = t.museumCompare;
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const fmtNum = (n: number) => Math.round(n).toLocaleString(locale);

  const [secondary, setSecondary] = useState<MusicDnaData | null>(null);
  const [secondaryLabel, setSecondaryLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const overlap = useMemo(() => (secondary ? compareArtistOverlap(data, secondary) : null), [data, secondary]);
  const metrics = useMemo(() => (secondary ? compareCoreMetrics(data, secondary) : null), [data, secondary]);
  const moods = useMemo(() => (secondary ? compareMoodProfiles(data, secondary) : null), [data, secondary]);

  const processFiles = async (files: File[]) => {
    setLoading(true);
    setError(null);
    try {
      const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
      const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
      const htmlFiles = files.filter(f => /\.html?$/i.test(f.name));

      if (!csvFiles.length && !jsonFiles.length && !htmlFiles.length) {
        throw new Error(t.uploader.noFilesError);
      }

      const [csvTexts, jsonTexts, htmlTexts] = await Promise.all([
        Promise.all(csvFiles.map(readFileAsText)),
        Promise.all(jsonFiles.map(readFileAsText)),
        Promise.all(htmlFiles.map(readFileAsText)),
      ]);

      for (const text of jsonTexts) {
        if (!text.slice(0, 300).includes('"nova_music_export"')) continue;
        const exported = parseExport(JSON.parse(text));
        if (exported) {
          setSecondary(exported.data);
          setSecondaryLabel(exported.source_label || copy.secondaryMuseumLabel);
          setLoading(false);
          return;
        }
      }

      const parsed = parseMusicSources({ csvTexts, spotifyJsonTexts: jsonTexts, youtubeHtmlTexts: htmlTexts });
      const source = parsed.source_summary;
      const label = [
        source?.lastfm_plays ? `${source.lastfm_plays}× Last.fm` : null,
        source?.apple_music_plays ? `${source.apple_music_plays}× Apple Music` : null,
        source?.spotify_plays ? `${source.spotify_plays}× Spotify` : null,
        source?.youtube_plays ? `${source.youtube_plays}× YouTube` : null,
        source?.listenbrainz_plays ? `${source.listenbrainz_plays}× ListenBrainz` : null,
      ].filter(Boolean).join(' + ') || copy.secondaryMuseumLabel;

      setSecondary(parsed);
      setSecondaryLabel(label);
    } catch (err: any) {
      if (err instanceof ParseError) {
        setError(err.code === 'INVALID_JSON' ? t.uploader.invalidJsonError : t.uploader.noValidRowsError);
      } else {
        setError(err.message || t.uploader.processingError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) await processFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const clearSecondary = () => {
    setSecondary(null);
    setSecondaryLabel('');
    setError(null);
  };

  const sourceTypeLabel = (museum: MusicDnaData) =>
    t.dataQuality.sourceTypes[museum.source_summary?.source_type ?? 'unknown'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-2">
        <Users className="w-6 h-6" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">{copy.title}</h2>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-gray-400">{copy.intro}</p>

      {/* Museum header cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="glass-panel rounded-3xl border p-5" style={{ borderColor: `${tc.c1}35` }}>
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c1 }}>
            {copy.primaryMuseumLabel}
          </p>
          <h3 className="mt-1 truncate text-lg font-black text-white">{primaryLabel}</h3>
          <p className="mt-1 text-xs font-mono text-gray-500">{sourceTypeLabel(data)}</p>
          <div className="mt-4 flex items-center gap-3">
            <ArtistAvatar name={data.top_artists[0]?.name ?? '?'} size={40} tooltip={false} />
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{copy.topArtistLabel}</p>
              <p className="truncate text-sm font-bold text-white">{data.top_artists[0]?.name ?? '—'}</p>
            </div>
          </div>
          <p className="mt-3 text-2xl font-black font-mono" style={{ color: tc.c1 }}>
            {fmtNum(data.core_metrics.total_plays)}
            <span className="ml-2 text-xs font-normal text-gray-500">{copy.totalPlaysLabel}</span>
          </p>
        </article>

        {secondary ? (
          <article className="glass-panel rounded-3xl border p-5" style={{ borderColor: `${tc.c2}35` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c2 }}>
                  {copy.secondaryMuseumLabel}
                </p>
                <h3 className="mt-1 truncate text-lg font-black text-white">{secondaryLabel}</h3>
                <p className="mt-1 text-xs font-mono text-gray-500">{sourceTypeLabel(secondary)}</p>
              </div>
              <button
                onClick={clearSecondary}
                aria-label={copy.clearSecondaryButton}
                title={copy.clearSecondaryButton}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-950/15 text-red-300 transition-transform hover:scale-110"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ArtistAvatar name={secondary.top_artists[0]?.name ?? '?'} size={40} tooltip={false} />
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{copy.topArtistLabel}</p>
                <p className="truncate text-sm font-bold text-white">{secondary.top_artists[0]?.name ?? '—'}</p>
              </div>
            </div>
            <p className="mt-3 text-2xl font-black font-mono" style={{ color: tc.c2 }}>
              {fmtNum(secondary.core_metrics.total_plays)}
              <span className="ml-2 text-xs font-normal text-gray-500">{copy.totalPlaysLabel}</span>
            </p>
          </article>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={copy.secondaryPlaceholderTitle}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            className={`glass-panel flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              dragActive ? 'border-cyberCyan bg-cyan-950/20 scale-[1.01]' : 'border-white/15 hover:border-white/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.html,.htm"
              onChange={handleChange}
              className="hidden"
            />
            <div className="rounded-2xl border p-3" style={{ borderColor: `${tc.c2}35`, backgroundColor: `${tc.c2}12` }}>
              <Upload className="h-6 w-6" style={{ color: tc.c2 }} />
            </div>
            <h3 className="text-sm font-black text-white">{copy.secondaryPlaceholderTitle}</h3>
            <p className="max-w-xs text-xs leading-relaxed text-gray-400">{copy.secondaryPlaceholderBody}</p>
            <span className="rounded-full border px-4 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider"
              style={{ color: tc.c2, borderColor: `${tc.c2}45`, backgroundColor: `${tc.c2}12` }}>
              {copy.browseButton}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-cyan-500/20 p-4 glass-panel">
          <Loader2 className="h-5 w-5 animate-spin text-cyberCyan" />
          <span className="font-mono text-sm text-gray-300">{copy.processing}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-red-300 animate-fade-in">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {secondary && overlap && metrics && moods && (
        <>
          {/* Artist overlap */}
          <section className="glass-panel space-y-4 rounded-3xl border border-white/10 p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: tc.c3 }} />
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">{copy.overlapTitle}</h3>
            </div>
            <p className="text-sm text-gray-300">{copy.overlapBody(overlap.overlapPct, overlap.sharedCount)}</p>
            <div className="flex flex-wrap gap-3 text-xs font-mono text-gray-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {copy.onlyInA(primaryLabel, overlap.onlyA.length)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {copy.onlyInB(secondaryLabel, overlap.onlyB.length)}
              </span>
            </div>
            {overlap.shared.length ? (
              <div>
                <p className="mb-2 text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                  {copy.sharedArtistsLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {overlap.shared.map(artist => (
                    <span key={artist.name} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] py-1 pl-1 pr-3">
                      <ArtistAvatar name={artist.name} size={24} tooltip={false} />
                      <span className="text-xs font-bold text-white">{artist.name}</span>
                      <span className="font-mono text-[10px] text-gray-500">
                        {fmtNum(artist.playsA)} / {fmtNum(artist.playsB)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">{copy.noOverlapArtists}</p>
            )}
          </section>

          {/* Mood face-off */}
          <section className="glass-panel space-y-4 rounded-3xl border border-white/10 p-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5" style={{ color: tc.c2 }} />
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">{copy.moodTitle}</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-gray-500">{primaryLabel}</p>
                <MoodBadge moodKey={moods.profileA.dominantMood.key} />
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-gray-500">{secondaryLabel}</p>
                <MoodBadge moodKey={moods.profileB.dominantMood.key} />
              </div>
            </div>
            <p className="text-sm text-gray-300">
              {moods.sameDominantMood
                ? copy.moodSameNarrative(moods.profileA.dominantMood.shortLabel[lang])
                : copy.moodDiffNarrative(moods.profileA.dominantMood.shortLabel[lang], moods.profileB.dominantMood.shortLabel[lang])}
            </p>
          </section>

          {/* Metrics side by side */}
          <section className="glass-panel space-y-4 rounded-3xl border border-white/10 p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: tc.c4 }} />
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">{copy.metricsTitle}</h3>
            </div>
            <p className="text-xs text-gray-500">{copy.metricsHint}</p>
            <div className="space-y-3">
              {metrics.map(metric => {
                const total = metric.a + metric.b;
                const pctA = total > 0 ? (metric.a / total) * 100 : 50;
                const diffColor = metric.diffPct === null ? '#6b7280' : metric.diffPct >= 0 ? '#22c55e' : '#ef4444';
                return (
                  <div key={metric.key}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono font-bold uppercase tracking-wider text-gray-400">
                        {t.hero[METRIC_HERO_KEYS[metric.key]]}
                      </span>
                      <span className="font-mono font-black" style={{ color: diffColor }}>
                        {metric.diffPct === null ? '—' : `${metric.diffPct > 0 ? '+' : ''}${metric.diffPct}%`}
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full" style={{ width: `${pctA}%`, backgroundColor: tc.c1 }} />
                      <div className="h-full" style={{ width: `${100 - pctA}%`, backgroundColor: tc.c2 }} />
                    </div>
                    <div className="mt-1 flex justify-between font-mono text-[10px] text-gray-500">
                      <span>{fmtNum(metric.a)}</span>
                      <span>{fmtNum(metric.b)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
