/**
 * Derive an Astro/Shards accent pair from a source image.
 *
 * Build-time only. Reads the original file with sharp, builds a hue histogram,
 * and returns two hex strings:
 *
 *   astro  — picked from the cool half of the image (cyan / blue / violet)
 *   shards — picked from the warm half of the image (red / orange / amber)
 *
 * If the image has no usable hue in one of those ranges (e.g. a near-monochrome
 * red emission nebula has plenty of warm hue but no cool hue at all), that
 * accent falls back to the default token value so the site still reads as the
 * site.
 *
 * The two helpers exported alongside `getAccentsForImage` —
 * `resolveImageFsPath` and `DEFAULT_ACCENTS` — exist so callers that already
 * know a collection / gallery / filename triple can resolve a disk path without
 * re-parsing meta.yaml themselves.
 */

import path from 'node:path';
import sharp from 'sharp';
import yaml from 'js-yaml';

export interface AccentPair {
  astro: string;
  shards: string;
}

/** Defaults mirror the values in src/styles/tokens.css. */
export const DEFAULT_ACCENTS: AccentPair = {
  astro: '#5dd6c8',
  shards: '#e8a87c',
};

/* ------------------------------------------------------------------ *
 *  Filename → fs path registry (built once at module load).
 *  We reuse the meta.yaml-as-raw trick the download helper uses, since
 *  ImageMetadata produced by Astro's content schema no longer carries
 *  the original on-disk filename in a stable public field.
 * ------------------------------------------------------------------ */

type CollectionSlug = 'astro-gallery' | 'shards-gallery';
type RegistryKey = `${CollectionSlug}::${string}::${string}`;

const metaSources = import.meta.glob<string>(
  '/src/content/*-gallery/*/meta.yaml',
  { query: '?raw', import: 'default', eager: true },
);

const fsPathRegistry = new Map<RegistryKey, string>();
const orderedFilenames = new Map<`${CollectionSlug}::${string}`, string[]>();

for (const [vPath, raw] of Object.entries(metaSources)) {
  const m = vPath.match(/^\/src\/content\/(astro-gallery|shards-gallery)\/([^/]+)\/meta\.yaml$/);
  if (!m) continue;
  const collection = m[1] as CollectionSlug;
  const gallerySlug = m[2];

  let parsed: any;
  try {
    parsed = yaml.load(raw);
  } catch {
    continue;
  }
  if (!Array.isArray(parsed?.images)) continue;

  const names: string[] = [];
  for (const entry of parsed.images) {
    const file = String(entry?.file ?? '').replace(/^\.\//, '');
    if (!file) continue;
    names.push(file);
    const fsPath = path.resolve(
      process.cwd(),
      'src',
      'content',
      collection,
      gallerySlug,
      file,
    );
    fsPathRegistry.set(`${collection}::${gallerySlug}::${file}`, fsPath);
  }
  orderedFilenames.set(`${collection}::${gallerySlug}`, names);
}

/**
 * Resolve the original on-disk path for a gallery image given the
 * triple (collection, gallerySlug, filename) — `filename` is the
 * value from meta.yaml's `images[].file` with any leading `./` stripped.
 */
export function resolveImageFsPath(
  collection: CollectionSlug,
  gallerySlug: string,
  filename: string,
): string | undefined {
  return fsPathRegistry.get(`${collection}::${gallerySlug}::${filename}`);
}

/**
 * Same as `resolveImageFsPath`, but lets the caller look up by position
 * instead of by filename — handy when iterating a collection where the
 * schema already discarded the original filename.
 */
export function resolveImageFsPathByIndex(
  collection: CollectionSlug,
  gallerySlug: string,
  index: number,
): string | undefined {
  const list = orderedFilenames.get(`${collection}::${gallerySlug}`);
  const name = list?.[index];
  return name ? resolveImageFsPath(collection, gallerySlug, name) : undefined;
}

/* ------------------------------------------------------------------ *
 *  Accent extraction.
 * ------------------------------------------------------------------ */

/** Sample resolution — small enough to be fast, large enough to be stable. */
const SAMPLE_W = 64;
const SAMPLE_H = 64;

/** 10° hue buckets (36 of them). */
const HUE_BUCKETS = 36;
const BUCKET_SIZE = 360 / HUE_BUCKETS;

/** Pixels outside these ranges don't carry useful colour info. */
const MIN_L = 0.08;
const MAX_L = 0.95;
const MIN_S = 0.10;

/** Hue ranges (degrees) for each accent slot. */
const COOL_RANGE: [number, number] = [150, 260]; // teal → blue → violet
const WARM_RANGE: [number, number] = [0, 60];   // red → orange → yellow
const WARM_RANGE_WRAP: [number, number] = [310, 360]; // pink-ish wrap

/** Clamp the final accent so it always reads as an accent over a dark UI. */
const OUT_S_MIN = 0.48;
const OUT_S_MAX = 0.70;
const OUT_L_MIN = 0.62;
const OUT_L_MAX = 0.74;

/**
 * Memoise by fs path — accents never change for a given source file at build
 * time, and a single home-bg pool of ~20 images would otherwise hit sharp
 * twenty times.
 */
const accentCache = new Map<string, Promise<AccentPair>>();

export function getAccentsForImage(fsPath: string): Promise<AccentPair> {
  let p = accentCache.get(fsPath);
  if (!p) {
    p = computeAccents(fsPath);
    accentCache.set(fsPath, p);
  }
  return p;
}

async function computeAccents(fsPath: string): Promise<AccentPair> {
  let pixels: Buffer;
  let width: number;
  let height: number;
  try {
    const { data, info } = await sharp(fsPath)
      .resize(SAMPLE_W, SAMPLE_H, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    pixels = data;
    width = info.width;
    height = info.height;
  } catch {
    return { ...DEFAULT_ACCENTS };
  }

  type Bucket = { count: number; hSum: number; sSum: number; lSum: number };
  const buckets: Bucket[] = Array.from({ length: HUE_BUCKETS }, () => ({
    count: 0, hSum: 0, sSum: 0, lSum: 0,
  }));

  const total = width * height;
  for (let i = 0; i < total; i++) {
    const r = pixels[i * 3] / 255;
    const g = pixels[i * 3 + 1] / 255;
    const b = pixels[i * 3 + 2] / 255;
    const { h, s, l } = rgbToHsl(r, g, b);
    if (l < MIN_L || l > MAX_L) continue;
    if (s < MIN_S) continue;
    // Weight by saturation so a few vivid pixels outvote many washed-out ones.
    const w = s;
    const idx = Math.floor(h / BUCKET_SIZE) % HUE_BUCKETS;
    const bk = buckets[idx];
    bk.count += w;
    bk.hSum  += h * w;
    bk.sSum  += s * w;
    bk.lSum  += l * w;
  }

  const astro = pickAccent(buckets, [COOL_RANGE]) ?? DEFAULT_ACCENTS.astro;
  const shards = pickAccent(buckets, [WARM_RANGE, WARM_RANGE_WRAP]) ?? DEFAULT_ACCENTS.shards;
  return { astro, shards };
}

function pickAccent(
  buckets: { count: number; hSum: number; sSum: number; lSum: number }[],
  ranges: Array<[number, number]>,
): string | undefined {
  let bestIdx = -1;
  let bestCount = 0;
  for (let i = 0; i < buckets.length; i++) {
    const hCenter = (i + 0.5) * BUCKET_SIZE;
    const inRange = ranges.some(([lo, hi]) => hCenter >= lo && hCenter <= hi);
    if (!inRange) continue;
    const bk = buckets[i];
    if (bk.count > bestCount) {
      bestIdx = i;
      bestCount = bk.count;
    }
  }
  if (bestIdx < 0 || bestCount === 0) return undefined;
  const bk = buckets[bestIdx];
  const h = bk.hSum / bk.count;
  const s = clamp(bk.sSum / bk.count, OUT_S_MIN, OUT_S_MAX);
  const l = clamp(bk.lSum / bk.count, OUT_L_MIN, OUT_L_MAX);
  return hslToHex(h, s, l);
}

/* ------------------------------------------------------------------ *
 *  Colour-space helpers.
 * ------------------------------------------------------------------ */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r)      h = ((g - b) / d) + (g < b ? 6 : 0);
    else if (max === g) h = ((b - r) / d) + 2;
    else                h = ((r - g) / d) + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  const byte = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}
