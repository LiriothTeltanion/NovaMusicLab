import { describe, expect, it } from 'vitest';
import { layoutEmotionalScatterPoints } from './emotionalScatterLayout';

const sharedCoordinates = [
  { name: 'Rain City Drive', valence: 0.42, energy: 0.88 },
  { name: 'TesseracT', valence: 0.42, energy: 0.88 },
  { name: 'Jonny Craig', valence: 0.42, energy: 0.88 },
  { name: 'Nevertel', valence: 0.42, energy: 0.88 },
  { name: 'Slaves', valence: 0.42, energy: 0.88 },
  { name: 'Normandie', valence: 0.42, energy: 0.88 },
  { name: 'Odeon', valence: 0.42, energy: 0.88 },
  { name: 'Emarosa', valence: 0.42, energy: 0.88 },
  { name: 'Hayehudim', valence: 0.42, energy: 0.88 },
];

describe('layoutEmotionalScatterPoints', () => {
  it('separates equal positions while preserving every raw coordinate', () => {
    const laidOut = layoutEmotionalScatterPoints(sharedCoordinates);
    const uniquePositions = new Set(
      laidOut.map(point => `${point.plotValence}|${point.plotEnergy}`),
    );

    expect(uniquePositions.size).toBe(sharedCoordinates.length);
    laidOut.forEach(point => {
      expect(point.rawValence).toBe(0.42);
      expect(point.rawEnergy).toBe(0.88);
      expect(point.valence).toBe(point.rawValence);
      expect(point.energy).toBe(point.rawEnergy);
      expect(point.plotValence).toBeGreaterThanOrEqual(0);
      expect(point.plotValence).toBeLessThanOrEqual(1);
      expect(point.plotEnergy).toBeGreaterThanOrEqual(0);
      expect(point.plotEnergy).toBeLessThanOrEqual(1);
      expect(point.overlapCount).toBe(sharedCoordinates.length);
    });
  });

  it('is deterministic and independent from input order', () => {
    const first = layoutEmotionalScatterPoints(sharedCoordinates);
    const reversed = layoutEmotionalScatterPoints([...sharedCoordinates].reverse());
    const positionByName = (points: typeof first) => Object.fromEntries(
      points.map(point => [point.name, [point.plotValence, point.plotEnergy]]),
    );

    expect(positionByName(first)).toEqual(positionByName(reversed));
    expect(layoutEmotionalScatterPoints(sharedCoordinates)).toEqual(first);
  });

  it('does not move a point that has no overlap', () => {
    const [point] = layoutEmotionalScatterPoints([
      { name: 'Solo Artist', valence: 0.12, energy: 0.97 },
    ]);

    expect(point.plotValence).toBe(point.rawValence);
    expect(point.plotEnergy).toBe(point.rawEnergy);
    expect(point.overlapCount).toBe(1);
    expect(point.overlapIndex).toBe(0);
  });
});
