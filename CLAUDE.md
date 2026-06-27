# apeia.eu — Project Brief
Personal memory site: astrophotography on one side, philosophy/science/politics/personal notes and observations on the other.
Built with Astro as a fully static site. Sleek, minimalist, dark aesthetic. 

---

## Site Architecture

Two top-level sections, clearly separated in navigation and visual identity:

| Section | Slug | Purpose |
|---|---|---|
| **Astro** | `/astro` | Astrophotography — backyard astrophotgraphy blog |
| **Shards** | `/shards` | Thoughts on philosophy, science, and politics, personal notes, travel blogs — essays and image galleries |

Each section has:
- A **blog** (long-form or short text posts)
- A **gallery** (collections of images with captions and short description)

---

## Tech Stack

- **Framework**: Astro (static output, `output: 'static'`)
- **Styling**: CSS custom properties (design tokens) + scoped component styles; no utility-class framework
- **Content**: Astro Content Collections (Markdown/MDX for posts, JSON/YAML for gallery metadata)
- **Images**: Astro's built-in `<Image />` component for optimisation
- **Deployment**: Static hosting (TBD — likely Cloudflare Pages or Netlify)
- **No client-side JS** unless strictly necessary

---

## Design System

### Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#111318` | Page background |
| `--color-surface` | `#1a1d24` | Cards, panels |
| `--color-border` | `#2a2d36` | Dividers, outlines |
| `--color-text` | `#e2e4ea` | Body text |
| `--color-text-muted` | `#7a7f92` | Captions, metadata |
| `--color-accent-astro` | `#5dd6c8` | Astro section accent (mint teal — sky / water) |
| `--color-accent-shards` | `#e8a87c` | Shards section accent (warm peach — earth / sun) |

> Tweak hex values here and update throughout — these are the source of truth.

### Typography

Font choice follows a **two-font combo** strategy per section, plus a pinned wordmark and a pinned mono. Start with the **anchor headline font** — it sets the whole personality of the section. Find a body/UI font that contrasts with the anchor without clashing; they should feel like they come from the same world but offer visual variety.

- **`--font-brand`** — pinned wordmark for the `apeia.eu` link in the header. Stays the same across both sections so the brand has a consistent face. Currently *Bricolage Grotesque*.
- **Astro anchor** — geometric, precise, instrument-panel feel. *Outfit* (display) + *DM Sans* (body/UI).
- **Shards anchor** — literary, human, warmer. *Newsreader* (display, with optical sizing) + *Lora* (body).
- **`--font-mono`** — pinned for image captions, dates, tag pills, eyebrows, code. Currently *JetBrains Mono*. Don't flip it per section; it's the connective tissue between rooms.
- **Scale**: Fluid type via `clamp()` — define in `src/styles/tokens.css`.
- **Line length**: Cap prose at `65ch`.
- All fonts are loaded from Google Fonts at the top of `src/styles/tokens.css`. No system-font fallback as a final design — system stacks remain only for graceful loading degradation.

### Star of the Show

Each section's landing experience must have **one element that makes a visitor feel something** before they read a word. It is not chosen for aesthetics — it grows directly from the section's content identity.

- **Astro**: The hero *photograph* is the star. One dramatic full-bleed image commands the hero; every layout decision serves it.
- **Shards**: More typographic — a bold headline or a provocative pull quote anchors the hero, supported by a subtle abstract visual.
- **Home (`/`)**: A full-bleed photograph behind the whole page, randomly selected per load from images tagged `home-page`. See the [Home Page Background](#home-page-background) section.

The star is the visual seed. Every other decorative choice on the page grows from it. If a decoration has no connection to the star, cut it.

### Visual Rhyming

Repeat a small set of visual details throughout the section so everything feels from the same universe. Derive 1–2 motifs from the star of the show and echo them across UI chrome:

- **Astro motif** — circular/orbital forms echoing celestial bodies (rings, arcs, dot grids)
- **Shards motif** — angular, faceted shapes echoing the section name (diagonals, shard edges, crystalline cuts)

Apply motifs subtly to: dividers, tag pill shapes, icon choices, section breaks, image masks. Accent colour appearing consistently in interactive states (tag pills, hover, active indicators) also counts as rhyming.

### Depth

The site should feel tangible, not flat:

- Add subtle **noise/grain texture** to hero backgrounds and large image overlays — not to cards or UI chrome.
- Cards and panels may use a light **glass/frost effect** (`backdrop-filter: blur` + low-opacity surface colour) — keep it barely-there.
- Depth cues must never compete with the star of the show. If in doubt, pull back.
- Gradients and shadows **are allowed** where they serve depth, not decoration — keep them low-contrast and monochromatic.

### Text Opacity Hierarchy

Do not set all text to 100% opacity. Use opacity to signal read-priority:

| Level | Opacity | Use |
|---|---|---|
| High emphasis | 100% | Headlines, primary CTAs |
| Body | 87% | Main body text |
| Medium | 70% | Subheadings, supporting copy |
| Muted | `--color-text-muted` colour | Captions, timestamps, metadata |

### General Principles

- Whitespace over decoration
- Images lead; text supports
- Transitions: `150ms ease` max
- **Iterate aggressively**: before committing to a layout or star of the show, try at least 2–3 completely different directions — different layout, different star, different font combo. The first version is a draft, not a destination.

---

## Content Collections

Define in `src/content/config.ts`.

### `astro-posts`
```
src/content/astro/posts/
  YYYY-MM-DD-slug.md
```
Frontmatter: `title`, `date`, `summary`, `tags[]`, `draft`

### `astro-gallery`
```
src/content/astro/gallery/
  collection-slug/
    meta.yaml       # title, date, description, tags[], object{?}
    *.jpg / *.webp
```
Individual images within a gallery can carry their own tags via an `images` list in `meta.yaml` (see Tagging section).

Images may also carry an optional **`added:`** date — the day the picture joined the gallery:

```yaml
images:
  - file: ./new-take.jpg
    caption: Reprocessed with better calibration
    added: 2026-06-12
```

**Gallery ordering is by activity, not creation**: everywhere galleries are listed (section indexes, gallery indexes, the home page's recent mix), they sort by the newest `added` across their images, falling back to the gallery's own `date` (which also stands in for images without `added`). Adding a fresh picture with today's `added` elevates the gallery to the top. Implemented in `src/lib/galleryDates.ts` (`galleryActivityDate`, `byActivityDesc`). Applies to both sections; the RSS feed and tag result pages still use the gallery's creation `date`.

Astro galleries also accept an optional **`object:`** block describing the astronomical subject. Every field is itself optional — pick whatever the night and the source data justified, leave the rest off. The card only renders the fields that are present, and is hidden entirely if the whole block is absent.

```yaml
object:
  constellation: "Orion"
  position:      "RA 5h 35m 17s · Dec −5° 23′"
  culmination:   "Late January"
  distance:      "≈ 1,344 ly"
  size:          "≈ 24 ly across"
  apparentSize:  "65′ × 60′"
```

Values are free-form strings so authors can write whatever notation reads best (HMS/DMS, decimal degrees, "≈", arc-min vs arc-sec, etc.). The `Shards` gallery schema does not accept this block.

### `shards-posts`
```
src/content/shards/posts/
  YYYY-MM-DD-slug.md
```
Frontmatter: `title`, `date`, `summary`, `tags[]`, `topic` (philosophy | science | politics | shard | travel | IT — defaults to `shard`), `draft`, optional `cover` + `coverAlt`

### `shards-gallery`
```
src/content/shards/gallery/
  collection-slug/
    meta.yaml       # title, date, description, tags[]
    *.jpg / *.webp
```
Images may carry an optional **`location:`** block (and/or `geolocate: true`) for the location maps — see the [Location Maps](#location-maps-shards-only) section. The `astro-gallery` schema does not accept location data.

---

## Page Routes

| Route | File |
|---|---|
| `/` | `src/pages/index.astro` — landing, links to both sections |
| `/astro` | Section index: recent posts + gallery previews |
| `/astro/blog` | Post list |
| `/astro/blog/[slug]` | Single post |
| `/astro/gallery` | Gallery index |
| `/astro/gallery/[slug]` | Single gallery |
| `/astro/gallery/[slug]/[image]` | Per-image **permalink** page (one per image in the gallery) |
| `/astro/gallery/[slug]/[image]/[file]` | Per-image **variant download** endpoint (serves the actual bytes) |
| `/astro/tags` | Tag browser for Astro section |
| `/astro/tags/[tag]` | All Astro artefacts (posts + galleries + images) with that tag |
| `/shards` | Section index |
| `/shards/blog` | Post list |
| `/shards/blog/[slug]` | Single post |
| `/shards/gallery` | Gallery index |
| `/shards/gallery/[slug]` | Single gallery |
| `/shards/gallery/[slug]/[image]` | Per-image **permalink** page |
| `/shards/gallery/[slug]/[image]/[file]` | Per-image **variant download** endpoint |
| `/shards/tags` | Tag browser for Shards section |
| `/shards/tags/[tag]` | All Shards artefacts (posts + galleries + images) with that tag |
| `/shards/map` | Global location map — one dot per located Shards gallery (provisional placement) |

---

## Component Conventions

- One component per file in `src/components/`
- Shared layout shell: `src/layouts/Base.astro`
- Section-aware layout: `src/layouts/SectionLayout.astro` (accepts `section: 'astro' | 'shards'` prop → sets accent CSS variable)
- No default exports from `.ts` utility files; named exports only

---

## Tagging

Tags are first-class content — every post, gallery, and individual image is taggable with multiple free-form strings. Each section has its own isolated tag namespace and its own visual tag browser.

### Where tags live

**Blog posts** — in frontmatter:
```yaml
tags: [nebula, widefield, Ha, summer-2024]
```

**Gallery collections** — in `meta.yaml`, two levels:
```yaml
title: Orion Rising
date: 2025-01-12
description: Three-panel mosaic of Orion from the backyard.
tags: [mosaic, orion, winter]          # gallery-level tags
images:
  - file: orion-panel-1.jpg
    caption: Left panel — Barnard's Loop
    tags: [barnards-loop, emission]
  - file: orion-panel-2.jpg
    caption: Centre — Trapezium core
    tags: [trapezium, open-cluster]
  - file: orion-panel-3.jpg
    caption: Right panel — M78
    tags: [reflection-nebula, m78]
```
Gallery-level tags are inherited by every image in the collection unless overridden. Image-level tags are *additive* (union, not replacement).

### Tag browser pages

Each section exposes two statically-generated routes:

- `/astro/tags` — the **Astro tag browser**
- `/shards/tags` — the **Shards tag browser**

These are generated at build time from all tags collected across posts, galleries, and images in that section.

### Tag browser design

The tag browser (`src/components/TagBrowser.astro`) renders a scrollable grid of tag pills. Each pill shows the tag name and a count of matching artefacts. Pills use the section's accent colour. Clicking a pill navigates to the tag result page.

```
[ nebula ×14 ]  [ mosaic ×6 ]  [ Ha ×9 ]  [ widefield ×11 ]  ...
```

Visual rules:
- Pills are inline-flex, `border: 1px solid --color-border`, accent-coloured text, `padding: 0.25em 0.75em`
- On hover: background shifts to `--color-surface`, accent border
- No tag cloud font-size scaling — uniform size, sorted by count descending by default; secondary sort A–Z
- No JS required — the browser is a static page of `<a>` links

### Tag result pages

`/astro/tags/[tag]` and `/shards/tags/[tag]` are generated via `getStaticPaths()` at build time.

Each result page shows all matching artefacts grouped by type and sorted by date descending:

1. **Posts** — list of post cards (title, date, summary excerpt)
2. **Galleries** — list of gallery cards (cover image, title, date)
3. **Images** — grid of individual images with their parent gallery linked in caption

If a section has zero results for a given type, that group is omitted entirely. Empty-state copy if no artefacts at all: *"Nothing tagged [tag] yet."*

### Implementation notes

- Tag collection happens in a shared utility `src/lib/tags.ts`:
  - `getTagsForSection(section: 'astro' | 'shards')` → `Map<string, TagEntry[]>` where `TagEntry` is `{ type: 'post' | 'gallery' | 'image', slug, title, date, href, thumbnail? }`
  - Called once at build time; passed as props to browser and result pages
- Tags are normalised on ingest: lowercased, spaces → hyphens
- Tags are **not** shared between sections — `/astro/tags/nebula` and `/shards/tags/nebula` are independent pages
- `TagBrowser.astro` and `TagResultList.astro` are shared components; section identity comes from the `section` prop

---

## Home Page Background

The landing page (`/`) carries a **full-bleed photograph behind everything**, randomly selected on each page load from the pool of images tagged `home-page` across both gallery sections. This is the home equivalent of a section's "star of the show": the image speaks first, the text supports.

### How an image qualifies

Tag any image — or a whole gallery — with `home-page` to add it to the rotation:

```yaml
images:
  - file: ./M31 - Andromeda Galaxy.jpg
    tags: [4k, wallpaper, home-page]
```

Matching follows the additive rule used everywhere else: gallery-level `home-page` qualifies every image in that gallery; image-level `home-page` qualifies only that one.

The pool is collected at build time by `src/lib/homeBackgrounds.ts`, which runs every candidate through Astro's `getImage()` (webp, 2400 px wide) and emits the optimised URL list to the page.

### Selection and presentation

- **Random per page load** — a tiny inline script in `src/pages/index.astro` picks one URL with `Math.random()` from the embedded list. Asset caching is fine; the freshness is in the pick, not the file.
- **Aspect ratio preserved** — `background-size: cover; background-position: center`. The image fills the viewport; edges may crop. Switching to `contain` (full image visible, possible empty bands) is a one-line change.
- **Fade-in** — `.page-bg` starts at opacity 0; a `new Image()` preloads the URL, then we add `.is-loaded` and fade to 1 over 600 ms. Prevents a flash before the asset arrives. If preload fails the deep-bg colour stays in place.
- **Legibility over the photo, not by darkening it** — the veil (`.page-bg-veil`) is mostly clear at the top of the viewport (let the image breathe) and ramps darker only at the bottom where content needs a readable floor. The hero headline carries a soft `text-shadow` so it stays readable over a bright patch of sky without us having to dim the whole image.
- **Frosted home cards** — the two section cards on the landing use `backdrop-filter: blur(10px)` plus a 62 %-opacity surface tint, so they remain readable over any random photo without competing with it.

### Client-side JS exception

This feature is the **only** place on the site that ships JavaScript to the browser. The Tech Stack rule ("no client-side JS unless strictly necessary") permits exactly this case: per-load randomness on a static site cannot be achieved server-side. The script is inline (no extra request), runs once on `DOMContentLoaded`, and degrades silently if anything goes wrong.

### Tuning the veil

`.page-bg-veil` in `src/pages/index.astro` is a single linear gradient. Approximate stops:

```
0–35 %  → 10 % black overlay   (image breathes)
80 %    → 55 % black overlay   (transition into content)
100 %   → 85 % black overlay   (dark floor under recent-posts)
```

If photographs still feel too dark, lower these alphas; if text legibility at the bottom suffers, raise the `100 %` stop.

---

## Image Permalinks

Every gallery image has a **stable URL space** that doesn't move across rebuilds. This is the canonical address for the image — visitors can bookmark, share, or link to these URLs and the links survive future changes to the image pipeline (quality bumps, format switches, Astro/Vite upgrades). See the "Stability" subsection below for what does and doesn't preserve them.

### URL scheme

For each image in each gallery, three layers of URL exist:

```
/{section}/gallery/{gallery-slug}/{image-slug}                                 — per-image page
/{section}/gallery/{gallery-slug}/{image-slug}/{image-slug}-{variant}.{ext}    — variant download
```

- **`section`** — `astro` or `shards`.
- **`gallery-slug`** — directory name under `src/content/{section}-gallery/`.
- **`image-slug`** — derived from the original filename: extension stripped, lowercased, non-alphanumeric runs collapsed to `-`. `M104 - Sombrero.jpg` → `m104-sombrero`.
- **`variant`** — one of `original | 800 | 2k | 4k`.
- **`ext`** — extension of the source file (`jpg`, `png`, `webp`, …).

Concrete example for `src/content/astro-gallery/m104-sombrero/M104.jpg` (4096 × 2731):

- Per-image page: `/astro/gallery/m104-sombrero/m104`
- Original download: `/astro/gallery/m104-sombrero/m104/m104-original.jpg`
- 4K download: `/astro/gallery/m104-sombrero/m104/m104-4k.jpg`
- 2K download: `/astro/gallery/m104-sombrero/m104/m104-2k.jpg`
- 800-px download: `/astro/gallery/m104-sombrero/m104/m104-800.jpg`

### Variants offered

Same rule as before — never offer a resolution larger than the source:

- **Original** — the source file, byte-for-byte.
- **4K · 3840 px** — only when source > 3840 wide.
- **2K · 2048 px** — only when source > 2048 wide.
- **800 px** — only when source > 800 wide.

A 600-px source thus offers only Original. A 1500-px source offers Original + 800. Only 4K-or-bigger sources show every option.

### How it's wired

The single source of truth is **`src/lib/imagePermalinks.ts`**. At module load it walks every `meta.yaml` via `import.meta.glob('/src/content/*-gallery/*/meta.yaml', { query: '?raw' })`, builds a registry of `{section, gallerySlug, imageIndex, imageSlug, originalFilename, fsPath}` per image, and exposes helpers (`pageUrl`, `variantUrl`, `variantDownloadName`, `variantsForWidth`, `resolveFileRequest`, …).

Two route files per section serve the URLs:

- **`src/pages/{section}/gallery/[slug]/[image]/index.astro`** — the per-image page. Renders the photo via Astro's `<Image>` (so the in-page display still benefits from `/_astro/`-hashed cache-busting), plus caption, notes, tags, and the list of downloads.
- **`src/pages/{section}/gallery/[slug]/[image]/[file].ts`** — a static endpoint that produces the actual bytes at the permalink URL. For `original` it copies the source file verbatim; for `800/2k/4k` it runs sharp at quality 95 in the source format. Astro writes the response body to a real file at the URL path, so visitors get a clean direct download with no redirect.

`src/lib/galleryDownloads.ts` is a thin shim that produces the `DownloadOption[]` consumed by `GalleryLayout.astro` — it just asks the permalink registry for URLs.

### UI

Each gallery image in `GalleryLayout.astro` has a three-pill action strip in its top-right corner:

- **Fullscreen** — pure-CSS `:target` overlay (same as before).
- **Share** — links to the per-image permalink page. The icon is the iOS-style "box with arrow up". Same pill family as Fullscreen.
- **Download** — a pure-HTML `<details>`/`<summary>` dropdown listing the available variants. Each menu item is an `<a>` with `download="<friendly-name>"`. Clicking a row navigates to the permalink, which serves the file bytes directly — `download` works as expected.

The Download dropdown picks up the section motif (rounded for Astro, shard-cut for Shards). On viewports under 640 px the pills collapse to icons-only.

The dropdown ships no JavaScript — `<details>` handles open/close. Clicking the summary again closes it. Clicking outside doesn't auto-close.

### Stability

What's permanent:

- **Page routes and gallery slugs** are stable as long as you don't rename the file (for posts) or directory (for galleries).
- **Image slugs** are stable as long as you don't rename the original file. If you rename `M104.jpg` to `M104_v2.jpg`, the slug changes from `m104` to `m104-v2`.
- **Variant URLs** are stable as long as both `gallerySlug` and `originalFilename` stay the same. They are immune to image-encoding parameter changes (quality, format), Astro/Vite version upgrades, and bundler heuristic shifts.

What's *not* permanent (and is invalidated when it changes):

- `/_astro/`-hashed URLs used for in-page **display** images. These deliberately rotate when the file content or transformation parameters change, so the browser cache flushes correctly. They're not what the permalink mechanism is for.
- Anchor fragments inside a gallery page (`#img-1`, `#fs-1`) — these are positional, so reordering `images:` in `meta.yaml` will shift them.

### Adding a new variant size

Edit the variant tables at the top of `src/lib/imagePermalinks.ts`:

```ts
const VARIANT_WIDTHS: Record<Variant, number | null> = {
  original: null,
  '800': 800,
  '2k': 2048,
  '4k': 3840,
};
```

Add a new entry (and a matching label/short in the parallel maps), include it in `ALL_VARIANTS`, and add it to the `Variant` union type. Rebuild. The "skip if width >= source width" rule applies automatically, and the new endpoint URLs appear in the Download menu and the per-image page.

---

## Sky Map

The `/astro` index carries **"The sky so far"** — a static, build-time SVG chart of the whole sky with every captured object plotted on it. Zero client-side JS: markers are plain SVG `<a>` links, tooltips are SVG `<title>`, fullscreen is the same pure-CSS `:target` overlay pattern as gallery images.

### Files

| File | Role |
|---|---|
| `src/components/SkyMap.astro` | In-flow figure + fullscreen pill + `:target` overlay |
| `src/components/SkyMapSvg.astro` | The chart itself, rendered twice (figure + overlay; overlay copy is non-interactive since the overlay is one big close-link) |
| `src/lib/skymap.ts` | Position parser, equirectangular projection, ±180° seam splitting, magnitude→radius/opacity |
| `src/data/skymap/stars.json` | 1,018 real stars, mag ≤ 4.6 — `[lon, lat, mag]` triplets |
| `src/data/skymap/constellation-lines.json` | 88 constellation stick figures |
| `src/data/skymap/constellation-borders.json` | IAU boundary segments (drawn dashed, fainter than stick figures) |
| `src/data/skymap/constellation-names.json` | 89 constellation names at conventional label positions, with prominence rank |

Stick figures follow **Stellarium's "Modern (Sky & Telescope)" sky culture** (GPL-2 data; the same figures as IAU/Wikipedia charts), resolved from HIP numbers to coordinates. Stars, boundaries and name positions derive from **d3-celestial** (BSD-3-Clause, built on the HYG database). Everything is reduced to compact build-time-only JSON.

### How objects get plotted

An astro gallery appears on the map iff its `meta.yaml` has a parsable `object.position` and is not a draft. Marker = small accent dot + mono label, linked to the gallery page; `constellation` (if present) enriches the tooltip. Nothing else to do — the map grows with the archive.

Accepted position notations (minutes/seconds optional):

```
"RA 0h 42m 44s · Dec +41° 16′ 9″"
"RA 20h 54' 19\" · Dec +43° 31′ 30\""
"RA 13h 30m · Dec −47° 12′"          (ASCII or U+2212 minus)
```

Unparsable or missing positions fail silently (by design) — check the map after adding a gallery.

### Chart conventions

- Equirectangular, full sky, RA 0h centred, RA increasing right-to-left (printed-chart convention); polylines are densified before projection so a curved projection remains a one-function swap in `skymap.ts`
- Visual hierarchy: stick figures (most visible) → dashed IAU borders (fainter) → grid (faintest); captured objects are the only accent colour on the chart
- Label placement is collision-avoiding at build time: labels nudge ±16 px vertically and flip to the marker's left near the right edge; markers never move

---

## Location Maps (Shards only)

A **Shards-only** feature that plots where photographs were taken on a static, build-time SVG world map — the geographic twin of the Sky Map. Same philosophy: zero client-side JS, markers as plain SVG `<a>` links, tooltips via SVG `<title>`, fullscreen via the pure-CSS `:target` overlay. The `astro-gallery` schema does **not** accept location data; this keeps backyard astrophotography coordinates from ever being published.

Two surfaces:

- **Per-gallery map** — appears on a Shards gallery page when any image in it carries a location. One dot per located image, **auto-fitted** to the bounding box of that gallery's points (a trip zooms to its own region, not the whole world).
- **Global map** — a standalone page at `/shards/map` collecting every located Shards gallery. **One dot per gallery** (not per image), so dense trips don't blob; the dot links to the gallery page and sits at the gallery's mean point. Shows the meaningful world extent of all travels (no auto-fit). Route placement is provisional — it lives on its own page for now and may later fold into the `/shards` index or nav; because collection lives in a lib, moving it is trivial.

### Authoring locations

Location is **opt-in per image** (never inherited from gallery-level the way tags are). Add a `location:` block to images in a `shards-gallery` `meta.yaml`:

```yaml
images:
  - file: ./alfama-rooftops.jpg
    caption: Rooftops at golden hour
    location:
      lat: 38.7139
      lon: -9.1334
      place: "Alfama, Lisbon"   # optional tooltip label; falls back to caption, then coords
  - file: ./tram-28.jpg
    caption: Tram 28 climbing
    geolocate: true             # no coords given → extract from the file's EXIF GPS at build time
```

**Source precedence** for an image's coordinates:

1. Explicit `location.lat` / `location.lon` — always wins.
2. Else if `geolocate: true` — read EXIF GPS from the original file at build time (e.g. via `exifr` over the `fsPath` already tracked in the permalink registry).
3. Else — the image has no point and is omitted from both maps.

### EXIF extraction caveats

Phone travel photos almost always carry GPS, so `geolocate: true` mostly just works. But heavily processed/exported images often have EXIF stripped, and `webp` frequently loses it. When `geolocate: true` is set but no GPS is found, **emit a build-time warning** (e.g. `tram-28.jpg marked geolocate but no GPS found`) — unlike the Sky Map's silent-fail convention, a missing dot here should be noisy so it isn't overlooked.

### Map conventions

- Equirectangular projection sharing `skymap.ts`'s machinery; polylines densified before projection so a curved projection stays a one-function swap. Reuse the existing ±180° seam splitting for both rendering and the auto-fit bounding-box calc (a trip crossing the date line must not wrap the wrong way).
- **Auto-fit (per-gallery)**: compute the lon/lat extent of the gallery's points and set the SVG `viewBox` to that region plus padding. A gallery with a **single** located image has no extent — fall back to a default span of **≈5 km** centred on that point.
- Coastline/border base reduced to compact build-time-only JSON, mirroring the `src/data/skymap/` approach. Captured-location dots are the only accent colour on the chart.
- Label placement collision-avoiding at build time, same approach as the Sky Map.

### Data sources

Base geometry comes from **Natural Earth** (public domain) — the cartographic counterpart to d3-celestial on the Sky Map. Easiest path is the **`world-atlas`** npm package (Bostock's pre-built TopoJSON derived from Natural Earth, also public domain), run once through `topojson` / `d3-geo` at build time to extract polylines, simplify, and reduce to `src/data/geomap/*.json`.

Resolution tiers: **110m** (small, world/continent scale) and **50m** (regional/island scale — needed because small islands like the Canaries don't exist at 110m) are both shipped. `GeoMapSvg.astro` picks per render: 110m when the fitted box spans > 30°, else 50m. (**10m** exists in `world-atlas` if ever needed; not shipped.) Geometry is clipped to the frame, so even the 50m world file only contributes the few nearby polylines to any one map.

**Scale caveat for the 5 km single-point fallback**: no Natural Earth tier carries street/shoreline detail at city scale, so a lone-photo map renders as a dot on a near-blank field. True street-level context only exists in tiled providers (OSM), which is the JS/tile dependency we ruled out. The static maps work well from world scale down to roughly regional/island scale; at extreme single-point zoom they show position-in-the-abstract, not a recognizable place. If that becomes a problem, the fix is a graticule/grid backdrop at high zoom, or a wider default span (≈50–100 km) so some coastline/border usually falls in frame.

Place-name **geocoding** is out of scope (we use manual coords + EXIF). If ever added, the build-time source would be Nominatim/OSM.

### Files (as built)

| File | Role |
|---|---|
| `src/lib/geomap.ts` | Coordinate parsing, equirectangular projection (Earth orientation), auto-fit bbox with antimeridian framing + single-point ≈5 km span, `heightForBox` (cos-lat undistorted), polyline clipping, graticule, `niceStep`. Reuses `splitAtWrap`/`densify` from `skymap.ts`. |
| `src/lib/locations.ts` | Build-time collection: walks `shards-gallery` `meta.yaml`, resolves coords (manual → EXIF via `exifr`), memoised; emits per-gallery point sets (`getGalleryPoints`) and one-mean-per-gallery (`getAllGalleryLocations`); owns the noisy missing-GPS warning. |
| `src/components/GeoMapSvg.astro` | The chart itself: coastline + borders + graticule + accent markers; picks 110m vs 50m geometry by zoom; `interactive` flag for the overlay copy. |
| `src/components/GeoMap.astro` | In-flow figure + fullscreen pill + `:target` overlay (per-gallery + global variants); unique `id` per map. |
| `src/data/geomap/{coastline,borders}-{110m,50m}.json` | Reduced Natural Earth geometry — `[lon,lat][]` polylines. |
| `scripts/build-geomap.mjs` | One-time generator for the JSON above (devDeps `world-atlas` + `topojson-client`). |
| `src/pages/shards/map.astro` | Standalone global map page, linked from the `/shards` subnav. |

The per-gallery map renders conditionally in `GalleryLayout.astro` (via a `locationPoints` prop passed from the shards gallery route) — present only when the gallery has ≥1 located image, the same way the astro `object` card hides when absent. `exifr` is a runtime dependency (EXIF read happens during `astro build`).

---

## Out of Scope (for now)

- Comments, likes, or any social features
- Search
- Dark/light mode toggle (dark only)
- i18n

---

## Open Decisions

- [x] Exact section names — **Astro** (`/astro`) and **Shards** (`/shards`) confirmed
- [x] Accent colour values — **Astro `#5dd6c8` (mint teal)**, **Shards `#e8a87c` (warm peach)**
- [x] Astro font combo — **Outfit** (display) + **DM Sans** (body)
- [x] Shards font combo — **Newsreader** (display, opsz) + **Lora** (body)
- [x] Brand wordmark — **Bricolage Grotesque** pinned across both sections via `--font-brand`
- [x] Astro star of the show — hero photo (most recent gallery cover) + `OrbitalDecor` orbital/circular motif
- [x] Shards star of the show — typographic anchor + `ShardDecor` angular/shard motif
- [x] Depth level — settled on subtle: grain on heroes, barely-there glass on cards (`backdrop-filter`)
- [x] Location Maps — **Shards only**; per-gallery map (auto-fit, point per image, no route line) + global map at `/shards/map` (one dot per gallery); manual coords with EXIF fallback via `geolocate: true`; noisy warning on missing GPS; 5 km default span for single-point galleries
- [ ] Location Maps — final home for the global map (standalone `/shards/map` for now)
- [ ] Deployment target
