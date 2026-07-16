import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('local data bootstrap scheduling', () => {
  it('reports repeated bootstrap failures only once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failure = new Error('IndexedDB blocked');
    const loader = vi.fn(async () => ({
      bootstrapLocalDataLayer: async () => {
        throw failure;
      },
    }));
    const { runLocalDataBootstrap } = await import('./bootstrapScheduler');

    await runLocalDataBootstrap(loader);
    await runLocalDataBootstrap(loader);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('schema-v4 artist enrichment'), failure);
  });

  it('treats an explicit storage failure as observable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storageError = { kind: 'storage_unavailable' };
    const { runLocalDataBootstrap } = await import('./bootstrapScheduler');

    await runLocalDataBootstrap(async () => ({
      bootstrapLocalDataLayer: async () => ({ ok: false, error: storageError }),
    }));

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.any(String), storageError);
  });
});
