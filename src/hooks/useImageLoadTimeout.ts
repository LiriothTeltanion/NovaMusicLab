import { useEffect, useRef } from 'react';

export const REMOTE_IMAGE_TIMEOUT_MS = 7_000;

/**
 * Advances a remote-image fallback chain when the browser never emits either
 * `load` or `error`. Some CDNs can leave a request pending indefinitely on
 * constrained networks, so visual components must not rely on `onError` alone.
 */
export function useImageLoadTimeout(
  active: boolean,
  requestKey: string,
  onTimeout: () => void,
  timeoutMs = REMOTE_IMAGE_TIMEOUT_MS,
) {
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [active, requestKey, timeoutMs]);
}
