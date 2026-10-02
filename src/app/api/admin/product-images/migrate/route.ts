import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWatermarkedPreview } from "@/lib/product-images/watermark";

const LEGACY_BUCKET = "product-images";
const ORIGINALS_BUCKET = "product-originals";
const PREVIEWS_BUCKET = "product-previews";

export async function POST() {
  try {
    await requireAdmin("/admin/products/images");
    const admin = createAdminClient();
    const { data: images, error } = await admin.from("product_images").select("id,product_id,image_url,protection_status").neq("protection_status", "protected").order("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let migrated = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const image of images ?? []) {
      try {
        const marker = `/storage/v1/object/public/${LEGACY_BUCKET}/`;
        const markerIndex = image.image_url.indexOf(marker);
        if (markerIndex < 0) throw new Error("Image does not point to the legacy public bucket.");
        const legacyPath = decodeURIComponent(image.image_url.slice(markerIndex + marker.length));
        const response = await fetch(image.image_url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not fetch legacy image (${response.status}).`);
        const bytes = Buffer.from(await response.arrayBuffer());
        const previewBytes = await createWatermarkedPreview(bytes);
        const sourceName = decodeURIComponent(legacyPath.split("/").pop() || `image-${image.id}.jpg`).replace(/[^a-zA-Z0-9._-]+/g, "-");
        const originalPath = `products/${image.product_id}/${image.id}-${sourceName}`;
        const previewPath = `products/${image.product_id}/${image.id}-${sourceName.replace(/\.(jpe?g|png|webp)$/i, ".webp")}`;

        const originalUpload = await admin.storage.from(ORIGINALS_BUCKET).upload(originalPath, bytes, { contentType: response.headers.get("content-type") || "image/jpeg", cacheControl: "31536000", upsert: true });
        if (originalUpload.error) throw originalUpload.error;
        const previewUpload = await admin.storage.from(PREVIEWS_BUCKET).upload(previewPath, previewBytes, { contentType: "image/webp", cacheControl: "3600", upsert: true });
        if (previewUpload.error) throw previewUpload.error;

        const updated = await admin.from("product_images").update({ image_url: `/api/product-images/${image.id}`, original_path: originalPath, preview_path: previewPath, protection_status: "protected" }).eq("id", image.id);
        if (updated.error) throw updated.error;
        await admin.storage.from(LEGACY_BUCKET).remove([legacyPath]);
        migrated++;
      } catch (migrationError) {
        failed++;
        failures.push(`${image.id}: ${migrationError instanceof Error ? migrationError.message : "Unknown error"}`);
      }
    }

    if (failed === 0) {
      const { error: bucketError } = await admin.storage.updateBucket(LEGACY_BUCKET, { public: false });
      if (bucketError) return NextResponse.json({ total: images?.length ?? 0, migrated, failed, failures, warning: bucketError.message }, { status: 500 });
    }

    return NextResponse.json({ total: images?.length ?? 0, migrated, failed, failures, legacyBucketPrivate: failed === 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Migration failed." }, { status: 500 });
  }
}
