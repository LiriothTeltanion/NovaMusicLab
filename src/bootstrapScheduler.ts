interface BootstrapResult {
  ok: boolean;
  error?: unknown;
}

interface BootstrapModule {
  bootstrapLocalDataLayer: () => Promise<BootstrapResult>;
}

type BootstrapLoader = () => Promise<BootstrapModule>;
interface NetworkHints {
  effectiveType?: string;
  saveData?: boolean;
}

const BOOTSTRAP_WARNING =
  '[Nova Music Lab] Local database bootstrap did not complete. The museum remains available, but schema-v4 artist enrichment may be unavailable.';

let bootstrapWarningSent = false;

function warnBootstrapOnce(reason: unknown) {
  if (bootstrapWarningSent) return;
  bootstrapWarningSent = true;
  console.warn(BOOTSTRAP_WARNING, reason);
}

export function bootstrapTimingForNetwork(connection?: NetworkHints) {
  const constrainedNetwork = Boolean(
    connection?.saveData || /(^|-)2g$|3g$/.test(connection?.effectiveType ?? ''),
  );
  return {
    constrainedNetwork,
    settleDelay: constrainedNetwork ? 20_000 : 10_000,
    idleTimeout: constrainedNetwork ? 20_000 : 10_000,
    fallbackDelay: constrainedNetwork ? 5_000 : 2_000,
  };
}

export async function runLocalDataBootstrap(
  loadBootstrap: BootstrapLoader = () => import('./db/bootstrap'),
) {
  try {
    const { bootstrapLocalDataLayer } = await loadBootstrap();
    const result = await bootstrapLocalDataLayer();
    if (!result.ok) warnBootstrapOnce(result.error ?? result);
  } catch (error) {
    warnBootstrapOnce(error);
  }
}

function scheduleAfterLoadAndIdle() {
  const connection = (navigator as Navigator & {
    connection?: NetworkHints;
  }).connection;
  const timing = bootstrapTimingForNetwork(connection);
  // The knowledge manifest is useful, but it must not compete with the first
  // room, fonts or remote artwork. Give the visitor a stable museum first.

  globalThis.setTimeout(() => {
    const run = () => {
      void runLocalDataBootstrap();
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: timing.idleTimeout });
    } else {
      globalThis.setTimeout(run, timing.fallbackDelay);
    }
  }, timing.settleDelay);
}

/**
 * Preserve first paint and the page's critical network window. Only the small
 * bootstrap coordinator is requested here; the full artist manifest remains a
 * conditional import inside the database bootstrap.
 */
export function scheduleLocalDataBootstrap() {
  if (document.readyState === 'complete') {
    scheduleAfterLoadAndIdle();
    return;
  }

  window.addEventListener('load', scheduleAfterLoadAndIdle, { once: true });
}
