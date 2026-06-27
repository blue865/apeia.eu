/**
 * Content collections — Astro 6 content layer.
 *
 * Each collection uses the `glob` loader from `astro/loaders`. Layout still
 * matches the spec (CLAUDE.md), with one pragmatic deviation: the directory
 * names are flattened (`astro-posts`, `astro-gallery`, etc.) because Astro's
 * collection model wants one top-level folder per collection. Collection
 * *names* match the spec exactly.
 *
 *   src/content/astro-posts/YYYY-MM-DD-slug.md
 *   src/content/astro-gallery/<slug>/meta.yaml + *.jpg
 *   src/content/shards-posts/YYYY-MM-DD-slug.md
 *   src/content/shards-gallery/<slug>/meta.yaml + *.jpg
 */

import { defineCollection, z, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = ({ image }: { image: SchemaContext['image'] }) =>
  z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  });

const astroPosts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/astro-posts',
  }),
  schema: ({ image }) => postSchema({ image }),
});

const shardsPosts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/shards-posts',
  }),
  schema: ({ image }) =>
    postSchema({ image }).extend({
      topic: z
        .enum(['philosophy', 'science', 'politics', 'shard', 'travel', 'IT'])
        .default('shard'),
    }),
});

/** Opt-in geographic location for a Shards gallery image (never inherited).
 *  Either explicit coords win, or `geolocate: true` pulls them from EXIF at
 *  build time. The astro-gallery schema deliberately omits this block so
 *  backyard astrophotography coordinates can never be published. */
const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    place: z.string().optional(),
  })
  .optional();

/** Gallery — one entry per <slug>/meta.yaml. Id is normalised to just <slug>.
 *  `withLocation` adds the per-image `location`/`geolocate` fields (Shards only). */
const gallerySchema = (
  { image }: { image: SchemaContext['image'] },
  { withLocation = false }: { withLocation?: boolean } = {},
) => {
  const imageObject = z.object({
    file: image(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    /** Optional multiline prose. Use YAML's `|` literal block style
     *  so line breaks survive into the rendered output. */
    notes: z.string().optional(),
    /** Optional date the picture was added to the gallery. Used to
     *  order galleries by their newest picture ("activity"); when
     *  absent, the gallery's own `date` stands in for the image. */
    added: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    ...(withLocation
      ? {
          location: locationSchema,
          /** When true and no explicit `location`, read EXIF GPS at build. */
          geolocate: z.boolean().optional(),
        }
      : {}),
  });

  return z.object({
    title: z.string(),
    /** Short label — the first whitespace-delimited token of the title. */
    name: z.string().optional(),
    date: z.coerce.date(),
    description: z.string().optional(),
    cover: image().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    images: z.array(imageObject).min(1),
  });
};

/** Optional astronomical metadata for an Astro gallery's subject.
 *  Every field is a free-form string so authors can write whatever notation
 *  reads best ("RA 5h 35m · Dec −5° 23'", "≈ 1,344 ly", "65' × 60'", …). */
const objectInfoSchema = z
  .object({
    constellation: z.string().optional(),
    position: z.string().optional(),
    culmination: z.string().optional(),
    distance: z.string().optional(),
    size: z.string().optional(),
    apparentSize: z.string().optional(),
  })
  .optional();

const astroGallery = defineCollection({
  loader: glob({
    pattern: '*/meta.yaml',
    base: './src/content/astro-gallery',
    generateId: ({ entry }) => entry.replace(/\/meta\.yaml$/, ''),
  }),
  schema: ({ image }) =>
    gallerySchema({ image }).extend({
      object: objectInfoSchema,
    }),
});

const shardsGallery = defineCollection({
  loader: glob({
    pattern: '*/meta.yaml',
    base: './src/content/shards-gallery',
    generateId: ({ entry }) => entry.replace(/\/meta\.yaml$/, ''),
  }),
  schema: ({ image }) => gallerySchema({ image }, { withLocation: true }),
});

export const collections = {
  'astro-posts': astroPosts,
  'astro-gallery': astroGallery,
  'shards-posts': shardsPosts,
  'shards-gallery': shardsGallery,
};
