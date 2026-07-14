type HebrewStrings = typeof import('./heStrings')['HE_STRINGS'];

let hebrewExperiencePromise: Promise<HebrewStrings> | null = null;

/**
 * Loads every Hebrew-only catalog behind one idempotent readiness boundary.
 * Keeping both imports here makes it impossible for AppContext's entry graph
 * to pull either catalog in through a runtime-static dependency.
 */
export function loadHebrewExperience(): Promise<HebrewStrings> {
  if (hebrewExperiencePromise) return hebrewExperiencePromise;

  const request = Promise.all([
    import('./heStrings').then(module => module.HE_STRINGS),
    import('../utils/artistEnrichmentHebrew').then(module => module.loadHebrewArtistEnrichment()),
  ]).then(([strings]) => strings);

  hebrewExperiencePromise = request.catch(error => {
    // A transient chunk/network failure must remain retryable.
    hebrewExperiencePromise = null;
    throw error;
  });

  return hebrewExperiencePromise;
}

export function hasRequestedHebrewExperience() {
  return hebrewExperiencePromise !== null;
}

/** Test isolation only; production callers should rely on the shared Promise. */
export function resetHebrewExperienceLoader() {
  hebrewExperiencePromise = null;
}
