import { ArrowUpRight } from 'lucide-react';
import ArtistAvatar from './ArtistAvatar';

export interface ArtistLeaderboardEntry {
  name: string;
  plays: number;
  genre: string;
  moodColor?: string;
}

export interface ArtistLeaderboardCopy {
  listLabel: string;
  empty: string;
  plays: string;
  archiveShare: string;
  openArtist: (rank: number, name: string) => string;
}

interface ArtistLeaderboardProps {
  artists: readonly ArtistLeaderboardEntry[];
  totalArchivePlays: number;
  locale: string;
  summary: string;
  copy: ArtistLeaderboardCopy;
  accentColor: string;
  onArtistOpen?: (name: string) => void;
}

const podium = ['🥇', '🥈', '🥉'] as const;

/**
 * A semantic, responsive ranked bar list. Unlike an SVG categorical axis, every
 * artist remains visible, readable and keyboard actionable at every width.
 */
export default function ArtistLeaderboard({
  artists,
  totalArchivePlays,
  locale,
  summary,
  copy,
  accentColor,
  onArtistOpen,
}: ArtistLeaderboardProps) {
  const visibleArtists = artists.slice(0, 10);
  const leaderPlays = Math.max(visibleArtists[0]?.plays ?? 0, 1);
  const numberFormatter = new Intl.NumberFormat(locale);
  const percentFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  if (visibleArtists.length === 0) {
    return (
      <div
        data-testid="artist-leaderboard-empty"
        className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 text-center"
        role="status"
      >
        <p className="max-w-sm text-sm leading-relaxed text-gray-400">🎧 {copy.empty}</p>
      </div>
    );
  }

  return (
    <div data-testid="artist-leaderboard" className="min-w-0">
      <p className="mb-4 text-xs leading-relaxed text-gray-400 sm:text-sm">
        📊 {summary}
      </p>

      <ol className="space-y-2" aria-label={copy.listLabel}>
        {visibleArtists.map((artist, index) => {
          const rank = index + 1;
          const archiveShare = totalArchivePlays > 0
            ? (artist.plays / totalArchivePlays) * 100
            : 0;
          const relativeWidth = artist.plays > 0
            ? Math.min(100, Math.max(4, (artist.plays / leaderPlays) * 100))
            : 0;
          const color = artist.moodColor ?? accentColor;
          const formattedPlays = numberFormatter.format(artist.plays);
          const formattedShare = percentFormatter.format(archiveShare);

          return (
            <li
              key={`${artist.name}-${rank}`}
              data-testid="artist-leaderboard-row"
              data-rank={rank}
              data-artist={artist.name}
            >
              <button
                type="button"
                aria-label={`${copy.openArtist(rank, artist.name)} · ${formattedPlays} ${copy.plays} · ${formattedShare}% ${copy.archiveShare}`}
                onClick={() => onArtistOpen?.(artist.name)}
                className="group grid min-h-[68px] w-full touch-manipulation grid-cols-[2.25rem_2.75rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-2.5 text-start transition-[border-color,background-color,transform] duration-200 hover:border-white/20 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.995] motion-reduce:transition-none motion-reduce:active:scale-100 sm:grid-cols-[2.5rem_3rem_minmax(0,1fr)_minmax(5.5rem,auto)] sm:gap-3 sm:px-3"
              >
                <span
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 font-mono text-xs font-black tabular-nums text-white"
                  aria-hidden="true"
                >
                  {String(rank).padStart(2, '0')}
                  {rank <= podium.length && (
                    <span className="absolute -end-1.5 -top-2 text-[11px] drop-shadow" aria-hidden="true">
                      {podium[rank - 1]}
                    </span>
                  )}
                </span>

                <ArtistAvatar name={artist.name} size={44} tooltip={false} />

                <span className="min-w-0">
                  <span className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="min-w-0 break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-[15px]">
                      <bdi dir="auto">{artist.name}</bdi>
                    </span>
                    <span className="hidden shrink-0 font-mono text-xs font-black tabular-nums sm:inline" style={{ color }}>
                      {formattedPlays}
                    </span>
                  </span>

                  <span className="mt-1 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="break-words text-xs leading-tight text-gray-500 [overflow-wrap:anywhere]">
                      <bdi dir="auto">{artist.genre}</bdi>
                    </span>
                    <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-gray-400">
                      {formattedShare}%
                    </span>
                  </span>

                  <span className="nova-data-ltr mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]" dir="ltr" aria-hidden="true">
                    <span
                      className="block h-full origin-left rounded-full"
                      style={{
                        width: `${relativeWidth}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}80)`,
                        boxShadow: `0 0 12px ${color}55`,
                      }}
                    />
                  </span>
                </span>

                <span className="flex min-w-[3.5rem] shrink-0 items-center justify-end gap-1.5 sm:min-w-[5.5rem]">
                  <span className="font-mono text-xs font-black tabular-nums sm:hidden" style={{ color }}>
                    {formattedPlays}
                  </span>
                  <ArrowUpRight
                    className="nova-mirror-rtl h-4 w-4 shrink-0 text-gray-600 transition-colors group-hover:text-white motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
