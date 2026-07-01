import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck, Files } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
      const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));

      if (csvFiles.length === 0 && jsonFiles.length === 0) {
        throw new Error(t.uploader.noFilesError);
      }

      const largestFile = files.reduce((max, f) => Math.max(max, f.size), 0);
      if (largestFile > LARGE_FILE_WARNING_BYTES) {
        setWarning(t.uploader.largeFileWarning((largestFile / (1024 * 1024)).toFixed(0)));
      }

      const [lastfmCsvTexts, spotifyJsonTexts] = await Promise.all([
        Promise.all(csvFiles.map(readFileAsText)),
        Promise.all(jsonFiles.map(readFileAsText)),
      ]);

      const parsed = parseMusicSources({ lastfmCsvTexts, spotifyJsonTexts });
      onDataLoaded(parsed);

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

  return (
    <div className="w-full max-w-2xl mx-auto">
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
          accept=".csv,.json"
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
              {t.uploader.dropHintBefore}
              <span className="font-bold" style={{ color: tc.c1 }}>Last.fm CSV</span>
              {t.uploader.dropHintMiddle}
              <span className="font-bold" style={{ color: tc.c2 }}>Spotify JSON</span>
              {t.uploader.dropHintAfter}
            </p>
          </div>

          <button className="px-6 py-2 bg-gradient-to-r from-cyberCyan/20 to-cyberPurple/20 border border-cyberCyan/40 hover:border-cyberCyan hover:shadow-cyber text-cyberCyan font-semibold rounded-full text-sm font-mono transition-all">
            {t.uploader.browseButton}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
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
        <div className="mt-6 flex items-start space-x-3 p-4 bg-green-950/20 border border-green-500/30 text-green-300 rounded-2xl animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-500" />
          <span className="text-sm font-mono">{successMsg}</span>
        </div>
      )}
    </div>
  );
}
