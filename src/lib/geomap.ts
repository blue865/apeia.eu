/**
 * Location map helpers — build-time only. The geographic twin of `skymap.ts`.
 *
 * Projects latitude/longitude onto a flat equirectangular chart and computes an
 * auto-fit bounding box so a per-gallery map zooms to just its own points. Earth
 * orientation (unlike the sky chart): longitude increases left→right, latitude
 * +90° at the top. The ±180° seam splitting and `densify` come from `skymap.ts`
 * so a curved projection stays a one-function swap there too.
 *
 * Base geometry in `src/data/geomap/` derives from Natural Earth (public domain)
 * via the `world-atlas` package, reduced by `scripts/build-geomap.mjs`.
 */

import { splitAtWrap, densify } from './skymap';

export { splitAtWrap, densify };

export type GeoPoint = { lat: number; lon: number };

/** A geographic bounding box. `lonMax` may exceed 180 for boxes that straddle
 *  the antimeridian (the date line); `normalizeLon` unwraps points to match. */
export type GeoBox = { lonMin: number; lonMax: number; latMin: number; latMax: number };

export const WORLD_BOX: GeoBox = { lonMin: -180, lonMax: 180, latMin: -60, latMax: 78 };

const KM_PER_DEG_LAT = 111.32;
const D2R = Math.PI / 180;

/** Parse + validate a lat/lon pair from free-form meta.yaml values. */
export function parseLatLon(lat: unknown, lon: unknown): GeoPoint | null {
  const la = typeof lat === 'number' ? lat : Number(lat);
  const lo = typeof lon === 'number' ? lon : Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lon: lo };
}

/** Unwrap a longitude into the box's domain (handles antimeridian boxes). */
export function normalizeLon(lon: number, box: GeoBox): number {
  return box.lonMax > 180 && lon < box.lonMin ? lon + 360 : lon;
}

function latSpanForKm(km: number): number {
  return km / KM_PER_DEG_LAT;
}
function lonSpanForKm(km: number, lat: number): number {
  return km / (KM_PER_DEG_LAT * Math.max(0.1, Math.cos(lat * D2R)));
}

/**
 * Auto-fit a bounding box around a set of points.
 *
 * - Chooses the longitude framing (normal vs. antimeridian-unwrapped) that
 *   yields the smaller span, so a trip crossing the date line doesn't wrap the
 *   whole globe.
 * - A single point (or a degenerate extent) is given a `minSpanKm` window
 *   (default ≈5 km) so it doesn't render as one dot on a world map.
 * - Pads the fitted extent by `padFrac` on every side.
 */
export function computeBox(
  points: GeoPoint[],
  opts: { padFrac?: number; minSpanKm?: number } = {},
): GeoBox {
  const { padFrac = 0.18, minSpanKm = 5 } = opts;
  if (points.length === 0) return { ...WORLD_BOX };

  const lats = points.map((p) => p.lat);
  let latMin = Math.min(...lats);
  let latMax = Math.max(...lats);

  // Longitude: compare a normal framing against one where negatives are
  // unwrapped to [0,360), keeping whichever spans less.
  const lonsRaw = points.map((p) => p.lon);
  const spanRaw = Math.max(...lonsRaw) - Math.min(...lonsRaw);
  // Only switch to the unwrapped [0,360) framing for a genuine date-line span
  // (raw span > 180°); otherwise keep the natural −180..180 domain so coastline
  // longitudes line up without needless wrapping.
  let lons = lonsRaw;
  if (spanRaw > 180) {
    const lonsUn = points.map((p) => (p.lon < 0 ? p.lon + 360 : p.lon));
    if (Math.max(...lonsUn) - Math.min(...lonsUn) < spanRaw) lons = lonsUn;
  }
  let lonMin = Math.min(...lons);
  let lonMax = Math.max(...lons);

  // Enforce a minimum span (degenerate / single-point extents).
  const midLat = (latMin + latMax) / 2;
  const minLat = latSpanForKm(minSpanKm);
  const minLon = lonSpanForKm(minSpanKm, midLat);
  if (latMax - latMin < minLat) {
    const c = midLat;
    latMin = c - minLat / 2;
    latMax = c + minLat / 2;
  }
  if (lonMax - lonMin < minLon) {
    const c = (lonMin + lonMax) / 2;
    lonMin = c - minLon / 2;
    lonMax = c + minLon / 2;
  }

  // Pad.
  const padLat = (latMax - latMin) * padFrac;
  const padLon = (lonMax - lonMin) * padFrac;
  latMin = Math.max(-90, latMin - padLat);
  latMax = Math.min(90, latMax + padLat);
  lonMin -= padLon;
  lonMax += padLon;

  return { lonMin, lonMax, latMin, latMax };
}

export type Projector = (lon: number, lat: number) => { x: number; y: number };

/** Equirectangular projector mapping `box` onto a w×h pixel area with `pad`. */
export function makeProjector(box: GeoBox, w: number, h: number, pad = 0): Projector {
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const lonRange = box.lonMax - box.lonMin || 1;
  const latRange = box.latMax - box.latMin || 1;
  return (lon, lat) => {
    const L = normalizeLon(lon, box);
    return {
      x: pad + ((L - box.lonMin) / lonRange) * iw,
      y: pad + ((box.latMax - lat) / latRange) * ih,
    };
  };
}

/**
 * Pixel height for a fixed `width` that keeps the box undistorted: longitude
 * degrees are scaled by cos(midLat) so shapes don't stretch east–west. Clamped
 * to a sane portrait/landscape range.
 */
export function heightForBox(box: GeoBox, width: number, minH = 300, maxH = 760): number {
  const midLat = (box.latMin + box.latMax) / 2;
  const geoW = (box.lonMax - box.lonMin) * Math.cos(midLat * D2R);
  const geoH = box.latMax - box.latMin;
  const h = (width * geoH) / (geoW || 1);
  return Math.round(Math.min(maxH, Math.max(minH, h)));
}

/** Is a [lon,lat] point inside the box (lon normalized to the box domain)? */
export function pointInBox(lon: number, lat: number, box: GeoBox): boolean {
  const L = normalizeLon(lon, box);
  return L >= box.lonMin && L <= box.lonMax && lat >= box.latMin && lat <= box.latMax;
}

/** Keep only polylines with at least one vertex inside a slightly grown box —
 *  drops far-away continents so a zoomed-in map stays small. */
export function clipPolylines(lines: [number, number][][], box: GeoBox): [number, number][][] {
  const m = 0.5; // grow factor so lines entering the frame aren't cut early
  const dLon = (box.lonMax - box.lonMin) * m;
  const dLat = (box.latMax - box.latMin) * m;
  const grown: GeoBox = {
    lonMin: box.lonMin - dLon,
    lonMax: box.lonMax + dLon,
    latMin: box.latMin - dLat,
    latMax: box.latMax + dLat,
  };
  return lines.filter((line) => line.some(([lon, lat]) => pointInBox(lon, lat, grown)));
}

/** A "nice" graticule step (degrees) for a given span, so a 5 km map gets a
 *  fine grid and a world map a coarse one. */
export function niceStep(spanDeg: number): number {
  const steps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 45];
  const target = spanDeg / 6; // aim for ~6 lines across
  for (const s of steps) if (s >= target) return s;
  return 45;
}

/** Graticule lines (meridians + parallels) snapped to `step`, within the box. */
export function graticule(box: GeoBox, step: number): {
  meridians: [number, number][][];
  parallels: [number, number][][];
} {
  const meridians: [number, number][][] = [];
  const parallels: [number, number][][] = [];
  const start = (v: number) => Math.ceil(v / step) * step;
  for (let lon = start(box.lonMin); lon <= box.lonMax; lon += step) {
    meridians.push([
      [lon, box.latMin],
      [lon, box.latMax],
    ]);
  }
  for (let lat = start(box.latMin); lat <= box.latMax; lat += step) {
    parallels.push([
      [box.lonMin, lat],
      [box.lonMax, lat],
    ]);
  }
  return { meridians, parallels };
}
