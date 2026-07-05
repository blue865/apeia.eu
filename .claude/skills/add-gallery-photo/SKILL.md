---
name: add-gallery-photo
description: >-
  Add a photo to an apeia.eu gallery and deploy it. Use when the user wants to
  publish, post, add, drop, or upload a picture/image/photo to a gallery on the
  site - e.g. "add this to the gallery", "post this to thingies", "add a photo
  to m42", "new gallery for NGC 7000", "publish this image". Two modes: SIMPLE
  (one picture into the thingies gallery with an optional caption) and COMPLETE
  (add to any gallery, or scaffold a new gallery, with full metadata). Handles
  the meta.yaml edit, build, and incremental FTP deploy.
---

# Add a photo to a gallery

Publishes an image to an apeia.eu gallery: places the file, updates `meta.yaml`,
builds, and shows the deploy plan for the user to approve before pushing.

## Layout you're working in

- Astro (astrophotography): `src/content/astro-gallery/<slug>/`
- Shards (everything else): `src/content/shards-gallery/<slug>/`
- Each gallery = a folder with `meta.yaml` + the image files it references.
- Image files are committed source; Astro generates web variants at build time.
- The image's filename becomes its permanent URL slug, so keep it meaningful.

Never hand-edit `meta.yaml` with the bulk Write/Edit file tools - writes to this
project's Windows mount can truncate. Use the helper below (it writes via node
and re-validates) or `bash`. Always confirm a file's byte size after writing.

## The meta.yaml helper

`scripts/gallery-image.mjs` (run with `node`, from the project root) owns all
YAML editing - it validates, inserts correctly even when an `object:` block
follows `images:`, matches the house style, and aborts on any error.

```
node .claude/skills/add-gallery-photo/scripts/gallery-image.mjs add    <meta.yaml> <entry.json>
node .claude/skills/add-gallery-photo/scripts/gallery-image.mjs create <meta.yaml> <gallery.json>
```

You build the JSON payload (no escaping headaches) and write it to a temp file
in the outputs dir, then call the helper.

`entry.json` fields (only `file` is required):

| field | required | notes |
|---|---|---|
| `file` | yes | `./<filename.ext>` - path relative to the gallery folder |
| `alt` | no | accessibility text describing the image |
| `caption` | no | short line shown under the image |
| `sizes` | no | download tiers, subset of `["4k","2k","800"]`; Original is always offered. Tiers >= source width are skipped (no upscaling). Omit = original only |
| `tags` | no | free-form; add `"home-page"` to enter the homepage background rotation |
| `added` | no | `YYYY-MM-DD` - set to TODAY so the gallery jumps to the top of activity ordering. Always include it. |
| `notes` | no | longer prose; pass with real `\n` for line breaks (rendered as a `|-` block) |

`gallery.json` (for `create`) = `title` (req), `date` (req, `YYYY-MM-DD`),
`name?` (short label, usually the first word of the title), `description?`,
`tags?`, `images: [entry, ...]` (>=1), and `object?` (astro only, see below).

`object` (astro galleries only, gallery-level, every sub-field optional):
`constellation`, `position`, `culmination`, `distance`, `size`, `apparentSize`.
Values are free-form strings, e.g. `position: "RA 5h 35m 17s · Dec -5° 23' 15\""`.

## Step 0 - find the image

Locate the image the user is publishing: a file they uploaded (check the uploads
dir) or a path they gave. Get today's date with `date +%F` for the `added` field.

## Simple mode

Trigger: a bare "add this picture" / "post this to thingies", no metadata fuss.

1. Target = `src/content/shards-gallery/thingies/`, unless the user names another
   EXISTING gallery - then use that folder (astro or shards).
2. Copy the image into the gallery folder. Keep a clean filename.
3. Build `entry.json`: `file`, today's `added`, `sizes: ["800"]`, and `caption`
   only if the user gave one. Nothing else.
4. Run the helper `add`.
5. Go to "Build and deploy".

## Complete mode

Trigger: "add to <gallery> with details", "new gallery", or the user wants to
set metadata.

1. Determine section + gallery slug. Ask the user which gallery, or the slug for
   a new one. Check whether the folder already exists.

2a. Existing gallery - collect image-level metadata by asking the user (offer
    sensible defaults, don't force every field): `alt`, `caption`, `tags`
    (+ `home-page`?), `sizes`, `notes`. Copy the file in, build `entry.json`
    (always include today's `added`), run the helper `add`.

2b. New gallery - create the folder, copy the image in, then collect
    gallery-level fields: `title` (required), `date` (required), `name`,
    `description`, `tags`, and for an astro gallery the `object` block (ask which
    of constellation/position/culmination/distance/size/apparentSize the user
    has - leave the rest off). Plus the first image's fields as in 2a. Build
    `gallery.json` and run the helper `create`.

Guidance on `sizes`: large astrophotography originals -> `["2k","800"]` or
`["4k","2k","800"]`; smaller/casual images -> `["800"]` or omit. Never worry
about upscaling - tiers above the source width are dropped automatically.

## Build and deploy

1. `npm run build` (regenerates `dist/`). Note: a full build regenerates ~1 GB
   of image variants; if the sandbox is low on disk it can fail - see the deploy
   notes / memory about cleaning `dist` or building on the user's machine.
2. `npm run deploy:plan` - show the user exactly what will upload/delete. For a
   single new photo expect the new image variants plus the few HTML/asset files
   that reference it.
3. STOP and ask the user to confirm. Do NOT push automatically.
4. On approval: `npm run deploy` (add `-- --verify` to HTTP-check a sample after
   upload). The push updates `deploy/manifest.json` itself.
5. Offer to `git add` the new image + `meta.yaml` and commit, so the source
   stays in version control. (`.env` and `dist/` are gitignored - never commit
   them.)

## After

Tell the user the gallery page URL, e.g. `https://apeia.eu/shards/gallery/thingies`
(or `/astro/gallery/<slug>`), and the image permalink
`.../gallery/<slug>/<image-slug>`. If the image was tagged `home-page`, mention
it's now in the homepage rotation.
