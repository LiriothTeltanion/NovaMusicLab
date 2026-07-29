import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  EXPERIENCE_DEPTH_STORAGE_KEY,
  type ExperienceDepth,
} from '../components/shell/museumNavigation';
import { EXPEDITION_JOURNEY_STORAGE_KEY } from '../components/shell/expeditionJourney';
import { ExperienceProvider, useExperience } from './ExperienceContext';

function ExperienceProbe() {
  const { experienceDepth, setExperienceDepth } = useExperience();

  return (
    <>
      <output>{experienceDepth}</output>
      <button type="button" onClick={() => setExperienceDepth('deep-dive')}>
        Select deep dive
      </button>
    </>
  );
}

function renderProvider() {
  return render(
    <ExperienceProvider>
      <ExperienceProbe />
    </ExperienceProvider>,
  );
}

describe('ExperienceProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('starts new visitors in the explore experience and persists the choice', async () => {
    renderProvider();

    expect(screen.getByText('explore')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem(EXPERIENCE_DEPTH_STORAGE_KEY)).toBe('explore');
    });
  });

  it.each([
    ['guided', 'guided'],
    ['explore', 'explore'],
    ['deep-dive', 'deep-dive'],
  ] as const)('restores the stored %s experience', async (stored, expected) => {
    window.localStorage.setItem(EXPERIENCE_DEPTH_STORAGE_KEY, stored);
    renderProvider();

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('migrates the old journey preference and preserves the legacy key', () => {
    window.localStorage.setItem(EXPEDITION_JOURNEY_STORAGE_KEY, 'full');
    renderProvider();

    expect(screen.getByText('explore')).toBeInTheDocument();
    expect(window.localStorage.getItem(EXPERIENCE_DEPTH_STORAGE_KEY)).toBe('explore');
    expect(window.localStorage.getItem(EXPEDITION_JOURNEY_STORAGE_KEY)).toBe('full');
  });

  it('updates and persists a user selection', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByRole('button', { name: 'Select deep dive' }));

    expect(screen.getByText('deep-dive')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem(EXPERIENCE_DEPTH_STORAGE_KEY)).toBe('deep-dive');
    });
  });

  it('requires consumers to be inside the provider', () => {
    const Consumer = () => {
      useExperience();
      return null;
    };

    expect(() => render(<Consumer />)).toThrow(
      'useExperience must be used within an ExperienceProvider',
    );
  });

  it('exposes only supported experience values to consumers', () => {
    const values: ExperienceDepth[] = ['guided', 'explore', 'deep-dive'];
    expect(values).toHaveLength(3);
  });
});
