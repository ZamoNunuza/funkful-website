
export function getProductThumbnailPath(previewPath: string): string {
  if (!/\.webp$/i.test(previewPath)) {
    throw new Error("Protected preview path must use the WebP format.");
  }

  return previewPath.replace(/\.webp$/i, "-thumb.webp");
}

export function getProductThumbnailUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  const match = imageUrl.match(/^\/api\/product-images\/([^/?#]+)\/?$/);

  if (!match) return imageUrl;

  return `/api/product-images/${match[1]}/thumbnail`;
}
