export const CURRENT_NOVA_VERSION = '1.6.0' as const;

const PRIVATE_CANDIDATE_DATE = '2026-08-09';
const injectedReleaseDate = import.meta.env.VITE_NOVA_RELEASE_DATE;

/**
 * Local and pull-request builds retain the candidate date. The Pages workflow
 * injects the actual Jerusalem deployment date into the production artifact,
 * so a delayed release is never presented as if it shipped on 2026-08-09.
 */
export const CURRENT_NOVA_RELEASE_DATE =
  typeof injectedReleaseDate === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(injectedReleaseDate)
    ? injectedReleaseDate
    : PRIVATE_CANDIDATE_DATE;

export type CurrentNovaReleaseStatus = 'private-candidate' | 'deployed';

/**
 * Source and pull-request builds remain honest private candidates. The Pages
 * workflow is the only caller allowed to inject `deployed`, after the exact
 * artifact has passed the complete verification gate.
 */
export const CURRENT_NOVA_RELEASE_STATUS: CurrentNovaReleaseStatus =
  import.meta.env.VITE_NOVA_RELEASE_STATUS === 'deployed'
    ? 'deployed'
    : 'private-candidate';
