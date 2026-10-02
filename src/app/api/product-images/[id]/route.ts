import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PREVIEWS_BUCKET = "product-previews";
const LEGACY_BUCKET = "product-images";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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
        "id,image_url,alt_text,preview_path,original_path,protection_status"
      )
      .eq("id", id)
      .maybeSingle();

    if (imageError) {
      console.error("Product image lookup failed:", imageError);

      return new NextResponse("Could not load image.", {
        status: 500,
      });
    }

    if (!image) {
      return new NextResponse("Image not found.", {
        status: 404,
      });
    }

    /*
     * New protected images:
     * Serve ONLY the watermarked preview.
     */
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

      return new NextResponse(preview, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": `inline; filename="${id}.webp"`,
        },
      });
    }

    /*
     * Legacy images:
     *
     * Existing records may still have image_url pointing
     * directly to the old public product-images bucket.
     */
    if (image.image_url) {
      const marker =
        `/storage/v1/object/public/${LEGACY_BUCKET}/`;

      const markerIndex = image.image_url.indexOf(marker);

      if (markerIndex >= 0) {
        const legacyPath = decodeURIComponent(
          image.image_url.slice(
            markerIndex + marker.length
          )
        );

        const {
          data: legacyImage,
          error: legacyError,
        } = await admin.storage
          .from(LEGACY_BUCKET)
          .download(legacyPath);

        if (!legacyError && legacyImage) {
          const extension =
            legacyPath
              .split(".")
              .pop()
              ?.toLowerCase();

          const contentType =
            extension === "png"
              ? "image/png"
              : extension === "webp"
                ? "image/webp"
                : "image/jpeg";

          return new NextResponse(legacyImage, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control":
                "private, max-age=3600",
              "Content-Disposition": `inline; filename="${id}.${extension || "jpg"}"`,
            },
          });
        }
      }
    }

    return new NextResponse(
      "No image preview is available.",
      {
        status: 404,
      }
    );
  } catch (error) {
    console.error("Product image GET failed:", error);

    return new NextResponse("Could not load image.", {
      status: 500,
    });
  }
}