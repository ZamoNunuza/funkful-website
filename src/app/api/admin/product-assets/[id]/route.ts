import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("/admin/products");
  const { id } = await params;
  const admin = createAdminClient();
  const { data: asset, error } = await admin.from("product_assets").select("storage_path,filename,mime_type,is_downloadable").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!asset || !asset.is_downloadable) return NextResponse.json({ error: "Asset is not available for download." }, { status: 404 });
  const { data, error: signedError } = await admin.storage.from("product-originals").createSignedUrl(asset.storage_path, 60);
  if (signedError || !data?.signedUrl) return NextResponse.json({ error: signedError?.message ?? "Could not create download link." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, 302);
}
