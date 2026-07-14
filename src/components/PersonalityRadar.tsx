import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { AlertTriangle, ShieldCheck, Heart } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import SectionNarrative from './SectionNarrative';
import { useChartAnimation } from './chartKit';
import { localizeTraitAxis } from '../utils/localizedDatasetText';
import { buildArchetypes, buildPersonalityMatrix } from '../utils/identityEngine';
import { directionFor } from '../utils/i18n';

interface PersonalityRadarProps {
  data: MusicDnaData;
}

export default function PersonalityRadar({ data }: PersonalityRadarProps) {
  const { tc, t, lang } = useApp();
  const chartAnimation = useChartAnimation();
  // Derived live from the real top_artists, per current language - never
  // pre-baked, so the radar always matches the archive actually on screen.
  const matrix = useMemo(() => buildPersonalityMatrix(data.top_artists, lang), [data.top_artists, lang]);
  type PersonalityKey = keyof typeof matrix;
  const [selectedKey, setSelectedKey] = useState<PersonalityKey>('sensibilidad_emocional');

  const chartData: Array<{ subject: string; value: number; key: PersonalityKey }> = [
    { subject: localizeTraitAxis('sensibilidad_emocional', lang), value: matrix.sensibilidad_emocional.score, key: 'sensibilidad_emocional' },
    { subject: localizeTraitAxis('nostalgia', lang), value: matrix.nostalgia.score, key: 'nostalgia' },
    { subject: localizeTraitAxis('energia', lang), value: matrix.energia.score, key: 'energia' },
    { subject: localizeTraitAxis('oscuridad_estetica', lang), value: matrix.oscuridad_estetica.score, key: 'oscuridad_estetica' },
    { subject: localizeTraitAxis('creatividad', lang), value: matrix.creatividad.score, key: 'creatividad' },
    { subject: localizeTraitAxis('rebeldia', lang), value: matrix.rebeldia.score, key: 'rebeldia' },
    { subject: localizeTraitAxis('futurismo', lang), value: matrix.futurismo.score, key: 'futurismo' }
  ];

  const currentTrait = matrix[selectedKey];
  const archetypes = useMemo(() => buildArchetypes(data.top_artists, lang), [data.top_artists, lang]);

  const traitLabels = t.personalityRadar.traitLabels;

  return (
    <div className="animate-fade-in space-y-8" dir={directionFor(lang)}>
      <SectionNarrative content={t.deepNarratives.personality} accent="c3" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Radar Chart */}
        <div className="nova-surface nova-surface--analysis flex flex-col items-center rounded-3xl p-5 lg:col-span-5 lg:p-6">
          <h3 className="type-section type-strong mb-4">
            {t.personalityRadar.radarTitle}</h3>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart accessibilityLayer data={chartData}>
                <PolarGrid stroke={`${tc.c3}30`} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  stroke="var(--type-ink-muted)"
                  fontSize={11}
                  tickFormatter={(val) => val}
                />
                <Radar
                  {...chartAnimation}
                  name={t.personalityRadar.yourProfileLabel}
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
            {chartData.map(item => {
              const active = selectedKey === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedKey(item.key)}
                  aria-pressed={active}
                  className="nova-surface nova-surface--interactive nova-surface--utility type-caption min-h-11 rounded-full border px-3 py-2 font-semibold"
                  style={active ? {
                    color: 'color-mix(in srgb, var(--c1) 58%, var(--fg))',
                    borderColor: `${tc.c1}70`,
                    backgroundColor: `${tc.c1}16`,
                    boxShadow: `0 0 14px ${tc.c1}20`,
                  } : { color: 'var(--type-ink-muted)', borderColor: `${tc.c1}18` }}
                >
                  {item.subject} ({item.value})
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Card */}
        <div className="nova-surface nova-surface--featured space-y-6 rounded-3xl border-s-4 p-5 sm:p-7 lg:col-span-7 lg:p-8"
          style={{ borderInlineStartColor: tc.c3 }}>
          <div className="flex items-center justify-between">
            <h3 className="type-title type-strong text-2xl">{traitLabels[selectedKey]}</h3>
            <span className="type-metric rounded-2xl border px-3 py-1 text-2xl font-black"
              style={{ color: 'color-mix(in srgb, var(--c3) 60%, var(--fg))', borderColor: `${tc.c3}35`, backgroundColor: `${tc.c3}12` }}>
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
                <span key={art} className="type-caption rounded-full border px-2.5 py-1"
                  style={{ color: 'color-mix(in srgb, var(--c1) 56%, var(--fg))', borderColor: `${tc.c1}30`, backgroundColor: `${tc.c1}10` }}>
                  <bdi dir="auto">{art}</bdi>
                </span>
              ))}
            </div>

            {/* Tres Secciones de Análisis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-cyan-500/10">
              <div className="space-y-2 rounded-2xl border p-4"
                style={{ borderColor: 'color-mix(in srgb, #22c55e 26%, transparent)', backgroundColor: 'color-mix(in srgb, #22c55e 5%, transparent)' }}>
                <div className="type-label flex items-center gap-2"
                  style={{ color: 'color-mix(in srgb, #22c55e 58%, var(--fg))' }}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.personalityRadar.strengthLabel}</span>
                </div>
                <p className="type-caption type-muted">{currentTrait.positive}</p>
              </div>

              <div className="space-y-2 rounded-2xl border p-4"
                style={{ borderColor: 'color-mix(in srgb, #ef4444 26%, transparent)', backgroundColor: 'color-mix(in srgb, #ef4444 5%, transparent)' }}>
                <div className="type-label flex items-center gap-2"
                  style={{ color: 'color-mix(in srgb, #ef4444 58%, var(--fg))' }}>
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                  <span>{t.personalityRadar.challengeLabel}</span>
                </div>
                <p className="type-caption type-muted">{currentTrait.shadow}</p>
              </div>
            </div>

            {/* Growth Tip */}
            <div className="flex items-start gap-3 rounded-2xl border p-4"
              style={{ borderColor: `${tc.c1}30`, backgroundColor: `${tc.c1}0d` }}>
              <Heart className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tc.c1 }} />
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
          {archetypes.map((arch) => (
            <div 
              key={arch.name} 
              className="nova-surface nova-surface--analysis rounded-3xl border-t-4 p-5 sm:p-6"
              style={{ borderTopColor: arch.color === 'cyan' ? tc.c1 : tc.c3 }}
            >
              <h4 className="type-section type-strong mb-2 text-xl"><bdi dir="auto">{arch.name}</bdi></h4>
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
