import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getMuseumRoomProgress,
  MobileMuseumRoomDock,
  MuseumRoomProgressRail,
  type MuseumRoomItem,
} from './MuseumRoomNavigator';

function TestIcon() {
  return <svg data-testid="room-icon" />;
}

const rooms: MuseumRoomItem[] = [
  { id: 'dashboard', label: 'Dashboard', groupLabel: 'Vista general', color: '#00f2fe', secondary: '#a855f7', icon: TestIcon, isChapter: true },
  { id: 'eras', label: 'Eras Musicales', groupLabel: 'Vista general', color: '#60a5fa', secondary: '#f59e0b', icon: TestIcon, isChapter: true },
  { id: 'top', label: 'Top Histórico', groupLabel: 'Archivo', color: '#facc15', secondary: '#f97316', icon: TestIcon, isChapter: true },
  { id: 'upload', label: 'Subir Archivos', groupLabel: 'Salida', color: '#10b981', secondary: '#facc15', icon: TestIcon, isChapter: false },
];

describe('MuseumRoomNavigator', () => {
  afterEach(cleanup);

  it('builds stable chapter codes while excluding utility destinations', () => {
    expect(getMuseumRoomProgress(rooms, 'eras')).toEqual({
      chapterIndex: 1,
      chapterTotal: 3,
      code: 'CH-02',
      ratio: 2 / 3,
    });
    expect(getMuseumRoomProgress(rooms, 'upload')).toEqual({
      chapterIndex: -1,
      chapterTotal: 3,
      code: 'UTIL',
      ratio: 1,
    });
  });

  it('shows desktop orientation with the active room and overall progress', () => {
    render(<MuseumRoomProgressRail items={rooms} activeId="eras" lang="es" onNavigate={vi.fn()} />);

    const progress = screen.getByTestId('room-progress');
    expect(progress).toHaveAttribute('aria-label', 'Sala activa: Eras Musicales');
    expect(screen.getByText('CH-02')).toBeInTheDocument();
    expect(progress).toHaveTextContent('Capítulo 2 / 3');
  });

  it('navigates sequentially and opens a grouped room map on desktop', async () => {
    const onNavigate = vi.fn();
    render(<MuseumRoomProgressRail items={rooms} activeId="eras" lang="es" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sala siguiente: Top Histórico' }));
    expect(onNavigate).toHaveBeenCalledWith('top');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir mapa de salas: Eras Musicales' }));
    expect(screen.getByRole('dialog', { name: 'Mapa de salas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Archivo' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Eras Musicales' })).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(onNavigate).toHaveBeenLastCalledWith('dashboard');
  });

  it('disables the previous step at the first room on desktop', () => {
    render(<MuseumRoomProgressRail items={rooms} activeId="dashboard" lang="es" onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sala anterior' })).toBeDisabled();
  });

  it('navigates sequentially and opens a grouped room map on mobile', async () => {
    const onNavigate = vi.fn();
    render(<MobileMuseumRoomDock items={rooms} activeId="eras" lang="es" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sala siguiente: Top Histórico' }));
    expect(onNavigate).toHaveBeenCalledWith('top');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir mapa de salas: Eras Musicales' }));
    expect(screen.getByRole('dialog', { name: 'Mapa de salas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Archivo' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Eras Musicales' })).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(onNavigate).toHaveBeenLastCalledWith('dashboard');
  });

  it('closes the desktop map on Escape and restores focus to its trigger', async () => {
    render(<MuseumRoomProgressRail items={rooms} activeId="eras" lang="es" onNavigate={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Abrir mapa de salas: Eras Musicales' });

    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Eras Musicales' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mapa de salas' })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes the mobile map on Escape and restores focus to its trigger', async () => {
    render(<MobileMuseumRoomDock items={rooms} activeId="eras" lang="es" onNavigate={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Abrir mapa de salas: Eras Musicales' });

    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Eras Musicales' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mapa de salas' })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('renders idiomatic Hebrew navigation with RTL direction', () => {
    render(<MuseumRoomProgressRail items={rooms} activeId="eras" lang="he" onNavigate={vi.fn()} />);

    const progress = screen.getByTestId('room-progress');
    expect(progress).toHaveAttribute('dir', 'rtl');
    expect(progress).toHaveAttribute('aria-label', 'החדר הפעיל: Eras Musicales');
    expect(progress).toHaveTextContent('פרק 2 / 3');
    expect(screen.getByRole('button', { name: 'החדר הבא: Top Histórico' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'פתיחת מפת החדרים: Eras Musicales' })).toBeInTheDocument();
  });

});
