/** Browser-side image derivatives shared by admin image-upload surfaces. */
export type BrowserImageProfile = "display" | "thumbnail";

const PROFILES: Record<BrowserImageProfile, { maxEdge: number; quality: number; square: boolean }> = {
  display: { maxEdge: 1400, quality: 0.84, square: false },
  thumbnail: { maxEdge: 360, quality: 0.8, square: true },
};

export async function createOptimizedWebp(file: File, profile: BrowserImageProfile): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  const settings = PROFILES[profile];
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(file);
  }

  try {
    let sx = 0;
    let sy = 0;
    let sw = bitmap.width;
    let sh = bitmap.height;
    if (settings.square) {
      const side = Math.min(sw, sh);
      sx = Math.round((sw - side) / 2);
      sy = Math.round((sh - side) / 2);
      sw = side;
      sh = side;
    }
    const scale = Math.min(1, settings.maxEdge / Math.max(sw, sh));
    const width = Math.max(1, Math.round(sw * scale));
    const height = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser can't process images.");
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
    const result = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not optimize this image.")), "image/webp", settings.quality),
    );
    if (result.type !== "image/webp") throw new Error("This browser cannot create optimized WebP images. Please use a current version of Chrome, Safari, or Firefox.");
    return result;
  } finally {
    bitmap.close();
  }
}

export function getSafeImageExtension(type: string): string | null {
  switch (type) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    default: return null;
  }
}
