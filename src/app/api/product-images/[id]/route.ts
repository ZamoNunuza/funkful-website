import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PREVIEWS_BUCKET = "product-previews";
const LEGACY_BUCKET = "product-images";

function getContentType(
  blob: Blob,
  path?: string | null,
): string {
  const blobType = blob.type?.trim();

  if (blobType && blobType !== "application/octet-stream") {
    return blobType;
  }

  const extension = path
    ?.split(".")
    .pop()
    ?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";

    case "png":
      return "image/png";

    case "webp":
      return "image/webp";

    case "gif":
      return "image/gif";

    case "avif":
      return "image/avif";

    default:
      return "application/octet-stream";
  }
}

function getExtension(
  contentType: string,
  path?: string | null,
): string {
  const pathExtension = path
    ?.split(".")
    .pop()
    ?.toLowerCase();

  if (
    pathExtension &&
    ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(
      pathExtension,
    )
  ) {
    return pathExtension;
  }

  switch (contentType) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "image/gif":
      return "gif";

    case "image/avif":
      return "avif";

    case "image/jpeg":
    default:
      return "jpg";
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return new NextResponse("Image ID is required.", {
        status: 400,
      });
    }

    const admin = createAdminClient();

    const { data: image, error: imageError } = await admin
      .from("product_images")
      .select(
        "id,image_url,alt_text,preview_path,original_path,protection_status",
      )
      .eq("id", id)
      .maybeSingle();

    if (imageError) {
      console.error("Product image lookup failed:", {
        imageId: id,
        error: imageError,
      });

      return new NextResponse("Could not load image.", {
        status: 500,
      });
    }

    if (!image) {
      return new NextResponse("Image not found.", {
        status: 404,
      });
    }

    // -----------------------------------------------------------------------
    // Protected preview
    // -----------------------------------------------------------------------

    if (image.preview_path) {
      const { data: preview, error: previewError } =
        await admin.storage
          .from(PREVIEWS_BUCKET)
          .download(image.preview_path);

      if (previewError) {
        console.error("Preview download failed:", {
          imageId: id,
          previewPath: image.preview_path,
          error: previewError,
        });

        return new NextResponse("Image preview not found.", {
          status: 404,
        });
      }

      if (!preview) {
        return new NextResponse("Image preview is empty.", {
          status: 404,
        });
      }

      const contentType = getContentType(
        preview,
        image.preview_path,
      );

      const extension = getExtension(
        contentType,
        image.preview_path,
      );

      console.log("Serving protected product preview:", {
        imageId: id,
        previewPath: image.preview_path,
        contentType,
        size: preview.size,
      });

      return new NextResponse(preview, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(preview.size),
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": `inline; filename="${id}.${extension}"`,
        },
      });
    }

    // -----------------------------------------------------------------------
    // Legacy public image
    // -----------------------------------------------------------------------

    if (image.image_url) {
      const marker =
        `/storage/v1/object/public/${LEGACY_BUCKET}/`;

      const markerIndex = image.image_url.indexOf(marker);

      if (markerIndex >= 0) {
        const legacyPath = decodeURIComponent(
          image.image_url.slice(
            markerIndex + marker.length,
          ),
        );

        const {
          data: legacyImage,
          error: legacyError,
        } = await admin.storage
          .from(LEGACY_BUCKET)
          .download(legacyPath);

        if (legacyError) {
          console.error("Legacy image download failed:", {
            imageId: id,
            legacyPath,
            error: legacyError,
          });
        }

        if (!legacyError && legacyImage) {
          const contentType = getContentType(
            legacyImage,
            legacyPath,
          );

          const extension = getExtension(
            contentType,
            legacyPath,
          );

          console.log("Serving legacy product image:", {
            imageId: id,
            legacyPath,
            contentType,
            size: legacyImage.size,
          });

          return new NextResponse(legacyImage, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(legacyImage.size),
              "Cache-Control": "private, max-age=3600",
              "Content-Disposition": `inline; filename="${id}.${extension}"`,
            },
          });
        }
      }
    }

    return new NextResponse(
      "No image preview is available.",
      {
        status: 404,
      },
    );
  } catch (error) {
    console.error("Product image GET failed:", error);

    return new NextResponse(
      "Could not load image.",
      {
        status: 500,
      },
    );
  }
}