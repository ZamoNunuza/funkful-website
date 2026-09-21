"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { brands, type BrandSlug } from "@/lib/brands";
import { primaryButtonClass, primaryButtonStyle } from "@/components/account/ui";

export interface ReorderLine {
  product_id: string;
  product_name: string;
  brand: string | null;
  variant: string | null;
  unit_price_cents: number;
  quantity: number;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Puts the items from a past order back in the bag and opens it.
 *
 * The cart id is `<product_id>-<variant slug>`, which is the same shape the
 * catalogue pages use — /api/checkout resolves the product from that prefix
 * and always re-prices from the database, so an old price here can't be used
 * to pay less than today's price.
 */
export default function ReorderButton({ lines }: { lines: ReorderLine[] }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function reorder() {
    setBusy(true);
    for (const line of lines) {
      const brand: BrandSlug = line.brand && line.brand in brands ? (line.brand as BrandSlug) : "funkful";
      addItem(
        {
          id: line.variant ? `${line.product_id}-${slugify(line.variant)}` : line.product_id,
          brand,
          name: line.product_name,
          variant: line.variant ?? undefined,
          priceCents: line.unit_price_cents,
        },
        line.quantity
      );
    }
    router.push("/cart");
  }

  return (
    <button type="button" onClick={reorder} disabled={busy || !lines.length} style={primaryButtonStyle} className={primaryButtonClass}>
      {busy ? "Adding to bag…" : "Buy again"}
    </button>
  );
}
