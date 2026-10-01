import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    await requireAdmin("/admin/products/images");
    const body = (await request.json()) as { productId?: string; imageIds?: string[]; primaryId?: string };
    if (!body.productId || !Array.isArray(body.imageIds) || !body.imageIds.length) {
      return NextResponse.json({ error: "Invalid image ordering." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: images, error } = await admin
      .from("product_images")
      .select("id")
      .eq("product_id", body.productId)
      .in("id", body.imageIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if ((images ?? []).length !== body.imageIds.length) {
      return NextResponse.json({ error: "One or more images do not belong to this product." }, { status: 400 });
    }

    // Clear the primary flag first so the unique partial index cannot be violated.
    await admin.from("product_images").update({ is_primary: false }).eq("product_id", body.productId);

    for (const [index, id] of body.imageIds.entries()) {
      const { error: updateError } = await admin
        .from("product_images")
        .update({ sort_order: index, is_primary: id === body.primaryId })
        .eq("id", id)
        .eq("product_id", body.productId);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product image reorder failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reorder images." }, { status: 500 });
  }
}
