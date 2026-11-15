// src/lib/inventory/inventory-images.ts
//
// Pure helpers for material photos (safe to import from server and client code).
// A material stores one `image_key`; the two files live at <key>-full.jpg and
// <key>-thumb.jpg in the public "inventory-images" bucket.

export const INVENTORY_BUCKET = "inventory-images";

export function imagePaths(key: string) {
  return { full: `${key}-full.jpg`, thumb: `${key}-thumb.jpg` };
}

/** Direct CDN URL. No network call, no signing, and it never touches the Next.js image optimiser. */
export function materialImageUrl(key: string | null | undefined, size: "thumb" | "full"): string | null {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${INVENTORY_BUCKET}/${imagePaths(key)[size]}`;
}
