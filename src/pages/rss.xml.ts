/**
 * Site-wide RSS feed.
 *
 * One feed for the whole site: blog posts AND galleries from BOTH sections
 * (Astro + Shards), merged and sorted by date, newest first. Drafts are
 * excluded. Each item carries <category> tags identifying its section
 * (Astro / Shards), its type (Post / Gallery), and — where present — the
 * Shards topic and the artefact's own tags, so readers/filters can slice the
 * feed without us mangling the titles.
 *
 * Served at /rss.xml (linked from the header nav and advertised via a
 * <link rel="alternate"> in Base.astro).
 */
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

type FeedItem = {
  title: string;
  pubDate: Date;
  link: string;
  description: string;
  categories: string[];
};

export async function GET(context: APIContext) {
  const [astroPosts, shardsPosts, astroGalleries, shardsGalleries] = await Promise.all([
    getCollection('astro-posts', ({ data }) => !data.draft),
    getCollection('shards-posts', ({ data }) => !data.draft),
    getCollection('astro-gallery', ({ data }) => !data.draft),
    getCollection('shards-gallery', ({ data }) => !data.draft),
  ]);

  const items: FeedItem[] = [
    ...astroPosts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/astro/blog/${p.id}`,
      description: p.data.summary ?? '',
      categories: ['Astro', 'Post', ...p.data.tags],
    })),
    ...shardsPosts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/shards/blog/${p.id}`,
      description: p.data.summary ?? '',
      categories: ['Shards', 'Post', p.data.topic, ...p.data.tags],
    })),
    ...astroGalleries.map((g) => ({
      title: g.data.title,
      pubDate: g.data.date,
      link: `/astro/gallery/${g.id}`,
      description: g.data.description ?? 'Gallery',
      categories: ['Astro', 'Gallery', ...g.data.tags],
    })),
    ...shardsGalleries.map((g) => ({
      title: g.data.title,
      pubDate: g.data.date,
      link: `/shards/gallery/${g.id}`,
      description: g.data.description ?? 'Gallery',
      categories: ['Shards', 'Gallery', ...g.data.tags],
    })),
  ];

  items.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: 'apeia.eu',
    description:
      'Astrophotography and the Synoptic Gospels of a Society in Search of Meaning - gardening section',
    site: context.site ?? 'https://apeia.eu',
    items,
    customData: '<language>en</language>',
  });
}
