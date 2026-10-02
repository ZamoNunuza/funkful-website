import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdmin("/admin/products");
    const form = await request.formData();
    const productId = String(form.get("productId") || "").trim();
    const file = form.get("file");
    const downloadable = String(form.get("downloadable") || "false") === "true";
    if (!productId) return NextResponse.json({ error: "Product is required." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "File is required." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Artwork must be 25 MB or smaller." }, { status: 400 });

    const admin = createAdminClient();
    const { data: product } = await admin.from("products").select("id").eq("id", productId).maybeSingle();
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
    const path = `artwork/${productId}/${crypto.randomUUID()}-${safeName}`;
    const upload = await admin.storage.from("product-originals").upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type || "application/octet-stream", cacheControl: "31536000", upsert: false });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });

    const { data: asset, error } = await admin.from("product_assets").insert({ product_id: productId, asset_type: "artwork", filename: file.name, storage_path: path, mime_type: file.type || null, byte_size: file.size, is_downloadable: downloadable }).select("*").single();
    if (error) { await admin.storage.from("product-originals").remove([path]); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}
