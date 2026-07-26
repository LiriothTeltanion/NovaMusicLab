import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ExternalLink,
  FileSearch,
  Image,
  LoaderCircle,
  ShieldAlert,
} from 'lucide-react';
import type { ArtistKnowledgeRecord, VisualAssetRecord } from '../../knowledge/types';
import { canonicalArtistName } from '../../utils/artistIdentity';
import { normalizeCatalogName } from '../../utils/catalogName';
import type { Lang } from '../../utils/i18n';
import { localeFor } from '../../utils/i18n';
import type { ArtistAtlasCopy } from './atlasCopy';

interface LoadedEvidence {
  artist: ArtistKnowledgeRecord | null;
  assets: VisualAssetRecord[];
}

interface ArtistEvidencePanelProps {
  artistName: string;
  copy: ArtistAtlasCopy;
  lang: Lang;
  accent: string;
}

type EvidenceState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; value: LoadedEvidence }
  | { status: 'error' };

function formatEvidenceDate(value: string, lang: Lang) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(localeFor(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed);
}

/**
 * The provenance manifest is intentionally loaded only when requested. This
 * keeps the 295-asset evidence catalog outside the first Artist Atlas render
 * while preserving exact licensing and privacy states when the visitor asks.
 */
export default function ArtistEvidencePanel({ artistName, copy, lang, accent }: ArtistEvidencePanelProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EvidenceState>({ status: 'idle' });

  useEffect(() => {
    setOpen(false);
    setState({ status: 'idle' });
  }, [artistName]);

  const loadEvidence = async () => {
    if (state.status !== 'idle') return;
    setState({ status: 'loading' });
    try {
      const { artistKnowledgeManifest } = await import('../../knowledge/manifest');
      const identityKey = normalizeCatalogName(canonicalArtistName(artistName));
      const artist = artistKnowledgeManifest.artists.find(candidate =>
        candidate.normalizedName === identityKey
        || normalizeCatalogName(candidate.name) === identityKey,
      ) ?? null;
      const assetIds = new Set(artist?.visualAssetIds ?? []);
      const assets = artistKnowledgeManifest.visualAssets.filter(asset => assetIds.has(asset.id));
      setState({ status: 'ready', value: { artist, assets } });
    } catch {
      setState({ status: 'error' });
    }
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) void loadEvidence();
  };

  return (
    <section className="artist-atlas__evidence">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="artist-atlas__evidence-summary"
      >
        <span className="artist-atlas__evidence-heading">
          <span className="artist-atlas__icon-box" style={{ color: accent, borderColor: `${accent}45`, backgroundColor: `${accent}15` }}>
            <FileSearch className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="artist-atlas__kicker" style={{ color: accent }}>{copy.evidenceTitle}</span>
            <span className="artist-atlas__evidence-description">{copy.evidenceSubtitle}</span>
          </span>
        </span>
        <span className="artist-atlas__evidence-action">
          {open ? copy.closeEvidence : copy.openEvidence}
          <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div className="artist-atlas__evidence-body" aria-live="polite">
          {state.status === 'loading' ? (
            <div className="artist-atlas__state-row">
              <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" style={{ color: accent }} />
              <p>{copy.evidenceLoading}</p>
            </div>
          ) : state.status === 'error' ? (
            <div className="artist-atlas__state-row" role="alert">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              <p>{copy.evidenceError}</p>
            </div>
          ) : state.status === 'ready' && !state.value.artist ? (
            <div className="artist-atlas__state-row">
              <FileSearch className="h-5 w-5 text-gray-500" />
              <p>{copy.noEvidence}</p>
            </div>
          ) : state.status === 'ready' && state.value.artist ? (
            <div className="artist-atlas__evidence-grid">
              <div>
                <div className="artist-atlas__subheading">
                  <BadgeCheck className="h-4 w-4" style={{ color: accent }} />
                  <h4>{copy.knowledgeSources}</h4>
                </div>
                <div className="artist-atlas__source-list">
                  {state.value.artist.provenance.map(source => (
                    <a
                      key={`${source.provider}-${source.sourceUrl}`}
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="artist-atlas__source-card"
                    >
                      <span>
                        <strong>{source.provider}</strong>
                        <small>{copy.confidence[source.confidence]}</small>
                        <small>
                          {source.verifiedAt
                            ? copy.verifiedAt(formatEvidenceDate(source.verifiedAt, lang))
                            : copy.verificationDateMissing}
                        </small>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0" aria-label={copy.openSource} />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <div className="artist-atlas__subheading">
                  <Image className="h-4 w-4" style={{ color: accent }} />
                  <h4>{copy.visualAssets}</h4>
                  <span>{copy.visualAssetCount(state.value.assets.length)}</span>
                </div>
                {state.value.assets.length ? (
                  <div className="artist-atlas__asset-list">
                    {state.value.assets.map(asset => (
                      <a
                        key={asset.id}
                        href={asset.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="artist-atlas__asset-card"
                      >
                        <span className="artist-atlas__asset-preview">
                          <img
                            src={asset.url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        </span>
                        <span className="artist-atlas__asset-copy">
                          <strong>{asset.provider} · {asset.role}</strong>
                          <small>{copy.license[asset.license.status]}</small>
                          <small>{copy.assetStatus[asset.status]} · {asset.cachePolicy.privacyImpact === 'third-party-request' ? copy.remoteArtwork : copy.generatedFallback}</small>
                          {asset.attribution.label ? <small>{copy.attribution}: {asset.attribution.label}</small> : null}
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0" aria-label={copy.openSource} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="artist-atlas__muted-state">{copy.noGallery}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
