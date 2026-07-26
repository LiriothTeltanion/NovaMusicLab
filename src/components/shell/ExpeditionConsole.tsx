import { useCallback, useEffect, useRef, useState } from 'react';

import type { MusicDnaData } from '../../types';
import { pickLanguage, type Lang } from '../../utils/i18n';
import ArchiveCapsule from './ArchiveCapsule';
import CommandPalette, { CommandPaletteButton, type CommandRoomItem } from './CommandPalette';
import JourneySwitcher from './JourneySwitcher';
import type { ExpeditionJourneyId } from './expeditionJourney';
import './ExpeditionConsole.css';

interface ExpeditionConsoleProps {
  activeJourney: ExpeditionJourneyId;
  activeRoomId: string;
  data: MusicDnaData;
  isPersonalArchive: boolean;
  isPersisted: boolean;
  lang: Lang;
  rooms: CommandRoomItem[];
  savedAt: string | null;
  sourceLabel: string | null;
  onNavigate: (roomId: string) => void;
  onOpenArchive: () => void;
  onSelectJourney: (journey: ExpeditionJourneyId) => void;
}

export default function ExpeditionConsole({
  activeJourney,
  activeRoomId,
  data,
  isPersonalArchive,
  isPersisted,
  lang,
  rooms,
  savedAt,
  sourceLabel,
  onNavigate,
  onOpenArchive,
  onSelectJourney,
}: ExpeditionConsoleProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const commandButtonRef = useRef<HTMLButtonElement>(null);
  const closeCommand = useCallback(() => setCommandOpen(false), []);
  const consoleLabel = pickLanguage(lang, {
    en: 'Nova Expedition Console',
    es: 'Consola de Expedición Nova',
    he: 'קונסולת המשלחת של Nova',
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLocaleLowerCase() !== 'k' || (!event.ctrlKey && !event.metaKey) || event.altKey) return;
      event.preventDefault();
      setCommandOpen(open => {
        if (open) window.requestAnimationFrame(() => commandButtonRef.current?.focus({ preventScroll: true }));
        return !open;
      });
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <section className="expedition-console" aria-label={consoleLabel} data-testid="expedition-console">
        <JourneySwitcher activeJourney={activeJourney} lang={lang} onChange={onSelectJourney} />
        <ArchiveCapsule
          data={data}
          isPersonalArchive={isPersonalArchive}
          isPersisted={isPersisted}
          lang={lang}
          savedAt={savedAt}
          sourceLabel={sourceLabel}
          onOpenArchive={onOpenArchive}
        />
        <CommandPaletteButton buttonRef={commandButtonRef} lang={lang} onOpen={() => setCommandOpen(true)} />
      </section>
      <CommandPalette
        activeRoomId={activeRoomId}
        isOpen={commandOpen}
        items={rooms}
        lang={lang}
        onClose={closeCommand}
        onNavigate={onNavigate}
        onSelectJourney={onSelectJourney}
        returnFocusRef={commandButtonRef}
      />
    </>
  );
}
