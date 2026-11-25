// Shared image paths for inventory originals and optimized WebP derivatives.
// Legacy keys continue resolving to their existing JPEG objects.
export const INVENTORY_BUCKET = "inventory-images";

export function imagePaths(key: string) {
  const isOptimized = key.split("/").pop()?.startsWith("v2-") ?? false;
  return isOptimized
    ? {
        original: `${key}-original`,
        full: `${key}-full.webp`,
        thumb: `${key}-thumb.webp`,
      }
    : {
        original: "",
        full: `${key}-full.jpg`,
        thumb: `${key}-thumb.jpg`,
      };
}

/** Routine UI always uses a derivative, never the preserved source upload. */
export function materialImageUrl(
  key: string | null | undefined,
  size: "thumb" | "full",
): string | null {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${INVENTORY_BUCKET}/${imagePaths(key)[size]}`;
}
