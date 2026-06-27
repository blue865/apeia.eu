/**
 * build-geomap.mjs — one-time generator for the Location Maps base geometry.
 *
 * Reads Natural Earth (public domain) via the `world-atlas` package and emits
 * compact build-time JSON used by `src/components/GeoMapSvg.astro`:
 *
 *   src/data/geomap/coastline-{110m,50m}.json  — land boundaries (coastline)
 *   src/data/geomap/borders-{110m,50m}.json    — interior country borders
 *
 * 110m is tiny and fine at world scale; 50m carries islands and finer coastline
 * for regional/island zooms (the Canaries, say, don't exist at 110m). Each file
 * is an array of polylines; each polyline is an array of [lon, lat] pairs rounded
 * to 3 decimals (~100 m). This is the geographic twin of `src/data/skymap/*.json`.
 * Run with:
 *
 *   node scripts/build-geomap.mjs
 *
 * `world-atlas` and `topojson-client` are devDependencies needed only here; the
 * runtime ships the generated JSON, not these packages.
 */
import { mesh } from 'topojson-client';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const round = (n) => Math.round(n * 1000) / 1000;

/** GeoJSON MultiLineString -> array of [lon,lat][] polylines, rounded + deduped. */
function toPolylines(multiLine) {
  return multiLine.coordinates
    .map((line) => {
      const out = [];
      let prev = null;
      for (const [lon, lat] of line) {
        const p = [round(lon), round(lat)];
        if (!prev || p[0] !== prev[0] || p[1] !== prev[1]) out.push(p);
        prev = p;
      }
      return out;
    })
    .filter((line) => line.length >= 2);
}

const count = (a) => a.reduce((n, l) => n + l.length, 0);

mkdirSync('src/data/geomap', { recursive: true });

for (const res of ['110m', '50m']) {
  const landTopo = require(`world-atlas/land-${res}.json`);
  const countriesTopo = require(`world-atlas/countries-${res}.json`);
  const coastline = toPolylines(mesh(landTopo, landTopo.objects.land));
  const borders = toPolylines(
    mesh(countriesTopo, countriesTopo.objects.countries, (a, b) => a !== b),
  );
  writeFileSync(`src/data/geomap/coastline-${res}.json`, JSON.stringify(coastline));
  writeFileSync(`src/data/geomap/borders-${res}.json`, JSON.stringify(borders));
  console.log(
    `[${res}] coastline ${coastline.length} lines / ${count(coastline)} pts, ` +
      `borders ${borders.length} lines / ${count(borders)} pts`,
  );
}
