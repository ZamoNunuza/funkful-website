import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProduct } from "@/lib/products";

export const runtime = "nodejs";

const MAX_WISHLIST_ITEMS = 200;
const PRODUCT_ID_RE = /^[a-z0-9][a-z0-9._-]{0,119}$/i;

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const unauthorised = () => NextResponse.json({ error: "Sign in to use your wishlist." }, { status: 401 });

/** A product is real if it's in the in-code catalogue or an active row in `products`. */
async function productExists(productId: string) {
  if (getProduct(productId)) return true;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("products").select("id").eq("id", productId).eq("is_active", true).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorised();

  const { data, error } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Wishlist GET failed:", error);
    return NextResponse.json({ error: "Could not load your wishlist." }, { status: 500 });
  }
  return NextResponse.json({ ids: (data ?? []).map((row) => row.product_id) });
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorised();

  let productId = "";
  try {
    const body = await req.json();
    productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!PRODUCT_ID_RE.test(productId)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }
  if (!(await productExists(productId))) {
    return NextResponse.json({ error: "That product isn't available." }, { status: 404 });
  }

  const { count } = await supabase
    .from("wishlist_items")
    .select("product_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= MAX_WISHLIST_ITEMS) {
    return NextResponse.json({ error: "Your wishlist is full." }, { status: 400 });
  }

  // Upsert so saving the same product twice is harmless.
  const { error } = await supabase
    .from("wishlist_items")
    .upsert({ user_id: user.id, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });

  if (error) {
    console.error("Wishlist POST failed:", error);
    return NextResponse.json({ error: "Could not save that item." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorised();

  const productId = req.nextUrl.searchParams.get("productId")?.trim() ?? "";
  if (!PRODUCT_ID_RE.test(productId)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }

  const { error } = await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", productId);
  if (error) {
    console.error("Wishlist DELETE failed:", error);
    return NextResponse.json({ error: "Could not remove that item." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
