import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { WORLD_MAP_DATA } from '../data/worldMapData';
import FlagArt from './FlagArt';
import ArtistAvatar from './ArtistAvatar';
import { useContinuousMotion } from '../hooks/useContinuousMotion';
import { localizeCountryName } from '../utils/localizedDatasetText';
import { directionFor, localeFor, type Lang } from '../utils/i18n';

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
  lang: Lang;
  topArtists?: { name: string; plays: number; country: string }[];
}

const GLOBE_COPY: Record<Lang, {
  plays: string;
  dragHint: string;
  globeLabel: string;
  closeCountry: string;
  topArtists: string;
  noArtists: string;
}> = {
  es: {
    plays: 'reproducciones',
    dragHint: 'Arrastra en cualquier dirección para girar',
    globeLabel: 'Globo interactivo de países de origen',
    closeCountry: 'Cerrar detalles del país',
    topArtists: 'Artistas principales',
    noArtists: 'Sin artistas catalogados',
  },
  en: {
    plays: 'plays',
    dragHint: 'Drag in any direction to spin',
    globeLabel: 'Interactive globe of artist origin countries',
    closeCountry: 'Close country details',
    topArtists: 'Top artists',
    noArtists: 'No cataloged artists',
  },
  he: {
    plays: 'השמעות',
    dragHint: 'גררו לכל כיוון כדי לסובב',
    globeLabel: 'גלובוס אינטראקטיבי של מדינות מוצא האמנים',
    closeCountry: 'סגירת פרטי המדינה',
    topArtists: 'האמנים המובילים',
    noArtists: 'לא נמצאו אמנים מקוטלגים',
  },
};

const COUNTRY_COORDS: Record<string, { lat: number; lon: number; color: string }> = {
  // Original top countries
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
  // Expanded universal list
  'Canada': { lat: 56, lon: -106, color: '#38bdf8' },
  'Spain': { lat: 40, lon: -3, color: '#facc15' },
  'Brazil': { lat: -14, lon: -51, color: '#10b981' },
  'Japan': { lat: 36, lon: 138, color: '#f43f5e' },
  'Australia': { lat: -25, lon: 133, color: '#a78bfa' },
  'Italy': { lat: 41, lon: 12, color: '#f59e0b' },
  'Netherlands': { lat: 52, lon: 5, color: '#fb923c' },
  'Mexico': { lat: 23, lon: -102, color: '#34d399' },
  'Colombia': { lat: 4, lon: -72, color: '#22d3ee' },
  'Argentina': { lat: -38, lon: -63, color: '#60a5fa' },
  'Switzerland': { lat: 46, lon: 8, color: '#a78bfa' },
  'Russia': { lat: 61, lon: 105, color: '#94a3b8' },
  'Denmark': { lat: 56, lon: 9, color: '#ec4899' },
  'Belgium': { lat: 50, lon: 4, color: '#facc15' },
  'Iceland': { lat: 64, lon: -18, color: '#38bdf8' },
  'Ireland': { lat: 53, lon: -8, color: '#10b981' },
  'Chile': { lat: -35, lon: -71, color: '#22d3ee' },
  'Portugal': { lat: 39, lon: -8, color: '#10b981' },
  'Greece': { lat: 39, lon: 22, color: '#60a5fa' },
  'Poland': { lat: 52, lon: 19, color: '#f472b6' },
  'Austria': { lat: 47.5, lon: 14.5, color: '#ef4444' },
  'Egypt': { lat: 26, lon: 30, color: '#f59e0b' },
  'Romania': { lat: 46, lon: 25, color: '#fb923c' },
  'South Korea': { lat: 36, lon: 128, color: '#f43f5e' },
  'South Africa': { lat: -30, lon: 25, color: '#22d3ee' },
  'Barbados': { lat: 13.19, lon: -59.54, color: '#f59e0b' },
};

const COUNTRY_CODES: Record<string, string> = {
  'United States': 'USA',
  'United Kingdom': 'GBR',
  'Sweden': 'SWE',
  'Finland': 'FIN',
  'Germany': 'DEU',
  'France': 'FRA',
  'Israel': 'ISR',
  'Norway': 'NOR',
  'New Zealand': 'NZL',
  'Puerto Rico': 'PRI',
  'Venezuela': 'VEN',
  'Dominican Republic': 'DOM',
  'Canada': 'CAN',
  'Spain': 'ESP',
  'Brazil': 'BRA',
  'Japan': 'JPN',
  'Australia': 'AUS',
  'Italy': 'ITA',
  'Netherlands': 'NLD',
  'Mexico': 'MEX',
  'Colombia': 'COL',
  'Argentina': 'ARG',
  'Switzerland': 'CHE',
  'Russia': 'RUS',
  'Denmark': 'DNK',
  'Belgium': 'BEL',
  'Iceland': 'ISL',
  'Ireland': 'IRL',
  'Chile': 'CHL',
  'Portugal': 'PRT',
  'Greece': 'GRC',
  'Romania': 'ROU',
  'South Korea': 'KOR',
  'South Africa': 'ZAF',
  'Barbados': 'BRB',
};

// Dimensions & constants
const size = 300;
const center = size / 2;
const R = 115; // Globe radius

// Precomputed unit-sphere basis per vertex: a = cosφ·sinθ, b = cosφ·cosθ, c = sinφ.
// sin(θ+rot)/cos(θ+rot) expand into multiply-adds of these, so re-projecting the
// whole world map every animation frame costs zero trig per vertex - the raw
// per-vertex Math.sin/Math.cos version measurably janked lower-end devices,
// since WORLD_MAP_DATA carries thousands of border points.
interface UnitVec { a: number; b: number; c: number }

function toUnitVec(lat: number, lon: number): UnitVec {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;
  return {
    a: Math.cos(phi) * Math.sin(theta),
    b: Math.cos(phi) * Math.cos(theta),
    c: Math.sin(phi),
  };
}

const WORLD_MAP_UNIT = WORLD_MAP_DATA.map(country => ({
  id: country.id,
  center: toUnitVec(country.center.lat, country.center.lon),
  polygons: country.polygons.map(poly => poly.map(pt => toUnitVec(pt.lat, pt.lon))),
}));

export default function InteractiveGlobe({
  countries,
  selectedCountry,
  onSelectCountry,
  lang,
  topArtists = [],
}: InteractiveGlobeProps) {
  const { tc } = useApp();
  const copy = GLOBE_COPY[lang];
  const locale = localeFor(lang);
  const containerRef = useRef<HTMLDivElement>(null);
  const continuousMotion = useContinuousMotion(containerRef);
  
  // Ejes de rotación: Y (rotation/yaw) y X (tilt/pitch)
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(0.2); 
  const [isDragging, setIsDragging] = useState(false);
  const [isCentering, setIsCentering] = useState(false);

  const targetRotationRef = useRef(0);
  const targetTiltRef = useRef(0.2);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
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

  // Project spherical lat/lon coordinates to 3D Cartesian coordinates
  const projectPoint = React.useCallback((lat: number, lon: number, radius: number) => {
    const phi = (lat * Math.PI) / 180;
    const theta = (lon * Math.PI) / 180;
    
    // Rotate around Y-axis (Yaw / Longitude)
    const x1 = radius * Math.cos(phi) * Math.sin(theta + rotation);
    const y1 = -radius * Math.sin(phi);
    const z1 = radius * Math.cos(phi) * Math.cos(theta + rotation);
    
    // Rotate around X-axis (Pitch / Latitude tilt)
    const x = x1;
    const y = y1 * Math.cos(tilt) - z1 * Math.sin(tilt);
    const z = y1 * Math.sin(tilt) + z1 * Math.cos(tilt);
    
    return { x, y, z };
  }, [rotation, tilt]);

  // Update target centering angles when selectedCountry changes
  useEffect(() => {
    if (!selectedCountry) {
      setIsCentering(false);
      return;
    }
    const coords = COUNTRY_COORDS[selectedCountry];
    if (coords) {
      // Convert target lat/lon to target angles to bring it to the center front (0, 0, R)
      targetRotationRef.current = -(coords.lon * Math.PI) / 180;
      targetTiltRef.current = (coords.lat * Math.PI) / 180;
      if (continuousMotion) {
        setIsCentering(true);
      } else {
        // Reduced-motion visitors still get the selected country centered,
        // but without a continuous interpolation loop.
        setRotation(targetRotationRef.current);
        setTilt(targetTiltRef.current);
        setIsCentering(false);
      }
    }
  }, [continuousMotion, selectedCountry]);

  // Latest angles readable from inside the animation loop without listing the
  // state values as effect deps - otherwise the effect tears down and restarts
  // its requestAnimationFrame chain on every single frame.
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  const tiltRef = useRef(tilt);
  tiltRef.current = tilt;

  // Frame tick animation loop
  useEffect(() => {
    if (!continuousMotion || isDragging) return;
    let animId: number | null = null;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;

    const tick = (timestamp: number) => {
      const elapsed = lastFrame ? timestamp - lastFrame : frameInterval;
      if (elapsed >= frameInterval) {
        const frameScale = Math.min(elapsed / (1000 / 60), 2);
        const centeringWeight = 1 - Math.pow(1 - 0.075, frameScale);
        lastFrame = timestamp - (elapsed % frameInterval);

        if (isCentering) {
          // Smoothly interpolate (LERP) angles to focus selected country.
          setRotation(r => {
            let diff = targetRotationRef.current - r;
            // Normalize diff to [-PI, PI] for shortest rotation path.
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            if (Math.abs(diff) < 0.005) {
              return targetRotationRef.current;
            }
            return r + diff * centeringWeight;
          });

          setTilt(t => {
            const diff = targetTiltRef.current - t;
            if (Math.abs(diff) < 0.005) {
              return targetTiltRef.current;
            }
            return t + diff * centeringWeight;
          });

          // Release lock if aligned.
          const rotDiff = Math.abs(targetRotationRef.current - rotationRef.current);
          const tiltDiff = Math.abs(targetTiltRef.current - tiltRef.current);
          if (rotDiff < 0.01 && tiltDiff < 0.01) {
            setIsCentering(false);
          }
        } else {
          // Slow automatic idle spin, time-normalized at the 30fps paint cap.
          setRotation(r => r + 0.0028 * frameScale);
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [continuousMotion, isDragging, isCentering]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setIsCentering(false); // Instantly release auto-centering lock
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    const deltaY = e.clientY - dragStartY.current;

    setRotation(r => r + deltaX * 0.006);
    // Constrain tilt to prevent flipping over poles.
    setTilt(t => Math.max(-Math.PI / 3, Math.min(Math.PI / 3, t + deltaY * 0.006)));
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
    setIsDragging(false);
  };

  // Latitude grid lines
  const latitudeRings = [];
  for (let lat = -60; lat <= 60; lat += 20) {
    const phi = (lat * Math.PI) / 180;
    const r = R * Math.cos(phi);
    const y = -R * Math.sin(phi);
    latitudeRings.push({ r, y });
  }

  // Longitude grid lines (rotated meridians)
  const longitudeAngles = [0, 30, 60, 90, 120, 150];
  const renderedMeridians = longitudeAngles.map(deg => {
    const angle = (deg * Math.PI) / 180 + rotation;
    const rx = R * Math.sin(angle);
    return { rx, visible: Math.abs(rx) > 1 };
  });

  // Project detailed country borders dynamically. Runs every frame while the
  // globe spins, so it works exclusively on the precomputed WORLD_MAP_UNIT
  // vectors - multiply-adds only, no per-vertex trig (see toUnitVec above).
  const renderedBorders = React.useMemo(() => {
    const sinR = Math.sin(rotation);
    const cosR = Math.cos(rotation);
    const sinT = Math.sin(tilt);
    const cosT = Math.cos(tilt);
    const project = (v: UnitVec) => {
      const x = R * (v.a * cosR + v.b * sinR);
      const z1 = R * (v.b * cosR - v.a * sinR);
      const y1 = -R * v.c;
      return { x, y: y1 * cosT - z1 * sinT, z: y1 * sinT + z1 * cosT };
    };

    const paths: { d: string; isFront: boolean; countryId: string }[] = [];

    WORLD_MAP_UNIT.forEach(country => {
      const centerPt = project(country.center);

      // Skip drawing borders if they are far behind the sphere (back face occlusion)
      if (centerPt.z < -40) return;
      const isFront = centerPt.z >= -10;

      country.polygons.forEach(poly => {
        let pathStr = '';
        let hasVisiblePoints = false;

        for (let i = 0; i < poly.length; i++) {
          const pt = project(poly[i]);
          if (pt.z >= -10) hasVisiblePoints = true;

          if (i === 0) {
            pathStr += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          } else {
            pathStr += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          }
        }

        if (hasVisiblePoints && pathStr) {
          pathStr += ' Z';
          paths.push({
            d: pathStr,
            isFront,
            countryId: country.id,
          });
        }
      });
    });

    return paths;
  }, [rotation, tilt]);

  // Project country dots
  const projectedPoints = React.useMemo(() => {
    return mappedCountries.map(c => {
      const pt = projectPoint(c.lat, c.lon, R);
      return {
        config: c,
        x: pt.x,
        y: pt.y,
        z: pt.z,
        visible: pt.z >= -10,
      };
    }).sort((a, b) => a.z - b.z);
  }, [mappedCountries, projectPoint]);

  // Home base is Venezuela (Lat: 8, Lon: -66)
  const homePoint = React.useMemo(() => {
    return projectPoint(8, -66, R);
  }, [projectPoint]);

  // Render 3D data-stream arcs from Venezuela to other countries
  const dataArcs = React.useMemo(() => {
    return projectedPoints
      .filter(({ config, visible }) => visible && config.name !== 'Venezuela')
      .map(({ config, x, y, z }) => {
        // Average coordinates for midpoint, elevated 25% above surface
        const midLat = (8 + config.lat) / 2;
        const midLon = (-66 + config.lon) / 2;
        const midPt = projectPoint(midLat, midLon, R * 1.25);

        return {
          countryName: config.name,
          color: config.color,
          path: `M ${homePoint.x} ${homePoint.y} Q ${midPt.x} ${midPt.y} ${x} ${y}`,
          visible: homePoint.z >= 0 || z >= 0,
        };
      });
  }, [projectedPoints, homePoint, projectPoint]);

  // Selected country details
  const countryStats = selectedCountry ? countries.find(c => c.country === selectedCountry) : null;
  const countryTopArtists = React.useMemo(() => {
    if (!selectedCountry) return [];
    return topArtists
      .filter(a => a.country === selectedCountry)
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 3);
  }, [selectedCountry, topArtists]);

  return (
    <div
      data-testid="interactive-globe"
      data-motion={continuousMotion ? 'running' : 'paused'}
      className="flex w-full min-w-0 select-none flex-col items-center"
      ref={containerRef}
      dir={directionFor(lang)}
    >
      <div
        data-testid="interactive-globe-canvas"
        data-dragging={isDragging ? 'true' : 'false'}
        className={`relative aspect-square w-full max-w-[300px] touch-none cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <svg
          data-testid="interactive-globe-svg"
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full overflow-hidden"
          style={{ direction: 'ltr' }}
          role="group"
          aria-label={copy.globeLabel}
        >
          <defs>
            {/* Shading gradients */}
            <radialGradient id="globeSphere" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.10} />
              <stop offset="50%" stopColor="#000000" stopOpacity={0} />
              <stop offset="100%" stopColor="#000000" stopOpacity={0.65} />
            </radialGradient>
            
            <radialGradient id="globeCore" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#00f2fe" stopOpacity={0} />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.05} />
            </radialGradient>
          </defs>

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
                strokeOpacity={0.12}
                strokeDasharray="3 3"
              />
            ))}

            {/* Longitude Gridlines */}
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
                strokeOpacity={0.12}
              />
            ))}

            {/* Detailed Country Borders */}
            {renderedBorders.map((border, idx) => (
              <path
                key={`border-${idx}`}
                d={border.d}
                fill="none"
                stroke={tc.c1}
                strokeWidth={0.6}
                strokeOpacity={border.isFront ? 0.22 : 0.05}
                strokeDasharray={border.isFront ? undefined : '1.5 1.5'}
                className="pointer-events-none"
              />
            ))}

            {/* 3D Cyber Data Stream Arcs */}
            {dataArcs.map((arc, idx) => (
              <path
                key={`arc-${idx}`}
                d={arc.path}
                fill="none"
                stroke={arc.color}
                strokeWidth={1}
                strokeOpacity={arc.visible ? 0.35 : 0.08}
                strokeDasharray="3 2"
              />
            ))}

            {/* Concentric Sonar radar sweeps to selected country */}
            {projectedPoints.map(({ config, x, y, z }) => {
              const isSelected = selectedCountry === config.name;
              const isFront = z >= 0;
              if (isSelected && isFront) {
                return (
                  <g key={`sonar-${config.name}`}>
                    {/* Ripple 1 */}
                    <circle cx={x} cy={y} r={continuousMotion ? undefined : 12} fill="none" stroke={config.color} strokeWidth={1} opacity={continuousMotion ? undefined : 0.45}>
                      {continuousMotion && <animate attributeName="r" values="3;24" dur="2.2s" repeatCount="indefinite" />}
                      {continuousMotion && <animate attributeName="opacity" values="1;0" dur="2.2s" repeatCount="indefinite" />}
                    </circle>
                    {/* Ripple 2 (offset) */}
                    <circle cx={x} cy={y} r={continuousMotion ? undefined : 20} fill="none" stroke={config.color} strokeWidth={1} opacity={continuousMotion ? undefined : 0.2}>
                      {continuousMotion && <animate attributeName="r" values="3;24" dur="2.2s" begin="1.1s" repeatCount="indefinite" />}
                      {continuousMotion && <animate attributeName="opacity" values="1;0" dur="2.2s" begin="1.1s" repeatCount="indefinite" />}
                    </circle>
                    {/* Sweep Line from Center */}
                    <line
                      x1="0"
                      y1="0"
                      x2={x}
                      y2={y}
                      stroke={config.color}
                      strokeWidth={0.9}
                      strokeOpacity={0.4}
                      strokeDasharray="2 2"
                    />
                  </g>
                );
              }
              return null;
            })}

            {/* Render Country Hot-spots */}
            {projectedPoints.map(({ config, x, y, z }) => {
              const isSelected = selectedCountry === config.name;
              const isFront = z >= 0;
              
              return (
                <g
                  key={config.name}
                  transform={`translate(${x}, ${y})`}
                  className="transition-all duration-150"
                  style={{
                    opacity: isFront ? 1 : 0.18,
                    pointerEvents: isFront ? 'auto' : 'none',
                  }}
                  role="button"
                  tabIndex={isFront ? 0 : -1}
                  aria-label={`${localizeCountryName(config.name, lang)}: ${config.plays.toLocaleString(locale)} ${copy.plays}`}
                  aria-pressed={isSelected}
                  onMouseEnter={() => isFront && setHoveredCountry(config)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onFocus={() => isFront && setHoveredCountry(config)}
                  onBlur={() => setHoveredCountry(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isFront) return;
                    onSelectCountry(isSelected ? null : config.name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    if (!isFront) return;
                    onSelectCountry(isSelected ? null : config.name);
                  }}
                >
                  {/* The visual dot stays precise while this transparent halo
                      provides a 44 px pointer target on the 300 px design grid. */}
                  <circle data-hit-target="true" cx="0" cy="0" r={22} fill="transparent" />

                  {/* Glowing ring for active hover nodes */}
                  {isFront && (isSelected || hoveredCountry?.name === config.name) && (
                    <circle
                      cx="0"
                      cy="0"
                      r={8.5}
                      fill="none"
                      stroke={config.color}
                      strokeWidth={1.5}
                      className={continuousMotion ? 'animate-pulse opacity-75' : 'opacity-75'}
                    />
                  )}

                  {/* Main Target Dot */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 6 : 3.5}
                    fill={config.color}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 1.5 : 0}
                    className="cursor-pointer shadow-lg"
                    style={{
                      filter: `drop-shadow(0 0 5px ${config.color})`,
                    }}
                  />

                  {/* Floating abbreviation tags */}
                  {isFront && (
                    <text
                      x={6}
                      y={3}
                      className="text-[8px] font-mono font-bold select-none pointer-events-none"
                      style={{
                        fill: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                        filter: isSelected ? `drop-shadow(0 0 4px ${config.color})` : 'none',
                      }}
                    >
                      {COUNTRY_CODES[config.name] || config.name.slice(0, 3).toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 3D Glass overlay shading */}
            <circle cx="0" cy="0" r={R} fill="url(#globeSphere)" stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1} pointerEvents="none" />
            
            {/* Equator ring */}
            <ellipse cx="0" cy="0" rx={R} ry={R * 0.08} fill="none" stroke="#64748b" strokeWidth={1} strokeOpacity={0.2} pointerEvents="none" />
          </g>
        </svg>

        {/* Hover Tooltip */}
        {hoveredCountry && (
          <div
            className="absolute z-20 pointer-events-none glass-panel p-2.5 rounded-lg border border-white/20 text-xs font-mono select-none"
            style={{
              // Percent positioning follows the responsive SVG instead of its 300 px design grid.
              left: `clamp(4.5rem, ${((center + projectPoint(hoveredCountry.lat, hoveredCountry.lon, R).x) / size) * 100}%, calc(100% - 4.5rem))`,
              top: `clamp(4rem, ${((center + projectPoint(hoveredCountry.lat, hoveredCountry.lon, R).y) / size) * 100}%, calc(100% - 1rem))`,
              transform: 'translate(-50%, calc(-100% - 0.75rem))',
              boxShadow: `0 0 15px ${hoveredCountry.color}35`,
            }}
          >
            <p className="font-bold text-white leading-tight">{localizeCountryName(hoveredCountry.name, lang)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {hoveredCountry.plays.toLocaleString(locale)} {copy.plays}
            </p>
          </div>
        )}
      </div>

      <p className="text-[10px] font-mono text-gray-500 mt-2 uppercase tracking-widest text-center">
        {copy.dragHint}
      </p>

      {/* Sticky Country Intelligence Dossier Card */}
      {selectedCountry && countryStats && (
        <div
          data-testid="country-dossier"
          className="glass-panel pointer-events-auto relative mt-4 w-full max-w-[360px] min-w-0 overflow-hidden rounded-2xl border p-4 transition-all duration-300"
          style={{
            borderColor: `${COUNTRY_COORDS[selectedCountry]?.color || '#ffffff'}40`,
            boxShadow: `0 8px 32px ${COUNTRY_COORDS[selectedCountry]?.color || '#ffffff'}15`,
          }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full pointer-events-none" />
          <button
            type="button"
            onClick={() => onSelectCountry(null)}
            aria-label={copy.closeCountry}
            className="absolute top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 font-mono text-base font-bold text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            style={{ insetInlineEnd: '0.375rem' }}
          >
            ×
          </button>
          
          <div className="flex items-center gap-3">
            <FlagArt country={selectedCountry} size={28} title={localizeCountryName(selectedCountry, lang)} />
            <div className="min-w-0">
              <h4 className="text-sm font-black text-white leading-tight truncate" style={{ paddingInlineEnd: '1rem' }}>
                {localizeCountryName(selectedCountry, lang)}
              </h4>
              <p className="mt-0.5 text-[11px] font-mono uppercase tracking-wider text-gray-400">
                {countryStats.plays.toLocaleString(locale)} {copy.plays}
              </p>
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-cyberCyan">
              {copy.topArtists}
            </p>
            {countryTopArtists.length > 0 ? (
              <div className="space-y-1.5">
                {countryTopArtists.map((artist, idx) => (
                  <div
                    key={artist.name}
                    className="flex items-center justify-between p-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ArtistAvatar name={artist.name} size={20} tooltip={false} />
                      <span className="truncate font-mono text-xs font-semibold text-gray-200">
                        {idx + 1}. {artist.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-gray-400" style={{ paddingInlineEnd: '0.25rem' }}>
                      {artist.plays.toLocaleString(locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-gray-500">
                {copy.noArtists}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
