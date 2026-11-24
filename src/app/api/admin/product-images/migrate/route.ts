
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createWatermarkedPreview,
  createWatermarkedThumbnail,
} from "@/lib/product-images/watermark";
import { getProductThumbnailPath } from "@/lib/product-images/paths";

const LEGACY_BUCKET = "product-images";
const ORIGINALS_BUCKET = "product-originals";
const PREVIEWS_BUCKET = "product-previews";

export async function POST() {
  try {
    await requireAdmin("/admin/products/images");

    const admin = createAdminClient();

    const { data: images, error } = await admin
      .from("product_images")
      .select("id,product_id,image_url,protection_status")
      .or("protection_status.is.null,protection_status.neq.protected")
      .order("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let migrated = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const image of images ?? []) {
      let originalPath: string | null = null;
      let previewPath: string | null = null;
      let thumbnailPath: string | null = null;
      let migrationCommitted = false;

      try {
        const marker = `/storage/v1/object/public/${LEGACY_BUCKET}/`;
        const markerIndex = image.image_url.indexOf(marker);

        if (markerIndex < 0) {
          throw new Error("Image does not point to the legacy public bucket.");
        }

        const legacyPath = decodeURIComponent(
          image.image_url.slice(markerIndex + marker.length),
        );

        const response = await fetch(image.image_url, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Could not fetch legacy image (${response.status}).`,
          );
        }

        const bytes = Buffer.from(await response.arrayBuffer());

        const sourceName = decodeURIComponent(
          legacyPath.split("/").pop() || `image-${image.id}.jpg`,
        ).replace(/[^a-zA-Z0-9._-]+/g, "-");

        originalPath = `products/${image.product_id}/${image.id}-${sourceName}`;

        previewPath = `products/${image.product_id}/${image.id}-${sourceName.replace(
          /\.(jpe?g|png|webp)$/i,
          ".webp",
        )}`;

        thumbnailPath = getProductThumbnailPath(previewPath);

        const [previewBytes, thumbnailBytes] = await Promise.all([
          createWatermarkedPreview(bytes),
          createWatermarkedThumbnail(bytes),
        ]);

        const originalUpload = await admin.storage
          .from(ORIGINALS_BUCKET)
          .upload(originalPath, bytes, {
            contentType:
              response.headers.get("content-type") || "image/jpeg",
            cacheControl: "31536000",
            upsert: true,
          });

        if (originalUpload.error) {
          throw originalUpload.error;
        }

        const previewUpload = await admin.storage
          .from(PREVIEWS_BUCKET)
          .upload(previewPath, previewBytes, {
            contentType: "image/webp",
            cacheControl: "3600",
            upsert: true,
          });

        if (previewUpload.error) {
          throw previewUpload.error;
        }

        const thumbnailUpload = await admin.storage
          .from(PREVIEWS_BUCKET)
          .upload(thumbnailPath, thumbnailBytes, {
            contentType: "image/webp",
            cacheControl: "3600",
            upsert: true,
          });

        if (thumbnailUpload.error) {
          throw thumbnailUpload.error;
        }

        const updated = await admin
          .from("product_images")
          .update({
            image_url: `/api/product-images/${image.id}`,
            original_path: originalPath,
            preview_path: previewPath,
            protection_status: "protected",
          })
          .eq("id", image.id);

        if (updated.error) {
          throw updated.error;
        }

        migrationCommitted = true;

        await admin.storage
          .from(LEGACY_BUCKET)
          .remove([legacyPath]);

        migrated++;
      } catch (migrationError) {
        if (!migrationCommitted) {
          const cleanupTasks = [];

          if (originalPath) {
            cleanupTasks.push(
              admin.storage
                .from(ORIGINALS_BUCKET)
                .remove([originalPath]),
            );
          }

          const previewFiles = [previewPath, thumbnailPath].filter(
            (path): path is string => Boolean(path),
          );

          if (previewFiles.length > 0) {
            cleanupTasks.push(
              admin.storage
                .from(PREVIEWS_BUCKET)
                .remove(previewFiles),
            );
          }

          await Promise.all(cleanupTasks);
        }

        failed++;

        failures.push(
          `${image.id}: ${
            migrationError instanceof Error
              ? migrationError.message
              : "Unknown error"
          }`,
        );
      }
    }

    if (failed === 0) {
      const { error: bucketError } = await admin.storage.updateBucket(
        LEGACY_BUCKET,
        { public: false },
      );

      if (bucketError) {
        return NextResponse.json(
          {
            total: images?.length ?? 0,
            migrated,
            failed,
            failures,
            warning: bucketError.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      total: images?.length ?? 0,
      migrated,
      failed,
      failures,
      legacyBucketPrivate: failed === 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Migration failed.",
      },
      { status: 500 },
    );
  }
}
