import React, { useState } from 'react';
import {
  BadgeCheck, Disc3, ExternalLink, Headphones, Link2, PlayCircle, Radio,
  Search, ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ArtistMediaProfile, MediaAction, MediaProvider } from '../utils/mediaLinks';

interface MediaEmbedHubProps {
  profile: ArtistMediaProfile;
}

const COPY = {
  es: {
    title: 'Estación de escucha legal',
    subtitle: 'Reproduce con embeds oficiales cuando existen y abre búsquedas legales cuando todavía falta una URL verificada.',
    spotify: 'Spotify',
    youtube: 'YouTube',
    verifiedEmbed: 'embed verificado',
    legalFallback: 'búsqueda legal',
    officialPlayer: 'Reproductor oficial',
    noEmbedTitle: 'Sin embed verificado todavía',
    noEmbedBody: 'La app no aloja audio ni descarga música. Usa botones oficiales para abrir Spotify o YouTube y, cuando añadamos una URL verificada, aquí aparecerá el reproductor embebido.',
    launch: 'Abrir',
    legalNote: 'Legal: solo iframes oficiales, enlaces públicos y búsquedas externas. Nova Music Lab no guarda ni redistribuye audio.',
    quickActions: 'Accesos rápidos',
    sourceStatus: 'Estado de fuentes',
    spotifySource: 'Fuente Spotify',
    youtubeSource: 'Fuente YouTube',
    actionCoverage: 'Acciones listas',
    embedPolicy: 'Política de embed',
    verifiedLink: 'enlace verificado',
    searchOnly: 'solo búsqueda',
    officialIframe: 'iframe oficial',
    artistSearch: 'Artista',
    trackSearch: 'Top canción',
    albumSearch: 'Álbum',
    officialSearch: 'Oficial',
    liveSearch: 'Live',
    verifiedSeed: 'fuente curada',
    universalCoverage: 'cobertura para todos',
  },
  en: {
    title: 'Legal listening station',
    subtitle: 'Plays official embeds when they exist and opens legal searches when a verified URL still needs to be added.',
    spotify: 'Spotify',
    youtube: 'YouTube',
    verifiedEmbed: 'verified embed',
    legalFallback: 'legal search',
    officialPlayer: 'Official player',
    noEmbedTitle: 'No verified embed yet',
    noEmbedBody: 'The app does not host audio or download music. Use the official buttons to open Spotify or YouTube; once a verified URL is added, the embedded player appears here.',
    launch: 'Open',
    legalNote: 'Legal: official iframes, public links and external searches only. Nova Music Lab does not store or redistribute audio.',
    quickActions: 'Quick actions',
    sourceStatus: 'Source status',
    spotifySource: 'Spotify source',
    youtubeSource: 'YouTube source',
    actionCoverage: 'Ready actions',
    embedPolicy: 'Embed policy',
    verifiedLink: 'verified link',
    searchOnly: 'search only',
    officialIframe: 'official iframe',
    artistSearch: 'Artist',
    trackSearch: 'Top track',
    albumSearch: 'Album',
    officialSearch: 'Official',
    liveSearch: 'Live',
    verifiedSeed: 'curated source',
    universalCoverage: 'coverage for all',
  },
} as const;

const ACTION_LABELS = {
  artist: { es: 'Artista', en: 'Artist' },
  track: { es: 'Top canción', en: 'Top track' },
  album: { es: 'Álbum', en: 'Album' },
  official: { es: 'Oficial', en: 'Official' },
  live: { es: 'Live', en: 'Live' },
  search: { es: 'Buscar', en: 'Search' },
} as const;

function SpotifyGlyph({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex items-center justify-center rounded-full font-black"
      style={{ width: size, height: size, backgroundColor: '#1DB954', color: '#03130a', fontSize: size * 0.58 }}
    >
      S
    </span>
  );
}

function YouTubeGlyph({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex items-center justify-center rounded-md"
      style={{ width: size * 1.22, height: size * 0.82, backgroundColor: '#ff0033' }}
    >
      <span
        style={{
          width: 0,
          height: 0,
          borderTop: `${size * 0.18}px solid transparent`,
          borderBottom: `${size * 0.18}px solid transparent`,
          borderLeft: `${size * 0.28}px solid white`,
          marginLeft: size * 0.04,
        }}
      />
    </span>
  );
}

function providerColor(provider: MediaProvider | 'web') {
  if (provider === 'spotify') return '#1DB954';
  if (provider === 'youtube') return '#ff0033';
  return '#38bdf8';
}

function ActionIcon({ action }: { action: MediaAction }) {
  if (action.provider === 'spotify') return <SpotifyGlyph size={16} />;
  if (action.provider === 'youtube') return <YouTubeGlyph size={16} />;
  if (action.kind === 'album') return <Disc3 className="w-4 h-4" />;
  return <Link2 className="w-4 h-4" />;
}

export default function MediaEmbedHub({ profile }: MediaEmbedHubProps) {
  const { tc, lang } = useApp();
  const [provider, setProvider] = useState<MediaProvider>(profile.spotify.embedUrl ? 'spotify' : 'youtube');
  const copy = COPY[lang];
  const active = provider === 'spotify' ? profile.spotify : profile.youtube;
  const accent = providerColor(provider);
  const hasAnyVerified = profile.spotify.verified || profile.youtube.verified;

  const providerTabs: Array<{ id: MediaProvider; label: string; verified: boolean; embed?: string }> = [
    { id: 'spotify', label: copy.spotify, verified: profile.spotify.verified, embed: profile.spotify.embedUrl },
    { id: 'youtube', label: copy.youtube, verified: profile.youtube.verified, embed: profile.youtube.embedUrl },
  ];

  const sourceRows = [
    {
      label: copy.spotifySource,
      value: profile.spotify.verified ? copy.verifiedLink : copy.searchOnly,
      color: '#1DB954',
    },
    {
      label: copy.youtubeSource,
      value: profile.youtube.verified ? copy.verifiedLink : copy.searchOnly,
      color: '#ff0033',
    },
    {
      label: copy.actionCoverage,
      value: String(profile.actions.length),
      color: tc.c2,
    },
    {
      label: copy.embedPolicy,
      value: copy.officialIframe,
      color: tc.c3,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tc.c1}, ${tc.c3}, transparent)` }} />
      <div className="p-4 md:p-5 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ color: tc.c1, backgroundColor: `${tc.c1}16`, border: `1px solid ${tc.c1}35` }}>
                <Headphones className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
                  {copy.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-3xl">{copy.subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{
                color: hasAnyVerified ? '#1DB954' : tc.c2,
                backgroundColor: hasAnyVerified ? '#1DB95418' : `${tc.c2}14`,
                borderColor: hasAnyVerified ? '#1DB95440' : `${tc.c2}35`,
              }}>
              <BadgeCheck className="w-3 h-3 inline mr-1" />
              {hasAnyVerified ? copy.verifiedSeed : copy.universalCoverage}
            </span>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full border text-gray-400 border-white/10 bg-white/5">
              <ShieldCheck className="w-3 h-3 inline mr-1" />
              {copy.legalFallback}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4" style={{ color: tc.c3 }} />
            <h4 className="text-xs font-mono font-black uppercase tracking-widest" style={{ color: tc.c3 }}>
              {copy.sourceStatus}
            </h4>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {sourceRows.map(row => (
              <div key={row.label} className="rounded-xl border border-white/8 bg-black/15 p-3 min-h-[74px]">
                <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500 mb-1">{row.label}</p>
                <p className="text-xs font-black uppercase tracking-wide leading-snug" style={{ color: row.color }}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] gap-4">
          <div className="rounded-2xl border border-white/8 bg-black/20 overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-3 border-b border-white/8 flex-wrap">
              <div className="flex gap-2">
                {providerTabs.map(tab => {
                  const selected = provider === tab.id;
                  const color = providerColor(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProvider(tab.id)}
                      className="h-9 px-3 rounded-xl border font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                      style={selected
                        ? { color, backgroundColor: `${color}18`, borderColor: `${color}55` }
                        : { color: '#9ca3af', backgroundColor: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      {tab.id === 'spotify' ? <SpotifyGlyph size={16} /> : <YouTubeGlyph size={16} />}
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                {active.embedUrl ? copy.verifiedEmbed : copy.legalFallback}
              </span>
            </div>

            {active.embedUrl ? (
              <div className="relative bg-[#050812]">
                <div className="absolute left-4 top-4 z-10 rounded-full px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-widest"
                  style={{ color: accent, backgroundColor: '#030712cc', border: `1px solid ${accent}40` }}>
                  <Radio className="w-3 h-3 inline mr-1" />
                  {copy.officialPlayer}
                </div>
                <iframe
                  title={`${profile.artistName} ${provider} player`}
                  src={active.embedUrl}
                  className="w-full h-[352px] border-0"
                  loading="lazy"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : (
              <div className="min-h-[352px] flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ color: accent, backgroundColor: `${accent}16`, border: `1px solid ${accent}35` }}>
                    <Search className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-black text-white">{copy.noEmbedTitle}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed mt-2">{copy.noEmbedBody}</p>
                  <a
                    href={active.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-4 rounded-xl px-4 py-2 text-xs font-mono font-black uppercase tracking-widest border transition-all hover:bg-white/10"
                    style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
                  >
                    <PlayCircle className="w-4 h-4" />
                    {copy.launch} {provider === 'spotify' ? copy.spotify : copy.youtube}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-4 h-4" style={{ color: tc.c2 }} />
              <h4 className="text-xs font-mono font-black uppercase tracking-widest" style={{ color: tc.c2 }}>
                {copy.quickActions}
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
              {profile.actions.map(action => {
                const color = providerColor(action.provider);
                return (
                  <a
                    key={`${action.provider}-${action.kind}-${action.url}`}
                    href={action.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-xl border bg-black/15 px-3 py-3 flex items-center gap-3 transition-all hover:bg-white/[0.07]"
                    style={{ borderColor: `${color}26` }}
                  >
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ color, backgroundColor: `${color}14`, border: `1px solid ${color}35` }}>
                      <ActionIcon action={action} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white truncate">{ACTION_LABELS[action.kind][lang]}</span>
                      <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 truncate">
                        {action.provider === 'spotify' ? copy.spotify : copy.youtube}
                      </span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors shrink-0" />
                  </a>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3">
              <div className="flex items-center gap-1.5 mb-2" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map(index => (
                  <span
                    key={index}
                    className="w-1.5 rounded-full animate-pulse"
                    style={{
                      height: 10 + ((index * 7) % 28),
                      backgroundColor: index % 2 ? tc.c1 : tc.c3,
                      animationDelay: `${index * 90}ms`,
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">{copy.legalNote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
