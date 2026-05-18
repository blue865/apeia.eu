/**
 * Collect every image tagged `home-page` across both gallery collections,
 * optimise it for use as a full-bleed page background, and return the URLs
 * along with an image-derived accent pair (astro + shards).
 *
 * Tag matching follows the same additive rule as the rest of the site:
 * gallery-level tags are inherited by every image; image-level tags are unioned
 * on top. So tagging an image *or* a whole gallery as `home-page` qualifies.
 */

import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import { normalizeTags } from './tags.ts';
import {
  getAccentsForImage,
  resolveImageFsPathByIndex,
  DEFAULT_ACCENTS,
  type AccentPair,
} from './imageAccents.ts';

export const HOME_BG_TAG = 'home-page';

export type HomeBackground = {
  src: string;
  width: number;
  height: number;
  alt: string;
  accents: AccentPair;
};

export async function getHomeBackgrounds(): Promise<HomeBackground[]> {
  const out: HomeBackground[] = [];

  for (const colName of ['astro-gallery', 'shards-gallery'] as const) {
    const galleries = await getCollection(colName, ({ data }: any) => !data.draft);
    for (const g of galleries) {
      const galleryTags = normalizeTags(g.data.tags);
      const inheritedHasTag = galleryTags.includes(HOME_BG_TAG);

      for (let i = 0; i < g.data.images.length; i++) {
        const img = g.data.images[i];
        const imgTags = normalizeTags(img.tags);
        const matches = inheritedHasTag || imgTags.includes(HOME_BG_TAG);
        if (!matches) continue;

        // Optimised webp at high quality so dark astro gradients don't band.
        const optimised = await getImage({
          src: img.file,
          width: 2400,
          format: 'webp',
          quality: 90,
        });

        // Image-derived accents — resolved off the original source bytes.
        // If the file path isn't resolvable for any reason, fall back to the
        // site defaults so the page still has its accents.
        const fsPath = resolveImageFsPathByIndex(colName, g.id, i);
        const accents = fsPath
          ? await getAccentsForImage(fsPath)
          : { ...DEFAULT_ACCENTS };

        out.push({
          src: optimised.src,
          width: optimised.attributes.width ?? img.file.width,
          height: optimised.attributes.height ?? img.file.height,
          alt: img.alt ?? img.caption ?? g.data.title,
          accents,
        });
      }
    }
  }

  return out;
}
