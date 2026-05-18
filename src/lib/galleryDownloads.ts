/**
 * Per-image download options for galleries — now powered by the permalink
 * registry in `imagePermalinks.ts`.
 *
 * URLs are stable: `/astro/gallery/{slug}/{image-slug}/{image-slug}-{variant}.{ext}`.
 * The actual bytes are served by the static endpoint at the same path
 * (`src/pages/{section}/gallery/[slug]/[image]/[file].ts`). No `getImage()`
 * here, no `/_astro/`-hashed URLs in the download menu — the URLs you ship
 * today survive future builds even if image transformation parameters change.
 */

import {
  findByIndex,
  variantUrl,
  variantDownloadName,
  variantLabel,
  variantWidth,
  variantsForWidth,
  type Variant,
} from './imagePermalinks.ts';

export type DownloadOption = {
  label: string;       // user-facing label, e.g. "Original · 4096 × 2731 px"
  width: number;       // output width (source width for 'original')
  url: string;         // permalink href
  filename: string;    // value for the <a download="..."> attribute
  isOriginal: boolean;
};

export type GalleryCollection = 'astro-gallery' | 'shards-gallery';

export async function buildDownloadOptions(args: {
  imageMeta: ImageMetadata;
  collection: GalleryCollection;
  gallerySlug: string;
  /** Index into the gallery's `images` list. */
  imageIndex: number;
}): Promise<DownloadOption[]> {
  const { imageMeta, collection, gallerySlug, imageIndex } = args;
  const section = collection === 'astro-gallery' ? 'astro' : 'shards';
  const permalink = findByIndex(section, gallerySlug, imageIndex);
  if (!permalink) return [];

  const variants = variantsForWidth(imageMeta.width);
  const out: DownloadOption[] = variants.map((v: Variant) => {
    const isOriginal = v === 'original';
    const width = isOriginal ? imageMeta.width : (variantWidth(v) ?? 0);
    const label = isOriginal
      ? `Original · ${imageMeta.width} × ${imageMeta.height} px`
      : variantLabel(v);
    return {
      label,
      width,
      url: variantUrl(permalink, v),
      filename: variantDownloadName(permalink, v),
      isOriginal,
    };
  });

  // Original first, then largest → smallest.
  out.sort((a, b) => (a.isOriginal ? -1 : b.isOriginal ? 1 : b.width - a.width));
  return out;
}
