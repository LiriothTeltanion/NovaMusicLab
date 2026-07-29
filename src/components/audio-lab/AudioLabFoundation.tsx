import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  FileAudio,
  FlaskConical,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { localeFor } from '../../utils/i18n';
import '../toolRoom.css';

export type AudioLabLanguage = 'en' | 'es' | 'he';
type AudioFileError = 'unsupported' | 'too-large' | 'metadata' | null;

export const AUDIO_LAB_MAX_FILE_BYTES = 100 * 1024 * 1024;
const AUDIO_EXTENSIONS = /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav|wave)$/i;

export interface AudioLabFoundationProps {
  lang: AudioLabLanguage;
}

interface AudioLabCopy {
  eyebrow: string;
  title: string;
  intro: string;
  choose: string;
  accepted: string;
  privacyTitle: string;
  privacyBody: string;
  rightsNote: string;
  selectedTitle: string;
  fileName: string;
  format: string;
  size: string;
  duration: string;
  durationPending: string;
  preview: string;
  clear: string;
  boundaryTitle: string;
  boundaryBody: string;
  plannedTitle: string;
  planned: string[];
  notRun: string;
  errors: Record<Exclude<AudioFileError, null>, string>;
}

const COPY: Record<AudioLabLanguage, AudioLabCopy> = {
  en: {
    eyebrow: 'Audio Lab foundation',
    title: 'Inspect a local audio file',
    intro: 'This first slice validates the private file flow and audio preview. It does not claim to analyze tempo, key, genre or emotion.',
    choose: 'Choose audio',
    accepted: 'Audio files up to 100 MB',
    privacyTitle: 'Local and temporary',
    privacyBody: 'The file is not uploaded or saved by Nova. Its temporary preview URL is released when you clear it or leave this room.',
    rightsNote: 'Use audio you own or have permission to inspect.',
    selectedTitle: 'Selected local file',
    fileName: 'File',
    format: 'Format',
    size: 'Size',
    duration: 'Duration',
    durationPending: 'Reading metadata…',
    preview: 'Local audio preview',
    clear: 'Clear file',
    boundaryTitle: 'No audio has been analyzed',
    boundaryBody: 'The analysis adapter, worker and evidence contract will be added separately. Until then, Nova shows only metadata reported by the file and browser.',
    plannedTitle: 'Future evidence slots',
    planned: ['Tempo estimate', 'Key estimate', 'Dynamics', 'Sound-character estimate'],
    notRun: 'Not run',
    errors: {
      unsupported: 'Choose a recognized audio file. Documents, archives and video files are not accepted.',
      'too-large': 'This file is larger than the 100 MB safety limit.',
      metadata: 'The browser could not read this file’s audio metadata. No analysis was attempted.',
    },
  },
  es: {
    eyebrow: 'Fundación del Audio Lab',
    title: 'Inspecciona un audio local',
    intro: 'Esta primera base valida el flujo privado y la preescucha. No afirma analizar tempo, tonalidad, género ni emoción.',
    choose: 'Elegir audio',
    accepted: 'Audios de hasta 100 MB',
    privacyTitle: 'Local y temporal',
    privacyBody: 'Nova no sube ni guarda el archivo. La URL temporal de preescucha se elimina al limpiar el archivo o salir de esta sala.',
    rightsNote: 'Usa audio propio o que tengas permiso para inspeccionar.',
    selectedTitle: 'Archivo local seleccionado',
    fileName: 'Archivo',
    format: 'Formato',
    size: 'Tamaño',
    duration: 'Duración',
    durationPending: 'Leyendo metadatos…',
    preview: 'Preescucha de audio local',
    clear: 'Limpiar archivo',
    boundaryTitle: 'No se ha analizado el audio',
    boundaryBody: 'El adaptador de análisis, el worker y el contrato de evidencia se añadirán por separado. Hasta entonces Nova solo muestra metadatos informados por el archivo y el navegador.',
    plannedTitle: 'Espacios de evidencia futuros',
    planned: ['Tempo estimado', 'Tonalidad estimada', 'Dinámica', 'Carácter sonoro estimado'],
    notRun: 'No ejecutado',
    errors: {
      unsupported: 'Elige un archivo de audio reconocido. No se aceptan documentos, archivos comprimidos ni video.',
      'too-large': 'Este archivo supera el límite de seguridad de 100 MB.',
      metadata: 'El navegador no pudo leer los metadatos de audio. No se intentó ningún análisis.',
    },
  },
  he: {
    eyebrow: 'תשתית מעבדת האודיו',
    title: 'בדיקת קובץ אודיו מקומי',
    intro: 'השלב הראשון בודק את זרימת הקובץ הפרטית ואת הנגן המקומי. הוא אינו מתיימר לנתח קצב, סולם, ז׳אנר או רגש.',
    choose: 'בחירת אודיו',
    accepted: 'קובצי אודיו עד 100MB',
    privacyTitle: 'מקומי וזמני',
    privacyBody: 'Nova אינה מעלה או שומרת את הקובץ. כתובת התצוגה המקדימה הזמנית משתחררת בעת ניקוי הקובץ או יציאה מהחדר.',
    rightsNote: 'יש להשתמש באודיו בבעלותך או באודיו שקיבלת רשות לבדוק.',
    selectedTitle: 'הקובץ המקומי שנבחר',
    fileName: 'קובץ',
    format: 'פורמט',
    size: 'גודל',
    duration: 'משך',
    durationPending: 'קריאת נתונים…',
    preview: 'תצוגה מקדימה של אודיו מקומי',
    clear: 'ניקוי הקובץ',
    boundaryTitle: 'לא בוצע ניתוח אודיו',
    boundaryBody: 'מתאם הניתוח, ה־worker וחוזה הראיות יתווספו בנפרד. עד אז Nova מציגה רק נתונים שמספקים הקובץ והדפדפן.',
    plannedTitle: 'שדות ראיות עתידיים',
    planned: ['הערכת קצב', 'הערכת סולם', 'דינמיקה', 'הערכת אופי הצליל'],
    notRun: 'לא הופעל',
    errors: {
      unsupported: 'יש לבחור קובץ אודיו מוכר. מסמכים, קבצים דחוסים וקובצי וידאו אינם נתמכים.',
      'too-large': 'הקובץ גדול ממגבלת הבטיחות של 100MB.',
      metadata: 'הדפדפן לא הצליח לקרוא את נתוני האודיו. לא נעשה ניסיון לנתח את הקובץ.',
    },
  },
};

function isSupportedAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || (!file.type && AUDIO_EXTENSIONS.test(file.name));
}

function formatFileSize(bytes: number, lang: AudioLabLanguage): string {
  const megabytes = bytes / (1024 * 1024);
  return `${new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 1 }).format(megabytes)} MB`;
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainder = String(rounded % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

interface AudioSelection {
  file: File;
  objectUrl: string;
  safeMediaSrc: string;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createSafeLocalAudioUrl(file: File): Pick<AudioSelection, 'objectUrl' | 'safeMediaSrc'> {
  const objectUrl = URL.createObjectURL(file);

  try {
    if (new URL(objectUrl).protocol !== 'blob:') {
      throw new Error('Unexpected local media URL protocol');
    }
    return {
      objectUrl,
      safeMediaSrc: escapeHtmlAttribute(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export default function AudioLabFoundation({ lang }: AudioLabFoundationProps) {
  const copy = COPY[lang];
  const direction = lang === 'he' ? 'rtl' : 'ltr';
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<AudioSelection | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [error, setError] = useState<AudioFileError>(null);

  useEffect(() => {
    if (!selection) return;
    const currentUrl = selection.objectUrl;
    return () => URL.revokeObjectURL(currentUrl);
  }, [selection]);

  const clearSelection = () => {
    setSelection(null);
    setDurationSeconds(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setDurationSeconds(null);

    if (!isSupportedAudioFile(file)) {
      setSelection(null);
      setError('unsupported');
      return;
    }
    if (file.size > AUDIO_LAB_MAX_FILE_BYTES) {
      setSelection(null);
      setError('too-large');
      return;
    }

    try {
      setSelection({ file, ...createSafeLocalAudioUrl(file) });
    } catch {
      setSelection(null);
      setError('metadata');
    }
  };

  const handleMetadata = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const duration = event.currentTarget.duration;
    if (Number.isFinite(duration) && duration >= 0) {
      setDurationSeconds(duration);
      setError(null);
    } else {
      setDurationSeconds(null);
      setError('metadata');
    }
  };

  return (
    <section
      dir={direction}
      aria-labelledby="audio-lab-foundation-title"
      className="nova-surface nova-surface--featured nova-tool-room nova-tool-room--audio space-y-6 rounded-3xl p-5 sm:p-7"
    >
      <header className="space-y-2">
        <p className="nova-tool-room__eyebrow flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.24em]">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          {copy.eyebrow}
        </p>
        <h2 id="audio-lab-foundation-title" className="nova-tool-room__title text-2xl font-black tracking-tight">
          {copy.title}
        </h2>
        <p className="nova-tool-room__copy max-w-3xl text-sm leading-relaxed">{copy.intro}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
        <div className="nova-tool-room__panel space-y-4 rounded-3xl border border-dashed p-5">
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.aac,.flac,.m4a,.mp3,.oga,.ogg,.opus,.wav,.wave"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
            aria-label={copy.choose}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="nova-tool-room__action nova-tool-room__action--accent inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {copy.choose}
          </button>
          <p className="nova-tool-room__counter text-center font-mono text-[10px] uppercase tracking-wider">{copy.accepted}</p>

          <div className="nova-tool-room__privacy flex items-start gap-3 rounded-2xl border p-4">
            <ShieldCheck className="nova-tool-room__privacy-icon mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="nova-tool-room__title text-sm font-bold">{copy.privacyTitle}</p>
              <p className="nova-tool-room__copy mt-1 text-xs leading-relaxed">{copy.privacyBody}</p>
              <p className="nova-tool-room__warning mt-2 rounded-lg px-2 py-1.5 text-xs font-semibold">{copy.rightsNote}</p>
            </div>
          </div>
        </div>

        <div className="nova-surface nova-surface--utility rounded-3xl p-5">
          {selection ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileAudio className="nova-tool-room__eyebrow mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="nova-tool-room__title text-sm font-black">{copy.selectedTitle}</h3>
                  <p className="nova-tool-room__copy mt-1 truncate text-xs" dir="auto">{selection.file.name}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="nova-tool-room__metric rounded-xl border p-3">
                  <dt>{copy.format}</dt>
                  <dd className="mt-1 truncate font-bold">{selection.file.type || 'audio'}</dd>
                </div>
                <div className="nova-tool-room__metric rounded-xl border p-3">
                  <dt>{copy.size}</dt>
                  <dd className="mt-1 font-bold">{formatFileSize(selection.file.size, lang)}</dd>
                </div>
                <div className="nova-tool-room__metric col-span-2 rounded-xl border p-3">
                  <dt>{copy.duration}</dt>
                  <dd className="mt-1 font-bold">
                    {durationSeconds === null ? copy.durationPending : formatDuration(durationSeconds)}
                  </dd>
                </div>
              </dl>

              <audio
                controls
                preload="metadata"
                src={selection.safeMediaSrc}
                aria-label={copy.preview}
                onLoadedMetadata={handleMetadata}
                onError={() => setError('metadata')}
                className="w-full"
              />

              <button
                type="button"
                onClick={clearSelection}
                className="nova-tool-room__action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {copy.clear}
              </button>
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
              <AudioLines className="nova-tool-room__empty-icon h-10 w-10" aria-hidden="true" />
              <p className="nova-tool-room__copy max-w-xs text-sm leading-relaxed">{copy.accepted}</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="nova-tool-room__warning flex items-start gap-3 rounded-2xl border p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {copy.errors[error]}
        </p>
      )}

      <div
        data-testid="audio-analysis-boundary"
        className="nova-tool-room__future space-y-4 rounded-3xl border p-5"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="nova-tool-room__eyebrow mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="nova-tool-room__title text-base font-black">{copy.boundaryTitle}</h3>
            <p className="nova-tool-room__copy mt-1 max-w-3xl text-sm leading-relaxed">{copy.boundaryBody}</p>
          </div>
        </div>
        <div>
          <p className="nova-tool-room__counter mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em]">
            {copy.plannedTitle}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {copy.planned.map((item) => (
              <li key={item} className="nova-tool-room__future-item flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs">
                <span className="nova-tool-room__copy">{item}</span>
                <span className="nova-tool-room__future-status font-mono text-[10px] uppercase tracking-wider">{copy.notRun}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
