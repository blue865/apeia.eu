/**
 * Content collections.
 *
 * Layout (per CLAUDE.md, with one pragmatic deviation marked below):
 *
 *   src/content/astro-posts/YYYY-MM-DD-slug.md
 *   src/content/astro-gallery/<slug>/meta.yaml + *.jpg
 *   src/content/shards-posts/YYYY-MM-DD-slug.md
 *   src/content/shards-gallery/<slug>/meta.yaml + *.jpg
 *
 * The spec describes folders as `src/content/astro/posts/` and
 * `src/content/astro/gallery/`. Astro's content-collections model requires
 * one collection per top-level folder under `content/`, so the folder names
 * are flattened to `astro-posts`, `astro-gallery`, etc. Collection *names*
 * match the spec exactly.
 */

import { defineCollection, z } from 'astro:content';

const postSchema = ({ image }: { image: () => any }) =>
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
  type: 'content',
  schema: ({ image }) => postSchema({ image }),
});

const shardsPosts = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    postSchema({ image }).extend({
      topic: z
        .enum(['philosophy', 'science', 'politics', 'personal', 'travel'])
        .default('personal'),
    }),
});

/** Gallery — one entry per <slug>/meta.yaml. Images sit alongside it. */
const gallerySchema = ({ image }: { image: () => any }) =>
  z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    cover: image().optional(),       // optional explicit cover; otherwise first image is used
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    images: z
      .array(
        z.object({
          file: image(),
          alt: z.string().optional(),
          caption: z.string().optional(),
          tags: z.array(z.string()).default([]),
        }),
      )
      .min(1),
  });

const astroGallery = defineCollection({
  type: 'data',
  schema: ({ image }) => gallerySchema({ image }),
});

const shardsGallery = defineCollection({
  type: 'data',
  schema: ({ image }) => gallerySchema({ image }),
});

export const collections = {
  'astro-posts': astroPosts,
  'astro-gallery': astroGallery,
  'shards-posts': shardsPosts,
  'shards-gallery': shardsGallery,
};
