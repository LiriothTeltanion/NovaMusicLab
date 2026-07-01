import React from 'react';
import { AlertCircle, HelpCircle, HeartHandshake, ShieldAlert } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { deriveSourceSummary, getNightRatio, getRecords } from '../utils/analytics';

interface HiddenInsightsProps {
  data: MusicDnaData;
}

export default function HiddenInsights({ data }: HiddenInsightsProps) {
  const metrics = data.core_metrics;
  const topArtist = data.top_artists[0];
  const supportArtists = data.top_artists.slice(1, 3);
  const anchorTracks = data.top_tracks.slice(0, 2);
  const source = deriveSourceSummary(data);
  const records = getRecords(data);
  const nightRatio = getNightRatio(data);
  const { tc, t, lang } = useApp();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';

  const secondArtistName = supportArtists[0]?.name ?? t.hiddenInsights.secondArtistFallback;
  const secondArtistPlays = supportArtists[0]?.plays?.toLocaleString(locale) ?? 0;
  const anchorTrackTitle = anchorTracks[0]?.title ?? t.hiddenInsights.anchorTrackFallback;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <AlertCircle className="w-6 h-6" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.hiddenInsights.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Insight 1: Silent Dominance */}
        <div className="glass-panel p-8 rounded-3xl space-y-4 border-l-4 border-l-cyberCyan">
          <div className="flex items-center space-x-2 text-cyberCyan">
            <HeartHandshake className="w-5 h-5" />
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
              {t.hiddenInsights.supportWeightTitle}
            </h4>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            {t.hiddenInsights.supportWeightBody(
              topArtist?.name ?? '',
              secondArtistName,
              secondArtistPlays,
              supportArtists[1]?.name,
              supportArtists[1]?.plays?.toLocaleString(locale),
            )}
          </p>
        </div>

        {/* Insight 2: Platform discrepancies */}
        <div className="glass-panel p-8 rounded-3xl space-y-4 border-l-4 border-l-cyberPink">
          <div className="flex items-center space-x-2 text-cyberPink">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
              {t.hiddenInsights.sourceCrossCheckTitle}
            </h4>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed font-light">
            {t.hiddenInsights.sourceCrossCheckBody(metrics.match_rate_pct)}
            {' '}{source.source_note}
            {source.spotify_short_plays > 0 && ' ' + t.hiddenInsights.spotifyShortPlaysNote(source.spotify_short_plays.toLocaleString(locale))}
          </p>
        </div>

        {/* Insight 3: Comfort loops */}
        <div className="glass-panel p-8 rounded-3xl space-y-4 border-l-4 border-l-cyberPurple">
          <div className="flex items-center space-x-2 text-cyberPurple">
            <RotateCcwIcon className="w-5 h-5" />
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
              {t.hiddenInsights.timeResistantTracksTitle}
            </h4>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            {t.hiddenInsights.timeResistantTracksBody(
              anchorTrackTitle,
              anchorTracks[0]?.artist,
              anchorTracks[1]?.title,
            )}
          </p>
        </div>

        {/* Insight 4: Hour correlation */}
        <div className="glass-panel p-8 rounded-3xl space-y-4 border-l-4 border-l-green-400">
          <div className="flex items-center space-x-2 text-green-400">
            <HelpCircle className="w-5 h-5" />
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
              {t.hiddenInsights.nocturnalRegulationTitle}
            </h4>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            {t.hiddenInsights.nocturnalRegulationBody(nightRatio, records.longest_streak_days)}
          </p>
        </div>
      </div>
    </div>
  );
}

// Simple internal icon proxy to avoid broken imports
function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
