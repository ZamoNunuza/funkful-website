import sharp from "sharp";

export const IMAGE_UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxPixels: 40_000_000,
  allowedTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
} as const;

export async function optimizeImageToWebp(input: Buffer, options: { width: number; height: number; quality?: number; fit?: "inside" | "cover" }) {
  const metadata = await sharp(input, { failOn: "error", limitInputPixels: IMAGE_UPLOAD_LIMITS.maxPixels }).metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new Error("Only JPG, PNG, and WebP images are supported.");
  }
  return sharp(input, { failOn: "error", limitInputPixels: IMAGE_UPLOAD_LIMITS.maxPixels })
    .rotate()
    .resize({ width: options.width, height: options.height, fit: options.fit ?? "inside", withoutEnlargement: true })
    .webp({ quality: options.quality ?? 84, effort: 4 })
    .toBuffer();
}

export function assertImageUpload(type: string, size: number) {
  if (!IMAGE_UPLOAD_LIMITS.allowedTypes.has(type)) throw new Error("Only JPG, PNG, and WebP images are supported.");
  if (size <= 0 || size > IMAGE_UPLOAD_LIMITS.maxBytes) throw new Error("Images must be 10 MB or smaller.");
}
