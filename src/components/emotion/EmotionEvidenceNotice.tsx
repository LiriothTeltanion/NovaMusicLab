import { Database, Ear, ScanSearch, Sparkles } from 'lucide-react';

import { pickLanguage, type Lang } from '../../utils/i18n';

interface EmotionEvidenceNoticeProps {
  artistCount: number;
  lang: Lang;
}

export default function EmotionEvidenceNotice({ artistCount, lang }: EmotionEvidenceNoticeProps) {
  const copy = pickLanguage(lang, {
    en: {
      eyebrow: 'Evidence model',
      title: 'A map of archive labels, not a reading of your mind',
      intro: `${artistCount} displayed artists are positioned from archive counts and deterministic genre/name rules. Nova has not analyzed their audio or measured what you felt.`,
      observed: 'Observed',
      observedBody: 'Artist names, play counts and genre labels present in the active archive.',
      inferred: 'Inferred',
      inferredBody: 'Energy, brightness and mood coordinates estimated with deterministic local rules.',
      interpreted: 'Interpretive',
      interpretedBody: 'Dossiers and listening prompts are creative possibilities, not personal facts.',
      unknown: 'Not measured',
      unknownBody: 'Felt emotion, intention, mental health and the role a song had in a real moment.',
      boundary: 'Expressed emotion in music ≠ emotion felt by the listener ≠ reason for listening.',
    },
    es: {
      eyebrow: 'Modelo de evidencia',
      title: 'Un mapa de etiquetas del archivo, no una lectura de tu mente',
      intro: `${artistCount} artistas mostrados se ubican usando conteos del archivo y reglas deterministas de género/nombre. Nova no analizó su audio ni midió lo que sentiste.`,
      observed: 'Observado',
      observedBody: 'Nombres, reproducciones y etiquetas de género presentes en el archivo activo.',
      inferred: 'Inferido',
      inferredBody: 'Energía, brillo y coordenadas de mood estimadas mediante reglas locales deterministas.',
      interpreted: 'Interpretativo',
      interpretedBody: 'Los dossiers y propuestas de escucha son posibilidades creativas, no hechos personales.',
      unknown: 'No medido',
      unknownBody: 'Emoción sentida, intención, salud mental y la función real de una canción en un momento.',
      boundary: 'Emoción expresada por la música ≠ emoción sentida ≠ razón para escucharla.',
    },
    he: {
      eyebrow: 'מודל ראיות',
      title: 'מפה של תגיות הארכיון, לא קריאת מחשבות',
      intro: `${artistCount} האמנים המוצגים ממוקמים לפי ספירות בארכיון וכללים דטרמיניסטיים של ז׳אנר ושם. Nova לא ניתחה את האודיו ולא מדדה מה הרגשתם.`,
      observed: 'נצפה',
      observedBody: 'שמות אמנים, מספרי השמעות ותגיות ז׳אנר שנמצאים בארכיון הפעיל.',
      inferred: 'הוסק',
      inferredBody: 'אנרגיה, בהירות וקואורדינטות מצב רוח שמוערכות באמצעות כללים מקומיים דטרמיניסטיים.',
      interpreted: 'פרשני',
      interpretedBody: 'התיקים והצעות ההאזנה הם אפשרויות יצירתיות, לא עובדות אישיות.',
      unknown: 'לא נמדד',
      unknownBody: 'הרגש שנחווה, הכוונה, בריאות הנפש והתפקיד האמיתי של שיר ברגע מסוים.',
      boundary: 'רגש שמובע במוזיקה ≠ רגש שחווה המאזין ≠ הסיבה להאזנה.',
    },
  });

  const layers = [
    { title: copy.observed, body: copy.observedBody, icon: Database, color: '#22d3ee' },
    { title: copy.inferred, body: copy.inferredBody, icon: ScanSearch, color: '#a78bfa' },
    { title: copy.interpreted, body: copy.interpretedBody, icon: Sparkles, color: '#f472b6' },
    { title: copy.unknown, body: copy.unknownBody, icon: Ear, color: '#fbbf24' },
  ];

  return (
    <section
      data-testid="emotion-evidence-model"
      className="nova-surface nova-surface--utility rounded-3xl p-4 sm:p-5"
      aria-labelledby="emotion-evidence-title"
    >
      <p className="type-label" style={{ color: 'var(--c1)' }}>{copy.eyebrow}</p>
      <h2 id="emotion-evidence-title" className="type-section type-strong mt-1">{copy.title}</h2>
      <p className="type-caption type-muted mt-2 max-w-4xl">{copy.intro}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {layers.map(({ title, body, icon: Icon, color }) => (
          <article key={title} className="rounded-2xl border p-3.5" style={{ borderColor: `${color}25`, backgroundColor: `${color}08` }}>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color }} aria-hidden="true" />
              <h3 className="type-label" style={{ color }}>{title}</h3>
            </div>
            <p className="type-caption type-muted mt-2">{body}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-100">
        {copy.boundary}
      </p>
    </section>
  );
}
