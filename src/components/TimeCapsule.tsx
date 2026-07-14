import React from 'react';
import { motion } from 'framer-motion';
import { Hourglass, Music, Disc3, BarChart2, Sun, ExternalLink, Ghost, Crown } from 'lucide-react';
import { MusicDnaData, YearlyEra } from '../types';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import CoverArt from './CoverArt';
import MethodologyPanel from './MethodologyPanel';
import SectionNarrative from './SectionNarrative';
import { localizeDaypart, localizeEraLabel } from '../utils/localeText';
import { localeFor, pickLanguage } from '../utils/i18n';

interface TimeCapsuleProps {
  data: MusicDnaData;
}

interface Capsule {
  era: YearlyEra;
  faded: boolean;
  yearsAgo: number;
}

export default function TimeCapsule({ data }: TimeCapsuleProps) {
  const { tc, t, lang, setActiveTab, setSelectedArtistName, setSelectedTrackKey, setTopSubTab } = useApp();
  const fmtNum = (n: number) => Math.round(n).toLocaleString(localeFor(lang));

  const eras = data.yearly_eras;
  const currentMaxYear = eras.length > 0 ? Math.max(...eras.map(e => e.year)) : 0;

  // The 2 highest years are "now" - too recent to be nostalgia. Everything older is capsule material.
  const recentYears = [...eras]
    .sort((a, b) => b.year - a.year)
    .slice(0, 2)
    .map(e => e.year);

  const currentTopTen = data.top_artists.slice(0, 10);

  const capsules: Capsule[] = eras
    .filter(era => !recentYears.includes(era.year))
    .sort((a, b) => a.year - b.year)
    .map(era => ({
      era,
      faded: currentTopTen.every(a => a.name.toLowerCase() !== era.top_artist.toLowerCase()),
      yearsAgo: currentMaxYear - era.year,
    }));

  const fadedCount = capsules.filter(c => c.faded).length;
  const stillCount = capsules.length - fadedCount;
  const recentStart = recentYears.length > 0 ? Math.min(...recentYears) : currentMaxYear;
  const recentEnd = recentYears.length > 0 ? Math.max(...recentYears) : currentMaxYear;

  const openCapsuleDossier = (capsule: Capsule) => {
    setSelectedArtistName(capsule.era.top_artist);
    setSelectedTrackKey(`${capsule.era.top_artist.toLowerCase()}|||${capsule.era.top_track.toLowerCase()}`);
    setTopSubTab('tracks');
    setActiveTab('top');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <p className="max-w-3xl text-sm leading-relaxed text-gray-400 font-sans">
        {t.timeCapsule.subtitle}
      </p>

      <SectionNarrative content={t.deepNarratives.timeCapsule} accent="c2" />

      {capsules.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl text-center">
          <Hourglass className="w-8 h-8 mx-auto mb-4 opacity-50" style={{ color: tc.c2 }} />
          <p className="text-sm text-gray-400 font-mono">{t.timeCapsule.emptyState}</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4"
          >
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              {t.timeCapsule.capsuleCount(fadedCount, capsules.length)}
            </span>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs font-bold"
                style={{ color: tc.c2, borderColor: `${tc.c2}40`, backgroundColor: `${tc.c2}12` }}
              >
                <Ghost className="w-3.5 h-3.5" />
                <span>{fadedCount}</span>
                <span className="font-normal opacity-80">{t.timeCapsule.fadedAway}</span>
              </div>
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs font-bold"
                style={{ color: tc.c1, borderColor: `${tc.c1}40`, backgroundColor: `${tc.c1}12` }}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{stillCount}</span>
                <span className="font-normal opacity-80">{t.timeCapsule.stillInTop}</span>
              </div>
            </div>
          </motion.div>

          <div className="text-sm text-gray-300 leading-relaxed">
            {t.timeCapsule.statusLine(fadedCount, stillCount, capsules.length)}
          </div>

          <MethodologyPanel
            eyebrow={t.timeCapsule.methodEyebrow}
            title={t.timeCapsule.methodTitle}
            subtitle={t.timeCapsule.methodSubtitle}
            accent="c2"
            stats={[
              {
                label: t.timeCapsule.methodStats.closedEras,
                value: fmtNum(capsules.length),
                note: t.timeCapsule.methodStats.closedErasNote,
              },
              {
                label: t.timeCapsule.methodStats.recentWindow,
                value: t.timeCapsule.methodStats.recentWindowValue(recentStart, recentEnd),
                note: t.timeCapsule.methodStats.recentWindowNote,
              },
              {
                label: t.timeCapsule.methodStats.matchRule,
                value: t.timeCapsule.methodStats.matchRuleValue,
              },
              {
                label: t.timeCapsule.methodStats.confidence,
                value: t.timeCapsule.methodStats.confidenceValue,
              },
            ]}
            points={t.timeCapsule.methodPoints}
          />

          {/* Vertical timeline */}
          <div className="relative pl-8 md:pl-10">
            {/* Timeline spine */}
            <div
              className="absolute left-3 md:left-4 top-2 bottom-2 w-px"
              style={{ background: `linear-gradient(to bottom, ${tc.c2}60, ${tc.c1}60)` }}
            />

            <div className="space-y-6">
              {capsules.map((cap, idx) => {
                const accent = cap.faded ? tc.c2 : tc.c1;
                const spotifyUrl =
                  'https://open.spotify.com/search/' +
                  encodeURIComponent(cap.era.top_artist + ' ' + cap.era.top_track);

                return (
                  <motion.div
                    key={cap.era.year}
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: idx * 0.08, ease: 'easeOut' }}
                    className="relative"
                  >
                    {/* Timeline node */}
                    <div
                      className="absolute -left-8 md:-left-10 top-7 w-3 h-3 rounded-full border-2 -translate-x-1/2 ml-3 md:ml-4"
                      style={{ borderColor: accent, backgroundColor: `${accent}30`, boxShadow: `0 0 10px ${accent}80` }}
                    />

                    <article
                      className="glass-panel p-6 rounded-3xl transition-all hover:scale-[1.01] hover:border-white/20"
                      style={{ borderColor: `${accent}25` }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-5">
                        {/* Year badge + avatar */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div
                            className="px-3 py-2 rounded-xl border font-mono font-black text-lg leading-none"
                            style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}10` }}
                          >
                            {cap.era.year}
                          </div>
                          <ArtistAvatar name={cap.era.top_artist} size={44} />
                        </div>

                        {/* Era identity */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white truncate">
                              {localizeEraLabel(cap.era.era_label, lang)}
                            </h3>
                            <span
                              className="px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider shrink-0"
                              style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}12` }}
                            >
                              {cap.faded ? t.timeCapsule.fadedAway : t.timeCapsule.stillInTop}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                            {t.timeCapsule.yearsAgo(cap.yearsAgo)}
                          </p>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                            <span className="text-gray-400">
                              <span className="font-mono text-gray-500 uppercase text-[10px] mr-1.5">{t.timeCapsule.flagshipLabel}</span>
                              <span className="font-bold text-white">{cap.era.top_artist}</span>
                            </span>
                            <span className="text-gray-400 truncate max-w-full inline-flex items-center gap-1.5">
                              <span className="font-mono text-gray-500 uppercase text-[10px] mr-0.5">{t.timeCapsule.anthemLabel}</span>
                              <CoverArt artist={cap.era.top_artist} title={cap.era.top_track} kind="track" size={20} />
                              <span className="font-bold" style={{ color: accent }}>{cap.era.top_track}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openCapsuleDossier(cap)}
                            aria-label={pickLanguage(lang, {
                              en: `Open ${cap.era.top_artist} — ${cap.era.top_track} in All-Time Top`,
                              es: `Abrir ${cap.era.top_artist} — ${cap.era.top_track} en Top Histórico`,
                              he: `פתיחת ${cap.era.top_artist} — ${cap.era.top_track} בדירוג של כל הזמנים`,
                            })}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all hover:scale-105"
                            style={{ color: accent, borderColor: `${accent}50`, backgroundColor: `${accent}10` }}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            {pickLanguage(lang, { en: 'Open dossier', es: 'Abrir expediente', he: 'פתיחת התיק' })}
                          </button>
                          <a
                            href={spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${t.timeCapsule.listenAgain}: ${cap.era.top_artist} — ${cap.era.top_track} (${pickLanguage(lang, { en: 'opens in a new tab', es: 'abre en una pestaña nueva', he: 'נפתח בכרטיסייה חדשה' })})`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all hover:scale-105"
                            style={{ color: accent, borderColor: `${accent}50`, backgroundColor: `${accent}10` }}
                          >
                            <Music className="w-3.5 h-3.5" />
                            {t.timeCapsule.listenAgain}
                            <ExternalLink className="nova-mirror-rtl w-3 h-3 opacity-70" />
                          </a>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Disc3 className="w-4 h-4 shrink-0" style={{ color: tc.c1 }} />
                          <div className="min-w-0">
                            <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-wider truncate">
                              {t.timeCapsule.playsLabel}
                            </span>
                            <span className="text-sm font-mono font-bold text-white">{fmtNum(cap.era.plays)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <BarChart2 className="w-4 h-4 shrink-0" style={{ color: tc.c2 }} />
                          <div className="min-w-0">
                            <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-wider truncate">
                              {t.timeCapsule.diversityLabel}
                            </span>
                            <span className="text-sm font-mono font-bold text-white">{cap.era.diversity_index}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Sun className="w-4 h-4 shrink-0" style={{ color: tc.c3 }} />
                          <div className="min-w-0">
                            <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-wider truncate">
                              {t.timeCapsule.daypartLabel}
                            </span>
                            <span className="text-sm font-mono font-bold text-white truncate block">
                              {localizeDaypart(cap.era.dominant_daypart, lang)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
