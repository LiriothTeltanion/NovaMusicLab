import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import MoodArtCanvas from './MoodArtCanvas';

describe('MoodArtCanvas accessibility', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('uses the localized mood title in its Hebrew accessible name', async () => {
    localStorage.setItem('nml_lang', 'he');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);

    render(
      <AppProvider>
        <MoodArtCanvas moodKey="melancolia" seed="test" width={320} height={180} />
      </AppProvider>,
    );

    expect(await screen.findByRole('img', { name: 'אמנות גנרטיבית: מלנכוליה / התבוננות פנימית' }))
      .toBeInTheDocument();
  });
});
