interface BootstrapResult {
  ok: boolean;
  error?: unknown;
}

interface BootstrapModule {
  bootstrapLocalDataLayer: () => Promise<BootstrapResult>;
}

type BootstrapLoader = () => Promise<BootstrapModule>;

const BOOTSTRAP_WARNING =
  '[Nova Music Lab] Local database bootstrap did not complete. The museum remains available, but schema-v4 artist enrichment may be unavailable.';

let bootstrapWarningSent = false;

function warnBootstrapOnce(reason: unknown) {
  if (bootstrapWarningSent) return;
  bootstrapWarningSent = true;
  console.warn(BOOTSTRAP_WARNING, reason);
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
  const run = () => {
    void runLocalDataBootstrap();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2_500 });
  } else {
    globalThis.setTimeout(run, 700);
  }
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
