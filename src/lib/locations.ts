/**
 * locations.ts — build-time collection of where Shards photographs were taken.
 *
 * Walks every `shards-gallery` meta.yaml and resolves each image's coordinates
 * with this precedence:
 *   1. explicit `location: { lat, lon, place? }`  — always wins
 *   2. `geolocate: true`  — read EXIF GPS from the original file at build time
 *   3. otherwise           — the image has no point and is omitted from the maps
 *
 * Unlike the Sky Map's silent-fail convention, an image marked `geolocate: true`
 * that yields no GPS emits a build-time WARNING — a missing dot here should be
 * noisy so it isn't overlooked.
 *
 * The `astro-gallery` collection is never read, so backyard astrophotography
 * coordinates can never reach these maps.
 */

import yaml from 'js-yaml';
import exifr from 'exifr';
import { parseLatLon, type GeoPoint } from './geomap';
import { findByIndex, pageUrl } from './imagePermalinks';

export interface LocatedImage extends GeoPoint {
  gallerySlug: string;
  imageIndex: number;
  /** Tooltip label: place → caption → coordinates. */
  label: string;
  /** Per-image permalink page (falls back to the gallery page). */
  href: string;
}

export interface GalleryLocation extends GeoPoint {
  slug: string;
  title: string;
  /** Number of located images in the gallery (the dot is their mean point). */
  count: number;
  href: string;
}

const metaSources = import.meta.glob<string>(
  '/src/content/shards-gallery/*/meta.yaml',
  { query: '?raw', import: 'default', eager: true },
);

function coordLabel(p: GeoPoint): string {
  return `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`;
}

async function resolvePoint(
  gallerySlug: string,
  imageIndex: number,
  entry: any,
): Promise<GeoPoint | null> {
  // 1. explicit coordinates
  if (entry?.location && entry.location.lat != null && entry.location.lon != null) {
    const p = parseLatLon(entry.location.lat, entry.location.lon);
    if (p) return p;
    console.warn(
      `[locations] ${gallerySlug}#${imageIndex} (${entry.file}) has an invalid location block — skipped`,
    );
    return null;
  }
  // 2. EXIF fallback
  if (entry?.geolocate === true) {
    const permalink = findByIndex('shards', gallerySlug, imageIndex);
    if (!permalink) return null;
    let gps: { latitude?: number; longitude?: number } | undefined;
    try {
      gps = await exifr.gps(permalink.fsPath);
    } catch {
      gps = undefined;
    }
    const p = gps ? parseLatLon(gps.latitude, gps.longitude) : null;
    if (p) return p;
    console.warn(
      `[locations] ${entry.file} in "${gallerySlug}" marked geolocate but no GPS found`,
    );
    return null;
  }
  // 3. no point
  return null;
}

let _cache: Promise<LocatedImage[]> | null = null;

async function collectAll(): Promise<LocatedImage[]> {
  const out: LocatedImage[] = [];
  for (const [vPath, raw] of Object.entries(metaSources)) {
    const m = vPath.match(/^\/src\/content\/shards-gallery\/([^/]+)\/meta\.yaml$/);
    if (!m) continue;
    const gallerySlug = m[1];

    let parsed: any;
    try {
      parsed = yaml.load(raw as string);
    } catch {
      continue;
    }
    if (parsed?.draft) continue;
    if (!Array.isArray(parsed?.images)) continue;

    const resolved = await Promise.all(
      parsed.images.map((entry: any, i: number) => resolvePoint(gallerySlug, i, entry)),
    );

    resolved.forEach((p, i) => {
      if (!p) return;
      const entry = parsed.images[i];
      const permalink = findByIndex('shards', gallerySlug, i);
      const href = permalink ? pageUrl(permalink) : `/shards/gallery/${gallerySlug}`;
      const label = entry?.location?.place ?? entry?.caption ?? coordLabel(p);
      out.push({ ...p, gallerySlug, imageIndex: i, label, href });
    });
  }
  return out;
}

function allLocated(): Promise<LocatedImage[]> {
  if (!_cache) _cache = collectAll();
  return _cache;
}

/** Located images for one gallery, in `images:` order. */
export async function getGalleryPoints(gallerySlug: string): Promise<LocatedImage[]> {
  return (await allLocated()).filter((p) => p.gallerySlug === gallerySlug);
}

/** Does a gallery have any located image? (cheap guard for conditional render) */
export async function galleryHasLocation(gallerySlug: string): Promise<boolean> {
  return (await getGalleryPoints(gallerySlug)).length > 0;
}

/** One point per located gallery (mean of its image points) — for the global map. */
export async function getAllGalleryLocations(): Promise<GalleryLocation[]> {
  const located = await allLocated();
  const bySlug = new Map<string, LocatedImage[]>();
  for (const p of located) {
    const list = bySlug.get(p.gallerySlug) ?? [];
    list.push(p);
    bySlug.set(p.gallerySlug, list);
  }

  // Titles come from the parsed meta (avoids importing astro:content here).
  const titles = new Map<string, string>();
  for (const [vPath, raw] of Object.entries(metaSources)) {
    const m = vPath.match(/^\/src\/content\/shards-gallery\/([^/]+)\/meta\.yaml$/);
    if (!m) continue;
    try {
      const parsed: any = yaml.load(raw as string);
      if (parsed?.title) titles.set(m[1], String(parsed.title));
    } catch {
      /* ignore */
    }
  }

  return [...bySlug.entries()].map(([slug, pts]) => {
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
    return {
      slug,
      title: titles.get(slug) ?? slug,
      lat,
      lon,
      count: pts.length,
      href: `/shards/gallery/${slug}`,
    };
  });
}
