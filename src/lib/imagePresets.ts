/**
 * Central image-transform presets — the single source of truth for every
 * display-image quality and width ladder on the site.
 *
 * Why this exists: Astro deduplicates generated images only when the FULL
 * transform matches (source + width + format + quality). Before this module,
 * the in-flow gallery ladder (q92), the fullscreen overlay (q95), the hero
 * backdrop (q90) and the astro index hero (default quality, odd widths) each
 * produced their own near-identical variants of the same photographs. Routing
 * every call site through these constants makes overlapping widths resolve to
 * the SAME generated file.
 *
 * Rules:
 *  - Per-section display quality: Astro keeps 92 (dark gradients band at lower
 *    quality); Shards uses 80 (daylight phone photos compress fine).
 *  - All ladders are subsets of one another where they overlap, and always
 *    paired with the section quality, so overlapping widths dedupe.
 *  - Download endpoints (permalink URLs) are separate by design — they encode
 *    in the SOURCE format, not webp. See DOWNLOAD_QUALITY below.
 */

export type Section = 'astro' | 'shards';

/** Display (webp) quality per section. */
export const DISPLAY_QUALITY: Record<Section, number> = {
  astro: 92,
  shards: 80,
};

/** Re-encode quality for the permalink download tiers (4k/2k/800), applied by
 *  the `[file].ts` endpoints in the image's source format. Astro downloads
 *  stay archival; Shards downloads are phone photos and take q85 without
 *  visible loss. Permalink URLs are unaffected. */
export const DOWNLOAD_QUALITY: Record<Section, number> = {
  astro: 95,
  shards: 85,
};

/** Post-local illustrations: screenshots, diagrams, snapshots that live in the
 *  post's own folder. Never opened fullscreen, never offered as a download,
 *  and never rendered wider than the 65ch prose column - so the gallery ladder
 *  is wasted bytes. Deliberately NOT a subset of DISPLAY_WIDTHS: these sources
 *  appear in exactly one place, so there is nothing to dedupe with. The top
 *  rung (1400) is 2x the ~700 px `--measure` column; the bottom two cover
 *  phones at 1x/2x. */
export const PROSE_WIDTHS = [560, 840, 1400];
export const PROSE_QUALITY = 72;

/** In-flow gallery images (and any other main-content photograph). */
export const DISPLAY_WIDTHS = [480, 800, 1200, 1800, 2400];

/** A gallery photograph shown inside a post (GalleryPhoto). Strict subset of
 *  DISPLAY_WIDTHS, paired with the same section quality, so a photo appearing
 *  in both a post and its gallery generates ONE set of files. */
export const POST_PHOTO_WIDTHS = [800, 1200, 1800];

/** Fullscreen overlay ladder. Shares 1200/1800/2400 with DISPLAY_WIDTHS (same
 *  quality ⇒ same files); only 3840 is an extra variant. The former 3000 tier
 *  was dropped — between 2400 and 3840 it earned its bytes on almost no
 *  viewport. */
export const FULLSCREEN_WIDTHS = [1200, 1800, 2400, 3840];

/** Per-image permalink page — subset of DISPLAY_WIDTHS, fully shared. */
export const PERMALINK_PAGE_WIDTHS = [800, 1200, 1800, 2400];

/** Full-bleed hero / page backgrounds (gallery hero, home background).
 *  2400 matches the top of DISPLAY_WIDTHS so the hero reuses the display
 *  file when quality matches. */
export const HERO_WIDTH = 2400;

/** Section index hero ladder — subset of DISPLAY_WIDTHS so the star image
 *  (always a gallery cover) reuses the gallery page's files. */
export const INDEX_HERO_WIDTHS = [800, 1200, 2400];

/** Square card/thumbnail size, shared by GalleryCard and TagResultList so a
 *  cover appearing in both generates ONE crop instead of two (720 + 520). */
export const CARD_SIZE = 640;

export function displayQuality(section: Section): number {
  return DISPLAY_QUALITY[section];
}

export function downloadQuality(section: Section): number {
  return DOWNLOAD_QUALITY[section];
}
