import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DailyHeatmap from './DailyHeatmap';
import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import { deriveDatasetTemporalTrust } from '../utils/dataTrust';

const data = defaultMusicData as unknown as MusicDnaData;

function renderHeatmap() {
  return render(
    <AppProvider>
      <DailyHeatmap data={data} />
    </AppProvider>,
  );
}

describe('DailyHeatmap accessible exploration', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('uses one grid tab stop and moves the active day with arrow keys', () => {
    renderHeatmap();

    const grid = screen.getByRole('grid', { name: /Daily listening activity/i });
    const cells = within(grid).getAllByRole('gridcell');
    expect(grid).toHaveAttribute('tabindex', '0');
    expect(cells.length).toBeGreaterThanOrEqual(365);
    expect(cells.filter(cell => cell.tabIndex === 0)).toHaveLength(0);

    grid.focus();
    const initialCellId = grid.getAttribute('aria-activedescendant');
    fireEvent.keyDown(grid, { key: 'ArrowDown' });

    expect(grid).toHaveFocus();
    expect(grid.getAttribute('aria-activedescendant')).not.toBe(initialCellId);
    expect(screen.getByRole('status')).toHaveTextContent(/plays?/i);
  });

  it('supports touch-style cell selection and large previous/next controls', async () => {
    const user = userEvent.setup();
    renderHeatmap();

    const grid = screen.getByRole('grid', { name: /Daily listening activity/i });
    const dayCells = within(grid).getAllByRole('gridcell').filter(
      cell => cell.tagName === 'BUTTON',
    );
    const targetCell = dayCells[10];

    await user.click(targetCell);
    expect(grid).toHaveFocus();
    expect(grid).toHaveAttribute('aria-activedescendant', targetCell.id);

    const previousDay = screen.getByRole('button', { name: 'Previous day' });
    const nextDay = screen.getByRole('button', { name: 'Next day' });
    const datePicker = screen.getByLabelText('Choose a date');
    const newestYear = Math.max(...data.yearly_eras.map(era => era.year));
    const temporalTrust = deriveDatasetTemporalTrust(data);
    expect(previousDay).toHaveClass('min-h-11', 'min-w-11');
    expect(nextDay).toHaveClass('min-h-11', 'min-w-11');
    expect(datePicker).toHaveClass('min-h-11');
    expect(datePicker).toHaveAttribute('min', `${newestYear}-01-01`);
    expect(datePicker).toHaveAttribute(
      'max',
      temporalTrust.dataMaxDate ?? `${newestYear}-12-31`,
    );
    expect(datePicker).toHaveValue(targetCell.id.slice(-10));
    expect((datePicker as HTMLInputElement).value.startsWith(`${newestYear}-`)).toBe(true);

    const laterCell = dayCells[20];
    fireEvent.change(datePicker, { target: { value: laterCell.id.slice(-10) } });
    expect(grid).toHaveAttribute('aria-activedescendant', laterCell.id);
  });

  it('marks dates after the observed maximum as unknown instead of zero plays', () => {
    const boundedData: MusicDnaData = {
      ...data,
      daily_plays: {
        '2026-01-01': 1,
        '2026-07-03': 2,
      },
      yearly_eras: data.yearly_eras.map(era => (
        era.year === 2026 ? { ...era, plays: 3 } : era
      )),
    };
    render(
      <AppProvider>
        <DailyHeatmap data={boundedData} />
      </AppProvider>,
    );

    const grid = screen.getByRole('grid', { name: /Daily listening activity/i });
    const unobservedCells = within(grid).getAllByRole('gridcell')
      .filter(cell => cell.getAttribute('data-observed') === 'false');
    const firstUnobserved = unobservedCells[0];

    expect(firstUnobserved).toHaveAttribute('aria-disabled', 'true');
    expect(firstUnobserved).toHaveAccessibleName(/not observed/i);
    expect(firstUnobserved).not.toHaveAccessibleName(/0 plays/i);
    expect(screen.getByText('Not observed')).toBeInTheDocument();
    expect(screen.getByText(/observed through Jul 3, 2026.*Asia\/Jerusalem/i))
      .toBeInTheDocument();
  });

  it('positions hover details inside the heatmap boundary and closes them on blur', async () => {
    renderHeatmap();

    const grid = screen.getByRole('grid', { name: /Daily listening activity/i });
    const boundary = grid.closest('.relative') as HTMLDivElement;
    const targetCell = within(grid).getAllByRole('gridcell').find(
      cell => cell.tagName === 'BUTTON',
    ) as HTMLButtonElement;

    vi.spyOn(boundary, 'getBoundingClientRect').mockReturnValue({
      x: 100, y: 200, left: 100, top: 200, right: 900, bottom: 500, width: 800, height: 300,
      toJSON: () => ({}),
    });
    vi.spyOn(targetCell, 'getBoundingClientRect').mockReturnValue({
      x: 140, y: 250, left: 140, top: 250, right: 152, bottom: 262, width: 12, height: 12,
      toJSON: () => ({}),
    });

    grid.focus();
    fireEvent.mouseEnter(targetCell);
    const tooltip = document.querySelector('.pointer-events-none.z-50') as HTMLDivElement;
    expect(tooltip).toHaveStyle({ left: '46px', top: '42px' });

    fireEvent.blur(grid);
    await waitFor(() => {
      expect(document.querySelector('.pointer-events-none.z-50')).not.toBeInTheDocument();
    });
  });

  it('exposes the exploration controls in Spanish', () => {
    window.localStorage.setItem('nml_lang', 'es');
    renderHeatmap();

    expect(screen.getByRole('grid', { name: /Actividad diaria de escucha/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Día anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeInTheDocument();
  });

  it('localizes the exploration model in Hebrew while keeping calendar geometry LTR', async () => {
    window.localStorage.setItem('nml_lang', 'he');
    renderHeatmap();

    const grid = await screen.findByRole('grid', { name: /פעילות האזנה יומית בשנת/i });
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('מפת חום יומית אינטראקטיבית')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'היום הקודם' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'היום הבא' })).toBeInTheDocument();
    expect(screen.getByLabelText('בחר תאריך')).toHaveAttribute('dir', 'ltr');
    expect(grid).toHaveClass('nova-data-ltr');
    expect(grid).toHaveAttribute('dir', 'ltr');
    const observedCell = within(grid).getAllByRole('gridcell')
      .find(cell => cell.tagName === 'BUTTON');
    expect(observedCell).toHaveAccessibleName(/השמע(?:ה|ות)$/);
    expect(observedCell).not.toHaveAccessibleName(/plays?$/i);
    expect(screen.getByText('פחות')).toBeInTheDocument();
    expect(screen.getByText('יותר')).toBeInTheDocument();
  });
});
