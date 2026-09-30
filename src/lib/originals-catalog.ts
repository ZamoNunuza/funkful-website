export const ORIGINAL_IMAGE_ROOT = "/assets/originals";

/**
 * Recommended image naming convention:
 *   public/assets/originals/<product-slug>-01.webp
 *   public/assets/originals/<product-slug>-02.webp
 *
 * Supabase product_images.image_url should contain the final public URL/path.
 * The product ID/slug is deliberately stable so an image can always be linked
 * to exactly one product without relying on display names.
 */
export function originalImagePath(slug: string, position = 1) {
  return `${ORIGINAL_IMAGE_ROOT}/${slug}-${String(position).padStart(2, "0")}.webp`;
}
