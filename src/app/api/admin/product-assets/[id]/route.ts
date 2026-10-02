import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin("/admin/products");

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Asset ID is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: asset, error } = await admin
      .from("product_assets")
      .select(
        "storage_path,filename,mime_type,is_downloadable"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Product asset lookup failed:", error);

      return NextResponse.json(
        { error: "Could not load product asset." },
        { status: 500 }
      );
    }

    if (!asset) {
      return NextResponse.json(
        { error: "Product asset not found." },
        { status: 404 }
      );
    }

    if (!asset.is_downloadable) {
      return NextResponse.json(
        { error: "Asset is not available for download." },
        { status: 403 }
      );
    }

    const { data, error: signedError } = await admin.storage
      .from("product-originals")
      .createSignedUrl(asset.storage_path, 60);

    if (signedError || !data?.signedUrl) {
      console.error("Signed asset URL creation failed:", signedError);

      return NextResponse.json(
        {
          error:
            signedError?.message ??
            "Could not create download link.",
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(data.signedUrl, 302);
  } catch (error) {
    console.error("Product asset download failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Download failed.",
      },
      { status: 500 }
    );
  }
}