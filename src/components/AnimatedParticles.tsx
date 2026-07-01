/**
 * AnimatedParticles — Full-screen floating particle background.
 * Renders pure CSS-animated particles using the current theme colors.
 * Use as an absolute-positioned layer behind content.
 */
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

interface Props {
  count?: number;
  intensity?: 'subtle' | 'medium' | 'vivid';
  className?: string;
}

type Shape = 'circle' | 'ring' | 'star' | 'diamond';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  shape: Shape;
  duration: number;
  delay: number;
  opacity: number;
}

const SHAPES: Shape[] = ['circle', 'ring', 'star', 'diamond'];

export default function AnimatedParticles({ count = 40, intensity = 'medium', className = '' }: Props) {
  const { tc } = useApp();

  const opacityMap = { subtle: 0.15, medium: 0.35, vivid: 0.6 };
  const maxOpacity = opacityMap[intensity];

  const palette = [tc.c1, tc.c2, tc.c3, tc.c4, '#ffffff'];

  // Deterministic pseudo-random using index as seed
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed1 = ((i * 1664525 + 1013904223) >>> 0) / 4294967296;
      const seed2 = (((i + 37) * 22695477 + 1) >>> 0) / 4294967296;
      const seed3 = (((i + 71) * 134775813 + 1) >>> 0) / 4294967296;
      return {
        id: i,
        x: seed1 * 100,
        y: seed2 * 100,
        size: 2 + seed3 * 5,
        color: palette[i % palette.length],
        shape: SHAPES[i % SHAPES.length],
        duration: 5 + seed1 * 15,
        delay: seed2 * -15,
        opacity: 0.05 + seed3 * maxOpacity,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, intensity, tc.c1, tc.c2, tc.c3, tc.c4]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
            ...(p.shape === 'circle' ? {
              borderRadius: '50%',
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}80`,
            } : p.shape === 'ring' ? {
              borderRadius: '50%',
              border: `1px solid ${p.color}`,
              backgroundColor: 'transparent',
            } : p.shape === 'diamond' ? {
              transform: 'rotate(45deg)',
              backgroundColor: p.color,
            } : {
              // star shape via clip-path
              clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              backgroundColor: p.color,
              width: `${p.size * 1.5}px`,
              height: `${p.size * 1.5}px`,
            }),
          }}
        />
      ))}
    </div>
  );
}
