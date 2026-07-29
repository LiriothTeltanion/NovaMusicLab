import { describe, expect, it } from 'vitest';

import compiledData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import {
  getArchiveNeighbors,
  getDocumentedArtistConnections,
} from './artistConnections';

const data = compiledData as unknown as MusicDnaData;

describe('artist connections', () => {
  it('finds a documented shared member without calling it a style influence', () => {
    const connections = getDocumentedArtistConnections(data, 'TesseracT');
    const skyharbor = connections.find(connection => connection.artist.name === 'Skyharbor');

    expect(skyharbor).toMatchObject({ kind: 'shared-member' });
    expect(skyharbor?.sharedMembers).toContain('Daniel Tompkins');
  });

  it('treats a documented former name as the same identity', () => {
    const connections = getDocumentedArtistConnections(data, 'Rain City Drive');
    expect(connections.find(connection => connection.artist.name === 'Slaves'))
      .toMatchObject({ kind: 'same-identity' });
  });

  it('keeps inferred neighbors separate and excludes documented connections', () => {
    const documented = getDocumentedArtistConnections(data, 'TesseracT');
    const neighbors = getArchiveNeighbors(
      data,
      'TesseracT',
      documented.map(connection => connection.artist.name),
    );

    expect(neighbors.map(neighbor => neighbor.artist.name)).not.toContain('Skyharbor');
    expect(neighbors.every(neighbor => neighbor.sharedGenres.length > 0 || neighbor.sameCountry)).toBe(true);
  });
});
