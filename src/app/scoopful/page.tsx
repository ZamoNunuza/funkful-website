// src/app/scoopful/page.tsx

import { createClient } from "@/lib/supabase/server";
import ScoopfulCatalog from "../../components/scoopful/ScoopfulCatalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scoopful by Funkful | Mystery Scoops",
  description:
    "Mystery scoops, surprise finds and guaranteed prizes from Scoopful by Funkful.",
};

type ProductImage = {
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

type ScoopfulProduct = {
  id: string;
  brand: "scoopful";
  category: string;
  product_type:
    | "ready-made"
    | "made-to-order"
    | "personalize"
    | "mystery"
    | "addon";
  name: string;
  slug: string;
  description: string | null;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  badge: string | null;
  featured: boolean;
  sort_order: number;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
  product_images: ProductImage[];
};

export default async function ScoopfulPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      brand,
      category,
      product_type,
      name,
      slug,
      description,
      base_price_cents,
      compare_at_price_cents,
      badge,
      featured,
      sort_order,
      stock_quantity,
      track_inventory,
      is_active,
      product_images (
        image_url,
        alt_text,
        is_primary,
        sort_order
      )
    `)
    .eq("brand", "scoopful")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load Scoopful products:", error);
  }

  const products = (data ?? []) as ScoopfulProduct[];

  const scoops = products.filter(
    (product) => product.product_type === "mystery"
  );

  const addOns = products.filter(
    (product) => product.product_type === "addon"
  );

  return (
    <ScoopfulCatalog
      products={products}
      scoops={scoops}
      addOns={addOns}
    />
  );
}