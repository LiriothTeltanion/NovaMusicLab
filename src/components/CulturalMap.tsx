import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Award, Languages, Map } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import SectionNarrative from './SectionNarrative';
import FlagArt from './FlagArt';
import InteractiveGlobe from './InteractiveGlobe';
import { getCulturalSceneTags, localizeCountryName } from '../utils/localizedDatasetText';
import { getArtistOriginGeography } from '../utils/analytics';
import { directionFor, localeFor, pickLanguage, type Lang } from '../utils/i18n';

interface CulturalMapProps {
  data: MusicDnaData;
}

interface CountryMetaLocale {
  lang: string;
  scene: string;
}

type CountryMeta = { flag: string; color: string } & Record<Lang, CountryMetaLocale>;

const COUNTRY_META: Record<string, CountryMeta> = {
  'United States': {
    flag: '🇺🇸 US', color: '#3b82f6',
    es: { lang: 'Inglés', scene: 'Post-Hardcore · Metalcore · Emo Rap' },
    en: { lang: 'English', scene: 'Post-Hardcore · Metalcore · Emo Rap' },
    he: { lang: 'אנגלית', scene: 'פוסט־הארדקור · מטאלקור · אימו־ראפ' },
  },
  'United Kingdom': {
    flag: '🇬🇧 UK', color: '#ef4444',
    es: { lang: 'Inglés', scene: 'Metalcore · Alt-Rock · Shoegaze' },
    en: { lang: 'English', scene: 'Metalcore · Alt-Rock · Shoegaze' },
    he: { lang: 'אנגלית', scene: 'מטאלקור · אלט־רוק · שוגייז' },
  },
  'Sweden': {
    flag: '🇸🇪 SE', color: '#facc15',
    es: { lang: 'Inglés/Sueco', scene: 'Hard Rock · AOR · Death Melódico' },
    en: { lang: 'English/Swedish', scene: 'Hard Rock · AOR · Melodic Death' },
    he: { lang: 'אנגלית/שוודית', scene: "הארד רוק · AOR · דת' מטאל מלודי" },
  },
  'Finland': {
    flag: '🇫🇮 FI', color: '#06b6d4',
    es: { lang: 'Finés/Inglés', scene: 'Glam Rock · Death Metal Melódico' },
    en: { lang: 'Finnish/English', scene: 'Glam Rock · Melodic Death Metal' },
    he: { lang: 'פינית/אנגלית', scene: "גלאם רוק · דת' מטאל מלודי" },
  },
  'Germany': {
    flag: '🇩🇪 DE', color: '#f97316',
    es: { lang: 'Alemán/Inglés', scene: 'Power Metal · Synth-Pop · Industrial' },
    en: { lang: 'German/English', scene: 'Power Metal · Synth-Pop · Industrial' },
    he: { lang: 'גרמנית/אנגלית', scene: "פאוור מטאל · סינת'־פופ · אינדסטריאל" },
  },
  'France': {
    flag: '🇫🇷 FR', color: '#8b5cf6',
    es: { lang: 'Francés/Inglés', scene: 'Darksynth · Shoegaze · Ambient' },
    en: { lang: 'French/English', scene: 'Darksynth · Shoegaze · Ambient' },
    he: { lang: 'צרפתית/אנגלית', scene: "דארקסינת' · שוגייז · אמביינט" },
  },
  'Israel': {
    flag: '🇮🇱 IL', color: '#10b981',
    es: { lang: 'Hebreo/Inglés', scene: 'Rock Israelí · Hip-Hop · Punk' },
    en: { lang: 'Hebrew/English', scene: 'Israeli Rock · Hip-Hop · Punk' },
    he: { lang: 'עברית/אנגלית', scene: 'רוק ישראלי · היפ־הופ · פאנק' },
  },
  'Norway': {
    flag: '🇳🇴 NO', color: '#a78bfa',
    es: { lang: 'Noruego/Inglés', scene: 'EDM · Metal · Black Metal' },
    en: { lang: 'Norwegian/English', scene: 'EDM · Metal · Black Metal' },
    he: { lang: 'נורווגית/אנגלית', scene: 'EDM · מטאל · בלאק מטאל' },
  },
  'New Zealand': {
    flag: '🇳🇿 NZ', color: '#34d399',
    es: { lang: 'Inglés', scene: 'Indie · Phonk · Pop de Internet' },
    en: { lang: 'English', scene: 'Indie · Phonk · Internet Pop' },
    he: { lang: 'אנגלית', scene: 'אינדי · Phonk · פופ אינטרנטי' },
  },
  'Puerto Rico': {
    flag: '🇵🇷 PR', color: '#fb923c',
    es: { lang: 'Español', scene: 'Trap Latino · Reggaeton' },
    en: { lang: 'Spanish', scene: 'Latin Trap · Reggaeton' },
    he: { lang: 'ספרדית', scene: 'טראפ לטיני · רגאטון' },
  },
  'Venezuela': {
    flag: '🇻🇪 VE', color: '#f43f5e',
    es: { lang: 'Español', scene: 'Rock Venezolano · Pop Latino' },
    en: { lang: 'Spanish', scene: 'Venezuelan Rock · Latin Pop' },
    he: { lang: 'ספרדית', scene: 'רוק ונצואלי · פופ לטיני' },
  },
  'Dominican Republic': {
    flag: '🇩🇴 DO', color: '#ec4899',
    es: { lang: 'Español', scene: 'Ritmos Caribeños' },
    en: { lang: 'Spanish', scene: 'Caribbean Rhythms' },
    he: { lang: 'ספרדית', scene: 'מקצבים קריביים' },
  },
  'Romania': {
    flag: '🇷🇴 RO', color: '#fb923c',
    es: { lang: 'Rumano/Inglés', scene: 'Metal/Rock Alternativo · Electro-Pop' },
    en: { lang: 'Romanian/English', scene: 'Metal/Alternative Rock · Electro-Pop' },
    he: { lang: 'רומנית/אנגלית', scene: 'מטאל/רוק אלטרנטיבי · אלקטרו־פופ' },
  },
  'Brazil': {
    flag: '🇧🇷 BR', color: '#34d399',
    es: { lang: 'Portugués/Inglés', scene: 'Post-Hardcore Digital · Rock Alternativo' },
    en: { lang: 'Portuguese/English', scene: 'Digital Post-Hardcore · Alternative Rock' },
    he: { lang: 'פורטוגזית/אנגלית', scene: 'פוסט־הארדקור דיגיטלי · רוק אלטרנטיבי' },
  },
  'Spain': {
    flag: '🇪🇸 ES', color: '#f59e0b',
    es: { lang: 'Español', scene: 'Folk Metal · Metal Juglaresco' },
    en: { lang: 'Spanish', scene: 'Folk Metal · Minstrel Metal' },
    he: { lang: 'ספרדית', scene: 'פולק מטאל · מטאל מינסטרלים' },
  },
};

export default function CulturalMap({ data }: CulturalMapProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const { lang, t } = useApp();
  // Artist-origin geography is compiled from every counted play with a
  // resolved artist home country. Legacy archives lack that optional aggregate,
  // so the helper reports a clearly labeled top-artist fallback instead of
  // pretending it covers all history.
  const originGeography = React.useMemo(() => getArtistOriginGeography(data), [data]);
  const countries = originGeography.countries;
  // `countries` is deliberately not reused here: it means where the listener
  // was connected from, not where the music came from.
  const listeningCountries = data.countries.filter(c => c.country && c.country !== 'Unknown' && c.plays > 0);
  const maxPlays = Math.max(...countries.map(c => c.plays), 1);
  const sceneTags = getCulturalSceneTags(lang);
  const locale = localeFor(lang);
  const originScopeNote = originGeography.isCompleteHistory
    ? t.cultural.originScopeFull(
        originGeography.knownOriginPlays.toLocaleString(locale),
        data.core_metrics.total_plays.toLocaleString(locale),
        Math.round(originGeography.coveragePct),
      )
    : t.cultural.originScopeLegacy;
  const heroDescription = originGeography.isCompleteHistory
    ? t.cultural.heroDesc(countries.length)
    : t.cultural.heroDescLegacy;

  // Language distribution follows the music's origin countries
  const languageData = React.useMemo(() => {
    const totalPlays = countries.reduce((sum, c) => sum + c.plays, 0) || 1;
    const langGroup: Record<string, number> = {};

    countries.forEach(c => {
      const meta = COUNTRY_META[c.country];
      const langStr = meta
        ? meta[lang].lang
        : pickLanguage(lang, { es: 'Otros', en: 'Other', he: 'אחר' });
      langGroup[langStr] = (langGroup[langStr] || 0) + c.plays;
    });

    const COLORS = ['#00f2fe', '#fb923c', '#34d399', '#f72585', '#a78bfa', '#06b6d4', '#ef4444', '#8b5cf6'];
    return Object.entries(langGroup)
      .map(([label, plays]) => ({
        label,
        plays,
        pct: (plays / totalPlays) * 100,
      }))
      .sort((a, b) => b.plays - a.plays)
      .map((item, idx) => ({
        label: item.label,
        // Honest display: a 0.1% share must never be inflated to a fabricated
        // "1%" (a Math.max(1,...) floor here once made totals exceed 100%).
        // Bars keep the true fraction; the text shows "<1%" for tiny shares.
        pct: item.pct,
        pctLabel: item.pct >= 0.5 ? `${Math.round(item.pct)}%` : '<1%',
        color: COLORS[idx % COLORS.length],
      }));
  }, [countries, lang]);

  const cardVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: (i: number) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.05, duration: 0.3 } }),
  };

  return (
    <div data-testid="cultural-map" className="min-w-0 space-y-10 animate-fade-in" dir={directionFor(lang)}>
      <SectionNarrative content={t.deepNarratives.cultural} accent="c4" />

      {/* Hero narrative */}
      <div className="glass-panel p-7 rounded-3xl border-l-4 border-l-cyberCyan relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyberCyan/5 blur-[60px] rounded-full pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <h3 className="text-xl font-bold text-white">
            {t.cultural.heroTitle}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            {heroDescription}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {sceneTags.map(({ tag, color }) => (
              <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full font-mono font-bold"
                style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Country cards grid */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
            {t.cultural.artistsByCountry}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mb-4">
          {originGeography.isCompleteHistory && `${t.cultural.originNote} `}
          {originScopeNote}
        </p>
        {countries.length > 0 ? (
          <div
            data-testid="cultural-country-grid"
            className="grid min-w-0 gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 166px), 1fr))' }}
          >
            {countries.map((c, idx) => {
              const meta = COUNTRY_META[c.country] ?? {
                flag: '🌐', color: '#6b7280',
                es: { lang: 'Varios', scene: 'Variado' },
                en: { lang: 'Various', scene: 'Varied' },
                he: { lang: 'מגוון', scene: 'סצנה מגוונת' },
              };
              const localeMeta = meta[lang];
              const pct = Math.round((c.plays / maxPlays) * 100);
              const isSelected = selected === c.country;
              return (
                <motion.button
                  key={c.country}
                  data-testid="cultural-country-card"
                  custom={idx}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  onClick={() => setSelected(isSelected ? null : c.country)}
                  aria-pressed={isSelected}
                  aria-label={`${localizeCountryName(c.country, lang)} · ${c.plays.toLocaleString(locale)} · ${localeMeta.lang} · ${localeMeta.scene}`}
                  className={`glass-panel min-h-32 min-w-0 w-full rounded-2xl border-2 p-4 text-start transition-all ${isSelected ? 'scale-[1.015]' : ''}`}
                  style={{ borderColor: isSelected ? meta.color : 'transparent' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 px-2 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${meta.color}20`, border: `1px solid ${meta.color}40` }}>
                      <FlagArt country={c.country} size={30} title={localizeCountryName(c.country, lang)} />
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                      style={{ color: meta.color, backgroundColor: `${meta.color}15` }}>
                      {c.plays.toLocaleString(locale)}
                    </span>
                  </div>
                  <p className="break-words text-sm font-bold leading-tight text-white [overflow-wrap:anywhere]">{localizeCountryName(c.country, lang)}</p>
                  <p className="mt-0.5 break-words text-xs font-mono text-gray-500 [overflow-wrap:anywhere]">{localeMeta.lang}</p>
                  <div className="mt-2.5 h-1.5 rounded-full bg-white/5">
                    <motion.div className="h-full rounded-full"
                      style={{ backgroundColor: meta.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05, ease: 'easeOut' }}
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-gray-500">
            {t.cultural.originEmpty}
          </p>
        )}
      </div>

      {/* Interactive Globe & Language distribution side-by-side */}
      <div data-testid="cultural-analysis-grid" className="grid min-w-0 grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]">
        {/* Globe Widget */}
        <div className="glass-panel relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-3xl p-4 sm:p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyberCyan/5 blur-[50px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-2 mb-4 self-start">
            <Globe className="w-5 h-5 text-cyberCyan" />
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
              {t.cultural.spatialTitle}
            </h3>
          </div>
          <InteractiveGlobe
            countries={countries}
            selectedCountry={selected}
            onSelectCountry={setSelected}
            lang={lang}
            topArtists={data.top_artists}
          />
        </div>

        {/* Language distribution */}
        <div className="glass-panel flex min-w-0 flex-col justify-between rounded-3xl p-4 sm:p-6">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Languages className="w-5 h-5 text-cyberPink" />
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">{t.cultural.languageDistribution}</h3>
            </div>
            <div className="space-y-4">
              {languageData.map(({ label, pct, pctLabel, color }, i) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex min-w-0 justify-between gap-3 text-xs font-mono">
                    <span className="min-w-0 break-words font-bold text-gray-300 [overflow-wrap:anywhere]">{label}</span>
                    <span style={{ color }} className="font-bold">{pctLabel}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                      initial={{ width: 0 }} animate={{ width: `${Math.max(pct, 0.75)}%` }}
                      transition={{ duration: 0.9, delay: 0.3 + i * 0.1, ease: 'easeOut' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Listening locations - a different fact: Spotify's conn_country
          telemetry of where the USER was, honestly labeled as such. */}
      {listeningCountries.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-1">
            <Map className="w-4 h-4 text-gray-400" />
            <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
              {t.cultural.listeningTitle}
            </h3>
          </div>
          <p className="text-[11px] text-gray-500 mb-4">{t.cultural.listeningNote}</p>
          <div className="flex flex-wrap gap-3">
            {listeningCountries.map(c => (
              <div key={c.country}
                className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/10">
                <FlagArt country={c.country} size={22} title={localizeCountryName(c.country, lang)} />
                <div>
                  <p className="text-xs font-bold text-white leading-tight">{localizeCountryName(c.country, lang)}</p>
                  <p className="text-[10px] font-mono text-gray-500">
                    {t.cultural.playsLabel(c.plays.toLocaleString(locale))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="glass-panel p-6 rounded-3xl border border-cyberCyan/15 flex items-start gap-4">
        <Award className="w-5 h-5 text-cyberCyan shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-xs font-mono font-bold text-cyberCyan uppercase tracking-wider">{t.cultural.conclusionTitle}</p>
          <p className="text-sm text-gray-300 leading-relaxed">
            {t.cultural.conclusionDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
