import { describe, expect, it } from 'vitest';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import { buildExport, parseExport, saveDataset, loadDataset, clearDataset } from './datasetStorage';

const data = defaultMusicData as unknown as MusicDnaData;

describe('datasetStorage export wrapper', () => {
  it('round-trips a dataset through buildExport + parseExport', () => {
    const wrapped = buildExport(data, 'test source');
    expect(wrapped.nova_music_export).toBe(true);
    expect(wrapped.version).toBe(1);
    expect(wrapped.source_label).toBe('test source');

    const reparsed = parseExport(JSON.parse(JSON.stringify(wrapped)));
    expect(reparsed).not.toBeNull();
    expect(reparsed!.data.core_metrics.total_plays).toBe(data.core_metrics.total_plays);
  });

  it('serializes with nova_music_export as an early key (sniffable prefix)', () => {
    const payload = JSON.stringify(buildExport(data, 'x'));
    expect(payload.slice(0, 300)).toContain('"nova_music_export"');
  });

  it('rejects raw Spotify Extended Streaming History arrays', () => {
    expect(parseExport([{ ts: '2024-01-01T00:00:00Z', master_metadata_track_name: 'Song' }])).toBeNull();
  });

  it('rejects unrelated objects and near-misses', () => {
    expect(parseExport(null)).toBeNull();
    expect(parseExport('nova_music_export')).toBeNull();
    expect(parseExport({ nova_music_export: true })).toBeNull();
    expect(parseExport({ nova_music_export: true, data: {} })).toBeNull();
    expect(parseExport({ nova_music_export: 'yes', data })).toBeNull();
  });
});

describe('datasetStorage IndexedDB helpers (jsdom: no indexedDB)', () => {
  it('degrades gracefully when indexedDB is unavailable', async () => {
    await expect(saveDataset(data, 'test')).resolves.toBe(false);
    await expect(loadDataset()).resolves.toBeNull();
    await expect(clearDataset()).resolves.toBeUndefined();
  });
});
