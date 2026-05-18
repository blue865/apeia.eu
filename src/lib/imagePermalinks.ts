/**
 * Image permalink registry — stable URLs for gallery images that don't move
 * across rebuilds.
 *
 * The site already has /_astro/-hashed URLs for in-page display (where the
 * hash-busting is the right call). This module provides a parallel, stable
 * URL space for *downloads* and *per-image pages*: changing an image's
 * encoding parameters or upgrading Astro/Vite no longer breaks links a
 * visitor might have bookmarked or shared.
 *
 * URL scheme:
 *   /{section}/gallery/{gallery-slug}/{image-slug}/                    — per-image page
 *   /{section}/gallery/{gallery-slug}/{image-slug}/{image-slug}-{variant}.{ext}
 *                                                                       — variant download
 *
 * `image-slug` is derived from the original filename (no extension,
 * lowercased, non-alphanumerics → dashes). `variant` is one of
 * `original | 800 | 2k | 4k`.
 *
 * The registry is built at module load via the same meta.yaml glob trick the
 * rest of the site uses, so it stays in sync with whatever the galleries
 * declare without any extra wiring.
 */

import path from 'node:path';
import yaml from 'js-yaml';

export type Section = 'astro' | 'shards';
export type CollectionSlug = 'astro-gallery' | 'shards-gallery';
export type Variant = 'original' | '800' | '2k' | '4k';

export interface ImagePermalink {
  section: Section;
  collection: CollectionSlug;
  gallerySlug: string;
  imageIndex: number;
  imageSlug: string;           // URL-safe; derived from filename
  originalFilename: string;    // exactly what meta.yaml declared
  fsPath: string;              // absolute on-disk path
}

/* ----------------------- Variant tables ----------------------- */

const VARIANT_WIDTHS: Record<Variant, number | null> = {
  original: null,
  '800': 800,
  '2k': 2048,
  '4k': 3840,
};

const VARIANT_LABELS: Record<Variant, string> = {
  original: 'Original',
  '800': '800 px',
  '2k': '2K · 2048 px',
  '4k': '4K · 3840 px',
};

const VARIANT_SHORT: Record<Variant, string> = {
  original: 'Original',
  '800': '800',
  '2k': '2K',
  '4k': '4K',
};

/** All variants in display order (largest first; original at the very top). */
export const ALL_VARIANTS: Variant[] = ['original', '4k', '2k', '800'];

/* ----------------------- Registry build ----------------------- */

const metaSources = import.meta.glob<string>(
  '/src/content/*-gallery/*/meta.yaml',
  { query: '?raw', import: 'default', eager: true },
);

const REGISTRY: ImagePermalink[] = [];

for (const [vPath, raw] of Object.entries(metaSources)) {
  const m = vPath.match(/^\/src\/content\/(astro|shards)-gallery\/([^/]+)\/meta\.yaml$/);
  if (!m) continue;
  const section = m[1] as Section;
  const collection = `${section}-gallery` as CollectionSlug;
  const gallerySlug = m[2];

  let parsed: any;
  try {
    parsed = yaml.load(raw as string);
  } catch {
    continue;
  }
  if (!Array.isArray(parsed?.images)) continue;

  parsed.images.forEach((entry: any, imageIndex: number) => {
    const filename = String(entry?.file ?? '').replace(/^\.\//, '').trim();
    if (!filename) return;
    REGISTRY.push({
      section,
      collection,
      gallerySlug,
      imageIndex,
      imageSlug: filenameToSlug(filename),
      originalFilename: filename,
      fsPath: path.resolve(process.cwd(), 'src', 'content', collection, gallerySlug, filename),
    });
  });
}

/* ----------------------- Helpers ----------------------- */

function stripExt(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i === -1 ? filename : filename.slice(0, i);
}

function getExt(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i === -1 ? '' : filename.slice(i + 1).toLowerCase();
}

/** Filename → URL-safe slug.
 *  "M104 - Sombrero Galaxy.jpg" → "m104-sombrero-galaxy" */
export function filenameToSlug(filename: string): string {
  return stripExt(filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** All images known to the registry. */
export function getAllPermalinks(): ImagePermalink[] {
  return REGISTRY.slice();
}

export function findByIndex(
  section: Section,
  gallerySlug: string,
  imageIndex: number,
): ImagePermalink | undefined {
  return REGISTRY.find(
    (p) => p.section === section && p.gallerySlug === gallerySlug && p.imageIndex === imageIndex,
  );
}

export function findBySlug(
  section: Section,
  gallerySlug: string,
  imageSlug: string,
): ImagePermalink | undefined {
  return REGISTRY.find(
    (p) => p.section === section && p.gallerySlug === gallerySlug && p.imageSlug === imageSlug,
  );
}

/** URL of the per-image page. */
export function pageUrl(p: ImagePermalink): string {
  return `/${p.section}/gallery/${p.gallerySlug}/${p.imageSlug}/`;
}

/** Filename portion of the variant URL — the `[file]` route param value. */
export function variantFile(p: ImagePermalink, variant: Variant): string {
  const ext = getExt(p.originalFilename);
  return `${p.imageSlug}-${variant}.${ext}`;
}

/** Full URL of a variant download. */
export function variantUrl(p: ImagePermalink, variant: Variant): string {
  return `${pageUrl(p)}${variantFile(p, variant)}`;
}

/** Suggested filename for the browser's `download` attribute. */
export function variantDownloadName(p: ImagePermalink, variant: Variant): string {
  if (variant === 'original') return p.originalFilename;
  const base = stripExt(p.originalFilename);
  const ext = getExt(p.originalFilename);
  return `${base} - ${VARIANT_SHORT[variant]}.${ext}`;
}

export function variantLabel(variant: Variant): string {
  return VARIANT_LABELS[variant];
}

export function variantWidth(variant: Variant): number | null {
  return VARIANT_WIDTHS[variant];
}

/** Variants offered for a source of the given width (px). Never offers a
 *  resized variant >= the source width — we don't upscale on download. */
export function variantsForWidth(sourceWidth: number): Variant[] {
  return ALL_VARIANTS.filter((v) => {
    const w = VARIANT_WIDTHS[v];
    return w === null || w < sourceWidth;
  });
}

/** Resolve a `[file]` route param back to its (permalink, variant). */
export function resolveFileRequest(
  section: Section,
  gallerySlug: string,
  imageSlug: string,
  file: string,
): { permalink: ImagePermalink; variant: Variant } | undefined {
  const permalink = findBySlug(section, gallerySlug, imageSlug);
  if (!permalink) return undefined;
  const ext = getExt(permalink.originalFilename);
  const prefix = `${permalink.imageSlug}-`;
  const suffix = `.${ext}`;
  if (!file.startsWith(prefix) || !file.endsWith(suffix)) return undefined;
  const variantStr = file.slice(prefix.length, file.length - suffix.length);
  if (!(variantStr in VARIANT_WIDTHS)) return undefined;
  return { permalink, variant: variantStr as Variant };
}

/** Content-Type for the source format. */
export function contentTypeFor(filename: string): string {
  const ext = getExt(filename);
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    default:     return 'application/octet-stream';
  }
}

/** Sharp's `toFormat()` format name for the source extension. */
export function sharpFormatFor(filename: string): 'jpeg' | 'png' | 'webp' | 'avif' | undefined {
  const ext = getExt(filename);
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (ext === 'png')  return 'png';
  if (ext === 'webp') return 'webp';
  if (ext === 'avif') return 'avif';
  return undefined;
}
