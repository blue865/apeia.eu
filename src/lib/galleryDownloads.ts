/**
 * Per-image download options for galleries.
 *
 * For every image we offer:
 *   - **Original** — the source file, byte-for-byte (Vite's `?url` import
 *     copies the file to dist with no transformation).
 *   - **4K (3840 px)**, **2K (2048 px)**, **800 px** — resized variants
 *     produced by Astro's image pipeline. Variants whose width is >= the
 *     source width are skipped, so a 1500-px-wide source gets only 800 +
 *     Original; a 600-px source gets only Original.
 *
 * NOTE on build-time resolution: callers used to read `meta.yaml` via Node
 * `fs` against a path derived from `import.meta.url`. That works in dev
 * (where `import.meta.url` is the source file's URL) but breaks in build
 * (the layout is bundled and `import.meta.url` points inside the bundle).
 * To work in both modes we let Vite resolve `meta.yaml` via
 * `import.meta.glob('?raw')`, which inlines the file contents at build time.
 */

import { getImage } from 'astro:assets';
import yaml from 'js-yaml';

export type DownloadOption = {
  label: string;       // user-facing label
  width: number;       // output width (or original width for the source)
  url: string;         // href used in the download link
  filename: string;    // value for the `download` attribute
  isOriginal: boolean;
};

export type GalleryCollection = 'astro-gallery' | 'shards-gallery';

/** Resize variants offered when source is wide enough. */
const VARIANTS = [
  { width: 800,  short: '800',  label: '800 px' },
  { width: 2048, short: '2K',   label: '2K · 2048 px' },
  { width: 3840, short: '4K',   label: '4K · 3840 px' },
] as const;

/** Formats we resize. SVG / TIFF / GIF fall through to "Original only". */
const RASTERS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);

/** All gallery source files, served as untouched bytes by Vite. Keys are
 *  project-absolute paths like `/src/content/astro-gallery/m31/M31.jpg`. */
const ORIGINALS = import.meta.glob(
  '/src/content/*-gallery/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

/** Raw meta.yaml contents for every gallery, keyed by project-absolute path. */
const META_YAMLS = import.meta.glob(
  '/src/content/*-gallery/*/meta.yaml',
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

type RawMeta = { images?: Array<{ file?: string }> };
const META_CACHE = new Map<string, RawMeta>();

function loadRawMeta(collection: GalleryCollection, slug: string): RawMeta {
  const key = `/src/content/${collection}/${slug}/meta.yaml`;
  const cached = META_CACHE.get(key);
  if (cached) return cached;
  const text = META_YAMLS[key];
  const parsed: RawMeta = text ? ((yaml.load(text) as RawMeta) ?? {}) : {};
  META_CACHE.set(key, parsed);
  return parsed;
}

function stripExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? name : name.slice(0, i);
}

export async function buildDownloadOptions(args: {
  imageMeta: ImageMetadata;
  collection: GalleryCollection;
  gallerySlug: string;
  /** Index into the gallery's `images` list — used to recover the original
   *  filename from meta.yaml. */
  imageIndex: number;
}): Promise<DownloadOption[]> {
  const { imageMeta, collection, gallerySlug, imageIndex } = args;
  const out: DownloadOption[] = [];

  const meta = loadRawMeta(collection, gallerySlug);
  const rawFile = meta.images?.[imageIndex]?.file ?? '';
  const originalFilename = rawFile.replace(/^\.\/+/, '');

  // 1. Original — Vite-served untouched bytes (only if we know the filename).
  if (originalFilename) {
    const key = `/src/content/${collection}/${gallerySlug}/${originalFilename}`;
    const originalUrl = ORIGINALS[key];
    if (originalUrl) {
      out.push({
        label: `Original · ${imageMeta.width} × ${imageMeta.height} px`,
        width: imageMeta.width,
        url: originalUrl,
        filename: originalFilename,
        isOriginal: true,
      });
    }
  }

  // 2. Resized variants — only for raster formats; never wider than original.
  const fmt = (imageMeta.format ?? 'jpg').toLowerCase();
  if (RASTERS.has(fmt)) {
    const baseName = originalFilename
      ? stripExt(originalFilename)
      : `image-${gallerySlug}-${imageIndex + 1}`;
    const ext = fmt === 'jpeg' ? 'jpg' : fmt;

    for (const v of VARIANTS) {
      if (v.width >= imageMeta.width) continue;
      const variant = await getImage({
        src: imageMeta,
        width: v.width,
        format: imageMeta.format,
      });
      out.push({
        label: v.label,
        width: v.width,
        url: variant.src,
        filename: `${baseName} - ${v.short}.${ext}`,
        isOriginal: false,
      });
    }
  }

  // Original first; then largest → smallest variant.
  out.sort((a, b) => (a.isOriginal ? -1 : b.isOriginal ? 1 : b.width - a.width));
  return out;
}
