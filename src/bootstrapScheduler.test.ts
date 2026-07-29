import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('local data bootstrap scheduling', () => {
  it('keeps bootstrap outside the first-room network window', async () => {
    const { bootstrapTimingForNetwork } = await import('./bootstrapScheduler');

    expect(bootstrapTimingForNetwork({ effectiveType: '4g' })).toMatchObject({
      constrainedNetwork: false,
      settleDelay: 10_000,
    });
    expect(bootstrapTimingForNetwork({ effectiveType: '3g' })).toMatchObject({
      constrainedNetwork: true,
      settleDelay: 20_000,
    });
    expect(bootstrapTimingForNetwork({ saveData: true })).toMatchObject({
      constrainedNetwork: true,
      settleDelay: 20_000,
    });
  });

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
