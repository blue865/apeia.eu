/**
 * Tag aggregation across a section's posts, galleries, and individual images.
 *
 * Per CLAUDE.md:
 *   - Each section (astro | shards) has its own isolated tag namespace.
 *   - Tags are normalised on ingest: lowercased + spaces → hyphens.
 *   - Image-level tags are *additive* (gallery tags inherited; image tags add on top).
 *
 * Public API:
 *   getTagsForSection(section)  → Map<string, TagEntry[]>
 *   sortedTagSummary(map)       → [{ tag, count }]  (count desc, then a–z)
 */

import { getCollection } from 'astro:content';

export type Section = 'astro' | 'shards';

export type TagEntry =
  | { type: 'post';    slug: string; title: string; date: Date; href: string; summary?: string }
  | { type: 'gallery'; slug: string; title: string; date: Date; href: string; thumbnail?: ImageMetadata; description?: string }
  | { type: 'image';   gallerySlug: string; title: string; date: Date; href: string; thumbnail: ImageMetadata; caption?: string };

export function normalizeTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, '-');
}

export function normalizeTags(tags: readonly string[] | undefined): string[] {
  if (!tags) return [];
  // de-dupe while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = normalizeTag(t);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export async function getTagsForSection(section: Section): Promise<Map<string, TagEntry[]>> {
  const postsCol = section === 'astro' ? 'astro-posts' : 'shards-posts';
  const galleryCol = section === 'astro' ? 'astro-gallery' : 'shards-gallery';

  const posts = await getCollection(postsCol, ({ data }: any) => !data.draft);
  const galleries = await getCollection(galleryCol, ({ data }: any) => !data.draft);

  const map = new Map<string, TagEntry[]>();
  const push = (tag: string, entry: TagEntry) => {
    const arr = map.get(tag);
    if (arr) arr.push(entry);
    else map.set(tag, [entry]);
  };

  // Posts — entry.id is the filename slug under the new content layer.
  for (const p of posts) {
    const entry: TagEntry = {
      type: 'post',
      slug: p.id,
      title: p.data.title,
      date: p.data.date,
      summary: p.data.summary,
      href: `/${section}/blog/${p.id}/`,
    };
    for (const t of normalizeTags(p.data.tags)) push(t, entry);
  }

  // Galleries (and their images) — generateId in content.config strips the
  // /meta.yaml suffix, so g.id is just the gallery slug.
  for (const g of galleries) {
    const slug = g.id;
    const galleryHref = `/${section}/gallery/${slug}/`;
    const galleryTags = normalizeTags(g.data.tags);
    const cover: ImageMetadata | undefined = g.data.cover ?? g.data.images?.[0]?.file;

    const galleryEntry: TagEntry = {
      type: 'gallery',
      slug,
      title: g.data.title,
      date: g.data.date,
      description: g.data.description,
      thumbnail: cover,
      href: galleryHref,
    };
    for (const t of galleryTags) push(t, galleryEntry);

    // Images — additive: union of gallery + image tags
    g.data.images.forEach((img: any, idx: number) => {
      const imgTags = normalizeTags(img.tags);
      const union = Array.from(new Set([...galleryTags, ...imgTags]));
      const imageEntry: TagEntry = {
        type: 'image',
        gallerySlug: slug,
        title: g.data.title,
        date: g.data.date,
        thumbnail: img.file,
        caption: img.caption,
        href: `${galleryHref}#img-${idx + 1}`,
      };
      for (const t of union) push(t, imageEntry);
    });
  }

  // De-dupe entries within each tag bucket (a gallery can pick up the same tag
  // from gallery-level + every image; show it once).
  const dedupedMap = new Map<string, TagEntry[]>();
  for (const [tag, entries] of map.entries()) {
    const seen = new Set<string>();
    const unique: TagEntry[] = [];
    for (const e of entries) {
      const key =
        e.type === 'image'
          ? `image:${e.gallerySlug}:${e.href}`
          : `${e.type}:${e.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(e);
      }
    }
    // newest-first within a tag
    unique.sort((a, b) => b.date.valueOf() - a.date.valueOf());
    dedupedMap.set(tag, unique);
  }

  return dedupedMap;
}

export function sortedTagSummary(map: Map<string, TagEntry[]>) {
  return Array.from(map.entries())
    .map(([tag, entries]) => ({ tag, count: entries.length }))
    .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag));
}

/** Return all tag strings for `getStaticPaths`. */
export async function listTagSlugs(section: Section): Promise<string[]> {
  const map = await getTagsForSection(section);
  return Array.from(map.keys());
}
