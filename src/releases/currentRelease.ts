export const CURRENT_NOVA_VERSION = '1.4.0' as const;
export const CURRENT_NOVA_RELEASE_DATE = '2026-07-29' as const;

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
