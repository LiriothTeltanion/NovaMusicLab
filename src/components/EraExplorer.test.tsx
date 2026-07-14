import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import EraExplorer from './EraExplorer';

const data = musicData as unknown as MusicDnaData;

function renderExplorer(source: MusicDnaData = data) {
  return render(
    <AppProvider>
      <EraExplorer data={source} />
    </AppProvider>,
  );
}

describe('EraExplorer visual identity', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nml_lang', 'es');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.lang = 'es';
    document.documentElement.dir = 'ltr';
    delete document.documentElement.dataset.language;
  });

  it('renders the newest real chapter as a data-derived poster', () => {
    renderExplorer();

    const poster = screen.getByTestId('era-poster');
    const latestEra = data.yearly_eras.at(-1)!;
    expect(poster).toHaveAttribute('data-era', String(latestEra.year));
    expect(poster).toHaveAttribute('aria-labelledby', `era-tab-${latestEra.year}`);
    expect(screen.getByRole('tab', { name: `Seleccionar era ${latestEra.year}` })).toHaveAttribute('aria-controls', `era-poster-${latestEra.year}`);
    expect(within(poster).getAllByText(latestEra.top_artist).length).toBeGreaterThan(0);
    expect(within(poster).getAllByText(latestEra.top_track).length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar', { name: 'Pulso del archivo' })).toHaveAttribute('aria-valuenow');
    expect(screen.getByText(/No representa BPM ni audio acústico/i)).toBeInTheDocument();
  });

  it('switches poster, artist and anthem from the timeline controls', async () => {
    const user = userEvent.setup();
    renderExplorer();
    const firstEra = data.yearly_eras[0];

    await user.click(screen.getByRole('tab', { name: `Seleccionar era ${firstEra.year}` }));

    await waitFor(() => {
      expect(screen.getAllByTestId('era-poster').some(poster => poster.dataset.era === String(firstEra.year))).toBe(true);
    });
    const poster = screen.getAllByTestId('era-poster').find(candidate => candidate.dataset.era === String(firstEra.year))!;
    expect(within(poster).getAllByText(firstEra.top_artist).length).toBeGreaterThan(0);
    expect(within(poster).getAllByText(firstEra.top_track).length).toBeGreaterThan(0);
  });

  it('exposes touch-sized adjacent-year controls with visible context', async () => {
    const user = userEvent.setup();
    renderExplorer();
    const latestIdx = data.yearly_eras.length - 1;
    const previousEra = data.yearly_eras[latestIdx - 1];

    const previousButton = screen.getByTestId('era-previous');
    expect(previousButton).toHaveTextContent(String(previousEra.year));
    expect(previousButton).toHaveClass('min-h-11', 'touch-manipulation');
    expect(screen.getByTestId('era-next')).toBeDisabled();

    await user.click(previousButton);

    await waitFor(() => {
      expect(screen.getAllByTestId('era-poster').some(poster => poster.dataset.era === String(previousEra.year))).toBe(true);
    });
    expect(screen.getByTestId('era-next')).not.toBeDisabled();
  });

  it('supports horizontal swipe navigation without hijacking vertical gestures', async () => {
    renderExplorer();
    const latestEra = data.yearly_eras.at(-1)!;
    const previousEra = data.yearly_eras.at(-2)!;
    const latestPoster = screen.getByTestId('era-poster');

    fireEvent.touchStart(latestPoster, { touches: [{ clientX: 90, clientY: 120 }] });
    fireEvent.touchEnd(latestPoster, { changedTouches: [{ clientX: 260, clientY: 128 }] });

    await waitFor(() => {
      expect(screen.getAllByTestId('era-poster').some(poster => poster.dataset.era === String(previousEra.year))).toBe(true);
    });

    const previousPoster = screen.getAllByTestId('era-poster').find(poster => poster.dataset.era === String(previousEra.year))!;
    fireEvent.touchStart(previousPoster, { touches: [{ clientX: 150, clientY: 80 }] });
    fireEvent.touchEnd(previousPoster, { changedTouches: [{ clientX: 155, clientY: 210 }] });

    await waitFor(() => {
      const livePoster = screen.getAllByTestId('era-poster').at(-1)!;
      expect(livePoster).toHaveAttribute('data-era', String(previousEra.year));
      expect(livePoster).not.toHaveAttribute('data-era', String(latestEra.year));
    });
  });

  it('uses roving tabs and keyboard arrows across the annual timeline', async () => {
    renderExplorer();
    const latestEra = data.yearly_eras.at(-1)!;
    const previousEra = data.yearly_eras.at(-2)!;
    const activeTab = screen.getByRole('tab', { name: `Seleccionar era ${latestEra.year}` });

    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    expect(activeTab).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(activeTab, { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: `Seleccionar era ${previousEra.year}` })).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByRole('tab', { name: `Seleccionar era ${previousEra.year}` })).toHaveFocus();
    expect(activeTab).toHaveAttribute('tabindex', '-1');
  });

  it('renders idiomatic Hebrew in RTL and reverses timeline arrow-key semantics', async () => {
    localStorage.setItem('nml_lang', 'he');
    renderExplorer();
    const latestEra = data.yearly_eras.at(-1)!;
    const previousEra = data.yearly_eras.at(-2)!;

    const archivePulse = await screen.findByRole('progressbar', { name: 'דופק הארכיון' });

    expect(document.documentElement).toHaveAttribute('lang', 'he');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(archivePulse).toHaveAttribute('aria-valuenow');
    expect(screen.getByText(/אינו מייצג BPM או מאפיינים אקוסטיים/)).toBeInTheDocument();
    expect(screen.getByTestId('era-previous')).toHaveAccessibleName('התקופה הקודמת');

    const activeTab = screen.getByRole('tab', { name: `בחירת התקופה של ${latestEra.year}` });
    fireEvent.keyDown(activeTab, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: `בחירת התקופה של ${previousEra.year}` })).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByRole('tab', { name: `בחירת התקופה של ${previousEra.year}` })).toHaveFocus();
    const poster = await waitFor(() => {
      const candidate = screen.getAllByTestId('era-poster').find(node => node.dataset.era === String(previousEra.year));
      expect(candidate).toBeDefined();
      return candidate!;
    });
    expect(within(poster).getAllByText(previousEra.top_artist).some(node => node.getAttribute('dir') === 'auto')).toBe(true);
    expect(within(poster).getAllByText(previousEra.top_track).some(node => node.getAttribute('dir') === 'auto')).toBe(true);
  });

  it('centers the active year horizontally without moving the document', async () => {
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    const horizontalScroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      value: horizontalScroll,
    });

    try {
      renderExplorer();

      await waitFor(() => {
        expect(horizontalScroll).toHaveBeenCalledWith(expect.objectContaining({
          behavior: 'smooth',
          left: expect.any(Number),
        }));
      });
      expect(window.scrollY).toBe(0);
    } finally {
      if (originalScrollTo) {
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
          configurable: true,
          writable: true,
          value: originalScrollTo,
        });
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
      }
    }
  });

  it('keeps an accessible empty state for archives without yearly eras', () => {
    renderExplorer({ ...data, yearly_eras: [] });

    expect(screen.getByText(/Todavía no hay años suficientes/i)).toBeInTheDocument();
    expect(screen.queryByTestId('era-poster')).not.toBeInTheDocument();
  });
});
