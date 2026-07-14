/**
 * Normalizes artist and release names for local catalog matching.
 *
 * Keep this utility data-free: it is used by eager and broadly shared modules,
 * so importing it must never pull an artist dataset into their chunks.
 */
export function normalizeCatalogName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}
