import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import InteractiveGlobe from './InteractiveGlobe';

vi.mock('../hooks/useContinuousMotion', () => ({
  useContinuousMotion: () => false,
}));

const countries = [{ country: 'Israel', plays: 2_400 }];
const artists = [
  { name: 'Artist A', plays: 120, country: 'Israel' },
  { name: 'Artist B', plays: 340, country: 'Israel' },
  { name: 'Artist C', plays: 210, country: 'Israel' },
];

function renderGlobe({
  selectedCountry = null,
  lang = 'en',
  onSelectCountry = vi.fn(),
}: {
  selectedCountry?: string | null;
  lang?: 'es' | 'en' | 'he';
  onSelectCountry?: (country: string | null) => void;
} = {}) {
  render(
    <AppProvider>
      <InteractiveGlobe
        countries={countries}
        selectedCountry={selectedCountry}
        onSelectCountry={onSelectCountry}
        lang={lang}
        topArtists={artists}
      />
    </AppProvider>,
  );
  return onSelectCountry;
}

describe('InteractiveGlobe', () => {
  afterEach(() => cleanup());

  it('keeps a fluid square SVG with accessible 44px country targets', async () => {
    const onSelectCountry = renderGlobe();
    const globe = screen.getByTestId('interactive-globe');
    const canvas = screen.getByTestId('interactive-globe-canvas');
    const svg = screen.getByTestId('interactive-globe-svg');
    const israel = screen.getByRole('button', { name: /Israel: 2,400 plays/i });
    const hitTarget = israel.querySelector('[data-hit-target="true"]');

    expect(globe).toHaveAttribute('data-motion', 'paused');
    expect(canvas).toHaveClass('aspect-square', 'w-full', 'max-w-[300px]', 'touch-none');
    expect(svg).toHaveAttribute('viewBox', '0 0 300 300');
    expect(svg).not.toHaveAttribute('width');
    expect(svg).not.toHaveAttribute('height');
    expect(svg).toHaveClass('h-full', 'w-full', 'overflow-hidden');
    expect(hitTarget).toHaveAttribute('r', '22');
    expect(svg.querySelector('animate')).not.toBeInTheDocument();

    fireEvent.focus(israel);
    expect(screen.getByText('Israel')).toBeInTheDocument();

    fireEvent.keyDown(israel, { key: 'Enter' });
    fireEvent.keyDown(israel, { key: ' ' });
    expect(onSelectCountry).toHaveBeenNthCalledWith(1, 'Israel');
    expect(onSelectCountry).toHaveBeenNthCalledWith(2, 'Israel');

    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX: 120,
      clientY: 120,
    });
    expect(canvas).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'touch', clientX: 150, clientY: 100 });
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'touch', clientX: 150, clientY: 100 });
    expect(canvas).toHaveAttribute('data-dragging', 'false');
  });

  it('renders a stable wider dossier with a 44px close action and sorted artists', async () => {
    const user = userEvent.setup();
    const onSelectCountry = renderGlobe({ selectedCountry: 'Israel', lang: 'he' });
    const globe = screen.getByTestId('interactive-globe');
    const dossier = screen.getByTestId('country-dossier');
    const close = within(dossier).getByRole('button', { name: 'סגירת פרטי המדינה' });

    expect(globe).toHaveAttribute('dir', 'rtl');
    expect(dossier).toHaveClass('w-full', 'max-w-[360px]', 'min-w-0');
    expect(close).toHaveClass('h-11', 'w-11');
    expect(within(dossier).getByText('1. Artist B')).toBeInTheDocument();
    expect(within(dossier).getByText('2. Artist C')).toBeInTheDocument();
    expect(within(dossier).getByText('3. Artist A')).toBeInTheDocument();

    await user.click(close);
    expect(onSelectCountry).toHaveBeenCalledWith(null);
  });
});
