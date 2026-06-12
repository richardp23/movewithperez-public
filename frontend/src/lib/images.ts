/**
 * Brand image display constants.
 * Source files live in src/assets/ — optimized at build time via Astro Image (Sharp).
 */

/** EXIT logo height in header/footer (px). Clear space ≥ this value per EXIT standards. */
export const EXIT_LOGO_HEIGHT = 28;

/** Full-color EXIT mark for light/white backgrounds (808×350 source). */
export const EXIT_LOGO_RGB_ASPECT = 808 / 350;

/** Knock-out EXIT mark for dark backgrounds (892×367 source). */
export const EXIT_LOGO_KO_ASPECT = 892 / 367;

/** Equal Housing Opportunity mark display height (px). */
export const EHO_MARK_HEIGHT = 32;

export const EHO_MARK_ASPECT = 1130 / 1209;

/** NAR REALTOR co-brand display height when used (px). */
export const REALTOR_COBRAND_HEIGHT = 24;

export const REALTOR_COBRAND_ASPECT = 1371 / 534;

/** NAR membership mark (block R) display height when used (px). */
export const NAR_MEMBERSHIP_MARK_HEIGHT = 32;

export const NAR_MEMBERSHIP_MARK_ASPECT = 1;

/** Device-pixel ratio for brand mark rasterization (display size × scale). */
export const BRAND_MARK_RENDER_SCALE = 3;

/**
 * Footer compliance row — full legal marks, optically matched display heights.
 * NAR source has more canvas padding than EHO; slightly taller display balances them.
 */
export const COMPLIANCE_EHO_HEIGHT = 32;
export const COMPLIANCE_NAR_HEIGHT = 40;

/** GitHub Invertocat — footer social link display height (px). */
export const GITHUB_MARK_HEIGHT = 18;
