import { ARTIST_KNOWLEDGE_SCHEMA_VERSION } from '../knowledge/types';
import type { MuseumRecord } from './schema';
import { NOVA_DATABASE_SCHEMA_VERSION } from './schema';

const KNOWLEDGE_PROVIDERS = new Set([
  'archive',
  'musicbrainz',
  'wikidata',
  'wikimedia-commons',
  'wikipedia',
  'spotify',
  'deezer',
  'curated',
  'other',
]);

const PROVENANCE_CONFIDENCE = new Set(['verified', 'curated', 'matched', 'unverified']);
const VISUAL_ROLES = new Set(['primary', 'gallery', 'background', 'avatar']);
const VISUAL_STATUSES = new Set(['active', 'review', 'blocked']);
const LICENSE_STATUSES = new Set(['verified', 'declared', 'unverified', 'restricted']);
const FOCAL_POINT_SOURCES = new Set(['curated', 'detected', 'default']);
const CACHE_STRATEGIES = new Set(['bundled', 'cache-first', 'remote-opt-in', 'remote-browser', 'no-store']);
const PRIVACY_IMPACTS = new Set(['none', 'third-party-request']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableText(value: unknown): value is string | null {
  return value === null || hasText(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isKnownPositiveNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function validateTextArray(
  value: unknown,
  label: string,
  errors: string[],
  options: { nonEmpty?: boolean } = {},
): string[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return null;
  }

  const validValues: string[] = [];
  value.forEach((item, index) => {
    if (!hasText(item)) {
      errors.push(`${label}[${index}] must be a non-empty string.`);
      return;
    }
    validValues.push(item);
  });
  if (options.nonEmpty && value.length === 0) errors.push(`${label} must not be empty.`);
  if (new Set(validValues).size !== validValues.length) errors.push(`${label} must contain unique values.`);
  return validValues;
}

function validateNullableHttpsUrl(value: unknown, label: string, errors: string[]): void {
  if (value !== null && !isHttpsUrl(value)) errors.push(`${label} must use HTTPS or be null.`);
}

function validateNullableIsoDate(value: unknown, label: string, errors: string[]): void {
  if (value !== null && !isIsoDate(value)) errors.push(`${label} must be an ISO timestamp or null.`);
}

export function isMuseumRecord(value: unknown): value is MuseumRecord {
  if (!isRecord(value)) return false;
  return hasText(value.id)
    && hasText(value.profileId)
    && value.schemaVersion === NOVA_DATABASE_SCHEMA_VERSION
    && ['public-demo', 'private-import', 'legacy-aggregate'].includes(String(value.datasetKind))
    && hasText(value.displayName)
    && hasText(value.timeZone)
    && typeof value.privacyMode === 'boolean'
    && ['staging', 'active', 'archived', 'corrupt'].includes(String(value.status))
    && (value.activeImportId === null || hasText(value.activeImportId))
    && Array.isArray(value.importIds)
    && value.importIds.every(hasText)
    && new Set(value.importIds).size === value.importIds.length
    && isIsoDate(value.createdAt)
    && isIsoDate(value.updatedAt);
}

/**
 * Runtime validator for generated artist/artwork manifests. It deliberately
 * accepts `unknown` and never trusts nested shapes, so a corrupt import is
 * reported as maintenance debt instead of crashing the installation flow.
 */
export function validateArtistKnowledgeManifest(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ['Manifest must be an object.'];
  if (!isRecord(value.meta)) return ['meta must be an object.'];

  const { meta } = value;
  if (meta.schemaVersion !== ARTIST_KNOWLEDGE_SCHEMA_VERSION) {
    errors.push(`Unsupported manifest schema version: ${String(meta.schemaVersion)}.`);
  }
  if (!isIsoDate(meta.generatedAt)) errors.push('meta.generatedAt must be an ISO timestamp.');
  if (!hasText(meta.sourceFingerprint) || !/^[a-f0-9]{64}$/.test(meta.sourceFingerprint)) {
    errors.push('meta.sourceFingerprint must be a lowercase SHA-256 fingerprint.');
  }
  validateTextArray(meta.sourceFiles, 'meta.sourceFiles', errors, { nonEmpty: true });
  if (!isNonNegativeInteger(meta.artistCount)) errors.push('meta.artistCount must be a non-negative integer.');
  if (!isNonNegativeInteger(meta.visualAssetCount)) {
    errors.push('meta.visualAssetCount must be a non-negative integer.');
  }
  if (!isNonNegativeInteger(meta.assetsAwaitingLicenseReview)) {
    errors.push('meta.assetsAwaitingLicenseReview must be a non-negative integer.');
  }
  if (!Array.isArray(value.artists)) errors.push('artists must be an array.');
  if (!Array.isArray(value.visualAssets)) errors.push('visualAssets must be an array.');
  if (!Array.isArray(value.artists) || !Array.isArray(value.visualAssets)) return errors;

  const artistIds = new Set<string>();
  const normalizedArtistNames = new Set<string>();
  const artistAssetReferences = new Map<string, Set<string>>();
  const assetIds = new Set<string>();
  const assetOwners = new Map<string, string>();
  const primaryAssetCounts = new Map<string, number>();

  value.artists.forEach((candidate, index) => {
    const label = `artists[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    const artist = candidate;

    if (!hasText(artist.id)) {
      errors.push(`${label}.id is required.`);
    } else if (artistIds.has(artist.id)) {
      errors.push(`${label}.id must be unique.`);
    } else {
      artistIds.add(artist.id);
    }
    if (!hasText(artist.name)) errors.push(`${label}.name is required.`);
    if (!hasText(artist.sortName)) errors.push(`${label}.sortName is required.`);
    if (!hasText(artist.normalizedName)
      || artist.normalizedName !== artist.normalizedName.trim().toLowerCase()) {
      errors.push(`${label}.normalizedName must be non-empty, trimmed and lowercase.`);
    } else if (normalizedArtistNames.has(artist.normalizedName)) {
      errors.push(`${label}.normalizedName must be unique.`);
    } else {
      normalizedArtistNames.add(artist.normalizedName);
    }
    if (!isNullableText(artist.artistType)) errors.push(`${label}.artistType must be text or null.`);

    validateTextArray(artist.aliases, `${label}.aliases`, errors);
    validateTextArray(artist.countries, `${label}.countries`, errors);
    validateTextArray(artist.genres, `${label}.genres`, errors);
    validateTextArray(artist.areas, `${label}.areas`, errors);

    if (!isRecord(artist.externalIds)) {
      errors.push(`${label}.externalIds must be an object.`);
    } else {
      if (!isNullableText(artist.externalIds.musicbrainz)) {
        errors.push(`${label}.externalIds.musicbrainz must be text or null.`);
      }
      if (!isNullableText(artist.externalIds.wikidata)) {
        errors.push(`${label}.externalIds.wikidata must be text or null.`);
      }
      validateTextArray(artist.externalIds.isnis, `${label}.externalIds.isnis`, errors);
    }

    if (artist.description !== null) {
      if (!isRecord(artist.description)) {
        errors.push(`${label}.description must be an object or null.`);
      } else {
        if (!hasText(artist.description.text)) errors.push(`${label}.description.text is required.`);
        if (!hasText(artist.description.language)) errors.push(`${label}.description.language is required.`);
        if (!KNOWLEDGE_PROVIDERS.has(String(artist.description.provider))) {
          errors.push(`${label}.description.provider is unsupported.`);
        }
        if (!isHttpsUrl(artist.description.sourceUrl)) {
          errors.push(`${label}.description.sourceUrl must use HTTPS.`);
        }
      }
    }

    if (!isRecord(artist.activeRange)) {
      errors.push(`${label}.activeRange must be an object.`);
    } else {
      if (!isNullableText(artist.activeRange.begin)) errors.push(`${label}.activeRange.begin must be text or null.`);
      if (!isNullableText(artist.activeRange.end)) errors.push(`${label}.activeRange.end must be text or null.`);
      if (artist.activeRange.ended !== null && typeof artist.activeRange.ended !== 'boolean') {
        errors.push(`${label}.activeRange.ended must be boolean or null.`);
      }
      if (artist.activeRange.ended === true && artist.activeRange.end === null) {
        errors.push(`${label}.activeRange.end is required when ended is true.`);
      }
      if (artist.activeRange.ended === false && artist.activeRange.end !== null) {
        errors.push(`${label}.activeRange.end must be null when ended is false.`);
      }
    }

    if (!Array.isArray(artist.members)) {
      errors.push(`${label}.members must be an array.`);
    } else {
      artist.members.forEach((member, memberIndex) => {
        const memberLabel = `${label}.members[${memberIndex}]`;
        if (!isRecord(member)) {
          errors.push(`${memberLabel} must be an object.`);
          return;
        }
        if (!hasText(member.name)) errors.push(`${memberLabel}.name is required.`);
        validateTextArray(member.roles, `${memberLabel}.roles`, errors);
        if (typeof member.current !== 'boolean') errors.push(`${memberLabel}.current must be boolean.`);
      });
    }

    if (!Array.isArray(artist.releases)) {
      errors.push(`${label}.releases must be an array.`);
    } else {
      const releaseIds = new Set<string>();
      artist.releases.forEach((release, releaseIndex) => {
        const releaseLabel = `${label}.releases[${releaseIndex}]`;
        if (!isRecord(release)) {
          errors.push(`${releaseLabel} must be an object.`);
          return;
        }
        if (!hasText(release.id)) {
          errors.push(`${releaseLabel}.id is required.`);
        } else if (releaseIds.has(release.id)) {
          errors.push(`${releaseLabel}.id must be unique within its artist.`);
        } else {
          releaseIds.add(release.id);
        }
        if (!hasText(release.title)) errors.push(`${releaseLabel}.title is required.`);
        if (!isNullableText(release.primaryType)) errors.push(`${releaseLabel}.primaryType must be text or null.`);
        if (!isNullableText(release.firstReleaseDate)) {
          errors.push(`${releaseLabel}.firstReleaseDate must be text or null.`);
        }
        if (!['musicbrainz', 'curated'].includes(String(release.provider))) {
          errors.push(`${releaseLabel}.provider is unsupported.`);
        }
      });
    }

    const officialUrls = validateTextArray(artist.officialUrls, `${label}.officialUrls`, errors);
    officialUrls?.forEach((url, urlIndex) => {
      if (!isHttpsUrl(url)) errors.push(`${label}.officialUrls[${urlIndex}] must use HTTPS.`);
    });

    const provenanceKeys = new Set<string>();
    const validProvenance: Array<Record<string, unknown>> = [];
    if (!Array.isArray(artist.provenance) || artist.provenance.length === 0) {
      errors.push(`${label}.provenance must retain at least one source.`);
    } else {
      artist.provenance.forEach((source, sourceIndex) => {
        const sourceLabel = `${label}.provenance[${sourceIndex}]`;
        if (!isRecord(source)) {
          errors.push(`${sourceLabel} must be an object.`);
          return;
        }
        validProvenance.push(source);
        if (!KNOWLEDGE_PROVIDERS.has(String(source.provider))) {
          errors.push(`${sourceLabel}.provider is unsupported.`);
        }
        if (!isNullableText(source.sourceId)) errors.push(`${sourceLabel}.sourceId must be text or null.`);
        if (!isHttpsUrl(source.sourceUrl)) errors.push(`${sourceLabel}.sourceUrl must use HTTPS.`);
        validateNullableIsoDate(source.verifiedAt, `${sourceLabel}.verifiedAt`, errors);
        if (!PROVENANCE_CONFIDENCE.has(String(source.confidence))) {
          errors.push(`${sourceLabel}.confidence is unsupported.`);
        }
        if (hasText(source.provider) && isHttpsUrl(source.sourceUrl)) {
          const key = `${source.provider}|${source.sourceUrl}`;
          if (provenanceKeys.has(key)) errors.push(`${sourceLabel} duplicates an existing source.`);
          provenanceKeys.add(key);
        }
      });
    }

    if (isRecord(artist.externalIds)) {
      for (const provider of ['musicbrainz', 'wikidata'] as const) {
        const sourceId = artist.externalIds[provider];
        if (hasText(sourceId)
          && !validProvenance.some(source => source.provider === provider && source.sourceId === sourceId)) {
          errors.push(`${label}.externalIds.${provider} requires matching provenance.`);
        }
      }
    }
    const description = artist.description;
    if (isRecord(description)
      && !validProvenance.some(source => source.provider === description.provider
        && source.sourceUrl === description.sourceUrl)) {
      errors.push(`${label}.description requires matching provenance.`);
    }

    const visualAssetIds = validateTextArray(
      artist.visualAssetIds,
      `${label}.visualAssetIds`,
      errors,
      { nonEmpty: true },
    );
    if (hasText(artist.id) && visualAssetIds) {
      artistAssetReferences.set(artist.id, new Set(visualAssetIds));
    }
    if (!isIsoDate(artist.updatedAt)) errors.push(`${label}.updatedAt must be an ISO timestamp.`);
  });

  value.visualAssets.forEach((candidate, index) => {
    const label = `visualAssets[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    const asset = candidate;

    if (!hasText(asset.id)) {
      errors.push(`${label}.id is required.`);
    } else if (assetIds.has(asset.id)) {
      errors.push(`${label}.id must be unique.`);
    } else {
      assetIds.add(asset.id);
    }
    if (!hasText(asset.entityId)) {
      errors.push(`${label}.entityId is required.`);
    } else {
      if (!artistIds.has(asset.entityId)) errors.push(`${label}.entityId does not match an artist.`);
      if (hasText(asset.id)) assetOwners.set(asset.id, asset.entityId);
      if (asset.role === 'primary') {
        primaryAssetCounts.set(asset.entityId, (primaryAssetCounts.get(asset.entityId) ?? 0) + 1);
      }
    }
    if (asset.kind !== 'image') errors.push(`${label}.kind must be image.`);
    if (!VISUAL_ROLES.has(String(asset.role))) errors.push(`${label}.role is unsupported.`);
    if (!isHttpsUrl(asset.url)) errors.push(`${label}.url must use HTTPS.`);
    if (!KNOWLEDGE_PROVIDERS.has(String(asset.provider))) errors.push(`${label}.provider is unsupported.`);
    if (!isHttpsUrl(asset.sourceUrl)) errors.push(`${label}.sourceUrl must use HTTPS.`);

    let licenseStatus: string | null = null;
    if (!isRecord(asset.license)) {
      errors.push(`${label}.license must be an object.`);
    } else {
      licenseStatus = typeof asset.license.status === 'string' ? asset.license.status : null;
      if (!LICENSE_STATUSES.has(String(asset.license.status))) {
        errors.push(`${label}.license.status is unsupported.`);
      }
      if (!isNullableText(asset.license.id)) errors.push(`${label}.license.id must be text or null.`);
      if (!isNullableText(asset.license.name)) errors.push(`${label}.license.name must be text or null.`);
      validateNullableHttpsUrl(asset.license.url, `${label}.license.url`, errors);
      if (['verified', 'declared'].includes(String(asset.license.status))
        && !hasText(asset.license.id)
        && !hasText(asset.license.name)) {
        errors.push(`${label}.license must identify a verified or declared license.`);
      }
    }

    if (!isRecord(asset.attribution)) {
      errors.push(`${label}.attribution must be an object.`);
    } else {
      if (typeof asset.attribution.required !== 'boolean') {
        errors.push(`${label}.attribution.required must be boolean.`);
      }
      if (!isNullableText(asset.attribution.creator)) {
        errors.push(`${label}.attribution.creator must be text or null.`);
      }
      if (!hasText(asset.attribution.label)) errors.push(`${label}.attribution.label is required.`);
      validateNullableHttpsUrl(asset.attribution.url, `${label}.attribution.url`, errors);
    }

    validateNullableIsoDate(asset.verifiedAt, `${label}.verifiedAt`, errors);
    if (licenseStatus === 'verified' && !isIsoDate(asset.verifiedAt)) {
      errors.push(`${label}.verifiedAt is required for a verified license.`);
    }

    if (!isRecord(asset.dimensions)) {
      errors.push(`${label}.dimensions must be an object.`);
    } else {
      const { width, height, aspectRatio } = asset.dimensions;
      if (!isKnownPositiveNumber(width)
        || !isKnownPositiveNumber(height)
        || !isKnownPositiveNumber(aspectRatio)) {
        errors.push(`${label}.dimensions must explicitly preserve positive known or null values.`);
      }
      if (typeof width === 'number' && typeof height === 'number') {
        if (typeof aspectRatio !== 'number') {
          errors.push(`${label}.dimensions.aspectRatio is required when width and height are known.`);
        } else if (Math.abs(aspectRatio - (width / height)) > 0.01) {
          errors.push(`${label}.dimensions.aspectRatio does not match width and height.`);
        }
      }
    }

    if (!isRecord(asset.focalPoint)) {
      errors.push(`${label}.focalPoint must be an object.`);
    } else {
      if (typeof asset.focalPoint.x !== 'number'
        || !Number.isFinite(asset.focalPoint.x)
        || asset.focalPoint.x < 0
        || asset.focalPoint.x > 1
        || typeof asset.focalPoint.y !== 'number'
        || !Number.isFinite(asset.focalPoint.y)
        || asset.focalPoint.y < 0
        || asset.focalPoint.y > 1) {
        errors.push(`${label}.focalPoint must use normalized coordinates.`);
      }
      if (!FOCAL_POINT_SOURCES.has(String(asset.focalPoint.source))) {
        errors.push(`${label}.focalPoint.source is unsupported.`);
      }
    }

    let cacheStrategy: string | null = null;
    let privacyImpact: string | null = null;
    if (!isRecord(asset.cachePolicy)) {
      errors.push(`${label}.cachePolicy must be an object.`);
    } else {
      cacheStrategy = typeof asset.cachePolicy.strategy === 'string' ? asset.cachePolicy.strategy : null;
      privacyImpact = typeof asset.cachePolicy.privacyImpact === 'string'
        ? asset.cachePolicy.privacyImpact
        : null;
      if (!CACHE_STRATEGIES.has(String(asset.cachePolicy.strategy))) {
        errors.push(`${label}.cachePolicy.strategy is unsupported.`);
      }
      if (!PRIVACY_IMPACTS.has(String(asset.cachePolicy.privacyImpact))) {
        errors.push(`${label}.cachePolicy.privacyImpact is unsupported.`);
      }
      if (asset.cachePolicy.maxAgeDays !== null
        && (!isNonNegativeInteger(asset.cachePolicy.maxAgeDays))) {
        errors.push(`${label}.cachePolicy.maxAgeDays must be a non-negative integer or null.`);
      }
      if (asset.cachePolicy.strategy === 'no-store'
        && asset.cachePolicy.maxAgeDays !== null
        && asset.cachePolicy.maxAgeDays !== 0) {
        errors.push(`${label}.cachePolicy.maxAgeDays must be null or zero for no-store.`);
      }
      if (asset.cachePolicy.strategy === 'remote-browser' && asset.cachePolicy.maxAgeDays !== null) {
        errors.push(`${label}.cachePolicy.maxAgeDays must be null when browser HTTP caching is provider-controlled.`);
      }
      if (asset.cachePolicy.strategy === 'bundled' && asset.cachePolicy.privacyImpact !== 'none') {
        errors.push(`${label}.cachePolicy bundled assets must have no third-party privacy impact.`);
      }
      if (['cache-first', 'remote-opt-in', 'remote-browser', 'no-store'].includes(String(asset.cachePolicy.strategy))
        && asset.cachePolicy.privacyImpact !== 'third-party-request') {
        errors.push(`${label}.cachePolicy remote assets must declare third-party-request privacy impact.`);
      }
    }

    if (!isNullableText(asset.contentHash)) errors.push(`${label}.contentHash must be text or null.`);
    if (!VISUAL_STATUSES.has(String(asset.status))) errors.push(`${label}.status is unsupported.`);
    if (['unverified', 'restricted'].includes(String(licenseStatus)) && asset.status === 'active') {
      errors.push(`${label}.status cannot be active while its license is ${licenseStatus}.`);
    }
    if (cacheStrategy === 'bundled' && privacyImpact === 'third-party-request') {
      errors.push(`${label} cannot bundle a third-party-request asset.`);
    }
  });

  for (const [artistId, references] of artistAssetReferences) {
    for (const assetId of references) {
      if (!assetIds.has(assetId)) {
        errors.push(`${artistId} references missing asset ${assetId}.`);
      } else if (assetOwners.get(assetId) !== artistId) {
        errors.push(`${artistId} references asset ${assetId} owned by another artist.`);
      }
    }
  }

  for (const [assetId, ownerId] of assetOwners) {
    if (!artistAssetReferences.get(ownerId)?.has(assetId)) {
      errors.push(`${assetId} is not referenced by its artist ${ownerId}.`);
    }
  }

  for (const artistId of artistIds) {
    if ((primaryAssetCounts.get(artistId) ?? 0) !== 1) {
      errors.push(`${artistId} must have exactly one primary visual asset.`);
    }
  }

  if (isNonNegativeInteger(meta.artistCount) && meta.artistCount !== value.artists.length) {
    errors.push('meta.artistCount is stale.');
  }
  if (isNonNegativeInteger(meta.visualAssetCount) && meta.visualAssetCount !== value.visualAssets.length) {
    errors.push('meta.visualAssetCount is stale.');
  }
  const reviewCount = value.visualAssets.filter(asset => isRecord(asset)
    && isRecord(asset.license)
    && asset.license.status === 'unverified').length;
  if (isNonNegativeInteger(meta.assetsAwaitingLicenseReview)
    && meta.assetsAwaitingLicenseReview !== reviewCount) {
    errors.push('meta.assetsAwaitingLicenseReview is stale.');
  }

  return errors;
}
