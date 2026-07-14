import React, { useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MusicDnaData } from '../types';
import { buildCoreArtistMoodProfile, EMOTIONAL_MOOD_TAXONOMY } from '../engines/moodCore';

interface InteractiveBackdropProps {
  data: MusicDnaData;
}

const SONIC_CARTOGRAPHY_URL = `${import.meta.env.BASE_URL}visuals/sonic-cartography-bg-v2.jpg`;

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  currentColor: string; // Lerped color
  targetColor: string;  // Destination color
}

// Simple color linear interpolation
function lerpColor(c1: string, c2: string, amt: number): string {
  const cleanHex = (h: string) => {
    let clean = h.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(char => char + char).join('');
    }
    return clean;
  };

  try {
    const h1 = cleanHex(c1);
    const h2 = cleanHex(c2);

    const r1 = parseInt(h1.substring(0, 2), 16);
    const g1 = parseInt(h1.substring(2, 4), 16);
    const b1 = parseInt(h1.substring(4, 6), 16);

    const r2 = parseInt(h2.substring(0, 2), 16);
    const g2 = parseInt(h2.substring(2, 4), 16);
    const b2 = parseInt(h2.substring(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * amt);
    const g = Math.round(g1 + (g2 - g1) * amt);
    const b = Math.round(b1 + (b2 - b1) * amt);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return c2; // Fallback
  }
}

export default function InteractiveBackdrop({ data }: InteractiveBackdropProps) {
  const { tc, selectedArtistName, selectedAlbumKey, selectedTrackKey } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  // Determine active colors based on selection or fallback to theme colors
  let primaryDossierColor: string | null = null;
  if (selectedTrackKey && data.top_tracks) {
    const match = data.top_tracks.find(t => `${t.artist.toLowerCase()}|||${t.title.toLowerCase()}` === selectedTrackKey);
    if (match) {
      const artMatch = data.top_artists.find(a => a.name.toLowerCase() === match.artist.toLowerCase());
      const profile = buildCoreArtistMoodProfile({ name: match.artist, plays: match.plays, genre: artMatch?.genre || '', country: '' });
      primaryDossierColor = EMOTIONAL_MOOD_TAXONOMY[profile.moodKey].color;
    }
  } else if (selectedAlbumKey && data.top_albums) {
    const match = data.top_albums.find(a => `${a.artist.toLowerCase()}|||${a.title.toLowerCase()}` === selectedAlbumKey);
    if (match) {
      const artMatch = data.top_artists.find(a => a.name.toLowerCase() === match.artist.toLowerCase());
      const profile = buildCoreArtistMoodProfile({ name: match.artist, plays: match.plays, genre: artMatch?.genre || '', country: '' });
      primaryDossierColor = EMOTIONAL_MOOD_TAXONOMY[profile.moodKey].color;
    }
  } else if (selectedArtistName && data.top_artists) {
    const match = data.top_artists.find(a => a.name === selectedArtistName);
    if (match) {
      const profile = buildCoreArtistMoodProfile(match);
      primaryDossierColor = EMOTIONAL_MOOD_TAXONOMY[profile.moodKey].color;
    }
  }

  // Target palette
  const targetPalette = useMemo(() => primaryDossierColor 
    ? [primaryDossierColor, tc.c1, primaryDossierColor] // Blend theme with artist colors
    : [tc.c1, tc.c2, tc.c3], [primaryDossierColor, tc.c1, tc.c2, tc.c3]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Half-resolution is enough behind the 75px blur. The loop is capped at
    // 30fps and fully pauses while the tab is hidden or motion is reduced.
    const scale = 0.5;
    const resize = () => {
      canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
    };
    resize();

    // Initial setup for blobs
    const blobs: Blob[] = targetPalette.map((color) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      radius: (200 + Math.random() * 100) * scale,
      currentColor: color,
      targetColor: color,
    }));

    // Mouse move tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX * scale,
        y: e.clientY * scale,
      };
    };
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = motionQuery.matches;
    let animationId: number | null = null;
    let lastFrame = 0;
    let time = 0;
    const frameInterval = 1000 / 30;

    const paint = (elapsedMs: number) => {
      const step = Math.min(elapsedMs / (1000 / 60), 2);
      time += elapsedMs * 0.00006;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render flat base background
      ctx.fillStyle = tc.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob, idx) => {
        // Sync target color to active index palette
        blob.targetColor = targetPalette[idx % targetPalette.length] || tc.c1;

        // Smoothly interpolate colors (lerp)
        if (blob.currentColor !== blob.targetColor) {
          blob.currentColor = lerpColor(blob.currentColor, blob.targetColor, 0.02);
        }

        // Autonomous drift
        blob.x += (blob.vx + Math.sin(time + idx) * 0.1) * step;
        blob.y += (blob.vy + Math.cos(time - idx) * 0.1) * step;

        // Bounce from boundaries
        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        // Mouse repelling physics
        const dx = blob.x - mouseRef.current.x;
        const dy = blob.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const activeRadius = 300 * scale;

        if (dist < activeRadius) {
          const force = (activeRadius - dist) / activeRadius;
          const angle = Math.atan2(dy, dx);
          blob.x += Math.cos(angle) * force * 3;
          blob.y += Math.sin(angle) * force * 3;
        }

        // Render blurred glowing aura radial gradient
        const grad = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius
        );
        grad.addColorStop(0, `${blob.currentColor}40`); // 25% opacity core
        grad.addColorStop(0.5, `${blob.currentColor}12`); // 7% opacity mid
        grad.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

    };

    const stop = () => {
      if (animationId === null) return;
      cancelAnimationFrame(animationId);
      animationId = null;
    };

    const animate = (timestamp: number) => {
      animationId = null;
      if (document.hidden || reduceMotion) return;

      if (!lastFrame) lastFrame = timestamp;
      const elapsed = timestamp - lastFrame;
      if (elapsed >= frameInterval) {
        paint(elapsed);
        lastFrame = timestamp - (elapsed % frameInterval);
      }
      animationId = requestAnimationFrame(animate);
    };

    const start = () => {
      if (animationId !== null || document.hidden || reduceMotion) return;
      lastFrame = 0;
      animationId = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      if (reduceMotion) {
        window.removeEventListener('mousemove', handleMouseMove);
        stop();
        paint(0);
      } else {
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        start();
      }
    };

    const handleResize = () => {
      resize();
      paint(0);
    };

    // Always paint a useful static backdrop before deciding whether to animate.
    paint(0);
    window.addEventListener('resize', handleResize);
    if (!reduceMotion) window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    motionQuery.addEventListener('change', handleMotionPreference);
    start();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      motionQuery.removeEventListener('change', handleMotionPreference);
      stop();
    };
  }, [tc, targetPalette]); // Re-run effect only when theme or target palette changes

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="sonic-cartography-backdrop"
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: [
            `linear-gradient(180deg, ${tc.bg}18 0%, ${tc.bg}72 72%, ${tc.bg}e8 100%)`,
            `radial-gradient(circle at 50% 20%, transparent 0%, ${tc.bg}18 46%, ${tc.bg}a8 100%)`,
            `url(${SONIC_CARTOGRAPHY_URL})`,
          ].join(', '),
          backgroundPosition: 'center, center, center top',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover, cover, cover',
          filter: tc.mode === 'light'
            ? 'saturate(0.72) contrast(0.92) brightness(1.18)'
            : 'saturate(1.08) contrast(1.04)',
          mixBlendMode: tc.mode === 'light' ? 'multiply' : 'screen',
          opacity: tc.mode === 'light' ? 0.075 : 0.28,
          transition: 'filter 500ms ease, opacity 500ms ease',
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        style={{
          filter: 'blur(75px)',
          mixBlendMode: tc.mode === 'light' ? 'multiply' : 'screen',
          // A full-strength multiply layer turns every light museum theme into a
          // dark veil. Keep just enough pigment for atmosphere while preserving
          // the intended paper-like luminance and text contrast.
          opacity: tc.mode === 'light' ? 0.22 : 1,
          transition: 'background-color 0.4s ease, opacity 0.4s ease',
        }}
      />
    </>
  );
}
