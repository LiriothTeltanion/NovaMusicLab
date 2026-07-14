import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmotionalTimeline from './EmotionalTimeline';
import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';

const data = defaultMusicData as unknown as MusicDnaData;

function renderTimeline() {
  return render(
    <AppProvider>
      <EmotionalTimeline data={data} />
    </AppProvider>,
  );
}

describe('EmotionalTimeline compact exploration', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders one compact button per year and one selected detail', async () => {
    const user = userEvent.setup();
    renderTimeline();

    const track = screen.getByTestId('emotional-timeline-track');
    const yearButtons = within(track).getAllByRole('button');
    const firstButton = yearButtons[0];
    const firstYear = Number(firstButton.getAttribute('data-year'));

    expect(track).toHaveAttribute('dir', 'ltr');
    expect(yearButtons).toHaveLength(data.yearly_eras.length);
    expect(yearButtons.filter(button => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(yearButtons.every(button => button.classList.contains('min-h-11'))).toBe(true);

    await user.click(firstButton);

    expect(firstButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('emotional-timeline-detail')).toHaveAttribute('data-selected-year', String(firstYear));
  });

  it('keeps chronological geometry LTR inside the Hebrew RTL section', async () => {
    window.localStorage.setItem('nml_lang', 'he');
    renderTimeline();

    expect(await screen.findByTestId('emotional-timeline')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('emotional-timeline-track')).toHaveAttribute('dir', 'ltr');
    expect(await screen.findByRole('heading', { name: 'ציר זמן רגשי' })).toBeInTheDocument();
  });
});
