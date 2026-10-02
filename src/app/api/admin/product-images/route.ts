import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWatermarkedPreview } from "@/lib/product-images/watermark";

const LEGACY_BUCKET = "product-images";
const ORIGINALS_BUCKET = "product-originals";
const PREVIEWS_BUCKET = "product-previews";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeFileName(name: string) {
  const ext = name.toLowerCase().endsWith(".png")
    ? ".png"
    : name.toLowerCase().endsWith(".webp")
      ? ".webp"
      : ".jpg";
  const base = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "image"}-${crypto.randomUUID()}${ext}`;
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin("/admin/products/images");
    const formData = await request.formData();
    const productId = String(formData.get("productId") || "");
    const altText = String(formData.get("altText") || "").trim();
    const file = formData.get("file");

    if (!productId) return jsonError("Select a product.");
    if (!(file instanceof File)) return jsonError("Choose an image file.");
    if (!ALLOWED_TYPES.has(file.type)) return jsonError("Only JPG, PNG, and WebP images are supported.");
    if (file.size > MAX_BYTES) return jsonError("Images must be 5 MB or smaller.");

    const admin = createAdminClient();
    const { data: product, error: productError } = await admin
      .from("products")
      .select("id,name,brand,slug")
      .eq("id", productId)
      .maybeSingle();

    if (productError) return jsonError(productError.message, 500);
    if (!product) return jsonError("Product not found.", 404);

    const { data: existing, error: existingError } = await admin
      .from("product_images")
      .select("id,sort_order,is_primary")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) return jsonError(existingError.message, 500);

    const sortOrder = existing ? existing.sort_order + 1 : 0;
    const isPrimary = !existing;
    const fileName = safeFileName(file.name);
    const originalPath = `products/${productId}/${String(sortOrder + 1).padStart(2, "0")}-${fileName}`;
    const previewPath = `products/${productId}/${String(sortOrder + 1).padStart(2, "0")}-${fileName.replace(/\.(jpe?g|png|webp)$/i, ".webp")}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const previewBytes = await createWatermarkedPreview(bytes);

    const { error: originalUploadError } = await admin.storage.from(ORIGINALS_BUCKET).upload(originalPath, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (originalUploadError) return jsonError(originalUploadError.message, 500);

    const { error: previewUploadError } = await admin.storage.from(PREVIEWS_BUCKET).upload(previewPath, previewBytes, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });
    if (previewUploadError) {
      await admin.storage.from(ORIGINALS_BUCKET).remove([originalPath]);
      return jsonError(previewUploadError.message, 500);
    }
    const { data: image, error: imageError } = await admin
      .from("product_images")
      .insert({
        product_id: productId,
        image_url: "",
        original_path: originalPath,
        preview_path: previewPath,
        protection_status: "protected",
        alt_text: altText || product.name,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select("id,product_id,image_url,alt_text,is_primary,sort_order,original_path,preview_path,protection_status")
      .single();

    if (imageError) {
      await admin.storage.from(ORIGINALS_BUCKET).remove([originalPath]);
      await admin.storage.from(PREVIEWS_BUCKET).remove([previewPath]);
      return jsonError(imageError.message, 500);
    }

    const { data: finalImage, error: urlUpdateError } = await admin
      .from("product_images")
      .update({ image_url: `/api/product-images/${image.id}` })
      .eq("id", image.id)
      .select("id,product_id,image_url,alt_text,is_primary,sort_order,original_path,preview_path,protection_status")
      .single();

    if (urlUpdateError || !finalImage) {
      await admin.storage.from(ORIGINALS_BUCKET).remove([originalPath]);
      await admin.storage.from(PREVIEWS_BUCKET).remove([previewPath]);
      await admin.from("product_images").delete().eq("id", image.id);
      return jsonError(urlUpdateError?.message ?? "Could not finalize protected image.", 500);
    }

    return NextResponse.json({ image: finalImage });
  } catch (error) {
    console.error("Product image upload failed:", error);
    return jsonError(error instanceof Error ? error.message : "Upload failed.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin("/admin/products/images");
    const body = (await request.json()) as { id?: string; imageUrl?: string };
    if (!body.id) return jsonError("Image ID is required.");

    const admin = createAdminClient();
    const { data: image, error: imageError } = await admin
      .from("product_images")
      .select("id,product_id,image_url,is_primary,original_path,preview_path")
      .eq("id", body.id)
      .maybeSingle();

    if (imageError) return jsonError(imageError.message, 500);
    if (!image) return jsonError("Image not found.", 404);

    const protectedPaths = [image.original_path, image.preview_path].filter((value): value is string => Boolean(value));
    if (image.original_path) await admin.storage.from(ORIGINALS_BUCKET).remove([image.original_path]);
    if (image.preview_path) await admin.storage.from(PREVIEWS_BUCKET).remove([image.preview_path]);

    // Legacy public objects are removed only when the stored URL belongs to our old bucket.
    const marker = `/storage/v1/object/public/${LEGACY_BUCKET}/`;
    const markerIndex = image.image_url.indexOf(marker);
    if (markerIndex >= 0) {
      const legacyPath = decodeURIComponent(image.image_url.slice(markerIndex + marker.length));
      await admin.storage.from(LEGACY_BUCKET).remove([legacyPath]);
    }

    void protectedPaths;

    const { error: deleteError } = await admin.from("product_images").delete().eq("id", image.id);
    if (deleteError) return jsonError(deleteError.message, 500);

    if (image.is_primary) {
      const { data: replacement } = await admin
        .from("product_images")
        .select("id")
        .eq("product_id", image.product_id)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (replacement) {
        await admin.from("product_images").update({ is_primary: true }).eq("id", replacement.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product image delete failed:", error);
    return jsonError(error instanceof Error ? error.message : "Delete failed.", 500);
  }
}
