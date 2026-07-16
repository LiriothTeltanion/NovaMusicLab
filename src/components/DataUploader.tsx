import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  Files,
  FileJson,
  FileText,
  Headphones,
  ListChecks,
  Music2,
  PlaySquare,
  Radio,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { parseMusicSources, ParseError } from '../utils/parser';
import type { GenreAssignment, MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import {
  downloadExport,
  parseExport,
  type DatasetClearResult,
  type DatasetSaveResult,
} from '../utils/datasetStorage';
import { localeFor, pickLanguage } from '../utils/i18n';
import { motion } from 'framer-motion';

const LARGE_FILE_WARNING_BYTES = 200 * 1024 * 1024; // 200MB
const NOVA_BACKUP_SNIFF_LENGTH = 300;

function hasNovaBackupMarker(text: string): boolean {
  return text.slice(0, NOVA_BACKUP_SNIFF_LENGTH).includes('"nova_music_export"');
}

function isNovaBackupEnvelope(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.prototype.hasOwnProperty.call(value, 'nova_music_export');
}

export type DatasetOperationKind = 'import' | 'clear';

export interface DatasetOperationToken {
  id: number;
  kind: DatasetOperationKind;
}

export interface DatasetOperationCoordinator {
  active: DatasetOperationToken | null;
  acquire: (kind: DatasetOperationKind) => DatasetOperationToken | null;
  isCurrent: (operation: DatasetOperationToken) => boolean;
  release: (operation: DatasetOperationToken) => void;
}

interface DataUploaderProps {
  onDataLoaded: (
    data: MusicDnaData,
    sourceLabel?: string,
    genreAssignments?: GenreAssignment[],
    operation?: DatasetOperationToken,
  ) => void | DatasetSaveResult | Promise<void | DatasetSaveResult>;
  currentData: MusicDnaData;
  genreAssignments?: GenreAssignment[];
  storedMeta: { savedAt: string; sourceLabel: string } | null;
  onClearStored: (operation?: DatasetOperationToken) => Promise<DatasetClearResult | void>;
  operationCoordinator: DatasetOperationCoordinator;
}

export default function DataUploader({
  onDataLoaded,
  currentData,
  genreAssignments = [],
  storedMeta,
  onClearStored,
  operationCoordinator,
}: DataUploaderProps) {
  const { tc, t, lang } = useApp();
  const locale = localeFor(lang);
  const logCopy = pickLanguage(lang, {
    en: {
      initialize: 'Initializing parsing pipeline...',
      files: (csv: number, json: number, html: number) => `Files identified: ${csv} CSV, ${json} JSON, ${html} HTML.`,
      reading: 'Reading raw file buffers into memory...',
      backup: 'Verified Nova backup signature. Restoring database...',
      restored: 'Restore complete. Reloading dashboard metrics...',
      processing: 'Processing scrobbles and streaming records...',
      parsed: (plays: string, artists: string) => `Parsed ${plays} plays across ${artists} unique artists.`,
      metadata: 'Synthesizing metadata and cross-navigation mappings...',
      success: 'Ingestion successful. Dashboard refreshed!',
      importedFiles: 'Imported Files',
    },
    es: {
      initialize: 'Inicializando el canal de análisis...',
      files: (csv: number, json: number, html: number) => `Archivos identificados: ${csv} CSV, ${json} JSON, ${html} HTML.`,
      reading: 'Leyendo búferes de archivos a memoria...',
      backup: 'Firma de copia de seguridad Nova verificada. Restaurando base de datos...',
      restored: 'Restauración completa. Recargando métricas del panel...',
      processing: 'Procesando registros de scrobbles y reproducción...',
      parsed: (plays: string, artists: string) => `Parseadas ${plays} reproducciones de ${artists} artistas.`,
      metadata: 'Sintetizando metadatos y mapeos de navegación cruzada...',
      success: 'Ingesta exitosa. ¡Panel de control actualizado!',
      importedFiles: 'Archivos importados',
    },
    he: {
      initialize: 'מאתחלים את תהליך הניתוח...',
      files: (csv: number, json: number, html: number) => `זוהו קבצים: ${csv} CSV,‏ ${json} JSON ו-${html} HTML.`,
      reading: 'קוראים את תוכן הקבצים לזיכרון המקומי...',
      backup: 'חתימת הגיבוי של Nova אומתה. משחזרים את מסד הנתונים...',
      restored: 'השחזור הושלם. מרעננים את מדדי לוח הבקרה...',
      processing: 'מעבדים סקראבלים ורשומות סטרימינג...',
      parsed: (plays: string, artists: string) => `נותחו ${plays} השמעות של ${artists} אמנים ייחודיים.`,
      metadata: 'בונים מטא-נתונים ומיפויי ניווט בין התצוגות...',
      success: 'הקליטה הושלמה בהצלחה. לוח הבקרה עודכן!',
      importedFiles: 'קבצים מיובאים',
    },
  });
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [clearingStored, setClearingStored] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [knowledgeSummary, setKnowledgeSummary] = useState<MusicDnaData['knowledge_summary'] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  const [parsingLogs, setParsingLogs] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the terminal console to the bottom on new log additions
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [parsingLogs]);

  const providerIcons = [Headphones, Music2, PlaySquare, FileJson, Radio, ListChecks];
  const providerCards = t.uploader.providerGuide.map((provider, index) => ({
    ...provider,
    icon: providerIcons[index] ?? Files,
    color: [tc.c1, '#1DB954', '#ff0033', tc.c3, tc.c2, tc.c4][index] ?? tc.c1,
  }));
  const clearCopy = pickLanguage(lang, {
    en: {
      busy: 'Clearing…',
      failed: 'The local archive could not be cleared. It remains active and no data was changed.',
      stale: 'A newer archive action in another Nova tab took priority. This older Clear request changed nothing.',
      idleLock: 'Import and Clear run as one local operation at a time.',
      importLock: 'Import and local save are still running. Clear unlocks when they finish.',
      clearLock: 'The saved archive is being cleared. New imports unlock when it finishes.',
      confirmTitle: 'Confirm local archive removal',
      confirmBody: 'Only the saved browser copy below will be removed. Export a backup first if you may need it again.',
      source: 'Exact saved source',
      saved: 'Saved time',
      confirm: 'Yes, clear this archive',
      cancel: 'Cancel',
    },
    es: {
      busy: 'Borrando…',
      failed: 'No se pudo borrar el archivo local. Sigue activo y no se modificó ningún dato.',
      stale: 'Una acción de archivo más reciente en otra pestaña de Nova tuvo prioridad. Esta solicitud de borrado antigua no cambió nada.',
      idleLock: 'Importar y Borrar se ejecutan como una sola operación local a la vez.',
      importLock: 'La importación y el guardado local siguen en curso. Borrar se habilitará al terminar.',
      clearLock: 'Se está borrando el archivo guardado. Las importaciones se habilitarán al terminar.',
      confirmTitle: 'Confirma el borrado del archivo local',
      confirmBody: 'Solo se eliminará la copia guardada en este navegador. Exporta una copia antes si podrías necesitarla de nuevo.',
      source: 'Fuente guardada exacta',
      saved: 'Hora de guardado',
      confirm: 'Sí, borrar este archivo',
      cancel: 'Cancelar',
    },
    he: {
      busy: 'מנקים…',
      failed: 'לא הצלחנו לנקות את הארכיון המקומי. הוא נשאר פעיל ולא בוצע שינוי בנתונים.',
      stale: 'פעולת ארכיון חדשה יותר בכרטיסיית Nova אחרת קיבלה קדימות. בקשת הניקוי הישנה לא שינתה דבר.',
      idleLock: 'ייבוא וניקוי רצים כפעולה מקומית אחת בכל פעם.',
      importLock: 'הייבוא והשמירה המקומית עדיין פעילים. הניקוי ייפתח בסיום.',
      clearLock: 'הארכיון השמור נמחק. ייבוא חדש ייפתח בסיום.',
      confirmTitle: 'אישור מחיקת הארכיון המקומי',
      confirmBody: 'רק העותק השמור בדפדפן הזה יימחק. אם ייתכן שיהיה בו צורך שוב, כדאי לייצא גיבוי קודם.',
      source: 'המקור השמור המדויק',
      saved: 'מועד השמירה',
      confirm: 'כן, למחוק את הארכיון',
      cancel: 'ביטול',
    },
  });
  const backupCopy = pickLanguage(lang, {
    en: {
      invalid: 'This file looks like a Nova backup, but its contents are invalid or damaged. Export a fresh backup and try again.',
      ignored: (count: number) => `${count} invalid Nova backup file(s) were ignored. The remaining valid files were imported safely.`,
    },
    es: {
      invalid: 'Este archivo parece una copia de seguridad de Nova, pero su contenido no es válido o está dañado. Exporta una copia nueva e inténtalo otra vez.',
      ignored: (count: number) => `Se ignoraron ${count} copia(s) de seguridad de Nova no válidas. Los demás archivos válidos se importaron de forma segura.`,
    },
    he: {
      invalid: 'הקובץ נראה כמו גיבוי של Nova, אבל התוכן שלו פגום או לא תקין. יש לייצא גיבוי חדש ולנסות שוב.',
      ignored: (count: number) => `התעלמנו מ-${count} קובצי גיבוי לא תקינים של Nova. שאר הקבצים התקינים יובאו בבטחה.`,
    },
  });
  const activeOperationKind = operationCoordinator.active?.kind;
  const activeImport = loading || activeOperationKind === 'import';
  const activeClear = clearingStored || activeOperationKind === 'clear';
  const operationBusy = activeImport || activeClear;

  useEffect(() => {
    if (showClearConfirmation) cancelClearRef.current?.focus();
  }, [showClearConfirmation]);

  useEffect(() => {
    if (!storedMeta) setShowClearConfirmation(false);
  }, [storedMeta]);

  const handleClearStored = async () => {
    const operation = operationCoordinator.acquire('clear');
    if (!operation) return;
    setClearingStored(true);
    setSuccessMsg(null);
    setWarning(null);
    try {
      const result = await onClearStored(operation);
      if (!operationCoordinator.isCurrent(operation) || !result) return;
      setWarning(result.ok
        ? t.uploader.clearedMessage
        : result.reason === 'stale-intent' ? clearCopy.stale : clearCopy.failed);
    } finally {
      operationCoordinator.release(operation);
      setClearingStored(false);
      setShowClearConfirmation(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (operationCoordinator.active) {
      setDragActive(false);
      return;
    }
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

    if (operationCoordinator.active) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (operationCoordinator.active) return;
    if (e.target.files && e.target.files[0]) {
      await processFiles(Array.from(e.target.files));
    }
  };

  // Yields to the event loop so React can paint the latest console line and
  // progress bar before the next (synchronous, potentially heavy) parse step.
  // Deliberately NOT a fixed-duration sleep: staging fake multi-second delays
  // to dramatize the terminal would make every real upload slower than it is.
  const paint = () => new Promise(resolve => setTimeout(resolve, 0));

  const addLog = (msg: string) => {
    setParsingLogs(prev => [...prev, `[${new Date().toLocaleTimeString(locale)}] ${msg}`]);
  };

  const processFiles = async (files: File[]) => {
    // The coordinator acquires synchronously in App, above this lazy route. Its
    // token therefore survives uploader unmount/remount and remains held through
    // parsing plus the caller's complete local-save promise.
    const operation = operationCoordinator.acquire('import');
    if (!operation) return;
    setLoading(true);
    setError(null);
    setWarning(null);
    setSuccessMsg(null);
    setKnowledgeSummary(null);
    setParsingLogs([]);
    setProgressPercent(0);

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

      addLog(logCopy.initialize);
      setProgressPercent(5);
      await paint();

      addLog(logCopy.files(csvFiles.length, jsonFiles.length, htmlFiles.length));
      setProgressPercent(15);
      await paint();

      const largestFile = files.reduce((max, f) => Math.max(max, f.size), 0);
      if (largestFile > LARGE_FILE_WARNING_BYTES) {
        setWarning(t.uploader.largeFileWarning((largestFile / (1024 * 1024)).toFixed(0)));
      }

      addLog(logCopy.reading);
      const [csvTexts, spotifyJsonTexts, youtubeHtmlTexts] = await Promise.all([
        Promise.all(csvFiles.map(readFileAsText)),
        Promise.all(jsonFiles.map(readFileAsText)),
        Promise.all(htmlFiles.map(readFileAsText)),
      ]);
      setProgressPercent(45);
      await paint();

      // A textual marker is only a cheap candidate signal. Backup mode starts
      // after the complete envelope passes parseExport's trust-boundary guard.
      const sourceJsonTexts: string[] = [];
      let invalidBackupCount = 0;
      for (const text of spotifyJsonTexts) {
        if (!hasNovaBackupMarker(text)) {
          sourceJsonTexts.push(text);
          continue;
        }

        let candidate: unknown;
        try {
          candidate = JSON.parse(text);
        } catch {
          invalidBackupCount += 1;
          continue;
        }

        // A source export can contain the marker as ordinary nested text. It
        // remains eligible for the normal parser unless the root is a Nova
        // envelope, preventing an accidental false-positive short circuit.
        if (!isNovaBackupEnvelope(candidate)) {
          sourceJsonTexts.push(text);
          continue;
        }

        const exported = parseExport(candidate);
        if (!exported) {
          invalidBackupCount += 1;
          continue;
        }

        addLog(logCopy.backup);
        setProgressPercent(70);
        await paint();

        if (!operationCoordinator.isCurrent(operation)) return;
        await onDataLoaded(exported.data, exported.source_label || pickLanguage(lang, {
          en: 'Nova backup',
          es: 'Copia de seguridad Nova',
          he: 'גיבוי Nova',
        }), exported.genre_assignments, operation);
        if (!operationCoordinator.isCurrent(operation)) return;
        setProgressPercent(100);
        addLog(logCopy.restored);
        setSuccessMsg(t.uploader.importedMessage(
          exported.data.core_metrics.total_plays.toLocaleString(locale),
          exported.data.core_metrics.unique_artists.toLocaleString(locale),
        ));
        return;
      }

      if (invalidBackupCount > 0
        && csvTexts.length === 0
        && sourceJsonTexts.length === 0
        && youtubeHtmlTexts.length === 0) {
        throw new Error(backupCopy.invalid);
      }
      if (invalidBackupCount > 0) setWarning(backupCopy.ignored(invalidBackupCount));

      addLog(logCopy.processing);
      let parsed: MusicDnaData;
      try {
        parsed = parseMusicSources({ csvTexts, spotifyJsonTexts: sourceJsonTexts, youtubeHtmlTexts });
      } catch (err) {
        if (invalidBackupCount > 0 && err instanceof ParseError && err.code === 'NO_VALID_ROWS') {
          throw new Error(backupCopy.invalid);
        }
        throw err;
      }
      setProgressPercent(75);
      await paint();

      addLog(logCopy.parsed(
        parsed.core_metrics.total_plays.toLocaleString(locale),
        parsed.core_metrics.unique_artists.toLocaleString(locale),
      ));
      await paint();

      addLog(logCopy.metadata);
      setProgressPercent(90);
      await paint();

      const source = parsed.source_summary;
      const sourceLabel = [
        source?.lastfm_plays ? `${source.lastfm_plays}× Last.fm` : null,
        source?.apple_music_plays ? `${source.apple_music_plays}× Apple Music` : null,
        source?.spotify_plays ? `${source.spotify_plays}× Spotify` : null,
        source?.youtube_plays ? `${source.youtube_plays}× YouTube` : null,
        source?.listenbrainz_plays ? `${source.listenbrainz_plays}× ListenBrainz` : null,
      ].filter(Boolean).join(' + ') || logCopy.importedFiles;

      if (!operationCoordinator.isCurrent(operation)) return;
      await onDataLoaded(parsed, sourceLabel, undefined, operation);
      if (!operationCoordinator.isCurrent(operation)) return;
      setKnowledgeSummary(parsed.knowledge_summary ?? null);

      setProgressPercent(100);
      addLog(logCopy.success);

      setSuccessMsg(t.uploader.successMessage(
        Math.max(1, files.length - invalidBackupCount),
        parsed.core_metrics.total_plays.toLocaleString(locale),
        parsed.core_metrics.unique_artists.toLocaleString(locale),
        source?.spotify_skip_rate_pct ?? 0
      ));
    } catch (err: any) {
      if (!operationCoordinator.isCurrent(operation)) return;
      console.error(err);
      if (err instanceof ParseError) {
        setError(err.code === 'INVALID_JSON' ? t.uploader.invalidJsonError : t.uploader.noValidRowsError);
      } else {
        setError(err.message || t.uploader.processingError);
      }
    } finally {
      operationCoordinator.release(operation);
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  const formatPct = (value: number) => `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  const formatNumber = (value: number) => value.toLocaleString(locale);
  const accessibilityCopy = pickLanguage(lang, {
    en: {
        progressBar: 'File import progress',
        activityLog: 'File import activity log',
      },
    es: {
        progressBar: 'Progreso de importación de archivos',
        activityLog: 'Registro de actividad de importación',
      },
    he: {
        progressBar: 'התקדמות ייבוא הקבצים',
        activityLog: 'יומן הפעילות של ייבוא הקבצים',
      },
  });
  const uploadUxCopy = pickLanguage(lang, {
    en: {
      localEyebrow: 'Private local import',
      formatsLabel: 'Accepted formats',
      formatsValue: 'CSV · JSON · HTML',
      helpHint: 'Spotify, Last.fm, YouTube, Apple Music, ListenBrainz and Nova backups',
      feedbackLabel: 'Import status',
      readyStatus: 'Ready for your files',
    },
    es: {
      localEyebrow: 'Importación privada y local',
      formatsLabel: 'Formatos admitidos',
      formatsValue: 'CSV · JSON · HTML',
      helpHint: 'Spotify, Last.fm, YouTube, Apple Music, ListenBrainz y copias de Nova',
      feedbackLabel: 'Estado de la importación',
      readyStatus: 'Listo para recibir tus archivos',
    },
    he: {
      localEyebrow: 'ייבוא פרטי ומקומי',
      formatsLabel: 'פורמטים נתמכים',
      formatsValue: 'CSV · JSON · HTML',
      helpHint: 'Spotify, Last.fm, YouTube, Apple Music, ListenBrainz וגיבויי Nova',
      feedbackLabel: 'מצב הייבוא',
      readyStatus: 'מוכנים לקבל את הקבצים שלך',
    },
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <section data-testid="upload-primary-action" className="space-y-3">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          role="region"
          aria-busy={operationBusy}
          aria-label={t.uploader.dropZoneAriaLabel}
          aria-describedby="upload-drop-hint upload-privacy-note upload-format-note"
          className={`glass-panel relative isolate overflow-hidden border-2 border-dashed p-6 sm:p-10 rounded-3xl text-center transition-all duration-300 ${
            dragActive
              ? 'border-cyberCyan bg-cyan-950/20 scale-[1.01]'
              : 'border-cyan-500/20 hover:border-cyberCyan/50'
          }`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[12%] top-0 -z-10 h-40 rounded-full blur-[70px]"
            style={{ backgroundColor: `${tc.c1}16` }}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.json,.html,.htm"
            onChange={handleChange}
            disabled={operationBusy}
            aria-label={t.uploader.dropZoneAriaLabel}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <p className="rounded-full border px-3 py-1 text-[10px] font-mono font-black uppercase tracking-[0.18em]" style={{ color: tc.c1, borderColor: `${tc.c1}35`, backgroundColor: `${tc.c1}0c` }}>
              {uploadUxCopy.localEyebrow}
            </p>
            <div className="p-4 bg-cyan-950/30 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Upload aria-hidden="true" className="w-10 h-10 text-cyberCyan animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-mono text-white tracking-wide">
                {t.uploader.title}
              </h3>
              <p id="upload-drop-hint" className="text-sm text-gray-400 max-w-lg mx-auto">
                {t.uploader.dropHint}
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={operationBusy}
              aria-describedby={operationBusy ? 'archive-operation-note' : undefined}
              className="min-h-11 px-6 py-2 bg-gradient-to-r from-cyberCyan/20 to-cyberPurple/20 border border-cyberCyan/40 hover:border-cyberCyan hover:shadow-cyber text-cyberCyan font-semibold rounded-full text-sm font-mono transition-all disabled:cursor-wait disabled:opacity-50"
            >
              {t.uploader.browseButton}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 p-4 rounded-2xl border bg-white/3" style={{ borderColor: `${tc.c1}20` }}>
            <ShieldCheck aria-hidden="true" className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c1 }} />
            <p id="upload-privacy-note" className="text-xs text-gray-400 leading-relaxed">
              {t.uploader.privacyNote}
            </p>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl border bg-white/3" style={{ borderColor: `${tc.c4}20` }}>
            <FileJson aria-hidden="true" className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c4 }} />
            <div id="upload-format-note" className="min-w-0">
              <p className="text-[10px] font-mono font-black uppercase tracking-wider" style={{ color: tc.c4 }}>
                {uploadUxCopy.formatsLabel}
              </p>
              <p dir="ltr" className="mt-1 text-xs font-mono font-bold text-gray-300">{uploadUxCopy.formatsValue}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl border bg-white/3" style={{ borderColor: `${tc.c2}20` }}>
            <Files aria-hidden="true" className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c2 }} />
            <p className="text-xs text-gray-400 leading-relaxed">
              {t.uploader.mergeNote}
            </p>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl border bg-white/3" style={{ borderColor: `${tc.c3}20` }}>
            <FileText aria-hidden="true" className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c3 }} />
            <p className="text-xs text-gray-400 leading-relaxed">
              {t.uploader.youtubeNote}
            </p>
          </div>
        </div>
      </section>

      <section
        data-testid="upload-feedback"
        data-state={operationBusy ? 'loading' : error ? 'error' : successMsg ? 'success' : warning ? 'warning' : 'idle'}
        aria-label={uploadUxCopy.feedbackLabel}
        className="min-h-[4.75rem] space-y-3"
      >
        {!operationBusy && !warning && !error && !successMsg && (
          <div className="flex min-h-[4.75rem] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-gray-400">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" style={{ color: tc.c1 }} />
            <span className="text-xs font-mono font-bold">{uploadUxCopy.readyStatus}</span>
          </div>
        )}

        {operationBusy && !loading && (
          <div role="status" className="flex min-h-[4.75rem] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-gray-300">
            <Database aria-hidden="true" className="h-5 w-5 shrink-0 animate-pulse" style={{ color: tc.c2 }} />
            <span className="text-xs font-mono font-bold">
              {activeImport ? clearCopy.importLock : clearCopy.clearLock}
            </span>
          </div>
        )}

        {loading && (
          <div
            aria-busy="true"
            className="relative space-y-4 overflow-hidden rounded-3xl border border-cyberCyan/20 p-5 glass-panel animate-fade-in"
          >
            <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-cyberCyan/5 blur-[50px]" />

            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="flex items-center justify-between font-mono text-xs"
            >
              <div className="flex items-center space-x-2.5">
                <div aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyberCyan border-t-transparent" />
                <span className="font-bold uppercase tracking-wider text-gray-300">
                  {t.uploader.processingStatus}
                </span>
              </div>
              <span className="font-black text-cyberCyan">{progressPercent}%</span>
            </div>

            <div
              role="progressbar"
              aria-label={accessibilityCopy.progressBar}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-valuetext={`${progressPercent}%`}
              className="h-2 w-full overflow-hidden rounded-full bg-white/5"
            >
              <motion.div
                aria-hidden="true"
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${tc.c1}, ${tc.c2})`,
                  boxShadow: `0 0 10px ${tc.c1}80`,
                }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />
            </div>

            <div
              ref={consoleRef}
              aria-label={accessibilityCopy.activityLog}
              className="h-36 space-y-1.5 overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-[11px] text-cyberCyan/90 scrollbar-thin scrollbar-thumb-white/10"
            >
              {parsingLogs.length === 0 ? (
                <div className="animate-pulse text-gray-500">{logCopy.initialize}</div>
              ) : (
                parsingLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-1 leading-relaxed">
                    <span className="select-none text-cyberPink">&gt;</span>
                    <span className="break-all">{log}</span>
                  </div>
                ))
              )}
              <div className="h-2" />
            </div>
          </div>
        )}

        {warning && (
          <div role="status" aria-live="polite" aria-atomic="true" className="flex items-start space-x-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-amber-300 animate-fade-in">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <span className="text-sm">{warning}</span>
          </div>
        )}

        {error && (
          <div role="alert" aria-live="assertive" aria-atomic="true" className="flex items-start space-x-3 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-red-300 animate-fade-in">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" aria-live="polite" aria-atomic="true" className="flex items-start space-x-3 rounded-2xl border border-green-500/30 bg-green-950/20 p-4 text-green-300 animate-fade-in">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <span className="text-sm font-mono">{successMsg}</span>
          </div>
        )}
      </section>

      <details data-testid="upload-source-guide" className="group overflow-hidden rounded-3xl border border-white/10 glass-panel">
        <summary
          aria-controls="upload-source-guide-content"
          className="flex min-h-11 cursor-pointer list-none items-center gap-3 p-5 marker:content-none"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border" style={{ color: tc.c1, borderColor: `${tc.c1}35`, backgroundColor: `${tc.c1}12` }}>
            <ListChecks aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 text-start">
            <span className="block text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c1 }}>
              {t.uploader.wizardEyebrow}
            </span>
            <span className="mt-0.5 block text-base font-black leading-tight text-white sm:text-lg">
              {t.uploader.wizardTitle}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-gray-500">
              {uploadUxCopy.helpHint}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180" />
        </summary>

        <div id="upload-source-guide-content" className="border-t border-white/8 p-5">
          <p className="max-w-3xl text-sm leading-relaxed text-gray-400">
            {t.uploader.wizardBody}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {t.uploader.wizardSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-black" style={{ color: '#020617', backgroundColor: tc.c1 }}>
                  {index + 1}
                </span>
                <p className="text-xs leading-relaxed text-gray-300">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {providerCards.map(({ icon: Icon, title, badge, body, steps, color }) => (
              <article key={title} className="rounded-3xl border bg-white/[0.035] p-4" style={{ borderColor: `${color}30` }}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border" style={{ color, borderColor: `${color}42`, backgroundColor: `${color}12` }}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black leading-tight text-white">{title}</p>
                    <p className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest" style={{ color, borderColor: `${color}45`, backgroundColor: `${color}12` }}>
                      {badge}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-gray-400">{body}</p>
                <ul className="mt-3 space-y-1.5">
                  {steps.map(step => (
                    <li key={step} className="flex gap-2 text-[11px] leading-relaxed text-gray-400">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </details>

      {/* ── Local session: auto-save status + portable backup ── */}
      <section className="glass-panel rounded-3xl border border-white/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border" style={{ color: tc.c2, borderColor: `${tc.c2}40`, backgroundColor: `${tc.c2}12` }}>
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c2 }}>
                {t.uploader.sessionEyebrow}
              </p>
              <h3 className="mt-1 text-lg font-black text-white">
                {t.uploader.sessionTitle}
              </h3>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                {t.uploader.sessionBody}
              </p>
              <p className="mt-2 text-[10px] font-mono text-gray-500">
                {storedMeta
                  ? t.uploader.storedMetaLabel(
                      new Date(storedMeta.savedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                      storedMeta.sourceLabel,
                    )
                  : t.uploader.noStoredData}
              </p>
              <p id="archive-operation-note" aria-live="polite" className="mt-2 text-[10px] font-mono text-gray-500">
                {activeImport ? clearCopy.importLock : activeClear ? clearCopy.clearLock : clearCopy.idleLock}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <button
              onClick={() => downloadExport(
                currentData,
                storedMeta?.sourceLabel ?? 'Nova Music Lab',
                genreAssignments,
              )}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all hover:scale-[1.03]"
              style={{ color: tc.c1, borderColor: `${tc.c1}45`, backgroundColor: `${tc.c1}12` }}
            >
              <Download className="h-4 w-4" />
              {t.uploader.exportButton}
            </button>
            {storedMeta && (
              <button
                type="button"
                onClick={() => setShowClearConfirmation(true)}
                disabled={operationBusy}
                aria-describedby="archive-operation-note"
                aria-expanded={showClearConfirmation}
                aria-controls="clear-archive-confirmation"
                className="inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-950/20 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-red-300 transition-all hover:scale-[1.03] hover:border-red-400/60 disabled:cursor-wait disabled:opacity-50 disabled:hover:scale-100"
              >
                <Trash2 className="h-4 w-4" />
                {activeClear ? clearCopy.busy : t.uploader.clearButton}
              </button>
            )}
          </div>
        </div>

        {storedMeta && showClearConfirmation && (
          <div
            id="clear-archive-confirmation"
            role="alertdialog"
            aria-labelledby="clear-archive-title"
            aria-describedby="clear-archive-description clear-archive-identity"
            className="mt-5 rounded-2xl border border-red-400/35 bg-red-950/25 p-4 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-400/35 bg-red-500/10 text-red-200">
                <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 id="clear-archive-title" className="font-black text-white">
                  {clearCopy.confirmTitle}
                </h4>
                <p id="clear-archive-description" className="mt-1 text-xs leading-relaxed text-gray-300">
                  {clearCopy.confirmBody}
                </p>
                <dl id="clear-archive-identity" className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <dt className="font-mono text-[10px] font-black uppercase tracking-wider text-red-200">
                      {clearCopy.source}
                    </dt>
                    <dd className="mt-1 break-words font-semibold text-white">
                      <bdi dir="auto">{storedMeta.sourceLabel}</bdi>
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <dt className="font-mono text-[10px] font-black uppercase tracking-wider text-red-200">
                      {clearCopy.saved}
                    </dt>
                    <dd className="mt-1 font-semibold text-white">
                      <time dateTime={storedMeta.savedAt}>
                        {new Date(storedMeta.savedAt).toLocaleString(locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    ref={cancelClearRef}
                    type="button"
                    onClick={() => setShowClearConfirmation(false)}
                    disabled={operationBusy}
                    className="min-h-11 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
                  >
                    {clearCopy.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleClearStored(); }}
                    disabled={operationBusy}
                    aria-describedby="clear-archive-description clear-archive-identity archive-operation-note"
                    className="min-h-11 rounded-full border border-red-300/50 bg-red-500/20 px-4 py-2 text-xs font-mono font-black uppercase tracking-wider text-red-100 transition-colors hover:bg-red-500/30 disabled:cursor-wait disabled:opacity-50"
                  >
                    {activeClear ? clearCopy.busy : clearCopy.confirm}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {successMsg && knowledgeSummary && (
        <div className="mt-6 space-y-4 animate-fade-in">
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

                <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
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
        </div>
      )}
    </div>
  );
}
