// src/lib/inventory/cold-vinyl.ts
//
// Server-only. Cold colour-changing vinyl colours for the customer-facing glass cup
// picker, read from the inventory (inv_materials) with the service-role client.
// Only exposes what a customer needs: colour, range, in-stock flag and a photo URL.
// Never returns costs, quantities or supplier details.

import { createAdminClient } from "@/lib/supabase/admin";
import { materialImageUrl } from "@/lib/inventory/inventory-images";

export const COLD_VINYL_FINISH = "Cold Colour-Changing Vinyl";
const COLD_TYPE = "Cold Colour-Changing";
const COLD_CATEGORY = "Permanent Vinyl";

export type ColdVinylColour = {
  /** Our inventory code (e.g. FK-00123). Used as the stable key in the cart and order. */
  code: string;
  colour: string;
  /** Customer-friendly range: Classic, Neon, Shimmer or Clear. */
  range: string;
  inStock: boolean;
  imageUrl: string | null;
};

const SELECT =
  "code, range_name, colour, quantity_on_hand, image_key, inv_material_types!inner(name), inv_categories!inner(name)";

function rangeLabel(name: string | null): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("neon")) return "Neon";
  if (n.includes("shimmer")) return "Shimmer";
  if (n.includes("clear") || n.includes("translucent")) return "Clear";
  return "Classic";
}

function toColour(row: Record<string, unknown>): ColdVinylColour {
  return {
    code: String(row.code),
    colour: String(row.colour ?? "").trim(),
    range: rangeLabel((row.range_name as string | null) ?? null),
    inStock: Number(row.quantity_on_hand ?? 0) > 0,
    imageUrl: materialImageUrl((row.image_key as string | null) ?? null, "thumb"),
  };
}

const RANGE_ORDER = ["Classic", "Neon", "Shimmer", "Clear"];

export async function listColdVinylColours(): Promise<ColdVinylColour[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inv_materials")
    .select(SELECT)
    .eq("is_active", true)
    .eq("inv_material_types.name", COLD_TYPE)
    .eq("inv_categories.name", COLD_CATEGORY)
    .limit(200);
  if (error) {
    console.error("Cold vinyl colours failed:", error);
    return [];
  }
  return (data ?? [])
    .map((row) => toColour(row as Record<string, unknown>))
    .filter((c) => c.colour)
    .sort((a, b) => RANGE_ORDER.indexOf(a.range) - RANGE_ORDER.indexOf(b.range) || a.colour.localeCompare(b.colour));
}

/** Server-side check at quote/checkout time: the code must be an active cold colour-changing vinyl. */
export async function findColdVinylColour(code: string): Promise<ColdVinylColour | null> {
  const clean = code.trim().toUpperCase();
  if (!clean || clean.length > 40) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inv_materials")
    .select(SELECT)
    .eq("is_active", true)
    .eq("code", clean)
    .eq("inv_material_types.name", COLD_TYPE)
    .eq("inv_categories.name", COLD_CATEGORY)
    .maybeSingle();
  if (error || !data) return null;
  return toColour(data as Record<string, unknown>);
}
