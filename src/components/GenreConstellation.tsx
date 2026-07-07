import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, HelpCircle, Star } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';

interface GenreConstellationProps {
  data: MusicDnaData;
}

interface ConstellationNode {
  name: string;
  plays: number;
  r: number;
  cx: number;
  cy: number;
  colorFrom: string;
  colorTo: string;
  angle: number;
  orbit: number;
}

const GENRE_COLORS: Record<string, { from: string; to: string }> = {
  'Metalcore':              { from: '#7c2d12', to: '#fbbf24' },
  'Post-Hardcore':          { from: '#083344', to: '#67e8f9' },
  'Post-Metal / Blackgaze': { from: '#1e1b4b', to: '#a5b4fc' },
  'Synthwave / Darksynth':  { from: '#2e1065', to: '#22d3ee' },
  'Pop Punk / Emo':         { from: '#500724', to: '#f9a8d4' },
  'Emo Rap / Trap':         { from: '#1e1b2e', to: '#c4b5fd' },
  'Hard Rock':              { from: '#450a0a', to: '#fbbf24' },
  'Progressive Metal':      { from: '#0c4a6e', to: '#5eead4' },
  'Ambient / Lo-Fi':        { from: '#312e81', to: '#ddd6fe' },
  'Death Metal':            { from: '#000000', to: '#ef4444' },
  'Pop / Indie':            { from: '#831843', to: '#fde68a' },
  'Israeli Rock':           { from: '#1e3a8a', to: '#bfdbfe' },
  'Hip-Hop / Rap':          { from: '#000000', to: '#fbbf24' },
  'Heavy Metal':            { from: '#18181b', to: '#d4d4d8' },
  'Alternative Rock':       { from: '#052e16', to: '#86efac' },
  'Alternative':            { from: '#4c1d95', to: '#fbbf24' },
  'Unclassified':           { from: '#1f2937', to: '#9ca3af' },
};

export default function GenreConstellation({ data }: GenreConstellationProps) {
  const { lang } = useApp();
  const L = lang === 'en';
  const locale = L ? 'en-US' : 'es-ES';

  const [hoveredNode, setHoveredNode] = useState<ConstellationNode | null>(null);

  // Compute the concentric layout coordinates
  const nodes: ConstellationNode[] = useMemo(() => {
    // Sort genres by plays and take the top 13 (1 central + 5 inner orbit + 7 outer orbit)
    const topGenres = [...data.top_genres]
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 13);

    if (topGenres.length === 0) return [];

    const center = 250; // SVG center point (500x500 viewport)
    const maxPlays = topGenres[0].plays || 1;
    const computedNodes: ConstellationNode[] = [];

    topGenres.forEach((g, idx) => {
      // Scale radius of bubble by plays relative to the max plays
      const r = 20 + Math.round((g.plays / maxPlays) * 32);
      const colors = GENRE_COLORS[g.name] || GENRE_COLORS['Unclassified'];

      if (idx === 0) {
        // Central supermassive bubble
        computedNodes.push({
          name: g.name,
          plays: g.plays,
          r,
          cx: center,
          cy: center,
          colorFrom: colors.from,
          colorTo: colors.to,
          angle: 0,
          orbit: 0,
        });
      } else if (idx <= 5) {
        // Inner Orbit (125px radius, 5 nodes arranged evenly)
        const orbitRadius = 120;
        const angle = ((idx - 1) * 360) / 5 - 90; // offset by -90 to start top-center
        const rad = (angle * Math.PI) / 180;
        computedNodes.push({
          name: g.name,
          plays: g.plays,
          r,
          cx: center + Math.round(orbitRadius * Math.cos(rad)),
          cy: center + Math.round(orbitRadius * Math.sin(rad)),
          colorFrom: colors.from,
          colorTo: colors.to,
          angle,
          orbit: 1,
        });
      } else {
        // Outer Orbit (210px radius, 7 nodes arranged evenly)
        const orbitRadius = 205;
        const angle = ((idx - 6) * 360) / 7 - 45; // stagger angle offset
        const rad = (angle * Math.PI) / 180;
        computedNodes.push({
          name: g.name,
          plays: g.plays,
          r,
          cx: center + Math.round(orbitRadius * Math.cos(rad)),
          cy: center + Math.round(orbitRadius * Math.sin(rad)),
          colorFrom: colors.from,
          colorTo: colors.to,
          angle,
          orbit: 2,
        });
      }
    });

    return computedNodes;
  }, [data.top_genres]);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden flex flex-col items-center">
      <div className="absolute top-0 left-0 w-36 h-36 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none" />
      
      {/* Title block */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Orbit className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
              {L ? 'The Genre Constellation' : 'La Constelación de Géneros'}
            </h3>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              {L ? 'Concentric orbital map of your top listening genres' : 'Mapa orbital concéntrico de tus géneros más escuchados'}
            </p>
          </div>
        </div>
      </div>

      {/* SVG Viewport */}
      <div className="w-full max-w-[480px] aspect-square relative select-none">
        <svg viewBox="0 0 500 500" className="w-full h-full relative z-10 overflow-visible">
          {/* Gradients declarations */}
          <defs>
            {nodes.map(n => {
              const id = `constell-grad-${n.name.replace(/[^a-zA-Z0-9]/g, '')}`;
              return (
                <radialGradient id={id} key={id} cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor={n.colorTo} />
                  <stop offset="60%" stopColor={n.colorFrom} />
                  <stop offset="100%" stopColor="#000000" stopOpacity={0.8} />
                </radialGradient>
              );
            })}
          </defs>

          {/* Background Orbit Tracks */}
          <circle cx="250" cy="250" r="120" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth={1} strokeDasharray="3 4" />
          <circle cx="250" cy="250" r="205" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth={1} strokeDasharray="5 6" />

          {/* Connection Lines (Constellation Paths) */}
          {nodes.map((n, i) => {
            if (n.orbit === 0) return null;
            return (
              <line
                key={`line-${i}`}
                x1="250"
                y1="250"
                x2={n.cx}
                y2={n.cy}
                stroke="rgba(167, 139, 250, 0.12)" // Translucent purple
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            );
          })}

          {/* Render Nodes */}
          {nodes.map((n, i) => {
            const gradId = `constell-grad-${n.name.replace(/[^a-zA-Z0-9]/g, '')}`;
            const isHovered = hoveredNode?.name === n.name;

            return (
              <g
                key={`node-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(n)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Floating glow ring on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.circle
                      initial={{ opacity: 0, r: n.r + 2 }}
                      animate={{ opacity: 0.6, r: n.r + 8 }}
                      exit={{ opacity: 0 }}
                      cx={n.cx}
                      cy={n.cy}
                      fill="none"
                      stroke={n.colorTo}
                      strokeWidth={1.5}
                      className="pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Main Bubble */}
                <circle
                  cx={n.cx}
                  cy={n.cy}
                  r={n.r}
                  fill={`url(#${gradId})`}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={isHovered ? 1.5 : 1}
                  className="transition-all duration-300"
                />

                {/* Genre Label abbreviation inside the bubble */}
                <text
                  x={n.cx}
                  y={n.cy + 3}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={n.r < 30 ? "8px" : "9px"}
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="pointer-events-none drop-shadow"
                  fillOpacity={n.r < 25 && !isHovered ? 0 : 0.9}
                >
                  {n.name.length > 10 ? `${n.name.substring(0, 8)}..` : n.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Details Panel Overlay (Cyberpunk Center Display) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-[140px] h-[140px] rounded-full bg-[#030712]/90 border border-purple-500/25 flex flex-col items-center justify-center p-3 text-center shadow-lg backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {hoveredNode ? (
                <motion.div
                  key={hoveredNode.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <Star className="w-4 h-4 mb-1" style={{ color: hoveredNode.colorTo }} />
                  <p className="text-[10px] font-mono font-bold text-white leading-tight uppercase max-h-[48px] overflow-hidden truncate w-28">
                    {hoveredNode.name}
                  </p>
                  <p className="text-xs font-mono font-black mt-1" style={{ color: hoveredNode.colorTo }}>
                    {hoveredNode.plays.toLocaleString(locale)}
                  </p>
                  <span className="text-[9px] font-mono text-gray-500 uppercase mt-0.5">
                    {L ? 'Plays' : 'Escuchas'}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <Orbit className="w-5 h-5 text-gray-600 animate-spin" style={{ animationDuration: '24s' }} />
                  <span className="text-[8px] font-mono text-gray-500 uppercase mt-2 w-24 leading-relaxed">
                    {L ? 'Hover nodes to decode data' : 'Pasa el cursor por las estrellas'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-gray-500 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>
            {L ? 'Interactive star-scale maps top 13 genres' : 'El mapa estelar grafica los 13 géneros principales'}
          </span>
        </div>
      </div>
    </div>
  );
}
