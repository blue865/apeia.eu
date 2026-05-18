/**
 * Per-image variant download endpoint.
 *
 * Statically generates the actual image bytes at the permalink URL
 *   /astro/gallery/{gallery-slug}/{image-slug}/{image-slug}-{variant}.{ext}
 *
 * So a visitor's `<a download>` link works as a normal direct download —
 * no redirects, no JS, the URL serves the file itself.
 *
 * - `original`: source bytes copied byte-for-byte.
 * - `4k / 2k / 800`: sharp re-encode at quality 95 in the source format.
 *   Variants whose width is >= source width are not generated.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {
  findByIndex,
  variantFile,
  variantsForWidth,
  variantWidth,
  contentTypeFor,
  sharpFormatFor,
  resolveFileRequest,
  type Variant,
} from '../../../../../lib/imagePermalinks.ts';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const galleries = await getCollection('astro-gallery', ({ data }: any) => !data.draft);
  const paths: any[] = [];
  for (const gallery of galleries) {
    for (let i = 0; i < gallery.data.images.length; i++) {
      const permalink = findByIndex('astro', gallery.id, i);
      if (!permalink) continue;
      const img = gallery.data.images[i];
      const variants = variantsForWidth(img.file.width);
      for (const variant of variants) {
        paths.push({
          params: {
            slug: gallery.id,
            image: permalink.imageSlug,
            file: variantFile(permalink, variant),
          },
        });
      }
    }
  }
  return paths;
};

export const GET: APIRoute = async ({ params }) => {
  const slug = String(params.slug ?? '');
  const image = String(params.image ?? '');
  const file = String(params.file ?? '');
  const resolved = resolveFileRequest('astro', slug, image, file);
  if (!resolved) return new Response('Not Found', { status: 404 });

  const { permalink, variant } = resolved;
  const contentType = contentTypeFor(permalink.originalFilename);

  let bytes: Buffer;
  if (variant === 'original') {
    bytes = await fs.readFile(permalink.fsPath);
  } else {
    const width = variantWidth(variant);
    const fmt = sharpFormatFor(permalink.originalFilename);
    if (!width || !fmt) return new Response('Bad variant', { status: 400 });
    bytes = await sharp(permalink.fsPath)
      .resize(width, null, { fit: 'inside', withoutEnlargement: true })
      .toFormat(fmt, { quality: 95 })
      .toBuffer();
  }

  return new Response(bytes, { headers: { 'Content-Type': contentType } });
};
