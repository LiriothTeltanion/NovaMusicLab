export interface EmotionalScatterCoordinate {
  name: string;
  valence: number;
  energy: number;
}

export type EmotionalScatterPoint<T extends EmotionalScatterCoordinate> = T & {
  /** Inferred category coordinates. These never change during presentation layout. */
  rawValence: number;
  rawEnergy: number;
  /** Coordinates used only to keep equal points individually discoverable. */
  plotValence: number;
  plotEnergy: number;
  overlapIndex: number;
  overlapCount: number;
};

interface IndexedPoint<T extends EmotionalScatterCoordinate> {
  point: T;
  sourceIndex: number;
}

const MAX_POINTS_PER_RING = 8;
const BASE_RADIUS = 0.024;
const RING_GAP = 0.018;
const PLOT_PADDING = 0.012;

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

/**
 * Gives artists with equal inferred coordinates a tiny deterministic visual
 * offset. The raw values remain attached to every row for tooltips, tables and
 * methodology; only plotValence/plotEnergy should be passed to the chart.
 *
 * Sorting each overlap group by a stable name hash makes the result independent
 * from API/file order, so the same archive always paints the same constellation.
 */
export function layoutEmotionalScatterPoints<T extends EmotionalScatterCoordinate>(
  points: readonly T[],
): Array<EmotionalScatterPoint<T>> {
  const groups = new Map<string, Array<IndexedPoint<T>>>();

  points.forEach((point, sourceIndex) => {
    const key = `${point.valence.toFixed(6)}|${point.energy.toFixed(6)}`;
    const group = groups.get(key) ?? [];
    group.push({ point, sourceIndex });
    groups.set(key, group);
  });

  const layouts = new Map<number, EmotionalScatterPoint<T>>();

  groups.forEach((group, groupKey) => {
    if (group.length === 1) {
      const [{ point, sourceIndex }] = group;
      layouts.set(sourceIndex, {
        ...point,
        rawValence: point.valence,
        rawEnergy: point.energy,
        plotValence: point.valence,
        plotEnergy: point.energy,
        overlapIndex: 0,
        overlapCount: 1,
      });
      return;
    }

    const sortedGroup = [...group].sort((left, right) => {
      const hashDelta = stableHash(left.point.name) - stableHash(right.point.name);
      return hashDelta || left.point.name.localeCompare(right.point.name);
    });
    const ringCount = Math.ceil(sortedGroup.length / MAX_POINTS_PER_RING);
    const maxRadius = BASE_RADIUS + (ringCount - 1) * RING_GAP;
    const rawValence = sortedGroup[0].point.valence;
    const rawEnergy = sortedGroup[0].point.energy;
    const centerValence = clamp(rawValence, maxRadius + PLOT_PADDING, 1 - maxRadius - PLOT_PADDING);
    const centerEnergy = clamp(rawEnergy, maxRadius + PLOT_PADDING, 1 - maxRadius - PLOT_PADDING);
    const phase = (stableHash(groupKey) % 360) * (Math.PI / 180);

    sortedGroup.forEach(({ point, sourceIndex }, overlapIndex) => {
      const ringIndex = Math.floor(overlapIndex / MAX_POINTS_PER_RING);
      const positionInRing = overlapIndex % MAX_POINTS_PER_RING;
      const pointsBeforeRing = ringIndex * MAX_POINTS_PER_RING;
      const pointsInRing = Math.min(MAX_POINTS_PER_RING, sortedGroup.length - pointsBeforeRing);
      const radius = BASE_RADIUS + ringIndex * RING_GAP;
      const angle = phase + (positionInRing / pointsInRing) * Math.PI * 2;

      layouts.set(sourceIndex, {
        ...point,
        rawValence: point.valence,
        rawEnergy: point.energy,
        plotValence: roundCoordinate(centerValence + Math.cos(angle) * radius),
        plotEnergy: roundCoordinate(centerEnergy + Math.sin(angle) * radius),
        overlapIndex,
        overlapCount: sortedGroup.length,
      });
    });
  });

  return points.map((_, index) => layouts.get(index) as EmotionalScatterPoint<T>);
}
