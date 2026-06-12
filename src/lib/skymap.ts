/**
 * Sky map helpers — build-time only.
 *
 * Parses the free-form `object.position` strings used in astro-gallery
 * meta.yaml files and projects celestial coordinates onto a flat
 * equirectangular chart (the classic "whole sky on a rectangle" view).
 * RA increases right-to-left as on printed charts, RA 0h centred.
 *
 * `densify()` is a no-op visually on this projection (straight lon/lat
 * segments stay straight) but is kept so switching to a curved projection
 * later is a one-function change in makeProjector.
 *
 * Background data in `src/data/skymap/` derives from Stellarium's
 * "Modern (Sky & Telescope)" sky culture (stick figures) and the
 * d3-celestial project / HYG database (stars, borders, name positions).
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

/** RA in degrees (0..360) → chart longitude (-180..180, RA 0h at centre). */
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
 * seam, so the chart doesn't draw a line clear across the map.
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

/**
 * Insert intermediate vertices so that no segment spans more than
 * `stepDeg` degrees — straight (lon, lat) segments must curve on the
 * Hammer ellipse. Interpolation is linear in lon/lat, which is exactly
 * how the source polylines are defined.
 */
export function densify(line: [number, number][], stepDeg = 2): [number, number][] {
  if (line.length < 2) return line;
  const out: [number, number][] = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1];
    const [x1, y1] = line[i];
    const span = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    const n = Math.max(1, Math.ceil(span / stepDeg));
    for (let k = 1; k <= n; k++) {
      out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
    }
  }
  return out;
}

/** Sampled meridian (constant lon) as a [lon, lat] polyline. */
export function sampleMeridian(lonDeg: number, stepDeg = 3): [number, number][] {
  const pts: [number, number][] = [];
  for (let lat = -90; lat <= 90; lat += stepDeg) pts.push([lonDeg, lat]);
  return pts;
}

/** Sampled parallel (constant lat) as a [lon, lat] polyline. */
export function sampleParallel(latDeg: number, stepDeg = 3): [number, number][] {
  const pts: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += stepDeg) pts.push([lon, latDeg]);
  return pts;
}

/** Star dot radius from visual magnitude (brighter → bigger). */
export function magRadius(mag: number): number {
  return Math.max(0.35, 2.4 - mag * 0.42);
}

/** Star dot opacity from visual magnitude (brighter → more opaque). */
export function magOpacity(mag: number): number {
  return Math.min(0.9, Math.max(0.18, 0.95 - mag * 0.16));
}
