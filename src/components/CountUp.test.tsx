import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import CountUp from './CountUp';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

function installMotionQuery(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList));
}

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

it('renders the final value without starting RAF work in app Static mode', () => {
  localStorage.setItem('nml_lang', 'en');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  installMotionQuery(false);
  vi.useFakeTimers();
  const requestAnimationFrame = vi.fn();
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);

  render(
    <div className="nova-app-root" data-motion="static">
      <AppProvider>
        <CountUp target={4_321} duration={1.5} />
      </AppProvider>
    </div>,
  );

  act(() => vi.runOnlyPendingTimers());
  expect(screen.getByText('4,321')).toBeInTheDocument();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it('renders the final value without starting RAF work for reduced-motion visitors', () => {
  localStorage.setItem('nml_lang', 'en');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  installMotionQuery(true);
  vi.useFakeTimers();
  const requestAnimationFrame = vi.fn();
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);

  render(
    <AppProvider>
      <CountUp target={9_876} duration={1.5} />
    </AppProvider>,
  );

  act(() => vi.runOnlyPendingTimers());
  expect(screen.getByText('9,876')).toBeInTheDocument();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});
