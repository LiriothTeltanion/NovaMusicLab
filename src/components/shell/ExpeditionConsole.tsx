import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MuseumRoomProgressRail,
  type MuseumRoomItem,
} from '../MuseumRoomNavigator';
import type { MusicDnaData } from '../../types';
import { pickLanguage, type Lang } from '../../utils/i18n';
import ArchiveCapsule from './ArchiveCapsule';
import CommandPalette, { CommandPaletteButton, type CommandRoomItem } from './CommandPalette';
import ExperienceSwitcher from './ExperienceSwitcher';
import './ExpeditionConsole.css';

interface ExpeditionConsoleProps {
  activeRoomId: string;
  data: MusicDnaData;
  isPersonalArchive: boolean;
  isPersisted: boolean;
  lang: Lang;
  roomItems: MuseumRoomItem[];
  rooms: CommandRoomItem[];
  savedAt: string | null;
  sourceLabel: string | null;
  onNavigate: (roomId: string) => void;
  onOpenArchive: () => void;
}

export default function ExpeditionConsole({
  activeRoomId,
  data,
  isPersonalArchive,
  isPersisted,
  lang,
  roomItems,
  rooms,
  savedAt,
  sourceLabel,
  onNavigate,
  onOpenArchive,
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
        <ExperienceSwitcher lang={lang} />
        <MuseumRoomProgressRail
          activeId={activeRoomId}
          items={roomItems}
          lang={lang}
          onNavigate={onNavigate}
        />
        <ArchiveCapsule
          data={data}
          isPersonalArchive={isPersonalArchive}
          isPersisted={isPersisted}
          lang={lang}
          savedAt={savedAt}
          sourceLabel={sourceLabel}
          onOpenArchive={onOpenArchive}
        />
        <CommandPaletteButton
          buttonRef={commandButtonRef}
          isOpen={commandOpen}
          lang={lang}
          onOpen={() => setCommandOpen(true)}
        />
      </section>
      <CommandPalette
        activeRoomId={activeRoomId}
        isOpen={commandOpen}
        items={rooms}
        lang={lang}
        onClose={closeCommand}
        onNavigate={onNavigate}
        returnFocusRef={commandButtonRef}
      />
    </>
  );
}
