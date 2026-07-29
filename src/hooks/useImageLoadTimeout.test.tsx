import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useImageLoadTimeout } from './useImageLoadTimeout';

describe('useImageLoadTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances an active image request after the configured timeout', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    renderHook(() => useImageLoadTimeout(true, 'portrait-a', onTimeout, 250));
    vi.advanceTimersByTime(249);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('cancels the timeout after the image becomes inactive', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const { rerender } = renderHook(
      ({ active }) => useImageLoadTimeout(active, 'portrait-a', onTimeout, 250),
      { initialProps: { active: true } },
    );

    rerender({ active: false });
    vi.advanceTimersByTime(300);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
