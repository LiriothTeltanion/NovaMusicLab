import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { AlertTriangle, ShieldCheck, Heart } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import SectionNarrative from './SectionNarrative';
import { CHART_ANIMATION } from './chartKit';
import { localizeArchetype, localizePersonalityTrait, localizeTraitAxis } from '../utils/localizedDatasetText';

interface PersonalityRadarProps {
  data: MusicDnaData;
}

export default function PersonalityRadar({ data }: PersonalityRadarProps) {
  const matrix = data.personality_matrix;
  type PersonalityKey = keyof typeof matrix;
  const [selectedKey, setSelectedKey] = useState<PersonalityKey>('sensibilidad_emocional');
  const { tc, t, lang } = useApp();

  const chartData: Array<{ subject: string; value: number; key: PersonalityKey }> = [
    { subject: localizeTraitAxis('sensibilidad_emocional', lang), value: matrix.sensibilidad_emocional.score, key: 'sensibilidad_emocional' },
    { subject: localizeTraitAxis('nostalgia', lang), value: matrix.nostalgia.score, key: 'nostalgia' },
    { subject: localizeTraitAxis('energia', lang), value: matrix.energia.score, key: 'energia' },
    { subject: localizeTraitAxis('oscuridad_estetica', lang), value: matrix.oscuridad_estetica.score, key: 'oscuridad_estetica' },
    { subject: localizeTraitAxis('creatividad', lang), value: matrix.creatividad.score, key: 'creatividad' },
    { subject: localizeTraitAxis('rebeldia', lang), value: matrix.rebeldia.score, key: 'rebeldia' },
    { subject: localizeTraitAxis('futurismo', lang), value: matrix.futurismo.score, key: 'futurismo' }
  ];

  const currentTrait = localizePersonalityTrait(selectedKey, matrix[selectedKey], lang);
  const localizedArchetypes = data.archetypes.map(arch => localizeArchetype(arch, lang));

  const traitLabels = t.personalityRadar.traitLabels;

  return (
    <div className="animate-fade-in space-y-8">
      <SectionNarrative content={t.deepNarratives.personality} accent="c3" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Radar Chart */}
        <div className="nova-surface nova-surface--analysis flex flex-col items-center rounded-3xl p-5 lg:col-span-5 lg:p-6">
          <h3 className="type-section type-strong mb-4">
            {t.personalityRadar.radarTitle}</h3>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke={`${tc.c3}30`} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  stroke="var(--type-ink-muted)"
                  fontSize={11}
                  tickFormatter={(val) => val}
                />
                <Radar
                  {...CHART_ANIMATION}
                  name="Kevin"
                  dataKey="value"
                  stroke={tc.c1}
                  fill={tc.c1}
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
                onClick={() => setSelectedKey(item.key)}
                className={`nova-surface nova-surface--interactive type-caption min-h-11 rounded-full border px-3 py-2 font-semibold ${
                  selectedKey === item.key 
                    ? 'bg-cyberCyan/10 border-cyberCyan text-cyberCyan shadow-[0_0_10px_rgba(0,242,254,0.15)]' 
                    : 'nova-surface--utility border-cyan-500/10 type-muted hover:text-[var(--fg)]'
                }`}
              >
                {item.subject} ({item.value})
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Detailed Card */}
        <div className="nova-surface nova-surface--featured space-y-6 rounded-3xl border-l-4 border-l-cyberPink p-5 sm:p-7 lg:col-span-7 lg:p-8">
          <div className="flex items-center justify-between">
            <h3 className="type-title type-strong text-2xl">{traitLabels[selectedKey]}</h3>
            <span className="type-metric rounded-2xl border border-cyberPink/20 bg-cyberPink/10 px-3 py-1 text-2xl font-black text-cyberPink">
              {currentTrait.score}/100
            </span>
          </div>

          <div className="space-y-4">
            {/* Evidencia */}
            <div className="space-y-1">
            <span className="type-label type-muted block">
              {t.personalityRadar.evidenceLabel}</span>
              <p className="type-body type-muted">{currentTrait.evidence}</p>
            </div>

            {/* Artistas de Apoyo */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentTrait.artists.map(art => (
                <span key={art} className="type-caption rounded-full border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-1 text-cyberBlue">
                  {art}
                </span>
              ))}
            </div>

            {/* Tres Secciones de Análisis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-cyan-500/10">
              <div className="space-y-2 p-4 bg-green-950/5 border border-green-500/20 rounded-2xl">
                <div className="type-label flex items-center space-x-2 text-green-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.personalityRadar.strengthLabel}</span>
                </div>
                <p className="type-caption type-muted">{currentTrait.positive}</p>
              </div>

              <div className="space-y-2 p-4 bg-red-950/5 border border-red-500/20 rounded-2xl">
                <div className="type-label flex items-center space-x-2 text-red-400">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                  <span>{t.personalityRadar.challengeLabel}</span>
                </div>
                <p className="type-caption type-muted">{currentTrait.shadow}</p>
              </div>
            </div>

            {/* Growth Tip */}
            <div className="p-4 bg-cyberCyan/5 border border-cyberCyan/20 rounded-2xl flex items-start space-x-3">
              <Heart className="w-5 h-5 text-cyberCyan shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="type-label type-strong">
                {t.personalityRadar.tipLabel}</span>
                <p className="type-caption type-muted">{currentTrait.tip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Archetypes Subsection */}
      <div className="space-y-6 pt-6">
        <h3 className="type-title type-strong">
          {t.personalityRadar.archetypesTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {localizedArchetypes.map((arch) => (
            <div 
              key={arch.name} 
              className={`nova-surface nova-surface--analysis rounded-3xl border-t-4 p-5 sm:p-6 ${
                arch.color === 'cyan' ? 'border-t-cyberCyan' : 'border-t-cyberPink'
              }`}
            >
              <h4 className="type-section type-strong mb-2 text-xl">{arch.name}</h4>
              <p className="type-caption type-muted mb-4">{arch.desc}</p>
              
              <div className="type-caption type-muted space-y-3">
                <p><strong className="text-gray-400">{t.personalityRadar.aestheticLabel}</strong> {arch.aesthetic}</p>
                <p><strong className="text-gray-400">{t.personalityRadar.strengthColonLabel}</strong> {arch.strength}</p>
                <p><strong className="text-gray-400">{t.personalityRadar.challengeColonLabel}</strong> {arch.wound}</p>
                <div className="nova-surface nova-surface--utility mt-2 rounded-xl border border-cyan-500/10 p-3 italic">
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
