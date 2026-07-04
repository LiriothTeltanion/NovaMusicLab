import React, { useState, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Files,
  FileJson,
  FileText,
  Headphones,
  ListChecks,
  Music2,
  PlaySquare,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { parseMusicSources, ParseError } from '../utils/parser';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';

const LARGE_FILE_WARNING_BYTES = 200 * 1024 * 1024; // 200MB

interface DataUploaderProps {
  onDataLoaded: (data: MusicDnaData) => void;
}

export default function DataUploader({ onDataLoaded }: DataUploaderProps) {
  const { tc, t, lang } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [knowledgeSummary, setKnowledgeSummary] = useState<MusicDnaData['knowledge_summary'] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const providerIcons = [Headphones, Music2, PlaySquare, FileJson, ListChecks];
  const providerCards = t.uploader.providerGuide.map((provider, index) => ({
    ...provider,
    icon: providerIcons[index] ?? Files,
    color: [tc.c1, '#1DB954', '#ff0033', tc.c3, tc.c4][index] ?? tc.c1,
  }));

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (files: File[]) => {
    setLoading(true);
    setError(null);
    setWarning(null);
    setSuccessMsg(null);
    setKnowledgeSummary(null);

    try {
      const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
      const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
      const htmlFiles = files.filter(f => {
        const name = f.name.toLowerCase();
        return name.endsWith('.html') || name.endsWith('.htm');
      });

      if (csvFiles.length === 0 && jsonFiles.length === 0 && htmlFiles.length === 0) {
        throw new Error(t.uploader.noFilesError);
      }

      const largestFile = files.reduce((max, f) => Math.max(max, f.size), 0);
      if (largestFile > LARGE_FILE_WARNING_BYTES) {
        setWarning(t.uploader.largeFileWarning((largestFile / (1024 * 1024)).toFixed(0)));
      }

      const [lastfmCsvTexts, spotifyJsonTexts, youtubeHtmlTexts] = await Promise.all([
        Promise.all(csvFiles.map(readFileAsText)),
        Promise.all(jsonFiles.map(readFileAsText)),
        Promise.all(htmlFiles.map(readFileAsText)),
      ]);

      const parsed = parseMusicSources({ lastfmCsvTexts, spotifyJsonTexts, youtubeHtmlTexts });
      onDataLoaded(parsed);
      setKnowledgeSummary(parsed.knowledge_summary ?? null);

      const source = parsed.source_summary;
      setSuccessMsg(t.uploader.successMessage(
        files.length,
        parsed.core_metrics.total_plays.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES'),
        parsed.core_metrics.unique_artists.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES'),
        source?.spotify_skip_rate_pct ?? 0
      ));
    } catch (err: any) {
      console.error(err);
      if (err instanceof ParseError) {
        setError(err.code === 'INVALID_JSON' ? t.uploader.invalidJsonError : t.uploader.noValidRowsError);
      } else {
        setError(err.message || t.uploader.processingError);
      }
    } finally {
      setLoading(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error(t.uploader.processingError));
      reader.readAsText(file);
    });
  };

  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const formatPct = (value: number) => `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  const formatNumber = (value: number) => value.toLocaleString(locale);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 items-stretch">
        <div className="glass-panel rounded-3xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ color: tc.c1, borderColor: `${tc.c1}35`, backgroundColor: `${tc.c1}12` }}>
              <ListChecks className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c1 }}>
                {t.uploader.wizardEyebrow}
              </p>
              <h3 className="text-xl font-black text-white leading-tight">
                {t.uploader.wizardTitle}
              </h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">
            {t.uploader.wizardBody}
          </p>
          <div className="mt-5 space-y-2">
            {t.uploader.wizardSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-black" style={{ color: '#020617', backgroundColor: tc.c1 }}>
                  {index + 1}
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {providerCards.map(({ icon: Icon, title, badge, body, steps, color }) => (
            <article key={title} className="rounded-3xl border bg-white/[0.035] p-4" style={{ borderColor: `${color}30` }}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border" style={{ color, borderColor: `${color}42`, backgroundColor: `${color}12` }}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white leading-tight">{title}</p>
                  <p className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest" style={{ color, borderColor: `${color}45`, backgroundColor: `${color}12` }}>
                    {badge}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400 leading-relaxed">{body}</p>
              <ul className="mt-3 space-y-1.5">
                {steps.map(step => (
                  <li key={step} className="flex gap-2 text-[11px] text-gray-400 leading-relaxed">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={t.uploader.dropZoneAriaLabel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        className={`glass-panel border-2 border-dashed p-10 rounded-3xl text-center cursor-pointer transition-all duration-300 ${
          dragActive 
            ? 'border-cyberCyan bg-cyan-950/20 scale-[1.01]' 
            : 'border-cyan-500/20 hover:border-cyberCyan/50'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple
          accept=".csv,.json,.html,.htm"
          onChange={handleChange}
          className="hidden" 
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-cyan-950/30 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Upload className="w-10 h-10 text-cyberCyan animate-bounce" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-mono text-white tracking-wide">
              {t.uploader.title}
            </h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              {t.uploader.dropHint}
            </p>
          </div>

          <button className="px-6 py-2 bg-gradient-to-r from-cyberCyan/20 to-cyberPurple/20 border border-cyberCyan/40 hover:border-cyberCyan hover:shadow-cyber text-cyberCyan font-semibold rounded-full text-sm font-mono transition-all">
            {t.uploader.browseButton}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-start gap-3 p-4 rounded-2xl border bg-white/3" style={{ borderColor: `${tc.c1}20` }}>
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c1 }} />
          <p className="text-xs text-gray-400 leading-relaxed">
            {t.uploader.privacyNote}
          </p>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-2xl border bg-white/3" style={{ borderColor: `${tc.c2}20` }}>
          <Files className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c2 }} />
          <p className="text-xs text-gray-400 leading-relaxed">
            {t.uploader.mergeNote}
          </p>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-2xl border bg-white/3" style={{ borderColor: `${tc.c3}20` }}>
          <FileText className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c3 }} />
          <p className="text-xs text-gray-400 leading-relaxed">
            {t.uploader.youtubeNote}
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center justify-center space-x-3 p-4 glass-panel border border-cyan-500/20 rounded-2xl">
          <div className="w-5 h-5 border-2 border-cyberCyan border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-300 font-mono">
            {t.uploader.processingStatus}
          </span>
        </div>
      )}

      {warning && (
        <div className="mt-6 flex items-start space-x-3 p-4 bg-amber-950/20 border border-amber-500/30 text-amber-300 rounded-2xl animate-fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <span className="text-sm">{warning}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start space-x-3 p-4 bg-red-950/20 border border-red-500/30 text-red-300 rounded-2xl animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-6 space-y-4 animate-fade-in">
          <div className="flex items-start space-x-3 p-4 bg-green-950/20 border border-green-500/30 text-green-300 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-500" />
            <span className="text-sm font-mono">{successMsg}</span>
          </div>

          {knowledgeSummary && (
            <div className="glass-panel rounded-3xl border border-white/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border" style={{ color: tc.c1, borderColor: `${tc.c1}40`, backgroundColor: `${tc.c1}12` }}>
                    <Database className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c1 }}>
                      {t.uploader.knowledgeEyebrow}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">
                      {t.uploader.knowledgeTitle}
                    </h3>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                      {t.uploader.knowledgeBody}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
                  {[
                    {
                      label: t.uploader.knowledgeMatched,
                      value: `${knowledgeSummary.matched_artists}/${knowledgeSummary.total_artists}`,
                      sub: formatPct(knowledgeSummary.match_rate_pct),
                      color: '#22c55e',
                    },
                    {
                      label: t.uploader.knowledgePlayCoverage,
                      value: formatPct(knowledgeSummary.matched_play_rate_pct),
                      sub: formatNumber(knowledgeSummary.matched_plays),
                      color: tc.c2,
                    },
                    {
                      label: t.uploader.knowledgeCache,
                      value: formatNumber(knowledgeSummary.cache_artist_count),
                      sub: t.uploader.knowledgeWikidataProfiles(formatNumber(knowledgeSummary.wikidata_profile_count)),
                      color: tc.c3,
                    },
                    {
                      label: t.uploader.knowledgeMissing,
                      value: formatNumber(knowledgeSummary.unmatched_artists),
                      sub: knowledgeSummary.unmatched_artists ? t.uploader.knowledgeNeedsEnrichment : t.uploader.knowledgeComplete,
                      color: knowledgeSummary.unmatched_artists ? '#f59e0b' : '#22c55e',
                    },
                  ].map(card => (
                    <div key={card.label} className="rounded-2xl border bg-white/[0.035] p-3" style={{ borderColor: `${card.color}28` }}>
                      <p className="text-[9px] font-mono font-black uppercase tracking-wider text-gray-500">{card.label}</p>
                      <p className="mt-1 text-lg font-black font-mono" style={{ color: card.color }}>{card.value}</p>
                      <p className="mt-1 truncate text-[10px] text-gray-500">{card.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                    {t.uploader.knowledgeTopMatches}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {knowledgeSummary.top_matches.slice(0, 6).map(match => (
                      <span key={`${match.mbid}-${match.name}`} className="rounded-full border px-2.5 py-1 text-[10px] font-mono font-bold" style={{ color: tc.c1, borderColor: `${tc.c1}35`, backgroundColor: `${tc.c1}10` }}>
                        {match.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                    {t.uploader.knowledgeTopMissing}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {knowledgeSummary.top_missing.length ? knowledgeSummary.top_missing.slice(0, 6).map(match => (
                      <span key={match.name} className="rounded-full border border-amber-500/30 bg-amber-950/10 px-2.5 py-1 text-[10px] font-mono font-bold text-amber-300">
                        {match.name}
                      </span>
                    )) : (
                      <span className="text-xs text-gray-400">{t.uploader.knowledgeNoMissing}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
