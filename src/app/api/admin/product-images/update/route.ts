import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    await requireAdmin("/admin/products/images");
    const body = (await request.json()) as { id?: string; altText?: string };
    if (!body.id) return NextResponse.json({ error: "Image ID is required." }, { status: 400 });
    const admin = createAdminClient();
    const { error } = await admin.from("product_images").update({ alt_text: String(body.altText || "").trim() || null }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product image update failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed." }, { status: 500 });
  }
}
