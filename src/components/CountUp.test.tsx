import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import CountUp from './CountUp';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it('renders the final value immediately when animation is disabled', () => {
  localStorage.setItem('nml_lang', 'en');
  const requestAnimationFrame = vi.fn();
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);

  render(
    <AppProvider>
      <CountUp target={1_234} duration={0} />
    </AppProvider>
  );

  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});
