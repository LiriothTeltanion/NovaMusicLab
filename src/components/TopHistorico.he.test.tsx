import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import TopHistorico from './TopHistorico';

const data = musicData as unknown as MusicDnaData;

describe('TopHistorico Hebrew localization', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nml_lang', 'he');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.lang = 'es';
    document.documentElement.dir = 'ltr';
    delete document.documentElement.dataset.language;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the artist dossier, archive summary and year chart fully Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <TopHistorico data={data} />
      </AppProvider>,
    );

    expect(await screen.findByText('תיק האמן')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('תחנת האזנה חוקית')).toBeInTheDocument();
    expect(screen.getAllByText(data.top_artists[0].name).some(node => node.getAttribute('dir') === 'auto')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'ז׳אנרים' }));
    expect(await screen.findByText(/כל הארכיון/)).toHaveTextContent('השמעות שנספרו');
    expect(screen.queryByText(/Whole archive/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'שנים' }));
    expect(await screen.findByRole('group', { name: 'המדד בתרשים השנתי' })).toBeInTheDocument();
    expect(screen.getByText(/מוצג בנפרד, כדי שנפח ההאזנה לא ישטח את מספר האמנים/)).toBeInTheDocument();
    expect(screen.queryByText(/One metric at a time/)).not.toBeInTheDocument();
  }, 20_000);
});
