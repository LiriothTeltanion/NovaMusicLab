import React, { useMemo } from 'react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import AnimatedParticles from './AnimatedParticles';

interface DynamicMuseumBackgroundProps {
  activeTab: string;
  data: MusicDnaData;
}

interface SectionVisual {
  density: number;
  amplitude: number;
  tempo: number;
  angle: number;
  particleCount: number;
  particleIntensity: 'subtle' | 'medium';
}

interface NodePoint {
  id: number;
  x: number;
  y: number;
  r: number;
  delay: number;
  colorSlot: number;
}

interface SpectrumBar {
  id: number;
  x: number;
  height: number;
  delay: number;
  colorSlot: number;
}

interface HaloRing {
  id: number;
  cx: number;
  cy: number;
  r: number;
  delay: number;
  colorSlot: number;
}

const SECTION_VISUALS: Record<string, SectionVisual> = {
  hero: { density: 0.44, amplitude: 28, tempo: 34, angle: 18, particleCount: 62, particleIntensity: 'medium' },
  dashboard: { density: 0.52, amplitude: 24, tempo: 30, angle: -8, particleCount: 54, particleIntensity: 'subtle' },
  eras: { density: 0.48, amplitude: 18, tempo: 38, angle: 0, particleCount: 46, particleIntensity: 'subtle' },
  top: { density: 0.58, amplitude: 30, tempo: 28, angle: 12, particleCount: 58, particleIntensity: 'medium' },
  personality: { density: 0.42, amplitude: 34, tempo: 42, angle: -18, particleCount: 50, particleIntensity: 'subtle' },
  emotions: { density: 0.64, amplitude: 38, tempo: 32, angle: 24, particleCount: 64, particleIntensity: 'medium' },
  obsessions: { density: 0.72, amplitude: 46, tempo: 22, angle: -24, particleCount: 68, particleIntensity: 'medium' },
  cultural: { density: 0.45, amplitude: 22, tempo: 40, angle: 10, particleCount: 50, particleIntensity: 'subtle' },
  inner: { density: 0.62, amplitude: 42, tempo: 46, angle: -14, particleCount: 60, particleIntensity: 'medium' },
  artist: { density: 0.55, amplitude: 36, tempo: 35, angle: 16, particleCount: 58, particleIntensity: 'medium' },
  insights: { density: 0.66, amplitude: 32, tempo: 26, angle: -10, particleCount: 56, particleIntensity: 'medium' },
  compare: { density: 0.5, amplitude: 26, tempo: 34, angle: 4, particleCount: 52, particleIntensity: 'subtle' },
  platforms: { density: 0.46, amplitude: 24, tempo: 36, angle: -2, particleCount: 50, particleIntensity: 'subtle' },
  quality: { density: 0.38, amplitude: 16, tempo: 44, angle: 0, particleCount: 42, particleIntensity: 'subtle' },
  statsdeep: { density: 0.58, amplitude: 28, tempo: 30, angle: 8, particleCount: 56, particleIntensity: 'medium' },
  achievements: { density: 0.6, amplitude: 34, tempo: 31, angle: 18, particleCount: 58, particleIntensity: 'medium' },
  timecapsule: { density: 0.46, amplitude: 20, tempo: 42, angle: -6, particleCount: 48, particleIntensity: 'subtle' },
  wrapped: { density: 0.7, amplitude: 44, tempo: 27, angle: 22, particleCount: 70, particleIntensity: 'medium' },
  pulse: { density: 0.76, amplitude: 48, tempo: 20, angle: -12, particleCount: 72, particleIntensity: 'medium' },
  report: { density: 0.4, amplitude: 22, tempo: 48, angle: 6, particleCount: 44, particleIntensity: 'subtle' },
  upload: { density: 0.34, amplitude: 18, tempo: 44, angle: -4, particleCount: 40, particleIntensity: 'subtle' },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seededRatio(seed: number) {
  return ((seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function getGenreTint(genre: string | undefined, palette: string[]) {
  const normalized = (genre ?? '').toLowerCase();

  if (/(metal|core|death|black|djent|heavy)/.test(normalized)) return palette[1];
  if (/(synth|wave|electronic|cyber|dance)/.test(normalized)) return palette[3];
  if (/(emo|post|gaze|ambient|shoegaze)/.test(normalized)) return palette[2];
  if (/(pop|punk|trap|rap)/.test(normalized)) return '#fb7185';
  if (/(rock|alternative|indie)/.test(normalized)) return '#f59e0b';

  return palette[0];
}

function buildWavePath(index: number, amplitude: number, density: number) {
  const baseY = 132 + index * 86;
  const phase = index * 0.82 + density * 1.7;
  const points: string[] = [];

  for (let x = -40; x <= 1240; x += 64) {
    const harmonic = Math.sin((x / 1200) * Math.PI * (2.1 + density) + phase);
    const undertone = Math.cos((x / 1200) * Math.PI * (3.2 + index * 0.18) - phase);
    const y = baseY + harmonic * amplitude + undertone * amplitude * 0.28;
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return `M ${points.join(' L ')}`;
}

function buildNodes(density: number) {
  const count = Math.round(12 + density * 18);

  return Array.from({ length: count }, (_, id): NodePoint => {
    const xSeed = seededRatio(id + 11);
    const ySeed = seededRatio(id + 71);
    const rSeed = seededRatio(id + 137);

    return {
      id,
      x: 60 + xSeed * 1080,
      y: 56 + ySeed * 688,
      r: 1.4 + rSeed * 3.6,
      delay: seededRatio(id + 211) * -8,
      colorSlot: id % 4,
    };
  });
}

function buildSpectrumBars(density: number, amplitude: number) {
  const count = 34;

  return Array.from({ length: count }, (_, id): SpectrumBar => {
    const wave = Math.sin(id * 0.72 + density * 3.4);
    const pulse = Math.cos(id * 0.31);
    const height = clamp(20 + (wave + 1) * amplitude * 0.72 + pulse * 10, 14, 108);

    return {
      id,
      x: 32 + id * 34,
      height,
      delay: id * -0.11,
      colorSlot: id % 4,
    };
  });
}

function buildHaloRings(density: number, amplitude: number) {
  const count = Math.round(4 + density * 4);

  return Array.from({ length: count }, (_, id): HaloRing => {
    const xSeed = seededRatio(id + 401);
    const ySeed = seededRatio(id + 509);
    const rSeed = seededRatio(id + 613);

    return {
      id,
      cx: 160 + xSeed * 880,
      cy: 110 + ySeed * 540,
      r: 54 + rSeed * (88 + amplitude),
      delay: seededRatio(id + 719) * -18,
      colorSlot: id % 4,
    };
  });
}

export default function DynamicMuseumBackground({ activeTab, data }: DynamicMuseumBackgroundProps) {
  const { tc } = useApp();
  const section = SECTION_VISUALS[activeTab] ?? SECTION_VISUALS.dashboard;
  const palette = [tc.c1, tc.c2, tc.c3, tc.c4];

  const topGenre = data.top_genres?.[0];
  const topArtistTotal = data.top_artists?.slice(0, 10).reduce((sum, artist) => sum + artist.plays, 0) || 1;
  const topArtistShare = clamp((data.top_artists?.[0]?.plays ?? 0) / topArtistTotal, 0.08, 0.38);
  const totalPlays = data.core_metrics?.total_plays || 1;
  const genreWeight = clamp((topGenre?.plays ?? 0) / totalPlays, 0.08, 0.42);
  const nightRows = data.heatmap?.slice(0, 6) ?? [];
  const nightTotal = nightRows.flat().reduce((sum, value) => sum + value, 0);
  const heatTotal = data.heatmap?.flat().reduce((sum, value) => sum + value, 0) || 1;
  const nightRatio = clamp(nightTotal / heatTotal, 0.1, 0.7);
  const genreTint = getGenreTint(topGenre?.name, palette);
  const modeOpacity = tc.mode === 'light' ? 0.34 : 0.78;

  const wavePaths = useMemo(
    () => Array.from({ length: 7 }, (_, index) => buildWavePath(index, section.amplitude, section.density)),
    [section.amplitude, section.density],
  );

  const nodes = useMemo(() => buildNodes(section.density), [section.density]);
  const spectrumBars = useMemo(() => buildSpectrumBars(section.density, section.amplitude), [section.density, section.amplitude]);
  const haloRings = useMemo(() => buildHaloRings(section.density, section.amplitude), [section.amplitude, section.density]);

  const style = {
    '--museum-c1': palette[0],
    '--museum-c2': palette[1],
    '--museum-c3': palette[2],
    '--museum-c4': palette[3],
    '--museum-genre': genreTint,
    '--museum-bg': tc.bg,
    '--museum-opacity': modeOpacity,
    '--museum-density': section.density,
    '--museum-tempo': `${section.tempo}s`,
    '--museum-angle': `${section.angle}deg`,
    '--museum-genre-weight': genreWeight,
    '--museum-night-ratio': nightRatio,
    '--museum-top-share': topArtistShare,
  } as React.CSSProperties & Record<`--${string}`, string | number>;

  return (
    <div className="dynamic-museum-background absolute inset-0 pointer-events-none z-0 overflow-hidden" style={style} aria-hidden="true">
      <div className="dynamic-museum-grid" />
      <div className="dynamic-museum-field dynamic-museum-field-a" />
      <div className="dynamic-museum-field dynamic-museum-field-b" />
      <div className="dynamic-museum-stage" />
      <div className="dynamic-museum-beam dynamic-museum-beam-a" />
      <div className="dynamic-museum-beam dynamic-museum-beam-b" />
      <div className="dynamic-museum-scanlines" />
      <AnimatedParticles
        count={section.particleCount}
        intensity={section.particleIntensity}
        className="dynamic-museum-particles"
      />

      <svg className="dynamic-museum-svg" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id="museumWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--museum-c1)" stopOpacity="0" />
            <stop offset="22%" stopColor="var(--museum-c1)" stopOpacity="0.72" />
            <stop offset="52%" stopColor="var(--museum-genre)" stopOpacity="0.92" />
            <stop offset="82%" stopColor="var(--museum-c3)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--museum-c4)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="museumTimelineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--museum-c2)" stopOpacity="0" />
            <stop offset="35%" stopColor="var(--museum-c2)" stopOpacity="0.5" />
            <stop offset="68%" stopColor="var(--museum-c4)" stopOpacity="0.46" />
            <stop offset="100%" stopColor="var(--museum-c1)" stopOpacity="0" />
          </linearGradient>
          <filter id="museumSoftGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="dynamic-museum-waves" filter="url(#museumSoftGlow)">
          {wavePaths.map((path, index) => (
            <path
              key={path}
              d={path}
              className="dynamic-museum-wave"
              style={{
                animationDuration: `${section.tempo + index * 2}s`,
                animationDelay: `${index * -1.2}s`,
                opacity: (0.2 + index * 0.045) * modeOpacity,
              }}
            />
          ))}
        </g>

        <g className="dynamic-museum-timeline">
          {[0, 1, 2, 3, 4].map(index => (
            <line
              key={index}
              x1={160 + index * 218}
              x2={160 + index * 218 + section.angle * 2}
              y1="20"
              y2="780"
              className="dynamic-museum-timebeam"
              style={{ animationDelay: `${index * -1.7}s`, opacity: (0.1 + section.density * 0.18) * modeOpacity }}
            />
          ))}
        </g>

        <g className="dynamic-museum-rings" filter="url(#museumSoftGlow)">
          {haloRings.map(ring => (
            <circle
              key={ring.id}
              cx={ring.cx}
              cy={ring.cy}
              r={ring.r}
              className="dynamic-museum-ring"
              style={{
                stroke: palette[ring.colorSlot],
                animationDelay: `${ring.delay}s`,
                opacity: (0.055 + section.density * 0.12 + topArtistShare * 0.16) * modeOpacity,
              }}
            />
          ))}
        </g>

        <g className="dynamic-museum-constellation">
          {nodes.slice(1).map((node, index) => {
            const previous = nodes[index];
            const distance = Math.hypot(node.x - previous.x, node.y - previous.y);
            if (distance > 340) return null;

            return (
              <line
                key={`${previous.id}-${node.id}`}
                x1={previous.x}
                y1={previous.y}
                x2={node.x}
                y2={node.y}
                className="dynamic-museum-link"
                style={{ opacity: clamp((340 - distance) / 900, 0.025, 0.2) * modeOpacity }}
              />
            );
          })}
          {nodes.map(node => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={node.r}
              className="dynamic-museum-node"
              style={{
                fill: palette[node.colorSlot],
                animationDelay: `${node.delay}s`,
                opacity: (0.28 + section.density * 0.32) * modeOpacity,
              }}
            />
          ))}
        </g>

        <g className="dynamic-museum-spectrum">
          {spectrumBars.map(bar => (
            <rect
              key={bar.id}
              x={bar.x}
              y={790 - bar.height}
              width="10"
              height={bar.height}
              rx="5"
              className="dynamic-museum-bar"
              style={{
                fill: palette[bar.colorSlot],
                animationDelay: `${bar.delay}s`,
                opacity: (0.17 + section.density * 0.22) * modeOpacity,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
