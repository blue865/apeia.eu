/**
 * Collect every image tagged `home-page` across both gallery collections,
 * optimise it for use as a full-bleed page background, and return the URLs.
 *
 * Tag matching follows the same additive rule as the rest of the site:
 * gallery-level tags are inherited by every image; image-level tags are unioned
 * on top. So tagging an image *or* a whole gallery as `home-page` qualifies.
 */

import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import { normalizeTags } from './tags.ts';

export const HOME_BG_TAG = 'home-page';

export type HomeBackground = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export async function getHomeBackgrounds(): Promise<HomeBackground[]> {
  const out: HomeBackground[] = [];

  for (const colName of ['astro-gallery', 'shards-gallery'] as const) {
    const galleries = await getCollection(colName, ({ data }: any) => !data.draft);
    for (const g of galleries) {
      const galleryTags = normalizeTags(g.data.tags);
      const inheritedHasTag = galleryTags.includes(HOME_BG_TAG);

      for (const img of g.data.images) {
        const imgTags = normalizeTags(img.tags);
        const matches = inheritedHasTag || imgTags.includes(HOME_BG_TAG);
        if (!matches) continue;

        // Two widths so a smaller display doesn't pull a 4K asset.
        // We pick the wider one for backgrounds; mobile is fine downscaling it.
        const optimised = await getImage({
          src: img.file,
          width: 2400,
          format: 'webp',
          quality: 75,
        });

        out.push({
          src: optimised.src,
          width: optimised.attributes.width ?? img.file.width,
          height: optimised.attributes.height ?? img.file.height,
          alt: img.alt ?? img.caption ?? g.data.title,
        });
      }
    }
  }

  return out;
}
