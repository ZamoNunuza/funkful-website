import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = request.headers.get("origin");
    if (!siteUrl || !origin || new URL(origin).origin !== new URL(siteUrl).origin) {
      return NextResponse.json({ error: "Invalid upload request." }, { status: 403 });
    }
    const body = await request.json() as { productId?: unknown; contentType?: unknown; size?: unknown };
    const productId = typeof body.productId === "string" ? body.productId : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = Number(body.size);
    if (!TYPES[contentType] || !Number.isInteger(size) || size < 1 || size > MAX_BYTES) {
      return NextResponse.json({ error: "Choose a JPG, PNG or WebP image up to 8 MB." }, { status: 400 });
    }

    if (!productId) return NextResponse.json({ error: "Select a valid personalised product." }, { status: 400 });
    const admin = createAdminClient();
    const { data: product } = await admin.from("products").select("id,product_type,allow_personalization,is_active").eq("id", productId).maybeSingle();
    if (!product || !product.is_active || (product.product_type !== "personalize" && !product.allow_personalization)) {
      return NextResponse.json({ error: "This product does not accept custom reference images." }, { status: 400 });
    }
    const path = `pending/${crypto.randomUUID()}.${TYPES[contentType]}`;
    const { data, error } = await admin.storage.from("personalization-uploads").createSignedUploadUrl(path);
    if (error || !data) {
      console.error("Personalization upload URL error:", error);
      return NextResponse.json({ error: "We couldn't prepare the image upload. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ path, token: data.token, bucket: "personalization-uploads" });
  } catch (error) {
    console.error("Personalization upload preparation failed:", error);
    return NextResponse.json({ error: "We couldn't prepare the image upload. Please try again." }, { status: 500 });
  }
}
