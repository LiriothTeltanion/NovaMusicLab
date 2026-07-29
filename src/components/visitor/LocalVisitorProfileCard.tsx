import { useEffect, useState } from 'react';
import { HardDrive, ShieldCheck, UserRound } from 'lucide-react';

import { LOCAL_VISITOR_NAME_MAX_LENGTH, normalizeLocalVisitorName } from '../../utils/localVisitorProfile';
import { directionFor, pickLanguage, type Lang } from '../../utils/i18n';

interface LocalVisitorProfileCardProps {
  displayName: string;
  isPersonalArchive: boolean;
  storageAvailable?: boolean;
  lang: Lang;
  onDisplayNameChange: (displayName: string) => void;
}

export default function LocalVisitorProfileCard({
  displayName,
  isPersonalArchive,
  storageAvailable = true,
  lang,
  onDisplayNameChange,
}: LocalVisitorProfileCardProps) {
  const [draftName, setDraftName] = useState(displayName);

  useEffect(() => {
    setDraftName(displayName);
  }, [displayName]);

  const commitDisplayName = (value: string) => {
    const normalizedName = normalizeLocalVisitorName(value);
    setDraftName(normalizedName);
    onDisplayNameChange(normalizedName);
  };

  const copy = pickLanguage(lang, {
    en: {
      eyebrow: 'Guest entry · no account required',
      title: 'Give your museum a local name',
      body: 'Optional. This label stays in this browser and personalizes comparisons. It is not a login, a public username or a password.',
      label: 'Museum name',
      placeholder: 'For example: Danny',
      local: 'Saved only on this device',
      tabOnly: 'Browser storage is blocked · active in this tab only',
      ready: isPersonalArchive ? 'Your private museum is active' : 'Add your files when you are ready',
    },
    es: {
      eyebrow: 'Entrada de visitante · sin cuenta',
      title: 'Dale un nombre local a tu museo',
      body: 'Es opcional. Esta etiqueta permanece en este navegador y personaliza las comparaciones. No es un login, un usuario público ni una contraseña.',
      label: 'Nombre del museo',
      placeholder: 'Por ejemplo: Danny',
      local: 'Guardado solo en este dispositivo',
      tabOnly: 'El guardado está bloqueado · activo solo en esta pestaña',
      ready: isPersonalArchive ? 'Tu museo privado está activo' : 'Añade tus archivos cuando estés listo',
    },
    he: {
      eyebrow: 'כניסת אורח · ללא חשבון',
      title: 'תנו למוזיאון שם מקומי',
      body: 'לא חובה. התווית נשארת בדפדפן הזה ומתאימה אישית את ההשוואות. היא אינה התחברות, שם משתמש ציבורי או סיסמה.',
      label: 'שם המוזיאון',
      placeholder: 'לדוגמה: Danny',
      local: 'נשמר רק במכשיר הזה',
      tabOnly: 'האחסון בדפדפן חסום · פעיל רק בכרטיסייה הזאת',
      ready: isPersonalArchive ? 'המוזיאון הפרטי שלך פעיל' : 'אפשר להוסיף קבצים כשמוכנים',
    },
  });

  return (
    <section
      className="nova-surface nova-surface--utility rounded-3xl p-5 sm:p-6"
      dir={directionFor(lang)}
      aria-labelledby="local-visitor-profile-title"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-end">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-cyberCyan">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2 id="local-visitor-profile-title" className="type-section type-strong mt-2">
            {copy.title}
          </h2>
          <p className="type-body type-muted mt-2 max-w-3xl">{copy.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 font-mono text-[10px] font-bold text-cyan-200">
              <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
              {storageAvailable ? copy.local : copy.tabOnly}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 font-mono text-[10px] font-bold text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.ready}
            </span>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
            {copy.label}
          </span>
          <input
            type="text"
            value={draftName}
            maxLength={LOCAL_VISITOR_NAME_MAX_LENGTH}
            autoComplete="nickname"
            spellCheck="false"
            placeholder={copy.placeholder}
            onChange={event => {
              setDraftName(event.target.value);
              onDisplayNameChange(event.target.value);
            }}
            onBlur={event => commitDisplayName(event.currentTarget.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="min-h-12 w-full rounded-2xl border border-white/15 bg-black/25 px-4 text-base font-bold text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
          />
        </label>
      </div>
    </section>
  );
}
