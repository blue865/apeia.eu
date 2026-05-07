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
- A **gallery** (collections of images with captions)

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
| `--color-accent-cosmos` | `#7aa2f7` | Cosmos section accent (blue) |
| `--color-accent-logos` | `#bb9af7` | Logos section accent (violet) |

> Tweak hex values here and update throughout — these are the source of truth.

### Typography

- **Font**: System font stack (no web font by default; may add a single variable font later)
- **Scale**: Fluid type via `clamp()` — define in `src/styles/tokens.css`
- **Line length**: Cap prose at `65ch`

### Principles

- Whitespace over decoration
- Images lead; text supports
- No gradients, shadows, or rounded corners except where functionally meaningful
- Transitions: `150ms ease` max

---

## Content Collections

Define in `src/content/config.ts`.

### `cosmos-posts`
```
src/content/cosmos/posts/
  YYYY-MM-DD-slug.md
```
Frontmatter: `title`, `date`, `summary`, `tags[]`, `draft`

### `cosmos-gallery`
```
src/content/cosmos/gallery/
  collection-slug/
    meta.yaml       # title, date, description
    *.jpg / *.webp
```

### `logos-posts`
```
src/content/logos/posts/
  YYYY-MM-DD-slug.md
```
Frontmatter: `title`, `date`, `summary`, `tags[]`, `topic` (philosophy | science | politics), `draft`

### `logos-gallery`
```
src/content/logos/gallery/
  collection-slug/
    meta.yaml
    *.jpg / *.webp
```

---

## Page Routes

| Route | File |
|---|---|
| `/` | `src/pages/index.astro` — landing, links to both sections |
| `/cosmos` | Section index: recent posts + gallery previews |
| `/cosmos/blog` | Post list |
| `/cosmos/blog/[slug]` | Single post |
| `/cosmos/gallery` | Gallery index |
| `/cosmos/gallery/[slug]` | Single gallery |
| `/logos` | Section index |
| `/logos/blog` | Post list |
| `/logos/blog/[slug]` | Single post |
| `/logos/gallery` | Gallery index |
| `/logos/gallery/[slug]` | Single gallery |

---

## Component Conventions

- One component per file in `src/components/`
- Shared layout shell: `src/layouts/Base.astro`
- Section-aware layout: `src/layouts/SectionLayout.astro` (accepts `section: 'cosmos' | 'logos'` prop → sets accent CSS variable)
- No default exports from `.ts` utility files; named exports only

---

## Out of Scope (for now)

- Comments, likes, or any social features
- Search
- RSS feed (add later)
- Dark/light mode toggle (dark only)
- i18n

---

## Open Decisions

- [ ] Exact section names (currently: Cosmos / Logos) — confirm or rename
- [ ] Accent colour values — placeholder values above, finalise before first deploy
- [ ] Web font choice — system stack for now
- [ ] Deployment target
