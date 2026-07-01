import React, { useState } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, ZAxis } from 'recharts';
import { Heart } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { inferMoodCoordinates } from '../utils/analytics';

interface EmotionalMapProps {
  data: MusicDnaData;
}

export default function EmotionalMap({ data }: EmotionalMapProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<'melancolia' | 'energia' | 'dopamina' | 'calma'>('melancolia');
  const { lang, tc } = useApp();
  const L = lang === 'en';

  const galaxyArtists = data.top_artists.slice(0, 14).map(artist => ({
    name: artist.name,
    plays: artist.plays,
    ...inferMoodCoordinates(artist.genre, artist.name),
  }));

  const emotionDetails = {
    melancolia: {
      title: "Melancolía / Introspección",
      desc: "Vibras shoegaze, post-metal atmosférico y trap emocional. La música sirve como un catalizador reflexivo para procesar heridas o transiciones de vida silenciosas.",
      artists: ["Deafheaven", "Alcest", "nothingnowhere.", "Hammock"],
      tracks: ["In Blur", "Shellstar", "Great Mass of Color", "Love Who Loves You Back"],
      time: "Madrugada 00-05 y Noche 18-23",
      color: "#00f2fe"
    },
    energia: {
      title: "Fuerza / Catarsis Metalcore",
      desc: "Metalcore agresivo y post-hardcore rápido. El enojo y la intensidad instrumental funcionan como escudo y combustible energético.",
      artists: ["Bring Me the Horizon", "The Word Alive", "Slaves", "Odeon"],
      tracks: ["MANTRA", "Prayers", "Red Clouds", "Ritual"],
      time: "Mañana 06-11 y Tarde 12-17",
      color: "#f72585"
    },
    dopamina: {
      title: "Dopamina / Diversión Emo-Groove",
      desc: "Riffs alegres de guitarra, mezcla de pop de los 2000s, sintetizadores y percusiones rápidas. Sonidos optimistas ideales para motivarte.",
      artists: ["Bilmuri", "Magnolia Park", "All Time Low", "Aries"],
      tracks: ["2016 CAVALIERS (Ohio)", "Tokyo", "THICC THICCLY", "Aperol Spritz"],
      time: "Mañana 06-11",
      color: "#ffb703"
    },
    calma: {
      title: "Calma / Enfoque Técnico",
      desc: "Ambient, lo-fi suave y metal progresivo intrincado de ritmos lentos. Utilizado como canalizador del hiperenfoque al diseñar o programar.",
      artists: ["TesseracT", "Hammock", "Corbin Karasu", "Astral Wonder"],
      tracks: ["Of Matter - Proxy", "The Journey", "Midnight Relief", "Candyland"],
      time: "Tarde 12-17 y Noche 18-23",
      color: "#10b981"
    }
  };

  const currentEmotion = emotionDetails[selectedEmotion];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <Heart className="w-6 h-6" style={{ color: tc.c2 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {L ? 'Galactic Emotional Map' : 'Mapa Emocional Galáctico'}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Scatter Chart "Galaxia Emocional" */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h3 className="text-sm font-mono font-bold text-gray-400 uppercase tracking-widest">Coordenadas de Artistas</h3>
            <span className="text-[10px] font-mono text-gray-500">{L ? 'Axes: Energy vs Positivity' : 'Ejes: Energía vs Positividad'}</span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <XAxis 
                  type="number" 
                  dataKey="valence" 
                  name="Positividad" 
                  domain={[0, 1]} 
                  stroke="#4b5563"
                  label={{ value: 'Positividad (Valence)', position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="energy" 
                  name="Energía" 
                  domain={[0, 1]} 
                  stroke="#4b5563"
                  label={{ value: 'Energía', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="plays" range={[50, 450]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: 'rgba(10, 25, 47, 0.95)', borderColor: '#00f2fe', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value, name) => {
                    if (name === "plays") return [`${value} plays`, "Frecuencia"];
                    return [value, name];
                  }}
                />
                <Scatter name="Artistas" data={galaxyArtists} fill="#00f2fe">
                  {galaxyArtists.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.valence > 0.5 ? '#ffb703' : '#00f2fe'} 
                      stroke={entry.energy > 0.7 ? '#f72585' : '#7209b7'}
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          <div className="w-full flex justify-between text-xs font-mono text-gray-500 mt-2 px-6">
            <span>← Melancólico / Oscuro</span>
            <span>Optimista / Brillante →</span>
          </div>
        </div>

        {/* Right Side: Tabbed Details */}
        <div className="glass-panel p-8 rounded-3xl lg:col-span-5 flex flex-col justify-between h-full">
          <div>
            {/* Tab selector buttons */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {(['melancolia', 'energia', 'dopamina', 'calma'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedEmotion(key)}
                  className={`py-2 font-mono text-[9px] font-bold rounded-xl border uppercase transition-all truncate ${
                    selectedEmotion === key 
                      ? 'bg-cyberPink/10 border-cyberPink text-cyberPink' 
                      : 'bg-[#0a0f1d] border-cyan-500/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {key === 'melancolia' ? 'Lamento' : key === 'energia' ? 'Catarsis' : key === 'dopamina' ? 'Dosis' : 'Foco'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentEmotion.color }}></span>
                {currentEmotion.title}
              </h3>
              
              <p className="text-xs text-gray-300 font-sans leading-relaxed">
                {currentEmotion.desc}
              </p>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Artistas clave:</span>
                <p className="text-xs text-white font-semibold font-mono">{currentEmotion.artists.join(', ')}</p>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Canciones del refugio:</span>
                <div className="space-y-1">
                  {currentEmotion.tracks.map(t => (
                    <div key={t} className="px-3 py-1 bg-[#0a0f1d] border border-cyan-500/10 rounded-lg text-xs truncate">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-cyan-500/10 space-y-1 mt-6 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Horario dominante:</span>
              <span className="font-mono text-white">{currentEmotion.time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
