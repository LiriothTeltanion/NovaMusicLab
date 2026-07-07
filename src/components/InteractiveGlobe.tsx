import React, { useEffect, useRef, useState } from 'react';

interface CountryConfig {
  name: string;
  lat: number;
  lon: number;
  color: string;
  plays: number;
}

interface InteractiveGlobeProps {
  countries: { country: string; plays: number }[];
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
  lang: 'es' | 'en';
}

const COUNTRY_COORDS: Record<string, { lat: number; lon: number; color: string }> = {
  'United States': { lat: 37, lon: -95, color: '#3b82f6' },
  'United Kingdom': { lat: 55, lon: -3, color: '#ef4444' },
  'Sweden': { lat: 60, lon: 15, color: '#facc15' },
  'Finland': { lat: 62, lon: 26, color: '#06b6d4' },
  'Germany': { lat: 51, lon: 9, color: '#f97316' },
  'France': { lat: 46, lon: 2, color: '#8b5cf6' },
  'Israel': { lat: 31, lon: 34, color: '#10b981' },
  'Norway': { lat: 60, lon: 8, color: '#a78bfa' },
  'New Zealand': { lat: -41, lon: 174, color: '#34d399' },
  'Puerto Rico': { lat: 18, lon: -66, color: '#fb923c' },
  'Venezuela': { lat: 8, lon: -66, color: '#f43f5e' },
  'Dominican Republic': { lat: 19, lon: -70, color: '#ec4899' },
};

export default function InteractiveGlobe({
  countries,
  selectedCountry,
  onSelectCountry,
  lang,
}: InteractiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const [hoveredCountry, setHoveredCountry] = useState<CountryConfig | null>(null);

  // Map country play counts to coordinates config
  const mappedCountries: CountryConfig[] = React.useMemo(() => {
    return countries
      .map(c => {
        const coords = COUNTRY_COORDS[c.country];
        if (!coords) return null;
        return {
          name: c.country,
          lat: coords.lat,
          lon: coords.lon,
          color: coords.color,
          plays: c.plays,
        };
      })
      .filter(Boolean) as CountryConfig[];
  }, [countries]);

  // Dimensions
  const size = 300;
  const center = size / 2;
  const R = 115; // Globe radius

  // Auto-rotation effect
  useEffect(() => {
    if (isDragging) return;
    let animId: number;
    const tick = () => {
      setRotation(r => r + 0.0035);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isDragging]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartX.current;
      setRotation(r => r + deltaX * 0.006);
      dragStartX.current = e.clientX;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Latitude wireframes (horizontal lines)
  const latitudeRings = [];
  for (let lat = -60; lat <= 60; lat += 20) {
    const phi = (lat * Math.PI) / 180;
    const r = R * Math.cos(phi);
    const y = -R * Math.sin(phi);
    latitudeRings.push({ r, y });
  }

  // Longitude wireframes (ellipses representing spinning meridians)
  const longitudeAngles = [0, 30, 60, 90, 120, 150];
  const renderedMeridians = longitudeAngles.map(deg => {
    const angle = (deg * Math.PI) / 180 + rotation;
    const rx = R * Math.sin(angle);
    return { rx, visible: Math.abs(rx) > 1 };
  });

  // Project country points into 3D Cartesian space
  const projectedPoints = mappedCountries.map(c => {
    const phi = (c.lat * Math.PI) / 180;
    const theta = (c.lon * Math.PI) / 180;

    // Standard spherical projection rotated by current Y-rotation
    const x = R * Math.cos(phi) * Math.sin(theta + rotation);
    const y = -R * Math.sin(phi);
    const z = R * Math.cos(phi) * Math.cos(theta + rotation); // Depth

    return {
      config: c,
      x,
      y,
      z,
      visible: z >= -10, // Slight buffer to include edges cleanly
    };
  }).sort((a, b) => a.z - b.z); // Render back points first, front points on top

  return (
    <div className="flex flex-col items-center select-none" ref={containerRef}>
      {/* Globe SVG Container */}
      <div
        className={`relative cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            {/* Cyber 3D glass highlight radial gradient */}
            <radialGradient id="globeSphere" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.12} />
              <stop offset="50%" stopColor="#000000" stopOpacity={0} />
              <stop offset="100%" stopColor="#000000" stopOpacity={0.65} />
            </radialGradient>
            
            {/* Cyber ring grid shader */}
            <radialGradient id="globeCore" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#00f2fe" stopOpacity={0} />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.06} />
            </radialGradient>
          </defs>

          {/* Group translated to center coordinates */}
          <g transform={`translate(${center}, ${center})`}>
            
            {/* Sphere core background */}
            <circle cx="0" cy="0" r={R} fill="url(#globeCore)" />

            {/* Latitude Gridlines */}
            {latitudeRings.map((ring, idx) => (
              <line
                key={`lat-${idx}`}
                x1={-ring.r}
                y1={ring.y}
                x2={ring.r}
                y2={ring.y}
                stroke="#64748b"
                strokeWidth={0.8}
                strokeOpacity={0.18}
                strokeDasharray="3 3"
              />
            ))}

            {/* Longitude Gridlines (Ellipses) */}
            {renderedMeridians.map((meridian, idx) => meridian.visible && (
              <ellipse
                key={`lon-${idx}`}
                cx="0"
                cy="0"
                rx={Math.abs(meridian.rx)}
                ry={R}
                fill="none"
                stroke="#64748b"
                strokeWidth={0.8}
                strokeOpacity={0.18}
              />
            ))}

            {/* Render Country Hot-spots */}
            {projectedPoints.map(({ config, x, y, z }) => {
              const isSelected = selectedCountry === config.name;
              const isFront = z >= 0;
              
              return (
                <g
                  key={config.name}
                  transform={`translate(${x}, ${y})`}
                  className="transition-all duration-100"
                  style={{
                    opacity: isFront ? 1 : 0.22,
                    pointerEvents: isFront ? 'auto' : 'none',
                  }}
                  onMouseEnter={() => isFront && setHoveredCountry(config)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isFront) return;
                    onSelectCountry(isSelected ? null : config.name);
                  }}
                >
                  {/* Glowing halo pulse for active/hovered nodes */}
                  {isFront && (isSelected || hoveredCountry?.name === config.name) && (
                    <circle
                      cx="0"
                      cy="0"
                      r={10}
                      fill="none"
                      stroke={config.color}
                      strokeWidth={2}
                      className="animate-ping opacity-60"
                    />
                  )}

                  {/* Outer target marker */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 6.5 : 4}
                    fill={config.color}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 1.5 : 0}
                    className="cursor-pointer shadow-lg"
                    style={{
                      filter: `drop-shadow(0 0 6px ${config.color})`,
                    }}
                  />
                </g>
              );
            })}

            {/* 3D Glass overlay shading */}
            <circle cx="0" cy="0" r={R} fill="url(#globeSphere)" stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1} pointerEvents="none" />
            
            {/* Equator visual ring marker */}
            <ellipse cx="0" cy="0" rx={R} ry={R * 0.08} fill="none" stroke="#64748b" strokeWidth={1} strokeOpacity={0.25} pointerEvents="none" />
          </g>
        </svg>

        {/* Holographic Tooltip */}
        {hoveredCountry && (
          <div
            className="absolute z-20 pointer-events-none glass-panel p-2.5 rounded-lg border border-white/20 text-xs font-mono select-none"
            style={{
              left: `${center + (R * Math.cos((hoveredCountry.lat * Math.PI) / 180) * Math.sin((hoveredCountry.lon * Math.PI) / 180 + rotation)) - 60}px`,
              top: `${center - (R * Math.sin((hoveredCountry.lat * Math.PI) / 180)) - 55}px`,
              boxShadow: `0 0 15px ${hoveredCountry.color}35`,
            }}
          >
            <p className="font-bold text-white leading-tight">{hoveredCountry.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {hoveredCountry.plays.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')} plays
            </p>
          </div>
        )}
      </div>

      <p className="text-[10px] font-mono text-gray-500 mt-2 uppercase tracking-widest">
        {lang === 'en' ? ' Drag to rotate the cyber-globe' : ' Arrastra para girar el ciber-globo'}
      </p>
    </div>
  );
}
