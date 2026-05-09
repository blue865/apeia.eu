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

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
        .enum(['philosophy', 'science', 'politics', 'personal', 'travel'])
        .default('personal'),
    }),
});

/** Gallery — one entry per <slug>/meta.yaml. Id is normalised to just <slug>. */
const gallerySchema = ({ image }: { image: () => any }) =>
  z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    cover: image().optional(),
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
  loader: glob({
    pattern: '*/meta.yaml',
    base: './src/content/astro-gallery',
    generateId: ({ entry }) => entry.replace(/\/meta\.yaml$/, ''),
  }),
  schema: ({ image }) => gallerySchema({ image }),
});

const shardsGallery = defineCollection({
  loader: glob({
    pattern: '*/meta.yaml',
    base: './src/content/shards-gallery',
    generateId: ({ entry }) => entry.replace(/\/meta\.yaml$/, ''),
  }),
  schema: ({ image }) => gallerySchema({ image }),
});

export const collections = {
  'astro-posts': astroPosts,
  'astro-gallery': astroGallery,
  'shards-posts': shardsPosts,
  'shards-gallery': shardsGallery,
};
