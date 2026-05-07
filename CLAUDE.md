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
| `--color-accent-astro` | `#7aa2f7` | Astro section accent (blue) |
| `--color-accent-shards` | `#bb9af7` | Shards section accent (violet) |

> Tweak hex values here and update throughout — these are the source of truth.

### Typography

Font choice follows a **two-font combo** strategy. Start with the **anchor headline font** — it sets the whole personality of the section. Find a body/UI font that contrasts with the anchor without clashing; they should feel like they come from the same world but offer visual variety. Use [Fonts In Use](https://fontsinuse.com) to explore pairings for a given anchor.

- **Astro anchor** — precise and technical, condensed or geometric. Suggested starting point: *Instrument Serif* (headlines) + *Geist Sans* (body/UI). Both free via Google Fonts.
- **Shards anchor** — literary and human, warmer display face. Pick from the same anchor-first approach.
- **Scale**: Fluid type via `clamp()` — define in `src/styles/tokens.css`
- **Line length**: Cap prose at `65ch`
- System font stack is for development only. Commit to the chosen combo before first deploy.

### Star of the Show

Each section's landing experience must have **one element that makes a visitor feel something** before they read a word. It is not chosen for aesthetics — it grows directly from the section's content identity.

- **Astro**: The hero *photograph* is the star. One dramatic full-bleed image commands the hero; every layout decision serves it.
- **Shards**: More typographic — a bold headline or a provocative pull quote anchors the hero, supported by a subtle abstract visual.

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

## Out of Scope (for now)

- Comments, likes, or any social features
- Search
- RSS feed (add later)
- Dark/light mode toggle (dark only)
- i18n

---

## Open Decisions

- [x] Exact section names — **Astro** (`/astro`) and **Shards** (`/shards`) confirmed
- [ ] Accent colour values — placeholder values above, finalise before first deploy
- [ ] Astro font combo — suggested *Instrument Serif* + *Geist Sans*; validate on real content before committing
- [ ] Shards font combo — pick anchor headline font, then find body pairing via [Fonts In Use](https://fontsinuse.com)
- [ ] Astro star of the show — confirm hero image treatment and orbital/circular motif
- [ ] Shards star of the show — confirm typographic anchor and shard/angular motif
- [ ] Depth level — decide how far to push noise texture and glass effects (subtle vs. very subtle)
- [ ] Deployment target
