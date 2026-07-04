import React, { useEffect, useRef } from 'react';
import { EMOTIONAL_MOOD_TAXONOMY, type EmotionalMoodKey } from '../engines/emotionalEngine';
import { randomFromString } from '../utils/seededRandom';

/**
 * Deterministic generative artwork per emotional mood. Every piece is painted
 * from (moodKey + seed) with a seeded PRNG: the same archive always produces
 * the same gallery, and no external image is ever drawn (canvas stays
 * same-origin, so PNG export never taints).
 */

interface MoodArtCanvasProps {
  moodKey: EmotionalMoodKey;
  seed: string;
  width: number;
  height: number;
  className?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Rotate a hex color's hue by `deg` degrees (keeps s/l), for palette accents. */
function shiftHue(hex: string, deg: number): string {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  h = (h + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
}

export function paintMoodArt(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  moodKey: EmotionalMoodKey,
  seed: string,
): void {
  const mood = EMOTIONAL_MOOD_TAXONOMY[moodKey];
  const rnd = randomFromString(`${moodKey}:${seed}`);
  const c1 = mood.color;
  const c2 = shiftHue(c1, 40);
  const c3 = shiftHue(c1, -45);

  // Shared night-lab base: deep navy tinted with the mood color.
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#060b16');
  base.addColorStop(1, '#03060d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const tint = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.8);
  tint.addColorStop(0, rgba(c1, 0.14));
  tint.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);

  switch (moodKey) {
    case 'melancolia': {
      // Slow translucent waves + drifting fog orbs.
      for (let layer = 0; layer < 5; layer++) {
        const baseY = h * (0.3 + layer * 0.14);
        const amp = h * (0.04 + rnd() * 0.05);
        const freq = 1.5 + rnd() * 2.5;
        const phase = rnd() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= w; x += 4) {
          ctx.lineTo(x, baseY + Math.sin((x / w) * Math.PI * freq + phase) * amp);
        }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        ctx.fillStyle = rgba(layer % 2 ? c1 : c3, 0.05 + layer * 0.02);
        ctx.fill();
      }
      for (let i = 0; i < 9; i++) {
        const x = rnd() * w, y = rnd() * h * 0.6, r = 8 + rnd() * 34;
        const fog = ctx.createRadialGradient(x, y, 0, x, y, r);
        fog.addColorStop(0, rgba(c1, 0.16));
        fog.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fog;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      break;
    }
    case 'energia': {
      // Jagged radial bolts bursting from an off-center core.
      const cx = w * (0.35 + rnd() * 0.3), cy = h * (0.35 + rnd() * 0.3);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.35);
      core.addColorStop(0, rgba(c1, 0.5));
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {
        const angle = rnd() * Math.PI * 2;
        const len = Math.min(w, h) * (0.3 + rnd() * 0.55);
        let x = cx, y = cy;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segments = 4 + Math.floor(rnd() * 4);
        for (let s = 1; s <= segments; s++) {
          const dist = (len / segments) * s;
          const jitter = (rnd() - 0.5) * len * 0.22;
          x = cx + Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * jitter;
          y = cy + Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * jitter;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(i % 3 === 0 ? c2 : c1, 0.28 + rnd() * 0.4);
        ctx.lineWidth = 1 + rnd() * 2.4;
        ctx.stroke();
      }
      break;
    }
    case 'dopamina': {
      // Confetti field: dots, squares and rings in rotated palette hues.
      for (let i = 0; i < 130; i++) {
        const x = rnd() * w, y = rnd() * h;
        const size = 1.5 + rnd() * 6.5;
        const color = [c1, c2, c3, shiftHue(c1, 150)][Math.floor(rnd() * 4)];
        const alpha = 0.25 + rnd() * 0.6;
        const kind = rnd();
        if (kind < 0.55) {
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = rgba(color, alpha);
          ctx.fill();
        } else if (kind < 0.82) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rnd() * Math.PI);
          ctx.fillStyle = rgba(color, alpha);
          ctx.fillRect(-size, -size / 2, size * 2, size);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, size + 2, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(color, alpha * 0.8);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      break;
    }
    case 'calma': {
      // Concentric breathing rings + orbiting points.
      const cx = w / 2, cy = h / 2;
      const rings = 9;
      for (let i = 1; i <= rings; i++) {
        const radius = (Math.min(w, h) / 2) * (i / rings) * (0.92 + rnd() * 0.1);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(i % 3 === 0 ? c2 : c1, 0.1 + (1 - i / rings) * 0.3);
        ctx.lineWidth = i % 3 === 0 ? 1.8 : 0.9;
        ctx.stroke();
        const dots = 1 + Math.floor(rnd() * 3);
        for (let d = 0; d < dots; d++) {
          const a = rnd() * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, 1.6 + rnd() * 2, 0, Math.PI * 2);
          ctx.fillStyle = rgba(c1, 0.5 + rnd() * 0.4);
          ctx.fill();
        }
      }
      break;
    }
    case 'nostalgia': {
      // Retro sunset bands with a scanlined low sun and film grain.
      const horizon = h * 0.62;
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, rgba(c3, 0.25));
      sky.addColorStop(1, rgba(c2, 0.3));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon);
      const sunR = Math.min(w, h) * (0.2 + rnd() * 0.08);
      const sunX = w * (0.3 + rnd() * 0.4);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, horizon, sunR, Math.PI, 0);
      ctx.closePath();
      ctx.clip();
      const sun = ctx.createLinearGradient(0, horizon - sunR, 0, horizon);
      sun.addColorStop(0, rgba(c1, 0.85));
      sun.addColorStop(1, rgba(c2, 0.55));
      ctx.fillStyle = sun;
      ctx.fillRect(sunX - sunR, horizon - sunR, sunR * 2, sunR);
      ctx.fillStyle = 'rgba(4, 7, 14, 0.85)';
      for (let y = horizon - sunR * 0.6; y < horizon; y += 7) {
        ctx.fillRect(sunX - sunR, y, sunR * 2, 2 + (y - horizon + sunR) * 0.02);
      }
      ctx.restore();
      for (let i = 0; i < 5; i++) {
        const y = horizon + ((h - horizon) / 5) * i + 4;
        ctx.fillStyle = rgba(i % 2 ? c1 : c3, 0.08 + i * 0.014);
        ctx.fillRect(0, y, w, (h - horizon) / 9);
      }
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = rgba('#ffffff', rnd() * 0.09);
        ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
      }
      break;
    }
    case 'rebeldia': {
      // Torn diagonal slashes with one defiant bright cut.
      for (let i = 0; i < 20; i++) {
        const x0 = rnd() * w * 1.2 - w * 0.1;
        const y0 = -10;
        const drift = (rnd() - 0.3) * w * 0.5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + drift + (rnd() - 0.5) * 30, h + 10);
        ctx.strokeStyle = rgba(i % 4 === 0 ? c2 : c1, 0.1 + rnd() * 0.3);
        ctx.lineWidth = 0.8 + rnd() * 5;
        ctx.stroke();
      }
      const cutX = w * (0.25 + rnd() * 0.5);
      ctx.beginPath();
      ctx.moveTo(cutX, -10);
      ctx.lineTo(cutX + w * 0.22, h + 10);
      ctx.strokeStyle = rgba(c1, 0.9);
      ctx.lineWidth = 2.6;
      ctx.shadowColor = rgba(c1, 0.8);
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case 'futurismo': {
      // Perspective grid rolling to a glowing horizon under a starfield.
      const horizon = h * (0.42 + rnd() * 0.1);
      for (let i = 0; i < 46; i++) {
        ctx.fillStyle = rgba('#ffffff', 0.12 + rnd() * 0.5);
        ctx.fillRect(rnd() * w, rnd() * horizon * 0.94, 1.2, 1.2);
      }
      ctx.fillStyle = rgba(c1, 0.5);
      ctx.fillRect(0, horizon - 1, w, 2);
      const glow = ctx.createLinearGradient(0, horizon - 22, 0, horizon);
      glow.addColorStop(0, 'rgba(0,0,0,0)');
      glow.addColorStop(1, rgba(c1, 0.4));
      ctx.fillStyle = glow;
      ctx.fillRect(0, horizon - 22, w, 22);
      const vpx = w * (0.35 + rnd() * 0.3);
      for (let i = -9; i <= 9; i++) {
        ctx.beginPath();
        ctx.moveTo(vpx, horizon);
        ctx.lineTo(w / 2 + i * (w / 7), h + 20);
        ctx.strokeStyle = rgba(c1, 0.22);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (let i = 1; i <= 7; i++) {
        const y = horizon + (h - horizon) * Math.pow(i / 7, 1.9);
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y);
        ctx.strokeStyle = rgba(i % 2 ? c1 : c3, 0.16 + i * 0.028);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      break;
    }
    case 'romanticismo': {
      // Soft bezier petals orbiting a warm heart of light + bokeh.
      const cx = w / 2, cy = h * 0.52;
      const heart = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.35);
      heart.addColorStop(0, rgba(c1, 0.32));
      heart.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = heart;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + rnd() * 0.4;
        const reach = Math.min(w, h) * (0.24 + rnd() * 0.2);
        const tipX = cx + Math.cos(angle) * reach;
        const tipY = cy + Math.sin(angle) * reach;
        const spread = 0.55 + rnd() * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(
          cx + Math.cos(angle - spread) * reach * 0.75,
          cy + Math.sin(angle - spread) * reach * 0.75,
          tipX, tipY,
        );
        ctx.quadraticCurveTo(
          cx + Math.cos(angle + spread) * reach * 0.75,
          cy + Math.sin(angle + spread) * reach * 0.75,
          cx, cy,
        );
        ctx.fillStyle = rgba(i % 3 === 0 ? c2 : c1, 0.07 + rnd() * 0.08);
        ctx.fill();
      }
      for (let i = 0; i < 14; i++) {
        const x = rnd() * w, y = rnd() * h, r = 2 + rnd() * 8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(c3, 0.05 + rnd() * 0.12);
        ctx.fill();
      }
      break;
    }
  }

  // Shared vignette so every piece sits in the same museum lighting.
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

export default function MoodArtCanvas({ moodKey, seed, width, height, className = '' }: MoodArtCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintMoodArt(ctx, width, height, moodKey, seed);
  }, [moodKey, seed, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label={`${moodKey} generative art`}
    />
  );
}
