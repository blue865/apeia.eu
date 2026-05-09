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
    meta.yaml       # title, date, description, tags[]
    *.jpg / *.webp
```
Individual images within a gallery can carry their own tags via an `images` list in `meta.yaml` (see Tagging section).

### `shards-posts`
```
src/content/shards/posts/
  YYYY-MM-DD-slug.md
```
Frontmatter: `title`, `date`, `summary`, `tags[]`, `topic` (philosophy | science | politics | personal | travel), `draft`

### `shards-gallery`
```
src/content/shards/gallery/
  collection-slug/
    meta.yaml       # title, date, description, tags[]
    *.jpg / *.webp
```

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
| `/astro/tags` | Tag browser for Astro section |
| `/astro/tags/[tag]` | All Astro artefacts (posts + galleries + images) with that tag |
| `/shards` | Section index |
| `/shards/blog` | Post list |
| `/shards/blog/[slug]` | Single post |
| `/shards/gallery` | Gallery index |
| `/shards/gallery/[slug]` | Single gallery |
| `/shards/tags` | Tag browser for Shards section |
| `/shards/tags/[tag]` | All Shards artefacts (posts + galleries + images) with that tag |

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

## Image Downloads

Every image inside a gallery detail page (`/astro/gallery/<slug>/`, `/shards/gallery/<slug>/`) carries a small **Download** pill in its top-right corner. Clicking it opens a dropdown with up to four sizes:

- **Original** — the source file, byte-for-byte. Labelled with the source dimensions, e.g. `Original · 4096 × 2731 px`, plus a small `original` badge.
- **4K · 3840 px** — only offered when the source is wider than 3840.
- **2K · 2048 px** — only offered when the source is wider than 2048.
- **800 px** — only offered when the source is wider than 800.

A 600-px-wide source thus offers only Original; a 1500-px source offers Original + 800 px; only 4K-or-bigger sources show every option. The rule is "never offer a resolution larger than the source", to avoid the misleading impression that we're upscaling.

### How it's wired

`src/lib/galleryDownloads.ts` is the single source of truth.

- **Original bytes** are served as-is via Vite: `import.meta.glob('/src/content/*-gallery/**/*.{jpg,jpeg,png,webp}', { query: '?url' })`. Vite copies the source file to `dist/_astro/<hash>` untouched.
- **Resized variants** are produced at build time by Astro's `getImage()` in the source's original format (PNG stays PNG, JPEG stays JPEG).
- The `<a download="...">` attribute supplies a clean filename — `M31 - Andromeda Galaxy - 2K.jpg` rather than the hashed asset name.
- Original filenames are recovered from `meta.yaml` via `import.meta.glob('/src/content/*-gallery/*/meta.yaml', { query: '?raw' })` — the raw text is inlined into the bundle and parsed with `js-yaml`. **Do not** read `meta.yaml` from a layout via `fs` and a path derived from `import.meta.url`: that works in dev (the layout is the source `.astro` file) but breaks in build (layouts get bundled and `import.meta.url` no longer points at the project tree). The Vite-glob route works in both modes.

### UI

The dropdown is a pure-HTML `<details>` / `<summary>` — no JavaScript ships to the browser. The summary is a small frosted pill (icon + "Download"); the menu opens below it with a darker frosted background and accent-coloured hover. The pill picks up the section motif: rounded for Astro, shard-cut corners for Shards. On narrow viewports (`max-width: 640px`) the label collapses and only the down-arrow icon remains.

The `<details>` doesn't auto-close on click outside — clicking the summary again closes it. If a richer menu becomes necessary later (lightbox, EXIF info, copy-link button), this is the natural place to add one tiny `<script>`; until then we stay JS-free.

### Adding a new size

Edit the `VARIANTS` array at the top of `src/lib/galleryDownloads.ts`:

```ts
const VARIANTS = [
  { width: 800,  short: '800',  label: '800 px' },
  { width: 2048, short: '2K',   label: '2K · 2048 px' },
  { width: 3840, short: '4K',   label: '4K · 3840 px' },
] as const;
```

Add an entry, rebuild. The "skip if width >= source width" rule applies automatically.

---

## Out of Scope (for now)

- Comments, likes, or any social features
- Search
- RSS feed (add later)
- Dark/light mode toggle (dark only)
- i18n

---

## Open Decisions

- [x] Exact section names — **Astro** (`/astro`) and **Shards** (`/shards`) confirmed
- [x] Accent colour values — **Astro `#5dd6c8` (mint teal)**, **Shards `#e8a87c` (warm peach)**
- [x] Astro font combo — **Outfit** (display) + **DM Sans** (body)
- [x] Shards font combo — **Newsreader** (display, opsz) + **Lora** (body)
- [x] Brand wordmark — **Bricolage Grotesque** pinned across both sections via `--font-brand`
- [ ] Astro star of the show — confirm hero image treatment and orbital/circular motif
- [ ] Shards star of the show — confirm typographic anchor and shard/angular motif
- [ ] Depth level — decide how far to push noise texture and glass effects (subtle vs. very subtle)
- [ ] Deployment target
