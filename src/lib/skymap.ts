/**
 * Sky map helpers — build-time only.
 *
 * Parses the free-form `object.position` strings used in astro-gallery
 * meta.yaml files and projects celestial coordinates onto a flat
 * equirectangular chart (the classic "whole sky on a rectangle" view,
 * RA increasing right-to-left as on printed star charts, RA 0h centred).
 *
 * Background data in `src/data/skymap/` is derived from the d3-celestial
 * project (BSD-3-Clause, https://github.com/ofrohn/d3-celestial), which in
 * turn builds on the HYG star database. Stars are pre-filtered to mag ≤ 4.6.
 */

export type SkyPoint = { raDeg: number; decDeg: number };

/**
 * Accepts the notations used across meta.yaml files, e.g.
 *   "RA 0h 42m 44s · Dec +41° 16′ 9″"
 *   "RA 20h 54' 19\" · Dec +43° 31′ 30\""
 *   "RA 18h 18m 45s · Dec −13° 47′ 13″"   (U+2212 minus)
 * Minutes/seconds are optional; both prime and letter unit marks work.
 */
const RA_RE = /RA\s*([\d.]+)\s*h(?:\s*([\d.]+)\s*[m'′])?(?:\s*([\d.]+)\s*[s"″])?/i;
const DEC_RE = /Dec\s*([+\-−–]?)\s*([\d.]+)\s*[°d](?:\s*([\d.]+)\s*['′m])?(?:\s*([\d.]+)\s*["″s])?/i;

export function parsePosition(position: string): SkyPoint | null {
  const ra = RA_RE.exec(position);
  const dec = DEC_RE.exec(position);
  if (!ra || !dec) return null;

  const raDeg =
    (Number(ra[1]) + Number(ra[2] ?? 0) / 60 + Number(ra[3] ?? 0) / 3600) * 15;
  const sign = dec[1] === '-' || dec[1] === '−' || dec[1] === '–' ? -1 : 1;
  const decDeg =
    sign * (Number(dec[2]) + Number(dec[3] ?? 0) / 60 + Number(dec[4] ?? 0) / 3600);

  if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return null;
  if (raDeg < 0 || raDeg >= 360 || decDeg < -90 || decDeg > 90) return null;
  return { raDeg, decDeg };
}

/** RA in degrees (0..360) → chart longitude (-180..180, d3-celestial convention). */
export function raToLon(raDeg: number): number {
  const r = ((raDeg % 360) + 360) % 360;
  return r > 180 ? r - 360 : r;
}

export type Projector = (lonDeg: number, latDeg: number) => { x: number; y: number };

/**
 * Equirectangular projector for a W×H box with `pad` inner padding.
 * lon +180 maps to the left edge, lon −180 to the right edge (sky charts
 * mirror east-west relative to earth maps), dec +90 to the top.
 */
export function makeProjector(w: number, h: number, pad = 0): Projector {
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  return (lonDeg, latDeg) => ({
    x: pad + ((180 - lonDeg) / 360) * iw,
    y: pad + ((90 - latDeg) / 180) * ih,
  });
}

/**
 * Split a polyline of [lon, lat] vertices wherever it crosses the ±180°
 * seam, so the flat chart doesn't draw a line clear across the map.
 */
export function splitAtWrap(line: [number, number][]): [number, number][][] {
  const parts: [number, number][][] = [];
  let current: [number, number][] = [];
  for (const pt of line) {
    if (current.length > 0 && Math.abs(pt[0] - current[current.length - 1][0]) > 180) {
      if (current.length > 1) parts.push(current);
      current = [];
    }
    current.push(pt);
  }
  if (current.length > 1) parts.push(current);
  return parts;
}

/** Star dot radius from visual magnitude (brighter → bigger). */
export function magRadius(mag: number): number {
  return Math.max(0.35, 2.4 - mag * 0.42);
}

/** Star dot opacity from visual magnitude (brighter → more opaque). */
export function magOpacity(mag: number): number {
  return Math.min(0.9, Math.max(0.18, 0.95 - mag * 0.16));
}
