# apeia.eu

Personal site of memory and thought. Built per `CLAUDE.md`.

Two sections, two accents:

- **Astro** (`/astro`) — backyard astrophotography. Accent **#7aa2f7** (cool blue), orbital motif.
- **Shards** (`/shards`) — essays + image collections on philosophy, science, politics, personal, travel. Accent **#bb9af7** (violet), faceted/shard motif.

## Running

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output → ./dist
npm run preview  # serve the built site
npm run check    # astro + types check
```

Requires Node 18.18+ or 20+.

## Project structure

```
src/
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   ├── PostCard.astro
│   ├── GalleryCard.astro
│   ├── TagPill.astro          # section-aware shape (pill vs cut)
│   ├── TagBrowser.astro       # /<section>/tags page body
│   ├── TagResultList.astro    # /<section>/tags/[tag] body
│   ├── OrbitalDecor.astro     # Astro motif
│   └── ShardDecor.astro       # Shards motif
├── content/
│   ├── config.ts              # 4 collections (astro-posts, astro-gallery, shards-posts, shards-gallery)
│   ├── astro-posts/
│   │   └── YYYY-MM-DD-slug.md
│   ├── astro-gallery/
│   │   └── <slug>/
│   │       ├── meta.yaml
│   │       └── *.jpg
│   ├── shards-posts/
│   │   └── YYYY-MM-DD-slug.md
│   └── shards-gallery/
│       └── <slug>/
│           ├── meta.yaml
│           └── *.jpg
├── layouts/
│   ├── Base.astro             # html/head + Header/Footer + body[data-section]
│   ├── SectionLayout.astro    # in-section pages with consistent header
│   ├── PostLayout.astro
│   └── GalleryLayout.astro
├── lib/
│   ├── tags.ts                # getTagsForSection, normalizeTag
│   └── format.ts
├── pages/
│   ├── index.astro
│   ├── 404.astro
│   ├── astro/
│   │   ├── index.astro
│   │   ├── blog/{index, [...slug]}.astro
│   │   ├── gallery/{index, [...slug]}.astro
│   │   └── tags/{index, [...tag]}.astro
│   └── shards/
│       └── (mirror of astro/)
└── styles/
    ├── tokens.css             # palette, type scale, motion, motif primitives
    └── global.css             # reset + base type + helpers
```

## Routes

| Path | Source |
|---|---|
| `/` | `pages/index.astro` |
| `/astro/` | `pages/astro/index.astro` |
| `/astro/blog/` | `pages/astro/blog/index.astro` |
| `/astro/blog/<slug>/` | `pages/astro/blog/[...slug].astro` |
| `/astro/gallery/` | `pages/astro/gallery/index.astro` |
| `/astro/gallery/<slug>/` | `pages/astro/gallery/[...slug].astro` |
| `/astro/tags/` | `pages/astro/tags/index.astro` |
| `/astro/tags/<tag>/` | `pages/astro/tags/[...tag].astro` |
| `/shards/...` | mirror of `/astro/...` |

## Adding content

### A new blog post

`src/content/astro-posts/2026-05-12-aurora-overhead.md`:

```md
---
title: "Aurora overhead"
date: 2026-05-12
summary: "Half a clear sky and a coronal mass that nearly missed."
tags: [aurora, widefield]
draft: false
---

Body in markdown.
```

For Shards posts, add a `topic` field — one of `philosophy | science | politics | personal | travel`.

### A new gallery

```
src/content/astro-gallery/comet-january/
  meta.yaml
  comet-01.jpg
  comet-02.jpg
```

`meta.yaml`:

```yaml
title: Comet, January
date: 2026-01-08
description: Two-night chase before it dropped past the horizon.
tags: [comet, winter]
images:
  - file: ./comet-01.jpg
    caption: Tail unwinding
    tags: [tail-detail]
  - file: ./comet-02.jpg
    caption: Fading into morning twilight
    tags: [twilight]
```

Set `draft: true` on any entry to keep it out of the build.

## Tagging

Tags are first-class. Per `CLAUDE.md`:

- Each section has its **own** tag namespace — `/astro/tags/winter/` and `/shards/tags/winter/` are independent pages.
- Gallery-level tags are inherited by every image; image-level tags add on top (union, not replacement).
- Tags are normalised on ingest: lowercased, spaces → hyphens.

The browser pages list every tag in the section as a pill with count, sorted by count desc then a–z. Clicking a pill takes you to `/<section>/tags/<tag>/`, which groups results by type — Posts, then Galleries, then Images. Empty groups are omitted.

## Design system

The single source of truth is `src/styles/tokens.css`. Edit tokens there and the change cascades:

| Token | Value |
|---|---|
| `--color-bg` | `#111318` |
| `--color-surface` | `#1a1d24` |
| `--color-border` | `#2a2d36` |
| `--color-text` | `#e2e4ea` |
| `--color-text-muted` | `#7a7f92` |
| `--color-accent-astro` | `#7aa2f7` |
| `--color-accent-shards` | `#bb9af7` |

Section accent flips via `body[data-section="astro" \| "shards"]`, which rebinds `--accent`, `--accent-rgb`, `--accent-soft`, `--accent-line`, `--font-display`, `--font-body`. Components reference the generic tokens and inherit the right values automatically.

Type:

- Astro: **Instrument Serif** (display) + **Geist Sans** (body)
- Shards: **Fraunces** (display) + **Inter** (body)
- Mono: **JetBrains Mono**

All loaded from Google Fonts at the top of `tokens.css`. The Shards font choice is provisional per `CLAUDE.md`; lock it in once you've validated it on real content.

## Layout deviation from CLAUDE.md

`CLAUDE.md` describes content folders as `src/content/astro/posts/` and `src/content/astro/gallery/`. Astro's content-collections model requires one collection per top-level folder under `src/content/`. The folder names are flattened to `astro-posts`, `astro-gallery`, etc.; collection *names* match the spec.

Inside each gallery collection the `<slug>/meta.yaml + *.jpg` directory layout matches CLAUDE.md exactly.

## Out of scope (per CLAUDE.md)

Comments, search, RSS, light-mode toggle, i18n. Not built.

## Open decisions still to make

- Lock in the Shards font combo (Fraunces + Inter is provisional).
- Decide how far to push grain/glass effects (current setting is subtle).
- Pick a deployment target — Cloudflare Pages and Netlify both work zero-config; the build is plain static.
- Replace seed content and placeholder imagery with the real thing.
