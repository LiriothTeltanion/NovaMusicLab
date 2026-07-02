import React, { useState } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, ZAxis } from 'recharts';
import { Heart } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { inferMoodCoordinates } from '../utils/analytics';
import ArtistAvatar from './ArtistAvatar';
import SectionNarrative from './SectionNarrative';

interface EmotionalMapProps {
  data: MusicDnaData;
}

const EMOTION_DETAILS = {
  melancolia: {
    es: {
      title: "Melancolía / Introspección",
      desc: "Vibras shoegaze, post-metal atmosférico y trap emocional. La música sirve como un catalizador reflexivo para procesar heridas o transiciones de vida silenciosas.",
      time: "Madrugada 00-05 y Noche 18-23",
    },
    en: {
      title: "Melancholy / Introspection",
      desc: "Shoegaze vibes, atmospheric post-metal, and emotional trap. Music works as a reflective catalyst for processing wounds or quiet life transitions.",
      time: "Late night 00-05 and Evening 18-23",
    },
    artists: ["Deafheaven", "Alcest", "nothingnowhere.", "Hammock"],
    tracks: ["In Blur", "Shellstar", "Great Mass of Color", "Love Who Loves You Back"],
    color: "#00f2fe",
  },
  energia: {
    es: {
      title: "Fuerza / Catarsis Metalcore",
      desc: "Metalcore agresivo y post-hardcore rápido. El enojo y la intensidad instrumental funcionan como escudo y combustible energético.",
      time: "Mañana 06-11 y Tarde 12-17",
    },
    en: {
      title: "Force / Metalcore Catharsis",
      desc: "Aggressive metalcore and fast post-hardcore. Anger and instrumental intensity work as both shield and fuel.",
      time: "Morning 06-11 and Afternoon 12-17",
    },
    artists: ["Bring Me the Horizon", "The Word Alive", "Slaves", "Odeon"],
    tracks: ["MANTRA", "Prayers", "Red Clouds", "Ritual"],
    color: "#f72585",
  },
  dopamina: {
    es: {
      title: "Dopamina / Diversión Emo-Groove",
      desc: "Riffs alegres de guitarra, mezcla de pop de los 2000s, sintetizadores y percusiones rápidas. Sonidos optimistas ideales para motivarte.",
      time: "Mañana 06-11",
    },
    en: {
      title: "Dopamine / Emo-Groove Fun",
      desc: "Cheerful guitar riffs, a blend of 2000s pop, synths and fast percussion. Upbeat sounds built to motivate you.",
      time: "Morning 06-11",
    },
    artists: ["Bilmuri", "Magnolia Park", "All Time Low", "Aries"],
    tracks: ["2016 CAVALIERS (Ohio)", "Tokyo", "THICC THICCLY", "Aperol Spritz"],
    color: "#ffb703",
  },
  calma: {
    es: {
      title: "Calma / Enfoque Técnico",
      desc: "Ambient, lo-fi suave y metal progresivo intrincado de ritmos lentos. Utilizado como canalizador del hiperenfoque al diseñar o programar.",
      time: "Tarde 12-17 y Noche 18-23",
    },
    en: {
      title: "Calm / Technical Focus",
      desc: "Ambient, soft lo-fi, and intricate slow-tempo progressive metal. Used as a channel for hyperfocus while designing or coding.",
      time: "Afternoon 12-17 and Evening 18-23",
    },
    artists: ["TesseracT", "Hammock", "Corbin Karasu", "Astral Wonder"],
    tracks: ["Of Matter - Proxy", "The Journey", "Midnight Relief", "Candyland"],
    color: "#10b981",
  },
};

export default function EmotionalMap({ data }: EmotionalMapProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<'melancolia' | 'energia' | 'dopamina' | 'calma'>('melancolia');
  const { tc, t, lang } = useApp();

  const galaxyArtists = data.top_artists.slice(0, 14).map(artist => ({
    name: artist.name,
    plays: artist.plays,
    ...inferMoodCoordinates(artist.genre, artist.name),
  }));

  const emotionDetails = {
    melancolia: { ...EMOTION_DETAILS.melancolia[lang], artists: EMOTION_DETAILS.melancolia.artists, tracks: EMOTION_DETAILS.melancolia.tracks, color: EMOTION_DETAILS.melancolia.color },
    energia: { ...EMOTION_DETAILS.energia[lang], artists: EMOTION_DETAILS.energia.artists, tracks: EMOTION_DETAILS.energia.tracks, color: EMOTION_DETAILS.energia.color },
    dopamina: { ...EMOTION_DETAILS.dopamina[lang], artists: EMOTION_DETAILS.dopamina.artists, tracks: EMOTION_DETAILS.dopamina.tracks, color: EMOTION_DETAILS.dopamina.color },
    calma: { ...EMOTION_DETAILS.calma[lang], artists: EMOTION_DETAILS.calma.artists, tracks: EMOTION_DETAILS.calma.tracks, color: EMOTION_DETAILS.calma.color },
  };

  const currentEmotion = emotionDetails[selectedEmotion];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <Heart className="w-6 h-6" style={{ color: tc.c2 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.sections.emotionalMap}</h2>
      </div>

      <SectionNarrative content={t.deepNarratives.emotions} accent="c2" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Scatter Chart "Galaxia Emocional" */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h3 className="text-sm font-mono font-bold text-gray-400 uppercase tracking-widest">{t.emotionalMap.artistCoordinates}</h3>
            <span className="text-[10px] font-mono text-gray-500">{t.emotionalMap.axesLabel}</span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <XAxis
                  type="number"
                  dataKey="valence"
                  name={t.emotionalMap.positivityName}
                  domain={[0, 1]}
                  stroke="#4b5563"
                  label={{ value: t.emotionalMap.positivityAxis, position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="energy"
                  name={t.emotionalMap.energyAxis}
                  domain={[0, 1]}
                  stroke="#4b5563"
                  label={{ value: t.emotionalMap.energyAxis, angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="plays" range={[50, 450]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: 'rgba(10, 25, 47, 0.95)', borderColor: '#00f2fe', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value, name) => {
                    if (name === "plays") return [`${value} plays`, t.emotionalMap.frequencyLabel];
                    return [value, name];
                  }}
                />
                <Scatter name={t.emotionalMap.artistsLegend} data={galaxyArtists} fill="#00f2fe">
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
            <span>{t.emotionalMap.darkSide}</span>
            <span>{t.emotionalMap.brightSide}</span>
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
                  {key === 'melancolia' ? t.emotionalMap.tabLament : key === 'energia' ? t.emotionalMap.tabCatharsis : key === 'dopamina' ? t.emotionalMap.tabDose : t.emotionalMap.tabFocus}
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

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">{t.emotionalMap.keyArtistsLabel}</span>
                <div className="flex flex-wrap gap-2">
                  {currentEmotion.artists.map(artist => (
                    <span key={artist} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-[#0a0f1d] border border-cyan-500/10 rounded-full text-xs text-white font-semibold font-mono">
                      <ArtistAvatar name={artist} size={20} />
                      {artist}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">{t.emotionalMap.refugeTracksLabel}</span>
                <div className="space-y-1">
                  {currentEmotion.tracks.map(track => (
                    <div key={track} className="px-3 py-1 bg-[#0a0f1d] border border-cyan-500/10 rounded-lg text-xs truncate">
                      {track}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-cyan-500/10 space-y-1 mt-6 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">{t.emotionalMap.dominantTimeLabel}</span>
              <span className="font-mono text-white">{currentEmotion.time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
