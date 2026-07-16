import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import defaultMusicData from './data/music_dna_compiled.json';
import type { MusicDnaData } from './types';
import type {
  DatasetClearResult,
  DatasetIntentClaimResult,
  DatasetLoadResult,
  DatasetMutationOperation,
  DatasetSaveResult,
} from './utils/datasetStorage';
import type {
  DatasetOperationCoordinator,
  DatasetOperationToken,
} from './components/DataUploader';

const storageMocks = vi.hoisted(() => ({
  claim: vi.fn<(operation: DatasetMutationOperation) => Promise<DatasetIntentClaimResult>>(),
  load: vi.fn<() => Promise<DatasetLoadResult>>(),
  save: vi.fn<(...args: unknown[]) => Promise<DatasetSaveResult>>(),
  clear: vi.fn<() => Promise<DatasetClearResult>>(),
}));

const defaultDatasetMocks = vi.hoisted(() => ({
  load: vi.fn<() => Promise<MusicDnaData>>(),
}));

const uploaderMocks = vi.hoisted(() => ({
  waitForSlowRead: vi.fn<() => Promise<void>>(),
}));

vi.mock('./utils/datasetStorage', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils/datasetStorage')>();
  return {
    ...actual,
    claimDatasetMutationIntent: storageMocks.claim,
    loadDatasetResult: storageMocks.load,
    saveDatasetResult: storageMocks.save,
    clearDatasetResult: storageMocks.clear,
  };
});

vi.mock('./data/defaultDataset', () => ({
  loadDefaultDataset: defaultDatasetMocks.load,
}));

vi.mock('framer-motion', async importOriginal => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

vi.mock('./components/HeroSection', () => ({
  default: ({
    isPersonalArchive,
    isArchivePersisted,
    onUpload,
  }: {
    isPersonalArchive?: boolean;
    isArchivePersisted?: boolean;
    onUpload: () => void;
  }) => (
    <div>
      <output data-testid="hero-persistence-state">
        {isPersonalArchive
          ? isArchivePersisted ? 'personal-saved' : 'personal-tab-only'
          : 'flagship-demo'}
      </output>
      <button type="button" onClick={onUpload}>Open upload room</button>
    </div>
  ),
}));

vi.mock('./components/DataUploader', () => ({
  default: ({
    currentData,
    storedMeta,
    onDataLoaded,
    onClearStored,
    operationCoordinator,
  }: {
    currentData: MusicDnaData;
    storedMeta: { savedAt: string; sourceLabel: string } | null;
    onDataLoaded: (
      data: MusicDnaData,
      sourceLabel: string,
      genreAssignments: undefined,
      operation: DatasetOperationToken,
    ) => Promise<DatasetSaveResult | void>;
    onClearStored: (operation: DatasetOperationToken) => Promise<DatasetClearResult | void>;
    operationCoordinator: DatasetOperationCoordinator;
  }) => {
    const runImport = (waitForRead: Promise<void>) => {
      const operation = operationCoordinator.acquire('import');
      if (!operation) return;
      void (async () => {
        try {
          await waitForRead;
          if (!operationCoordinator.isCurrent(operation)) return;
          await onDataLoaded(
            { ...currentData, project: 'Visitor archive' },
            'Visitor import',
            undefined,
            operation,
          );
        } finally {
          operationCoordinator.release(operation);
        }
      })();
    };

    const runClear = () => {
      const operation = operationCoordinator.acquire('clear');
      if (!operation) return;
      void onClearStored(operation).finally(() => operationCoordinator.release(operation));
    };

    const busy = Boolean(operationCoordinator.active);
    return (
      <div data-testid="mock-uploader">
        <output data-testid="mock-stored-meta">{storedMeta ? 'saved' : 'not-saved'}</output>
        <output data-testid="mock-operation-state">{operationCoordinator.active?.kind ?? 'idle'}</output>
        <button type="button" disabled={busy} onClick={() => runImport(Promise.resolve())}>
          Import personal archive
        </button>
        <button type="button" disabled={busy} onClick={() => runImport(uploaderMocks.waitForSlowRead())}>
          Start slow import
        </button>
        <button type="button" disabled={busy} onClick={runClear}>
          Clear stored archive
        </button>
      </div>
    );
  },
}));

vi.mock('./components/Dashboard', () => ({ default: () => <div data-testid="mock-dashboard">Dashboard</div> }));

import App from './App';

const data = defaultMusicData as unknown as MusicDnaData;
let nextIntentEpoch = 0;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => { resolve = next; });
  return { promise, resolve };
}

function openHeroFromHeader() {
  const header = screen.getByTestId('museum-app-header');
  const homeButton = header.querySelector('button');
  if (!homeButton) throw new Error('Museum home button not found.');
  fireEvent.click(homeButton);
}

const quotaFailure: DatasetSaveResult = {
  ok: false,
  status: 'error',
  operation: 'save',
  reason: 'quota-exceeded',
  recoverable: true,
  errorName: 'QuotaExceededError',
};

function contrastRatio(firstHex: string, secondHex: string) {
  const luminance = (hex: string) => {
    const channels = hex.match(/[a-f\d]{2}/gi)?.map(channel => Number.parseInt(channel, 16) / 255) ?? [];
    const linear = channels.map(channel => (
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  };
  const lighter = Math.max(luminance(firstHex), luminance(secondHex));
  const darker = Math.min(luminance(firstHex), luminance(secondHex));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('App persistence truth states', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
    window.history.replaceState(null, '', '/');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    storageMocks.load.mockResolvedValue({ ok: true, status: 'missing' });
    storageMocks.clear.mockResolvedValue({ ok: true, status: 'cleared' });
    nextIntentEpoch = 0;
    storageMocks.claim.mockImplementation(async operation => ({
      ok: true,
      status: 'claimed',
      intent: {
        schemaVersion: 1,
        epoch: ++nextIntentEpoch,
        ownerId: `app-test-${nextIntentEpoch}`,
        operation,
        issuedAt: `2026-07-16T04:00:0${nextIntentEpoch}.000Z`,
      },
    }));
    defaultDatasetMocks.load.mockResolvedValue(data);
    uploaderMocks.waitForSlowRead.mockReset();
    uploaderMocks.waitForSlowRead.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('keeps an imported archive tab-only until its exact IndexedDB save succeeds', async () => {
    const pendingSave = deferred<DatasetSaveResult>();
    storageMocks.save.mockReturnValue(pendingSave.promise);
    render(<App />);

    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('flagship-demo');
    fireEvent.click(screen.getByRole('button', { name: 'Open upload room' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Import personal archive' }));
    await screen.findByTestId('mock-dashboard');

    openHeroFromHeader();
    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('personal-tab-only');
    expect(screen.queryByText(/saved locally/i)).not.toBeInTheDocument();

    pendingSave.resolve(quotaFailure);
    const errorNotice = await screen.findByTestId('persistence-notice');
    expect(errorNotice).toHaveTextContent(/local storage is full/i);
    expect(errorNotice).toHaveAttribute('data-notice-tone', 'error');
    expect(errorNotice).toHaveStyle({ backgroundColor: '#4c0519', color: '#ffffff' });
    expect(contrastRatio('#4c0519', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(screen.getByTestId('hero-persistence-state')).toHaveTextContent('personal-tab-only');
  }, 15_000);

  it('promotes the active personal archive to saved only after write completion', async () => {
    const pendingSave = deferred<DatasetSaveResult>();
    storageMocks.save.mockReturnValue(pendingSave.promise);
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open upload room' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Import personal archive' }));
    await screen.findByTestId('mock-dashboard');
    openHeroFromHeader();
    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('personal-tab-only');

    pendingSave.resolve({
      ok: true,
      status: 'saved',
      record: {
        schemaVersion: 3,
        data,
        savedAt: '2026-07-16T03:30:00.000Z',
        sourceLabel: 'Visitor import',
        genreAssignments: [],
      },
    });

    await waitFor(() => expect(screen.getByTestId('hero-persistence-state')).toHaveTextContent('personal-saved'));
    expect(screen.getByTestId('persistence-notice')).toHaveTextContent(/saved locally/i);
  });

  it('surfaces restore failure but treats an ordinary missing dataset as a silent first visit', async () => {
    const first = render(<App />);
    await screen.findByTestId('hero-persistence-state');
    expect(screen.queryByTestId('persistence-notice')).not.toBeInTheDocument();
    first.unmount();

    storageMocks.load.mockResolvedValue({
      ok: false,
      status: 'error',
      operation: 'load',
      reason: 'transaction-failed',
      recoverable: true,
      errorName: 'TransactionError',
    });
    render(<App />);

    expect(await screen.findByTestId('persistence-notice')).toHaveTextContent(/saved archive could not be read/i);
    expect(screen.getByTestId('hero-persistence-state')).toHaveTextContent('flagship-demo');
  });

  it('awaits a failed clear and keeps the saved personal archive active', async () => {
    storageMocks.load.mockResolvedValue({
      ok: true,
      status: 'loaded',
      record: {
        schemaVersion: 3,
        data,
        savedAt: '2026-07-16T03:30:00.000Z',
        sourceLabel: 'Saved visitor archive',
        genreAssignments: [],
      },
    });
    storageMocks.clear.mockResolvedValue({
      ok: false,
      status: 'error',
      operation: 'clear',
      reason: 'transaction-failed',
      recoverable: true,
      errorName: 'TransactionError',
    });
    render(<App />);

    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('personal-saved');
    fireEvent.click(screen.getByRole('button', { name: 'Open upload room' }));
    expect(await screen.findByTestId('mock-stored-meta')).toHaveTextContent('saved');
    fireEvent.click(screen.getByRole('button', { name: 'Clear stored archive' }));

    expect(await screen.findByTestId('persistence-notice')).toHaveTextContent(/could not be cleared/i);
    expect(screen.getByTestId('mock-stored-meta')).toHaveTextContent('saved');
    expect(storageMocks.clear).toHaveBeenCalledTimes(1);
  });

  it('renders a retryable gate when the bundled demo chunk cannot load', async () => {
    defaultDatasetMocks.load
      .mockRejectedValueOnce(new Error('ChunkLoadError'))
      .mockResolvedValue(data);
    render(<App />);

    const errorPanel = await screen.findByTestId('dataset-load-error');
    expect(errorPanel).toHaveTextContent(/museum archive could not load/i);
    expect(screen.queryByTestId('persistence-notice')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry archive load/i }));
    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('flagship-demo');
    expect(defaultDatasetMocks.load).toHaveBeenCalledTimes(2);
  });

  it('truthfully becomes tab-only when clear succeeds but the demo chunk fails', async () => {
    storageMocks.load.mockResolvedValue({
      ok: true,
      status: 'loaded',
      record: {
        schemaVersion: 3,
        data,
        savedAt: '2026-07-16T03:30:00.000Z',
        sourceLabel: 'Saved visitor archive',
        genreAssignments: [],
      },
    });
    defaultDatasetMocks.load.mockRejectedValueOnce(new Error('ChunkLoadError'));
    render(<App />);

    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('personal-saved');
    fireEvent.click(screen.getByRole('button', { name: 'Open upload room' }));
    expect(await screen.findByTestId('mock-stored-meta')).toHaveTextContent('saved');
    fireEvent.click(screen.getByRole('button', { name: 'Clear stored archive' }));

    await waitFor(() => expect(screen.getByTestId('mock-stored-meta')).toHaveTextContent('not-saved'));
    expect(screen.getByTestId('persistence-notice')).toHaveTextContent(/remains only in the current tab/i);
    expect(storageMocks.clear).toHaveBeenCalledTimes(1);
    openHeroFromHeader();
    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('personal-tab-only');
  });

  it('keeps the App-owned import lock across uploader navigation and blocks newer clear/import intent', async () => {
    storageMocks.load.mockResolvedValue({
      ok: true,
      status: 'loaded',
      record: {
        schemaVersion: 3,
        data,
        savedAt: '2026-07-16T03:30:00.000Z',
        sourceLabel: 'Saved visitor archive',
        genreAssignments: [],
      },
    });
    const slowRead = deferred<void>();
    uploaderMocks.waitForSlowRead.mockReturnValueOnce(slowRead.promise);
    storageMocks.save.mockResolvedValue({
      ok: true,
      status: 'saved',
      record: {
        schemaVersion: 3,
        data: { ...data, project: 'Visitor archive' },
        savedAt: '2026-07-16T04:00:00.000Z',
        sourceLabel: 'Visitor import',
        genreAssignments: [],
      },
    });
    render(<App />);

    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('personal-saved');
    fireEvent.click(screen.getByRole('button', { name: 'Open upload room' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start slow import' }));
    expect(await screen.findByTestId('mock-operation-state')).toHaveTextContent('import');

    openHeroFromHeader();
    fireEvent.click(await screen.findByRole('button', { name: 'Open upload room' }));

    expect(await screen.findByTestId('mock-operation-state')).toHaveTextContent('import');
    const competingImport = screen.getByRole('button', { name: 'Import personal archive' });
    const competingClear = screen.getByRole('button', { name: 'Clear stored archive' });
    expect(competingImport).toBeDisabled();
    expect(competingClear).toBeDisabled();
    fireEvent.click(competingImport);
    fireEvent.click(competingClear);
    expect(storageMocks.save).not.toHaveBeenCalled();
    expect(storageMocks.clear).not.toHaveBeenCalled();

    slowRead.resolve();
    await waitFor(() => expect(storageMocks.save).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();
    expect(storageMocks.clear).not.toHaveBeenCalled();

    openHeroFromHeader();
    fireEvent.click(await screen.findByRole('button', { name: 'Open upload room' }));
    expect(await screen.findByTestId('mock-operation-state')).toHaveTextContent('idle');
    expect(screen.getByRole('button', { name: 'Import personal archive' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Clear stored archive' })).toBeEnabled();
  }, 15_000);

  it('keeps an old cross-tab import tab-only when durable storage rejects its stale intent', async () => {
    storageMocks.load.mockResolvedValue({
      ok: true,
      status: 'loaded',
      record: {
        schemaVersion: 3,
        data,
        savedAt: '2026-07-16T03:30:00.000Z',
        sourceLabel: 'Saved visitor archive',
        genreAssignments: [],
      },
    });
    const slowRead = deferred<void>();
    uploaderMocks.waitForSlowRead.mockReturnValueOnce(slowRead.promise);
    storageMocks.save.mockResolvedValue({
      ok: false,
      status: 'stale',
      operation: 'save',
      reason: 'stale-intent',
      recoverable: true,
      errorName: 'StaleIntentError',
    });
    render(<App />);

    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('personal-saved');
    fireEvent.click(screen.getByRole('button', { name: 'Open upload room' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start slow import' }));
    await waitFor(() => expect(storageMocks.claim).toHaveBeenCalledWith('save'));

    // This resolves after a simulated tab B has already registered newer
    // intent; the persistence layer therefore returns the typed stale result.
    slowRead.resolve();
    expect(await screen.findByTestId('mock-dashboard')).toBeInTheDocument();
    await waitFor(() => expect(storageMocks.save).toHaveBeenCalledTimes(1));
    expect(storageMocks.save.mock.calls[0][3]).toMatchObject({
      operation: 'save',
      ownerId: 'app-test-1',
    });
    expect(await screen.findByTestId('persistence-notice')).toHaveTextContent(/newer archive action in another Nova tab/i);

    openHeroFromHeader();
    expect(await screen.findByTestId('hero-persistence-state')).toHaveTextContent('personal-tab-only');
  }, 15_000);
});
