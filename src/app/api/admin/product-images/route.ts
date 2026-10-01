import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";
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
    const objectPath = `originals/${productId}/${String(sortOrder + 1).padStart(2, "0")}-${safeFileName(file.name)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(objectPath, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

    if (uploadError) return jsonError(uploadError.message, 500);

    const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
    const { data: image, error: imageError } = await admin
      .from("product_images")
      .insert({
        product_id: productId,
        image_url: publicUrl.publicUrl,
        alt_text: altText || product.name,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select("id,product_id,image_url,alt_text,is_primary,sort_order")
      .single();

    if (imageError) {
      await admin.storage.from(BUCKET).remove([objectPath]);
      return jsonError(imageError.message, 500);
    }

    return NextResponse.json({ image });
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
      .select("id,product_id,image_url,is_primary")
      .eq("id", body.id)
      .maybeSingle();

    if (imageError) return jsonError(imageError.message, 500);
    if (!image) return jsonError("Image not found.", 404);

    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const markerIndex = image.image_url.indexOf(marker);
    if (markerIndex >= 0) {
      const objectPath = decodeURIComponent(image.image_url.slice(markerIndex + marker.length));
      const { error: storageError } = await admin.storage.from(BUCKET).remove([objectPath]);
      if (storageError) console.warn("Storage object removal failed:", storageError.message);
    }

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
