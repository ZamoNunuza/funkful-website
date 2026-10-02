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
  variants?: VariantInput[];
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cents(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function productPayload(input: ProductInput) {
  const personalizationMaxLength = Math.min(
    500,
    Math.max(1, cents(input.personalization_max_length ?? 80))
  );

  return {
    brand: input.brand.trim(),
    category: input.category.trim(),
    product_type: input.product_type.trim(),
    name: input.name.trim(),
    slug: cleanSlug(input.slug || input.name),

    description: input.description?.trim() || null,

    base_price_cents: cents(input.base_price_cents),

    compare_at_price_cents:
      input.compare_at_price_cents === null ||
      input.compare_at_price_cents === undefined
        ? null
        : cents(input.compare_at_price_cents),

    swatch: input.swatch?.trim() || null,
    badge: input.badge?.trim() || null,

    personalization_prompt:
      input.personalization_prompt?.trim() || null,

    stock_quantity: Math.max(0, cents(input.stock_quantity)),
    track_inventory: Boolean(input.track_inventory),
    is_active: Boolean(input.is_active),
    featured: Boolean(input.featured),
    sort_order: cents(input.sort_order),

    allow_personalization: Boolean(input.allow_personalization),

    personalization_price_delta_cents: Math.max(
      0,
      cents(input.personalization_price_delta_cents)
    ),

    personalization_max_length: personalizationMaxLength,

    design_group: input.design_group?.trim() || null,

    updated_at: new Date().toISOString(),
  };
}

/**
 * GET /api/admin/products
 *
 * Returns all products and all variants.
 */
export async function GET() {
  try {
    await requireAdmin("/admin/products");

    const admin = createAdminClient();

    const [
      { data: products, error: productsError },
      { data: variants, error: variantsError },
    ] = await Promise.all([
      admin
        .from("products")
        .select("*")
        .order("brand")
        .order("sort_order")
        .order("name"),

      admin
        .from("product_variants")
        .select(
          "id,product_id,group_name,option_name,price_delta_cents,stock_quantity,sku,is_active,sort_order"
        )
        .order("product_id")
        .order("group_name")
        .order("sort_order")
        .order("option_name"),
    ]);

    if (productsError) {
      console.error("GET products failed:", productsError);

      return jsonError(
        `Could not load products: ${productsError.message}`,
        400
      );
    }

    if (variantsError) {
      console.error("GET variants failed:", variantsError);

      return jsonError(
        `Could not load product variants: ${variantsError.message}`,
        400
      );
    }

    return NextResponse.json({
      products: products ?? [],
      variants: variants ?? [],
    });
  } catch (error) {
    console.error("GET /api/admin/products failed:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not load products.",
      500
    );
  }
}

/**
 * POST /api/admin/products
 *
 * Creates or updates a product and its variants.
 *
 * IMPORTANT:
 * product_catalog is a read-only database VIEW.
 * This route intentionally does NOT INSERT, UPDATE,
 * UPSERT, or DELETE from product_catalog.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin("/admin/products");

    const input = (await request.json()) as ProductInput;

    /*
     * Validate product.
     */
    if (!input.name?.trim()) {
      return jsonError("Product name is required.");
    }

    if (!input.brand?.trim()) {
      return jsonError("Brand is required.");
    }

    if (!input.category?.trim()) {
      return jsonError("Category is required.");
    }

    if (!input.product_type?.trim()) {
      return jsonError("Product type is required.");
    }

    const basePrice = Number(input.base_price_cents);

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return jsonError("Base price is invalid.");
    }

    const slug = cleanSlug(input.slug || input.name);

    if (!slug) {
      return jsonError(
        "A valid product slug could not be generated."
      );
    }

    const admin = createAdminClient();

    const isNew = !input.id?.trim();

    const id =
      input.id?.trim() ||
      `${slug}-${crypto.randomUUID().slice(0, 8)}`;

    const payload = productPayload(input);

    /*
     * Check slug uniqueness.
     */
    const { data: existingSlug, error: slugCheckError } =
      await admin
        .from("products")
        .select("id,name")
        .eq("slug", payload.slug)
        .neq("id", id)
        .maybeSingle();

    if (slugCheckError) {
      console.error("Slug check failed:", slugCheckError);

      return jsonError(
        `Could not validate product slug: ${slugCheckError.message}`,
        400
      );
    }

    if (existingSlug) {
      return jsonError(
        `The product slug "${payload.slug}" is already used by "${existingSlug.name}". Please choose another slug.`,
        409
      );
    }

    /*
     * Save product.
     */
    const productResult = isNew
      ? await admin
          .from("products")
          .insert({
            id,
            ...payload,
          })
          .select("*")
          .single()
      : await admin
          .from("products")
          .update(payload)
          .eq("id", id)
          .select("*")
          .single();

    const { data: product, error: productError } =
      productResult;

    if (productError) {
      console.error(
        "Product database save failed:",
        productError
      );

      return jsonError(
        `Could not save product: ${productError.message}`,
        400
      );
    }

    if (!product) {
      return jsonError(
        "Product could not be saved because no product was returned.",
        500
      );
    }

    /*
     * Variants.
     */
    const variants = Array.isArray(input.variants)
      ? input.variants
      : [];

    const submittedIds = variants
      .map((variant) => variant.id)
      .filter(
        (variantId): variantId is string =>
          Boolean(variantId) &&
          !variantId?.startsWith("new-")
      );

    /*
     * Remove variants that were deleted in the Product Manager.
     */
    if (submittedIds.length > 0) {
      const { error: deleteRemovedError } = await admin
        .from("product_variants")
        .delete()
        .eq("product_id", id)
        .not("id", "in", `(${submittedIds.join(",")})`);

      if (deleteRemovedError) {
        console.error(
          "Removing deleted variants failed:",
          deleteRemovedError
        );

        return jsonError(
          `Could not remove deleted variants: ${deleteRemovedError.message}`,
          400
        );
      }
    } else {
      /*
       * No variants submitted, so remove all existing variants.
       */
      const { error: deleteAllError } = await admin
        .from("product_variants")
        .delete()
        .eq("product_id", id);

      if (deleteAllError) {
        console.error(
          "Removing old variants failed:",
          deleteAllError
        );

        return jsonError(
          `Could not remove existing variants: ${deleteAllError.message}`,
          400
        );
      }
    }

    /*
     * Insert/update submitted variants.
     */
    for (const [index, variant] of variants.entries()) {
      const groupName =
        variant.group_name?.trim() || "";

      const optionName =
        variant.option_name?.trim() || "";

      if (!groupName || !optionName) {
        return jsonError(
          `Variant ${index + 1} requires both a group and an option.`
        );
      }

      const row = {
        product_id: id,
        group_name: groupName,
        option_name: optionName,

        price_delta_cents: cents(
          variant.price_delta_cents
        ),

        stock_quantity: Math.max(
          0,
          cents(variant.stock_quantity)
        ),

        sku: variant.sku?.trim() || null,

        is_active: Boolean(variant.is_active),

        sort_order: Number.isFinite(
          Number(variant.sort_order)
        )
          ? cents(variant.sort_order)
          : index,
      };

      const existingVariantId =
        variant.id &&
        !variant.id.startsWith("new-")
          ? variant.id
          : null;

      const result = existingVariantId
        ? await admin
            .from("product_variants")
            .update(row)
            .eq("id", existingVariantId)
            .eq("product_id", id)
        : await admin
            .from("product_variants")
            .insert(row);

      if (result.error) {
        console.error(
          `Variant ${index + 1} save failed:`,
          result.error
        );

        return jsonError(
          `Could not save variant "${groupName} / ${optionName}": ${result.error.message}`,
          400
        );
      }
    }

    /*
     * Read variants back from Supabase.
     */
    const {
      data: savedVariants,
      error: savedVariantsError,
    } = await admin
      .from("product_variants")
      .select(
        "id,product_id,group_name,option_name,price_delta_cents,stock_quantity,sku,is_active,sort_order"
      )
      .eq("product_id", id)
      .order("group_name")
      .order("sort_order")
      .order("option_name");

    if (savedVariantsError) {
      console.error(
        "Reading saved variants failed:",
        savedVariantsError
      );

      return jsonError(
        `Could not load saved variants: ${savedVariantsError.message}`,
        400
      );
    }

    /*
     * IMPORTANT:
     *
     * Do NOT write to product_catalog here.
     *
     * product_catalog is a read-only VIEW containing GROUP BY.
     * It automatically reflects the underlying products and
     * product_variants tables.
     */

    return NextResponse.json({
      product,
      variants: savedVariants ?? [],
    });
  } catch (error) {
    console.error("Product save failed:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Product save failed.",
      500
    );
  }
}

/**
 * DELETE /api/admin/products
 */
export async function DELETE(request: Request) {
  try {
    await requireAdmin("/admin/products");

    const body = (await request.json()) as {
      id?: string;
      permanent?: boolean;
    };

    if (!body.id) {
      return jsonError("Product ID is required.");
    }

    const admin = createAdminClient();

    /*
     * Soft delete / deactivate.
     */
    if (!body.permanent) {
      const { error } = await admin
        .from("products")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id);

      if (error) {
        return jsonError(error.message, 400);
      }

      /*
       * Deactivate all variants as well.
       *
       * No product_catalog update is necessary because
       * product_catalog is a database VIEW.
       */
      const { error: variantError } = await admin
        .from("product_variants")
        .update({
          is_active: false,
        })
        .eq("product_id", body.id);

      if (variantError) {
        return jsonError(
          `Product deactivated, but variants could not be deactivated: ${variantError.message}`,
          400
        );
      }

      return NextResponse.json({
        success: true,
        deactivated: true,
      });
    }

    /*
     * Permanent delete safety check.
     *
     * Products with related records are not allowed to be
     * permanently deleted.
     */
    const [
      orderItems,
      images,
      reviews,
      wishlists,
      assets,
    ] = await Promise.all([
      admin
        .from("order_items")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("product_id", body.id),

      admin
        .from("product_images")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("product_id", body.id),

      admin
        .from("product_reviews")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("product_id", body.id),

      admin
        .from("wishlist_items")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("product_id", body.id),

      admin
        .from("product_assets")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("product_id", body.id),
    ]);

    /*
     * Check for query errors before using the counts.
     */
    const relationErrors = [
      orderItems.error,
      images.error,
      reviews.error,
      wishlists.error,
      assets.error,
    ].filter(Boolean);

    if (relationErrors.length > 0) {
      console.error(
        "Permanent delete safety check failed:",
        relationErrors
      );

      return jsonError(
        "Could not verify whether the product has related records.",
        400
      );
    }

    const relatedCount =
      (orderItems.count ?? 0) +
      (images.count ?? 0) +
      (reviews.count ?? 0) +
      (wishlists.count ?? 0) +
      (assets.count ?? 0);

    if (relatedCount > 0) {
      return jsonError(
        "This product has related records (orders, images, artwork/assets, reviews or wishlists) and cannot be permanently deleted. Deactivate it instead.",
        409
      );
    }

    /*
     * Delete variants first.
     */
    const { error: variantError } = await admin
      .from("product_variants")
      .delete()
      .eq("product_id", body.id);

    if (variantError) {
      return jsonError(
        variantError.message,
        400
      );
    }

    /*
     * Delete the product.
     *
     * Do NOT delete from product_catalog because it is
     * a read-only database VIEW.
     */
    const { error: productError } = await admin
      .from("products")
      .delete()
      .eq("id", body.id);

    if (productError) {
      return jsonError(
        productError.message,
        400
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    console.error(
      "Product delete failed:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Delete failed.",
      500
    );
  }
}