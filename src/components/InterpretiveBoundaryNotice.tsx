import { useId } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

import { directionFor, pickLanguage, type Lang } from '../utils/i18n';

interface InterpretiveBoundaryNoticeProps {
  lang: Lang;
}

export default function InterpretiveBoundaryNotice({ lang }: InterpretiveBoundaryNoticeProps) {
  const titleId = `interpretive-boundary-${useId().replace(/:/g, '')}`;
  const copy = pickLanguage(lang, {
    en: {
      eyebrow: 'Interpretive boundary',
      title: 'Creative archive reading · not a psychological assessment',
      body: 'Nova applies deterministic local rules to listening counts, genres and timing. The result describes patterns in the archive; it does not measure personality, felt emotion, mental health or reasons for listening.',
    },
    es: {
      eyebrow: 'Límite interpretativo',
      title: 'Lectura creativa del archivo · no es una evaluación psicológica',
      body: 'Nova aplica reglas locales deterministas a conteos, géneros y horarios. El resultado describe patrones del archivo; no mide personalidad, emociones sentidas, salud mental ni motivos de escucha.',
    },
    he: {
      eyebrow: 'גבול פרשני',
      title: 'קריאה יצירתית בארכיון · לא הערכה פסיכולוגית',
      body: 'Nova מפעילה כללים מקומיים דטרמיניסטיים על ספירות, ז׳אנרים וזמני האזנה. התוצאה מתארת דפוסים בארכיון; היא אינה מודדת אישיות, רגשות שנחוו, בריאות נפשית או סיבות להאזנה.',
    },
  });

  return (
    <aside
      role="note"
      aria-labelledby={titleId}
      data-testid="interpretive-boundary"
      className="nova-surface nova-surface--utility rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4 sm:p-5"
      dir={directionFor(lang)}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/[0.07] text-amber-200"
          aria-hidden="true"
        >
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="type-label flex items-center gap-1.5 text-amber-200/80">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <p id={titleId} className="type-section type-strong mt-1 text-amber-50">
            {copy.title}
          </p>
          <p className="type-caption type-muted mt-2 max-w-4xl leading-relaxed">
            {copy.body}
          </p>
        </div>
      </div>
    </aside>
  );
}
