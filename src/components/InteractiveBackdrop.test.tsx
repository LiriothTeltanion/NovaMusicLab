import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MusicDnaData } from '../types';
import InteractiveBackdrop from './InteractiveBackdrop';

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    tc: { bg: '#030712', c1: '#00f2fe', c2: '#f72585', c3: '#a78bfa', mode: 'dark' },
    selectedArtistName: null,
    selectedAlbumKey: null,
    selectedTrackKey: null,
  }),
}));

const data = {
  top_artists: [],
  top_tracks: [],
  top_albums: [],
} as unknown as MusicDnaData;

const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

function mockCanvas() {
  const gradient = { addColorStop: vi.fn() };
  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  return context;
}

function mockMotionPreference(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => query));
  return { query, listeners };
}

beforeEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
});

describe('InteractiveBackdrop scheduling', () => {
  it('layers the detailed sonic cartography artwork above the opaque reactive canvas', () => {
    mockCanvas();
    mockMotionPreference(true);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const { getByTestId } = render(<InteractiveBackdrop data={data} />);
    const artwork = getByTestId('sonic-cartography-backdrop');

    expect(artwork).toHaveAttribute('aria-hidden', 'true');
    expect(artwork).toHaveClass('z-[1]');
    expect(artwork).toHaveStyle({ opacity: '0.28' });
    expect(artwork.getAttribute('style')).toContain('sonic-cartography-bg-v2.jpg');
  });

  it('paints once and never starts a loop when reduced motion is requested', () => {
    const context = mockCanvas();
    mockMotionPreference(true);
    const raf = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    render(<InteractiveBackdrop data={data} motionMode="expressive" />);

    expect(context.fillRect).toHaveBeenCalledTimes(1);
    expect(raf).not.toHaveBeenCalled();
  });

  it('pauses while hidden and resumes when the document becomes visible', () => {
    mockCanvas();
    mockMotionPreference(false);
    const raf = vi.fn(() => 17);
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', cancel);

    render(<InteractiveBackdrop data={data} motionMode="expressive" />);
    expect(raf).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(cancel).toHaveBeenCalledWith(17);

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    expect(raf).toHaveBeenCalledTimes(2);
  });

  it('preserves blob geometry when the canvas follows a viewport resize', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1_000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const context = mockCanvas();
    mockMotionPreference(false);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const { container } = render(<InteractiveBackdrop data={data} motionMode="calm" />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute('width', '340');
    expect(canvas).toHaveAttribute('height', '272');

    context.arc.mockClear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1_500 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1_200 });
    fireEvent(window, new Event('resize'));

    expect(canvas).toHaveAttribute('width', '510');
    expect(canvas).toHaveAttribute('height', '408');
    const [firstX, firstY] = context.arc.mock.calls[0];
    expect(firstX).toBeCloseTo(510 * 0.22);
    expect(firstY).toBeCloseTo(408 * 0.28);
  });
});
