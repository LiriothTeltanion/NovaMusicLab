import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './useMediaQuery';

function installMediaQuery(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const media = {
    get matches() { return matches; },
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => media));

  return {
    setMatches(next: boolean) {
      matches = next;
      act(() => listeners.forEach(listener => listener()));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('tracks viewport query changes without remounting', () => {
    const viewport = installMediaQuery(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

    expect(result.current).toBe(false);
    viewport.setMatches(true);
    expect(result.current).toBe(true);
  });

  it('falls back safely when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

    expect(result.current).toBe(false);
  });

  it('uses the explicit server snapshot without reading browser state', () => {
    installMediaQuery(true);

    function Probe() {
      return <span>{useMediaQuery('(max-width: 767px)') ? 'mobile' : 'desktop'}</span>;
    }

    expect(renderToString(<Probe />)).toContain('desktop');
  });
});
