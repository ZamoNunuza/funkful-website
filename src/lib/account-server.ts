// src/lib/account-server.ts
//
// Server-only helpers shared by the account pages and server actions. Nothing
// here should be imported from a "use client" file.

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { brands, type BrandSlug } from "@/lib/brands";
import { getProduct } from "@/lib/products";

/**
 * The signed-in user, or null. Wrapped in React's `cache` so the layout and
 * the page it wraps share one round-trip to Supabase Auth per request.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export interface ProfileRow {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

export const getProfile = cache(async (userId: string): Promise<ProfileRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", userId)
    .maybeSingle();
  return data;
});

/**
 * Attaches orders placed as a guest to the account that owns the same email.
 *
 * Only runs for emails Supabase has verified (sign-up requires confirmation),
 * so nobody can claim someone else's orders by registering their address.
 * Exact match on the lower-cased email — checkout stores it lower-cased.
 */
export async function claimGuestOrders(user: User) {
  if (!user.email || !user.email_confirmed_at) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("orders")
      .update({ user_id: user.id })
      .is("user_id", null)
      .eq("email", user.email.toLowerCase());
    if (error) console.error("claimGuestOrders failed:", error.message);
  } catch (err) {
    // Missing service-role key etc. — never block the page over this.
    console.error("claimGuestOrders unavailable:", err);
  }
}

// ---------------------------------------------------------------------------
// Wishlist product resolution
// ---------------------------------------------------------------------------

export interface WishlistProductView {
  id: string;
  name: string;
  brand: BrandSlug;
  priceCents: number;
  swatch: string;
  badge?: string;
  /** Where "Choose options" / "View" should point. */
  href: string;
  /** True when the product can go straight into the bag (no variants or personalization). */
  canAddDirect: boolean;
  available: boolean;
}

function asBrand(value: unknown): BrandSlug {
  return typeof value === "string" && value in brands ? (value as BrandSlug) : "funkful";
}

/**
 * Turns saved product ids into display data. Funkful Originals come from the
 * in-code catalogue; anything else (e.g. Scoopful scoops) is looked up in the
 * `products` table. Ids that resolve nowhere are returned as unavailable so
 * the customer can still remove them.
 */
export async function resolveWishlistProducts(ids: string[]): Promise<WishlistProductView[]> {
  const found = new Map<string, WishlistProductView>();

  for (const id of ids) {
    const p = getProduct(id);
    if (!p) continue;
    found.set(id, {
      id,
      name: p.name,
      brand: p.brand,
      priceCents: p.basePriceCents,
      swatch: p.swatch,
      badge: p.badge,
      href: `/products/${p.id}`,
      canAddDirect: !(p.variantGroups?.length) && p.type !== "personalize",
      available: true,
    });
  }

  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("products")
        .select("id,name,brand,product_type,base_price_cents,is_active")
        .in("id", missing);
      for (const row of data ?? []) {
        const brand = asBrand(row.brand);
        found.set(row.id, {
          id: row.id,
          name: row.name,
          brand,
          priceCents: row.base_price_cents,
          swatch: brands[brand].accent,
          href: brands[brand].href,
          canAddDirect: row.product_type !== "personalize",
          available: Boolean(row.is_active),
        });
      }
    } catch (err) {
      console.error("resolveWishlistProducts lookup failed:", err);
    }
  }

  return ids.map(
    (id) =>
      found.get(id) ?? {
        id,
        name: "This item is no longer available",
        brand: "funkful" as BrandSlug,
        priceCents: 0,
        swatch: "#E8DDD0",
        href: "/originals",
        canAddDirect: false,
        available: false,
      }
  );
}
