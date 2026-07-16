import React, { useId, useMemo } from 'react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import AnimatedParticles from './AnimatedParticles';
import { museumVisualFor, type MotionMode } from './museumVisualIdentity';

interface DynamicMuseumBackgroundProps {
  activeTab: string;
  data: MusicDnaData;
  motionMode?: MotionMode;
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

export default function DynamicMuseumBackground({
  activeTab,
  data,
  motionMode = 'calm',
}: DynamicMuseumBackgroundProps) {
  const { tc } = useApp();
  const reactId = useId().replaceAll(':', '');
  const identity = museumVisualFor(activeTab);
  const section = identity.background;
  const palette = [identity.palette[0], identity.palette[1], identity.palette[2], tc.c4];

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
  const visibleWaves = wavePaths.slice(0, motionMode === 'expressive' ? 6 : motionMode === 'calm' ? 4 : 3);
  const visibleNodes = nodes.slice(0, motionMode === 'expressive' ? nodes.length : motionMode === 'calm' ? 12 : 7);
  const visibleBars = spectrumBars.slice(0, motionMode === 'expressive' ? 28 : motionMode === 'calm' ? 18 : 12);
  const visibleRings = haloRings.slice(0, motionMode === 'expressive' ? 5 : motionMode === 'calm' ? 3 : 2);
  const waveGradientId = `museum-wave-${reactId}`;
  const timelineGradientId = `museum-timeline-${reactId}`;
  const glowId = `museum-glow-${reactId}`;

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
    <div
      className="dynamic-museum-background absolute inset-0 pointer-events-none z-0 overflow-hidden"
      style={style}
      data-family={identity.family}
      data-motion={motionMode}
      aria-hidden="true"
    >
      <div className="dynamic-museum-grid" />
      <div className="dynamic-museum-field dynamic-museum-field-a" />
      <div className="dynamic-museum-field dynamic-museum-field-b" />
      <div className="dynamic-museum-stage" />
      <div className="dynamic-museum-beam dynamic-museum-beam-a" />
      <div className="dynamic-museum-beam dynamic-museum-beam-b" />
      <div className="dynamic-museum-scanlines" />
      {motionMode === 'expressive' && activeTab !== 'hero' ? (
        <AnimatedParticles
          count={section.particleCount}
          intensity={section.particleIntensity}
          className="dynamic-museum-particles"
        />
      ) : null}

      <svg className="dynamic-museum-svg" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id={waveGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--museum-c1)" stopOpacity="0" />
            <stop offset="22%" stopColor="var(--museum-c1)" stopOpacity="0.72" />
            <stop offset="52%" stopColor="var(--museum-genre)" stopOpacity="0.92" />
            <stop offset="82%" stopColor="var(--museum-c3)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--museum-c4)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={timelineGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--museum-c2)" stopOpacity="0" />
            <stop offset="35%" stopColor="var(--museum-c2)" stopOpacity="0.5" />
            <stop offset="68%" stopColor="var(--museum-c4)" stopOpacity="0.46" />
            <stop offset="100%" stopColor="var(--museum-c1)" stopOpacity="0" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="dynamic-museum-waves" filter={`url(#${glowId})`}>
          {visibleWaves.map((path, index) => (
            <path
              key={path}
              d={path}
              className="dynamic-museum-wave"
              stroke={`url(#${waveGradientId})`}
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
              stroke={`url(#${timelineGradientId})`}
              style={{ animationDelay: `${index * -1.7}s`, opacity: (0.1 + section.density * 0.18) * modeOpacity }}
            />
          ))}
        </g>

        <g className="dynamic-museum-rings" filter={`url(#${glowId})`}>
          {visibleRings.map(ring => (
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
          {visibleNodes.slice(1).map((node, index) => {
            const previous = visibleNodes[index];
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
          {visibleNodes.map(node => (
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
          {visibleBars.map(bar => (
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
