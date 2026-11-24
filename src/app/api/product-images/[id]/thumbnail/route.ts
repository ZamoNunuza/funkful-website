
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductThumbnailPath } from "@/lib/product-images/paths";

const PREVIEWS_BUCKET = "product-previews";

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
      .select("id,preview_path")
      .eq("id", id)
      .maybeSingle();

    if (imageError) {
      return new NextResponse("Could not load image.", {
        status: 500,
      });
    }

    if (!image?.preview_path) {
      return new NextResponse("Image thumbnail not found.", {
        status: 404,
      });
    }

    const thumbnailPath = getProductThumbnailPath(image.preview_path);

    const { data: thumbnail, error: thumbnailError } = await admin.storage
      .from(PREVIEWS_BUCKET)
      .download(thumbnailPath);

    if (thumbnailError || !thumbnail) {
      return new NextResponse("Image thumbnail not found.", {
        status: 404,
      });
    }

    return new NextResponse(thumbnail, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(thumbnail.size),
        "Cache-Control":
          "public, max-age=86400, s-maxage=31536000, immutable",
        "Content-Disposition": `inline; filename="${id}-thumb.webp"`,
      },
    });
  } catch (error) {
    console.error("Product thumbnail delivery failed:", error);

    return new NextResponse("Could not load image thumbnail.", {
      status: 500,
    });
  }
}
