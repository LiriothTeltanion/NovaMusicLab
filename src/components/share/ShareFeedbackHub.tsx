import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  MessageCircle,
  Music2,
  Send,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import '../toolRoom.css';

export type ShareFeedbackLanguage = 'en' | 'es' | 'he';
type FeedbackPerspective = 'listener' | 'musician' | 'creator';
type ActionStatus = 'idle' | 'copied-link' | 'copied-feedback' | 'shared' | 'cancelled' | 'error';

export interface ShareFeedbackHubProps {
  lang: ShareFeedbackLanguage;
  shareUrl: string;
  title?: string;
  inviterName?: string;
}

interface ShareCopy {
  eyebrow: string;
  title: string;
  intro: string;
  nativeShare: string;
  whatsapp: string;
  copyLink: string;
  feedbackTitle: string;
  feedbackIntro: string;
  perspectiveLabel: string;
  perspectives: Record<FeedbackPerspective, string>;
  feedbackLabel: string;
  feedbackPlaceholder: string;
  copyFeedback: string;
  sendFeedbackWhatsapp: string;
  privacyTitle: string;
  privacyBody: string;
  invalidUrl: string;
  statuses: Record<Exclude<ActionStatus, 'idle'>, string>;
  inviteText: (title: string, inviterName?: string) => string;
  feedbackTemplate: (
    title: string,
    perspective: string,
    feedback: string,
    shareUrl: string,
  ) => string;
}

const COPY: Record<ShareFeedbackLanguage, ShareCopy> = {
  en: {
    eyebrow: 'Local sharing',
    title: 'Invite someone into the museum',
    intro: 'Send the public exhibition, then let your friend return structured feedback without creating an account.',
    nativeShare: 'Share',
    whatsapp: 'Open WhatsApp',
    copyLink: 'Copy link',
    feedbackTitle: 'Feedback companion',
    feedbackIntro: 'Your friend can write here, then copy or send the message through WhatsApp. Nova does not receive it.',
    perspectiveLabel: 'Perspective',
    perspectives: { listener: 'Listener', musician: 'Musician', creator: 'Creator' },
    feedbackLabel: 'Notes',
    feedbackPlaceholder: 'What felt clear, beautiful, confusing, inaccurate or worth expanding?',
    copyFeedback: 'Copy feedback',
    sendFeedbackWhatsapp: 'Send feedback on WhatsApp',
    privacyTitle: 'Nothing is sent automatically',
    privacyBody: 'The note stays in this tab. Only the app you explicitly choose receives the text and link.',
    invalidUrl: 'A valid http or https museum link is required.',
    statuses: {
      'copied-link': 'Museum link copied.',
      'copied-feedback': 'Feedback copied.',
      shared: 'Share sheet opened.',
      cancelled: 'Sharing was cancelled.',
      error: 'The action could not be completed.',
    },
    inviteText: (title, inviterName) =>
      `${inviterName ? `${inviterName} invited you to explore` : 'Explore'} ${title}: a living personal music museum.`,
    feedbackTemplate: (title, perspective, feedback, shareUrl) =>
      [
        `${title} — feedback`,
        `Perspective: ${perspective}`,
        '',
        feedback.trim() || 'What I enjoyed:\n\nWhat confused me:\n\nArtist or media notes:\n\nOne idea to improve:',
        '',
        `Museum: ${shareUrl}`,
      ].join('\n'),
  },
  es: {
    eyebrow: 'Compartir localmente',
    title: 'Invita a alguien al museo',
    intro: 'Envía la exposición pública y permite que tu amigo devuelva feedback estructurado sin crear una cuenta.',
    nativeShare: 'Compartir',
    whatsapp: 'Abrir WhatsApp',
    copyLink: 'Copiar enlace',
    feedbackTitle: 'Compañero de feedback',
    feedbackIntro: 'Tu amigo puede escribir aquí y luego copiar o enviar el mensaje por WhatsApp. Nova no lo recibe.',
    perspectiveLabel: 'Perspectiva',
    perspectives: { listener: 'Oyente', musician: 'Músico', creator: 'Creador' },
    feedbackLabel: 'Notas',
    feedbackPlaceholder: '¿Qué fue claro, bonito, confuso, inexacto o merece expandirse?',
    copyFeedback: 'Copiar feedback',
    sendFeedbackWhatsapp: 'Enviar feedback por WhatsApp',
    privacyTitle: 'Nada se envía automáticamente',
    privacyBody: 'La nota permanece en esta pestaña. Solo la aplicación que elijas recibe el texto y el enlace.',
    invalidUrl: 'Se necesita un enlace válido del museo con http o https.',
    statuses: {
      'copied-link': 'Enlace del museo copiado.',
      'copied-feedback': 'Feedback copiado.',
      shared: 'Se abrió el menú para compartir.',
      cancelled: 'Se canceló la acción de compartir.',
      error: 'No fue posible completar la acción.',
    },
    inviteText: (title, inviterName) =>
      `${inviterName ? `${inviterName} te invita a explorar` : 'Explora'} ${title}: un museo musical personal y vivo.`,
    feedbackTemplate: (title, perspective, feedback, shareUrl) =>
      [
        `${title} — feedback`,
        `Perspectiva: ${perspective}`,
        '',
        feedback.trim() || 'Lo que disfruté:\n\nLo que me confundió:\n\nNotas sobre artistas o media:\n\nUna idea para mejorar:',
        '',
        `Museo: ${shareUrl}`,
      ].join('\n'),
  },
  he: {
    eyebrow: 'שיתוף מקומי',
    title: 'הזמנה למוזיאון',
    intro: 'אפשר לשתף את התערוכה הציבורית ולקבל משוב מסודר מחבר, בלי לחייב אותו ליצור חשבון.',
    nativeShare: 'שיתוף',
    whatsapp: 'פתיחה ב־WhatsApp',
    copyLink: 'העתקת קישור',
    feedbackTitle: 'כלי עזר למשוב',
    feedbackIntro: 'אפשר לכתוב כאן, ואז להעתיק או לשלוח את ההודעה ב־WhatsApp. המשוב לא נשלח ל־Nova.',
    perspectiveLabel: 'נקודת מבט',
    perspectives: { listener: 'מאזין או מאזינה', musician: 'מוזיקאי או מוזיקאית', creator: 'יוצר או יוצרת' },
    feedbackLabel: 'הערות',
    feedbackPlaceholder: 'מה היה ברור, יפה, מבלבל, לא מדויק או ראוי להרחבה?',
    copyFeedback: 'העתקת המשוב',
    sendFeedbackWhatsapp: 'שליחת משוב ב־WhatsApp',
    privacyTitle: 'דבר אינו נשלח אוטומטית',
    privacyBody: 'ההערה נשארת בלשונית הזאת. רק היישום שנבחר במפורש מקבל את הטקסט והקישור.',
    invalidUrl: 'נדרש קישור תקין למוזיאון בפרוטוקול http או https.',
    statuses: {
      'copied-link': 'הקישור למוזיאון הועתק.',
      'copied-feedback': 'המשוב הועתק.',
      shared: 'תפריט השיתוף נפתח.',
      cancelled: 'פעולת השיתוף בוטלה.',
      error: 'לא ניתן היה להשלים את הפעולה.',
    },
    inviteText: (title, inviterName) =>
      `${inviterName ? `${inviterName} מזמין או מזמינה אותך לגלות את` : 'אפשר לגלות את'} ${title}: מוזיאון מוזיקה אישי וחי.`,
    feedbackTemplate: (title, perspective, feedback, shareUrl) =>
      [
        `${title} — משוב`,
        `נקודת מבט: ${perspective}`,
        '',
        feedback.trim() || 'מה אהבתי:\n\nמה בלבל אותי:\n\nהערות על אמנים או מדיה:\n\nרעיון אחד לשיפור:',
        '',
        `מוזיאון: ${shareUrl}`,
      ].join('\n'),
  },
};

export function normalizeShareUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand?.('copy')) throw new Error('Clipboard copy was rejected.');
  } finally {
    textarea.remove();
  }
}

export default function ShareFeedbackHub({
  lang,
  shareUrl,
  title = 'Nova Music Lab',
  inviterName,
}: ShareFeedbackHubProps) {
  const copy = COPY[lang];
  const direction = lang === 'he' ? 'rtl' : 'ltr';
  const validShareUrl = useMemo(() => normalizeShareUrl(shareUrl), [shareUrl]);
  const [perspective, setPerspective] = useState<FeedbackPerspective>('listener');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<ActionStatus>('idle');

  const inviteText = copy.inviteText(title, inviterName);
  const feedbackText = validShareUrl
    ? copy.feedbackTemplate(
        title,
        copy.perspectives[perspective],
        feedback,
        validShareUrl,
      )
    : '';

  const handleNativeShare = async () => {
    if (!validShareUrl) return;
    setStatus('idle');
    try {
      if (navigator.share) {
        await navigator.share({ title, text: inviteText, url: validShareUrl });
        setStatus('shared');
      } else {
        await copyText(validShareUrl);
        setStatus('copied-link');
      }
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'error');
    }
  };

  const handleCopy = async (value: string, success: 'copied-link' | 'copied-feedback') => {
    if (!value) return;
    setStatus('idle');
    try {
      await copyText(value);
      setStatus(success);
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      dir={direction}
      aria-labelledby="share-feedback-title"
      className="nova-surface nova-surface--featured nova-tool-room nova-tool-room--share space-y-6 rounded-3xl p-5 sm:p-7"
    >
      <header className="space-y-2">
        <p className="nova-tool-room__eyebrow flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.24em]">
          <Music2 className="h-4 w-4" aria-hidden="true" />
          {copy.eyebrow}
        </p>
        <h2 id="share-feedback-title" className="nova-tool-room__title text-2xl font-black tracking-tight">
          {copy.title}
        </h2>
        <p className="nova-tool-room__copy max-w-3xl text-sm leading-relaxed">{copy.intro}</p>
      </header>

      {!validShareUrl ? (
        <p role="alert" className="nova-tool-room__alert rounded-2xl border p-4 text-sm">
          {copy.invalidUrl}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => { void handleNativeShare(); }}
            className="nova-tool-room__action nova-tool-room__action--accent inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {copy.nativeShare}
          </button>
          <a
            href={buildWhatsAppUrl(`${inviteText}\n\n${validShareUrl}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="nova-tool-room__action nova-tool-room__action--secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {copy.whatsapp}
          </a>
          <button
            type="button"
            onClick={() => { void handleCopy(validShareUrl, 'copied-link'); }}
            className="nova-tool-room__action inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copy.copyLink}
          </button>
        </div>
      )}

      <div className="nova-surface nova-surface--analysis nova-tool-room__panel space-y-4 rounded-3xl p-4 sm:p-5">
        <div>
          <h3 className="nova-tool-room__title text-lg font-black">{copy.feedbackTitle}</h3>
          <p className="nova-tool-room__copy mt-1 text-sm leading-relaxed">{copy.feedbackIntro}</p>
        </div>

        <label className="block space-y-1.5">
          <span className="nova-tool-room__label text-xs font-bold">{copy.perspectiveLabel}</span>
          <select
            value={perspective}
            onChange={(event) => setPerspective(event.target.value as FeedbackPerspective)}
            aria-label={copy.perspectiveLabel}
            className="nova-tool-room__control min-h-11 w-full rounded-xl border px-3 text-sm"
          >
            {(Object.keys(copy.perspectives) as FeedbackPerspective[]).map((key) => (
              <option key={key} value={key}>{copy.perspectives[key]}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="nova-tool-room__label text-xs font-bold">{copy.feedbackLabel}</span>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value.slice(0, 2_000))}
            aria-label={copy.feedbackLabel}
            maxLength={2_000}
            rows={5}
            placeholder={copy.feedbackPlaceholder}
            className="nova-tool-room__control w-full resize-y rounded-xl border p-3 text-sm leading-relaxed"
          />
          <span className="nova-tool-room__counter block text-end font-mono text-[10px]">{feedback.length}/2000</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!validShareUrl}
            onClick={() => { void handleCopy(feedbackText, 'copied-feedback'); }}
            className="nova-tool-room__action nova-tool-room__action--accent inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copy.copyFeedback}
          </button>
          {validShareUrl ? (
            <a
              href={buildWhatsAppUrl(feedbackText)}
              target="_blank"
              rel="noopener noreferrer"
              className="nova-tool-room__action nova-tool-room__action--secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center text-sm font-bold transition-colors"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {copy.sendFeedbackWhatsapp}
            </a>
          ) : (
            <span
              aria-disabled="true"
              className="nova-tool-room__action nova-tool-room__action--secondary inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center text-sm font-bold opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {copy.sendFeedbackWhatsapp}
            </span>
          )}
        </div>
      </div>

      <div className="nova-tool-room__privacy flex items-start gap-3 rounded-2xl border p-4">
        <ShieldCheck className="nova-tool-room__privacy-icon mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="nova-tool-room__title text-sm font-bold">{copy.privacyTitle}</p>
          <p className="nova-tool-room__copy mt-1 text-xs leading-relaxed">{copy.privacyBody}</p>
        </div>
      </div>

      <p className="nova-tool-room__status min-h-5 text-sm" role="status" aria-live="polite">
        {status !== 'idle' && (
          <span className="inline-flex items-center gap-2">
            {status !== 'error' && status !== 'cancelled' && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {copy.statuses[status]}
          </span>
        )}
      </p>
    </section>
  );
}
