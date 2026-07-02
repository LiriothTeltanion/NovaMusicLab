import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { BrainCircuit, AlertTriangle, ShieldCheck, Heart } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import SectionNarrative from './SectionNarrative';

interface PersonalityRadarProps {
  data: MusicDnaData;
}

export default function PersonalityRadar({ data }: PersonalityRadarProps) {
  const matrix = data.personality_matrix;
  const [selectedKey, setSelectedKey] = useState<keyof typeof matrix>('sensibilidad_emocional');
  const { tc, t } = useApp();

  const chartData = [
    { subject: 'Sensibilidad', value: matrix.sensibilidad_emocional.score, key: 'sensibilidad_emocional' },
    { subject: 'Nostalgia', value: matrix.nostalgia.score, key: 'nostalgia' },
    { subject: 'Energía', value: matrix.energia.score, key: 'energia' },
    { subject: 'Oscuridad', value: matrix.oscuridad_estetica.score, key: 'oscuridad_estetica' },
    { subject: 'Creatividad', value: matrix.creatividad.score, key: 'creatividad' },
    { subject: 'Rebeldía', value: matrix.rebeldia.score, key: 'rebeldia' },
    { subject: 'Futurismo', value: matrix.futurismo.score, key: 'futurismo' }
  ];

  const currentTrait = matrix[selectedKey];

  const traitLabels = t.personalityRadar.traitLabels;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <BrainCircuit className="w-6 h-6" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.personalityRadar.profileTitle}</h2>
      </div>

      <SectionNarrative content={t.deepNarratives.personality} accent="c3" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Radar Chart */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-5 flex flex-col items-center">
          <h3 className="text-sm font-mono font-bold text-gray-400 uppercase tracking-widest mb-4">
            {t.personalityRadar.radarTitle}</h3>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  stroke="#9ca3af" 
                  fontSize={11}
                  tickFormatter={(val) => val}
                />
                <Radar
                  name="Kevin"
                  dataKey="value"
                  stroke="#00f2fe"
                  fill="#00f2fe"
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick buttons to select axis */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {chartData.map(item => (
              <button
                key={item.key}
                onClick={() => setSelectedKey(item.key as any)}
                className={`px-3 py-1 font-mono text-[10px] font-bold rounded-full border transition-all ${
                  selectedKey === item.key 
                    ? 'bg-cyberCyan/10 border-cyberCyan text-cyberCyan shadow-[0_0_10px_rgba(0,242,254,0.15)]' 
                    : 'bg-[#0a0f1d] border-cyan-500/10 text-gray-400 hover:text-white'
                }`}
              >
                {item.subject} ({item.value})
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Detailed Card */}
        <div className="glass-panel p-8 rounded-3xl lg:col-span-7 space-y-6 border-l-4 border-l-cyberPink">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-white">{traitLabels[selectedKey]}</h3>
            <span className="text-2xl font-black text-cyberPink font-mono bg-cyberPink/10 px-3 py-1 rounded-2xl border border-cyberPink/20">
              {currentTrait.score}/100
            </span>
          </div>

          <div className="space-y-4">
            {/* Evidencia */}
            <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider block">
              {t.personalityRadar.evidenceLabel}</span>
              <p className="text-sm text-gray-200">{currentTrait.evidence}</p>
            </div>

            {/* Artistas de Apoyo */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentTrait.artists.map(art => (
                <span key={art} className="px-2.5 py-1 bg-cyan-950/20 border border-cyan-500/20 text-cyberBlue rounded-full text-xs font-mono">
                  {art}
                </span>
              ))}
            </div>

            {/* Tres Secciones de Análisis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-cyan-500/10">
              <div className="space-y-2 p-4 bg-green-950/5 border border-green-500/20 rounded-2xl">
                <div className="flex items-center space-x-2 text-green-400 font-mono text-xs font-bold uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.personalityRadar.strengthLabel}</span>
                </div>
                <p className="text-xs text-gray-300 font-sans leading-relaxed">{currentTrait.positive}</p>
              </div>

              <div className="space-y-2 p-4 bg-red-950/5 border border-red-500/20 rounded-2xl">
                <div className="flex items-center space-x-2 text-red-400 font-mono text-xs font-bold uppercase">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                  <span>{t.personalityRadar.challengeLabel}</span>
                </div>
                <p className="text-xs text-gray-300 font-sans leading-relaxed">{currentTrait.shadow}</p>
              </div>
            </div>

            {/* Growth Tip */}
            <div className="p-4 bg-cyberCyan/5 border border-cyberCyan/20 rounded-2xl flex items-start space-x-3">
              <Heart className="w-5 h-5 text-cyberCyan shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-[var(--fg)] uppercase">
                {t.personalityRadar.tipLabel}</span>
                <p className="text-xs text-gray-300 font-sans leading-relaxed">{currentTrait.tip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Archetypes Subsection */}
      <div className="space-y-6 pt-6">
        <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
          {t.personalityRadar.archetypesTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.archetypes.map((arch) => (
            <div 
              key={arch.name} 
              className={`glass-panel p-6 rounded-3xl border-t-4 transition-all duration-300 ${
                arch.color === 'cyan' ? 'border-t-cyberCyan' : 'border-t-cyberPink'
              }`}
            >
              <h4 className="text-xl font-bold text-white mb-2">{arch.name}</h4>
              <p className="text-xs text-gray-400 font-mono mb-4">{arch.desc}</p>
              
              <div className="space-y-3 text-xs text-gray-300">
                <p><strong className="text-gray-400">{t.personalityRadar.aestheticLabel}</strong> {arch.aesthetic}</p>
                <p><strong className="text-gray-400">{t.personalityRadar.strengthColonLabel}</strong> {arch.strength}</p>
                <p><strong className="text-gray-400">{t.personalityRadar.challengeColonLabel}</strong> {arch.wound}</p>
                <div className="p-3 bg-[#0a0f1d] border border-cyan-500/10 rounded-xl mt-2 font-mono italic">
                  "{arch.advice}"
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
