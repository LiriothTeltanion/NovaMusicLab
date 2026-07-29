import { createHash } from 'node:crypto';

export const COMMONS_API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
export const COMMONS_CACHE_SCHEMA_VERSION = 1;

const OPEN_LICENSE_PATTERNS = [
  /\bcc[\s-]*0\b/i,
  /\bcc[\s-]*by(?:[\s-]*sa)?\b/i,
  /\bcreative commons attribution\b/i,
  /\bpublic domain\b/i,
  /\bpublic domain mark\b/i,
  /\bgfdl\b/i,
  /\bgnu free documentation license\b/i,
  /\bfree art license\b/i,
];

const RESTRICTED_LICENSE_PATTERNS = [
  /\ball rights reserved\b/i,
  /\bfair use\b/i,
  /\bnon[\s-]*free\b/i,
  /\bpermission only\b/i,
];

const ENTITY_MAP = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['gt', '>'],
  ['hellip', '…'],
  ['lt', '<'],
  ['nbsp', ' '],
  ['quot', '"'],
]);

function truncate(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function decodeHtmlEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return ENTITY_MAP.get(normalized) ?? match;
  });
}

function decodeUriComponentSafely(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return String(value ?? '');
  }
}

export function sanitizeCommonsMetadataText(value, maxLength = 500) {
  const plainText = decodeHtmlEntities(
    String(value ?? '')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .trim()
    .replace(/^[\s,;:|/\\-]+|[\s,;:|/\\-]+$/g, '');

  return plainText ? truncate(plainText, maxLength) : null;
}

function safeHttpsUrl(value) {
  try {
    const parsed = new URL(String(value ?? '').trim());
    if (parsed.protocol === 'http:') parsed.protocol = 'https:';
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeFileTitle(value) {
  const decoded = decodeUriComponentSafely(String(value ?? '').trim())
    .replace(/^File:/i, '')
    .replace(/_/g, ' ')
    .normalize('NFC')
    .trim();
  return decoded ? `File:${decoded}` : null;
}

export function normalizeCommonsTitleKey(value) {
  return normalizeFileTitle(value)?.toLocaleLowerCase('en-US') ?? null;
}

function titleFromCommonsSourceUrl(sourceUrl) {
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.hostname.toLowerCase() !== 'commons.wikimedia.org') return null;

    const decodedPath = decodeURIComponent(parsed.pathname);
    const filePathIndex = decodedPath.toLowerCase().indexOf('/wiki/file:');
    if (filePathIndex >= 0) {
      return normalizeFileTitle(decodedPath.slice(filePathIndex + '/wiki/'.length));
    }

    const specialPathIndex = decodedPath.toLowerCase().indexOf('/special:filepath/');
    if (specialPathIndex >= 0) {
      return normalizeFileTitle(decodedPath.slice(specialPathIndex + '/special:filepath/'.length));
    }

    const queryTitle = parsed.searchParams.get('title');
    return /^File:/i.test(queryTitle ?? '') ? normalizeFileTitle(queryTitle) : null;
  } catch {
    return null;
  }
}

function titleFromCommonsUploadUrl(assetUrl) {
  try {
    const parsed = new URL(assetUrl);
    if (parsed.hostname.toLowerCase() !== 'upload.wikimedia.org') return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    const thumbIndex = segments.indexOf('thumb');
    const fileName = thumbIndex >= 0 ? segments[thumbIndex + 3] : segments.at(-1);
    return normalizeFileTitle(fileName);
  } catch {
    return null;
  }
}

export function commonsTitleForAsset(asset) {
  if (asset?.provider !== 'wikimedia-commons') return null;
  return titleFromCommonsSourceUrl(asset.sourceUrl) ?? titleFromCommonsUploadUrl(asset.url);
}

function metadataValue(extmetadata, key, maxLength = 500) {
  return sanitizeCommonsMetadataText(extmetadata?.[key]?.value, maxLength);
}

function classifyLicense(licenseId, licenseName) {
  const evidence = `${licenseId ?? ''} ${licenseName ?? ''}`.trim();
  if (!evidence) return 'unverified';
  if (RESTRICTED_LICENSE_PATTERNS.some(pattern => pattern.test(evidence))) return 'restricted';
  if (OPEN_LICENSE_PATTERNS.some(pattern => pattern.test(evidence))) return 'declared';
  return 'unverified';
}

function attributionRequired(licenseId, licenseName) {
  const evidence = `${licenseId ?? ''} ${licenseName ?? ''}`;
  return !(/\bcc[\s-]*0\b/i.test(evidence) || /\bpublic domain\b/i.test(evidence));
}

function commonsSourceUrl(title) {
  const fileName = title.replace(/^File:/i, '').replace(/ /g, '_');
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
}

function metadataFingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sanitizeCachedEntry(entry) {
  if (!entry || typeof entry !== 'object' || entry.resolved !== true) return entry;
  const license = {
    ...entry.license,
    id: sanitizeCommonsMetadataText(entry.license?.id, 160),
    name: sanitizeCommonsMetadataText(entry.license?.name, 240),
  };
  const creator = sanitizeCommonsMetadataText(entry.attribution?.creator);
  const label = sanitizeCommonsMetadataText(entry.attribution?.label) ?? creator ?? 'Wikimedia Commons contributors';
  const attribution = {
    ...entry.attribution,
    creator,
    label,
  };
  const title = normalizeFileTitle(entry.title);
  return {
    ...entry,
    title,
    license,
    attribution,
    provenance: {
      ...entry.provenance,
      title,
      metadataFingerprint: metadataFingerprint({ title, license, attribution }),
    },
  };
}

export function parseCommonsExtMetadataPage(page, fetchedAt) {
  const title = normalizeFileTitle(page?.title);
  const extmetadata = page?.imageinfo?.[0]?.extmetadata;
  if (!title || !extmetadata || page?.missing === true) return null;

  const licenseId = metadataValue(extmetadata, 'LicenseShortName', 160);
  const licenseName = metadataValue(extmetadata, 'UsageTerms', 240) ?? licenseId;
  const licenseUrl = safeHttpsUrl(extmetadata?.LicenseUrl?.value);
  const creator = metadataValue(extmetadata, 'Artist');
  const credit = metadataValue(extmetadata, 'Credit');
  const sourceUrl = commonsSourceUrl(title);
  const licenseStatus = classifyLicense(licenseId, licenseName);
  const label = creator ?? credit ?? 'Wikimedia Commons contributors';
  const rights = {
    license: {
      status: licenseStatus,
      id: licenseId,
      name: licenseName,
      url: licenseUrl,
    },
    attribution: {
      required: attributionRequired(licenseId, licenseName),
      creator,
      label,
      url: sourceUrl,
    },
  };

  return {
    title,
    pageId: Number.isInteger(page.pageid) ? page.pageid : null,
    fetchedAt,
    resolved: true,
    sourceUrl,
    ...rights,
    provenance: {
      provider: 'wikimedia-commons-api',
      endpoint: COMMONS_API_ENDPOINT,
      fetchedAt,
      pageId: Number.isInteger(page.pageid) ? page.pageid : null,
      title,
      metadataFingerprint: metadataFingerprint({ title, ...rights }),
    },
  };
}

function missingCommonsEntry(title, fetchedAt) {
  return {
    title,
    pageId: null,
    fetchedAt,
    resolved: false,
    reason: 'missing-or-unreadable-page',
    sourceUrl: commonsSourceUrl(title),
    provenance: {
      provider: 'wikimedia-commons-api',
      endpoint: COMMONS_API_ENDPOINT,
      fetchedAt,
      pageId: null,
      title,
      metadataFingerprint: null,
    },
  };
}

function pageAliases(query) {
  const aliases = new Map();
  for (const item of [...(query?.normalized ?? []), ...(query?.redirects ?? [])]) {
    const from = normalizeCommonsTitleKey(item.from);
    const to = normalizeCommonsTitleKey(item.to);
    if (from && to) aliases.set(from, to);
  }
  return aliases;
}

function resolveAlias(key, aliases) {
  let current = key;
  const visited = new Set();
  while (aliases.has(current) && !visited.has(current)) {
    visited.add(current);
    current = aliases.get(current);
  }
  return current;
}

function batch(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function fetchCommonsExtMetadata(
  titles,
  {
    fetchImpl = globalThis.fetch,
    batchSize = 25,
    fetchedAt = new Date().toISOString(),
    signal,
  } = {},
) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
    throw new RangeError('Commons batchSize must be between 1 and 50.');
  }

  const uniqueTitles = [];
  const seen = new Set();
  for (const value of titles) {
    const title = normalizeFileTitle(value);
    const key = normalizeCommonsTitleKey(title);
    if (!title || !key || seen.has(key)) continue;
    seen.add(key);
    uniqueTitles.push(title);
  }

  const entries = {};
  for (const titleBatch of batch(uniqueTitles, batchSize)) {
    const url = new URL(COMMONS_API_ENDPOINT);
    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      iiprop: 'extmetadata',
      prop: 'imageinfo',
      redirects: '1',
      titles: titleBatch.join('|'),
    }).toString();

    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NovaMusicLab/rights-metadata (https://github.com/LiriothTeltanion/NovaMusicLab)',
      },
      signal,
    });
    if (!response.ok) {
      throw new Error(`Wikimedia Commons API request failed with HTTP ${response.status}.`);
    }

    const payload = await response.json();
    if (payload?.error) {
      throw new Error(`Wikimedia Commons API error: ${payload.error.code ?? 'unknown'}.`);
    }

    const aliases = pageAliases(payload?.query);
    const pages = new Map();
    for (const page of payload?.query?.pages ?? []) {
      const key = normalizeCommonsTitleKey(page.title);
      if (key) pages.set(key, page);
    }

    for (const requestedTitle of titleBatch) {
      const requestedKey = normalizeCommonsTitleKey(requestedTitle);
      const resolvedKey = resolveAlias(requestedKey, aliases);
      const entry = parseCommonsExtMetadataPage(pages.get(resolvedKey), fetchedAt)
        ?? missingCommonsEntry(requestedTitle, fetchedAt);
      entries[requestedKey] = entry;
    }
  }

  return entries;
}

export function createCommonsMetadataCache(entries = {}, updatedAt = null) {
  return {
    schemaVersion: COMMONS_CACHE_SCHEMA_VERSION,
    provider: 'wikimedia-commons-api',
    endpoint: COMMONS_API_ENDPOINT,
    updatedAt,
    entries,
  };
}

export function sanitizeCommonsMetadataCache(cache) {
  if (cache?.schemaVersion !== COMMONS_CACHE_SCHEMA_VERSION
    || cache?.provider !== 'wikimedia-commons-api'
    || !cache?.entries
    || typeof cache.entries !== 'object') {
    return createCommonsMetadataCache();
  }

  return createCommonsMetadataCache(
    Object.fromEntries(
      Object.entries(cache.entries).map(([key, entry]) => [key, sanitizeCachedEntry(entry)]),
    ),
    cache.updatedAt ?? null,
  );
}

export function mergeCommonsMetadataCache(cache, newEntries, updatedAt) {
  const existingEntries = cache?.schemaVersion === COMMONS_CACHE_SCHEMA_VERSION
    && cache?.provider === 'wikimedia-commons-api'
    && cache?.entries
    && typeof cache.entries === 'object'
    ? cache.entries
    : {};

  return sanitizeCommonsMetadataCache(
    createCommonsMetadataCache({ ...existingEntries, ...newEntries }, updatedAt),
  );
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function licenseConfidence(status) {
  return {
    unverified: 0,
    declared: 1,
    verified: 2,
    restricted: 3,
  }[status] ?? 0;
}

export function enrichManifestWithCommonsMetadata(manifest, cache) {
  const enriched = cloneJson(manifest);
  const entries = cache?.schemaVersion === COMMONS_CACHE_SCHEMA_VERSION ? cache.entries ?? {} : {};
  let matchedAssetCount = 0;
  let changedAssetCount = 0;

  for (const asset of enriched.visualAssets ?? []) {
    const title = commonsTitleForAsset(asset);
    const key = normalizeCommonsTitleKey(title);
    const entry = key ? entries[key] : null;
    if (!entry?.resolved || !entry.license || !entry.attribution || !entry.provenance) continue;

    matchedAssetCount += 1;
    const before = JSON.stringify(asset);
    const currentStatus = asset.license?.status ?? 'unverified';
    if (licenseConfidence(entry.license.status) > licenseConfidence(currentStatus)) {
      asset.license = cloneJson(entry.license);
    }

    if (currentStatus !== 'restricted') {
      asset.attribution = {
        ...asset.attribution,
        ...cloneJson(entry.attribution),
        url: asset.sourceUrl,
      };
    }

    asset.rightsMetadata = cloneJson(entry.provenance);
    if (JSON.stringify(asset) !== before) changedAssetCount += 1;
  }

  const commonsAssets = (enriched.visualAssets ?? [])
    .filter(asset => asset.provider === 'wikimedia-commons');
  const unresolvedCommonsAssetCount = commonsAssets
    .filter(asset => asset.license?.status === 'unverified')
    .length;
  const assetsAwaitingLicenseReview = (enriched.visualAssets ?? [])
    .filter(asset => asset.license?.status === 'unverified')
    .length;

  enriched.meta = {
    ...enriched.meta,
    assetsAwaitingLicenseReview,
    rightsMetadata: {
      provider: 'wikimedia-commons-api',
      cacheSchemaVersion: COMMONS_CACHE_SCHEMA_VERSION,
      cacheUpdatedAt: cache?.updatedAt ?? null,
      matchedAssetCount,
      unresolvedCommonsAssetCount,
    },
  };

  return {
    manifest: enriched,
    stats: {
      commonsAssetCount: commonsAssets.length,
      matchedAssetCount,
      changedAssetCount,
      unresolvedCommonsAssetCount,
    },
  };
}
