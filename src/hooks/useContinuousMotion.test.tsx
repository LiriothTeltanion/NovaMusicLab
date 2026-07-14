import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { useContinuousMotion } from './useContinuousMotion';

function Probe() {
  const allowed = useContinuousMotion();
  return <output data-testid="motion-state">{allowed ? 'running' : 'paused'}</output>;
}

function ViewportProbe() {
  const targetRef = useRef<HTMLDivElement>(null);
  const allowed = useContinuousMotion(targetRef);
  return (
    <div ref={targetRef} data-testid="motion-target">
      <output data-testid="motion-state">{allowed ? 'running' : 'paused'}</output>
    </div>
  );
}

function installMotionQuery(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const query = {
    get matches() { return matches; },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => query));
  return {
    setMatches(next: boolean) {
      matches = next;
      act(() => listeners.forEach(listener => listener()));
    },
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('useContinuousMotion', () => {
  it('tracks reduced-motion changes without remounting', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    const media = installMotionQuery(false);
    render(<Probe />);
    expect(screen.getByTestId('motion-state')).toHaveTextContent('running');

    media.setMatches(true);
    expect(screen.getByTestId('motion-state')).toHaveTextContent('paused');
  });

  it('pauses while the document is hidden and resumes on visibility', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    installMotionQuery(false);
    render(<Probe />);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByTestId('motion-state')).toHaveTextContent('paused');

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByTestId('motion-state')).toHaveTextContent('running');
  });

  it('pauses a targeted animation while its surface is outside the viewport', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    installMotionQuery(false);
    let notify: IntersectionObserverCallback = () => undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = () => [];
      root = null;
      rootMargin = '0px';
      thresholds = [0.01];
    }

    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver as unknown as typeof IntersectionObserver,
    );
    const { unmount } = render(<ViewportProbe />);

    expect(observe).toHaveBeenCalledWith(screen.getByTestId('motion-target'));
    act(() => notify(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ));
    expect(screen.getByTestId('motion-state')).toHaveTextContent('paused');

    act(() => notify(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ));
    expect(screen.getByTestId('motion-state')).toHaveTextContent('running');

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
