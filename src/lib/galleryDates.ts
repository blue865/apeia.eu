/**
 * Gallery "activity" dating.
 *
 * Galleries are ordered by their newest picture, not just their creation
 * date: each image may carry an optional `added` date in meta.yaml, and a
 * gallery's activity date is the newest `added` across its images, falling
 * back to the gallery's own `date` (which also stands in for any image
 * without `added`). Adding a fresh picture with `added: <today>` therefore
 * elevates the whole gallery to the top of every gallery list.
 */

type GalleryLike = {
  data: {
    date: Date;
    images?: { added?: Date }[];
  };
};

/** Newest of: gallery `date`, every image's optional `added`. */
export function galleryActivityDate(entry: GalleryLike): Date {
  let latest = entry.data.date.valueOf();
  for (const img of entry.data.images ?? []) {
    const t = img.added?.valueOf();
    if (t !== undefined && t > latest) latest = t;
  }
  return new Date(latest);
}

/** Comparator: most recently active gallery first. */
export function byActivityDesc(a: GalleryLike, b: GalleryLike): number {
  return galleryActivityDate(b).valueOf() - galleryActivityDate(a).valueOf();
}
