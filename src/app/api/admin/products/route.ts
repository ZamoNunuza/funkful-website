import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

type VariantInput = {
  id?: string;
  group_name: string;
  option_name: string;
  price_delta_cents: number;
  stock_quantity: number;
  sku?: string | null;
  is_active: boolean;
  sort_order: number;
};

type ProductInput = {
  id?: string;
  brand: string;
  category: string;
  product_type: string;
  name: string;
  slug: string;
  description?: string | null;
  base_price_cents: number;
  compare_at_price_cents?: number | null;
  swatch?: string | null;
  badge?: string | null;
  personalization_prompt?: string | null;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
  featured: boolean;
  sort_order: number;
  allow_personalization: boolean;
  personalization_price_delta_cents: number;
  personalization_max_length: number;
  design_group?: string | null;
  variants: VariantInput[];
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function cents(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function productPayload(input: ProductInput) {
  return {
    brand: input.brand.trim(),
    category: input.category.trim(),
    product_type: input.product_type.trim(),
    name: input.name.trim(),
    slug: cleanSlug(input.slug || input.name),
    description: input.description?.trim() || null,
    base_price_cents: cents(input.base_price_cents),
    compare_at_price_cents:
      input.compare_at_price_cents === null || input.compare_at_price_cents === undefined
        ? null
        : cents(input.compare_at_price_cents),
    swatch: input.swatch?.trim() || null,
    badge: input.badge?.trim() || null,
    personalization_prompt: input.personalization_prompt?.trim() || null,
    stock_quantity: Math.max(0, cents(input.stock_quantity)),
    track_inventory: Boolean(input.track_inventory),
    is_active: Boolean(input.is_active),
    featured: Boolean(input.featured),
    sort_order: cents(input.sort_order),
    allow_personalization: Boolean(input.allow_personalization),
    personalization_price_delta_cents: cents(input.personalization_price_delta_cents),
    personalization_max_length: Math.max(0, cents(input.personalization_max_length)),
    design_group: input.design_group?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    await requireAdmin("/admin/products");
    const input = (await request.json()) as ProductInput;

    if (!input.name?.trim()) return jsonError("Product name is required.");
    if (!input.brand?.trim()) return jsonError("Brand is required.");
    if (!input.category?.trim()) return jsonError("Category is required.");
    if (!input.product_type?.trim()) return jsonError("Product type is required.");
    if (!Number.isFinite(Number(input.base_price_cents)) || Number(input.base_price_cents) < 0) {
      return jsonError("Base price is invalid.");
    }

    const admin = createAdminClient();
    const isNew = !input.id;
    const id = input.id?.trim() || `${cleanSlug(input.slug || input.name)}-${crypto.randomUUID().slice(0, 8)}`;
    const payload = productPayload(input);

    const { data: product, error: productError } = isNew
      ? await admin.from("products").insert({ id, ...payload }).select("*").single()
      : await admin.from("products").update(payload).eq("id", id).select("*").single();

    if (productError) return jsonError(productError.message, 400);
    if (!product) return jsonError("Product could not be saved.", 500);

    const variants = Array.isArray(input.variants) ? input.variants : [];
    const submittedIds = variants
      .map((v) => v.id)
      .filter((v): v is string => Boolean(v) && !v?.startsWith("new-"));

    if (submittedIds.length) {
      const { error: deleteRemovedError } = await admin
        .from("product_variants")
        .delete()
        .eq("product_id", id)
        .not("id", "in", `(${submittedIds.join(",")})`);
      if (deleteRemovedError) return jsonError(deleteRemovedError.message, 400);
    } else {
      const { error: deleteAllError } = await admin.from("product_variants").delete().eq("product_id", id);
      if (deleteAllError) return jsonError(deleteAllError.message, 400);
    }

    for (const [index, variant] of variants.entries()) {
      const row = {
        product_id: id,
        group_name: variant.group_name.trim(),
        option_name: variant.option_name.trim(),
        price_delta_cents: cents(variant.price_delta_cents),
        stock_quantity: Math.max(0, cents(variant.stock_quantity)),
        sku: variant.sku?.trim() || null,
        is_active: Boolean(variant.is_active),
        sort_order: Number.isFinite(Number(variant.sort_order)) ? cents(variant.sort_order) : index,
      };

      if (!row.group_name || !row.option_name) return jsonError("Variant group and option are required.");

      const existingVariantId = variant.id && !variant.id.startsWith("new-") ? variant.id : null;
      const result = existingVariantId
        ? await admin.from("product_variants").update(row).eq("id", existingVariantId).eq("product_id", id)
        : await admin.from("product_variants").insert(row);

      if (result.error) return jsonError(result.error.message, 400);
    }

    const { data: savedVariants, error: savedVariantsError } = await admin
      .from("product_variants")
      .select("id,product_id,group_name,option_name,price_delta_cents,stock_quantity,sku,is_active,sort_order")
      .eq("product_id", id)
      .order("group_name")
      .order("sort_order")
      .order("option_name");

    if (savedVariantsError) return jsonError(savedVariantsError.message, 400);

    // product_catalog is maintained as the catalogue projection used by the storefront.
    const variantStock = (savedVariants ?? [])
      .filter((variant) => variant.is_active)
      .reduce((total, variant) => total + Math.max(0, variant.stock_quantity), 0);

    const catalogRow = {
      id,
      brand: product.brand,
      category: product.category,
      product_type: product.product_type,
      name: product.name,
      slug: product.slug,
      description: product.description,
      base_price_cents: product.base_price_cents,
      compare_at_price_cents: product.compare_at_price_cents,
      swatch: product.swatch,
      badge: product.badge,
      personalization_prompt: product.personalization_prompt,
      stock_quantity: product.stock_quantity,
      track_inventory: product.track_inventory,
      is_active: product.is_active,
      featured: product.featured,
      sort_order: product.sort_order,
      variant_stock: variantStock,
      updated_at: product.updated_at,
    };

    const { error: catalogError } = await admin
      .from("product_catalog")
      .upsert(catalogRow, { onConflict: "id" });

    if (catalogError) return jsonError(catalogError.message, 400);

    return NextResponse.json({ product, variants: savedVariants ?? [] });
  } catch (error) {
    console.error("Product save failed:", error);
    return jsonError(error instanceof Error ? error.message : "Product save failed.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin("/admin/products");
    const body = (await request.json()) as { id?: string; permanent?: boolean };
    if (!body.id) return jsonError("Product ID is required.");

    const admin = createAdminClient();

    if (!body.permanent) {
      const { error } = await admin.from("products").update({ is_active: false }).eq("id", body.id);
      if (error) return jsonError(error.message, 400);
      await admin.from("product_catalog").upsert({ id: body.id, is_active: false }, { onConflict: "id" });
      await admin.from("product_variants").update({ is_active: false }).eq("product_id", body.id);
      return NextResponse.json({ success: true, deactivated: true });
    }

    const [orderItems, images, reviews, wishlists] = await Promise.all([
      admin.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", body.id),
      admin.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", body.id),
      admin.from("product_reviews").select("id", { count: "exact", head: true }).eq("product_id", body.id),
      admin.from("wishlist_items").select("id", { count: "exact", head: true }).eq("product_id", body.id),
    ]);

    if ((orderItems.count ?? 0) + (images.count ?? 0) + (reviews.count ?? 0) + (wishlists.count ?? 0) > 0) {
      return jsonError(
        "This product has related records (orders, images, reviews or wishlists) and cannot be permanently deleted. Deactivate it instead.",
        409
      );
    }

    const { error: variantError } = await admin.from("product_variants").delete().eq("product_id", body.id);
    if (variantError) return jsonError(variantError.message, 400);

    const { error: catalogError } = await admin.from("product_catalog").delete().eq("id", body.id);
    if (catalogError) return jsonError(catalogError.message, 400);

    const { error: productError } = await admin.from("products").delete().eq("id", body.id);
    if (productError) return jsonError(productError.message, 400);

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Product delete failed:", error);
    return jsonError(error instanceof Error ? error.message : "Delete failed.", 500);
  }
}
