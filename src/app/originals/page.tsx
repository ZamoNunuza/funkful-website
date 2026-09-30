import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import OriginalsCatalog from "./OriginalsCatalog";
import { brands, palette } from "@/lib/brands";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  brand: "funkful";
  category: string;
  product_type: "made-to-order" | "personalize";
  name: string;
  slug: string;
  description: string | null;
  base_price_cents: number;
  swatch: string | null;
  badge: string | null;
  personalization_prompt: string | null;
  allow_personalization: boolean;
  personalization_price_delta_cents: number;
  personalization_max_length: number;
  design_group: string | null;
  sort_order: number;
};

type VariantRow = {
  product_id: string;
  group_name: string;
  option_name: string;
  price_delta_cents: number;
  sort_order: number;
};

type ImageRow = {
  product_id: string;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

function OriginalsDataError({ message }: { message: string }) {
  return (
    <main style={{ background: palette.cream, color: palette.black }} className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-xl w-full rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-neutral-500 mb-3">Funkful Originals</p>
        <h1 className="text-2xl font-black mb-3">We couldn’t load the Originals catalog.</h1>
        <p className="text-sm text-neutral-600 leading-relaxed">Please refresh the page. If the problem continues, the catalog data connection needs attention.</p>
        <p className="mt-4 text-[11px] text-neutral-400 break-words">{message}</p>
      </div>
    </main>
  );
}

export default async function OriginalsPage() {
  const supabase = await createClient();

  // Originals are identified by their stable `original-*` product IDs.
  // Do not use the broad `brand = funkful` filter here: that also includes
  // other Funkful catalog records that do not belong on this page.
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id,brand,category,product_type,name,slug,description,base_price_cents,swatch,badge,personalization_prompt,allow_personalization,personalization_price_delta_cents,personalization_max_length,design_group,sort_order"
    )
    .like("id", "original-%")
    .eq("is_active", true)
    .order("sort_order");

  if (productsError) {
    console.error("Originals products query failed:", productsError);
    return <OriginalsDataError message={productsError.message} />;
  }

  const originalProducts = (products ?? []) as ProductRow[];
  const productIds = originalProducts.map((product) => product.id);

  const [{ data: variants, error: variantsError }, { data: images, error: imagesError }] =
    productIds.length
      ? await Promise.all([
          supabase
            .from("product_variants")
            .select("product_id,group_name,option_name,price_delta_cents,sort_order")
            .in("product_id", productIds)
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("product_images")
            .select("product_id,image_url,alt_text,is_primary,sort_order")
            .in("product_id", productIds)
            .order("is_primary", { ascending: false })
            .order("sort_order"),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

  if (variantsError || imagesError) {
    const error = variantsError ?? imagesError;
    console.error("Originals supporting data query failed:", error);
    return <OriginalsDataError message={error?.message ?? "Unable to load product options."} />;
  }

  const variantGroups = new Map<string, Map<string, VariantRow[]>>();
  for (const variant of (variants ?? []) as VariantRow[]) {
    if (!variantGroups.has(variant.product_id)) variantGroups.set(variant.product_id, new Map());
    const groups = variantGroups.get(variant.product_id)!;
    if (!groups.has(variant.group_name)) groups.set(variant.group_name, []);
    groups.get(variant.group_name)!.push(variant);
  }

  const imageMap = new Map<string, ImageRow[]>();
  for (const image of (images ?? []) as ImageRow[]) {
    if (!imageMap.has(image.product_id)) imageMap.set(image.product_id, []);
    imageMap.get(image.product_id)!.push(image);
  }

  const catalog = ((products ?? []) as ProductRow[]).map((product) => ({
    ...product,
    variantGroups: [...(variantGroups.get(product.id)?.entries() ?? [])].map(([name, options]) => ({
      name,
      options: options.sort((a, b) => a.sort_order - b.sort_order).map((option) => ({
        label: option.option_name,
        priceDeltaCents: option.price_delta_cents,
      })),
    })),
    images: (imageMap.get(product.id) ?? []).map((image) => ({
      url: image.image_url,
      alt: image.alt_text ?? product.name,
      primary: image.is_primary,
    })),
  }));

  return (
    <main style={{ background: palette.cream, color: palette.black }}>
      <div className="max-w-[1180px] mx-auto px-8 pt-4 text-xs text-neutral-500">
        <Link href="/">Home</Link> / <span className="text-black font-medium">Funkful Originals</span>
      </div>
      <section style={{ background: brands.funkful.accent }} className="mt-4 py-11 md:py-14">
        <div className="max-w-[1180px] mx-auto px-8 grid md:grid-cols-[220px_1fr] gap-10 items-center">
          <img src={brands.funkful.logo} alt={brands.funkful.name} width={220} height={220} className="w-full opacity-90" draggable={false} />
          <div>
            <span style={{ background: palette.black, color: palette.cream }} className="inline-flex items-center border rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide mb-4">
              {brands.funkful.eyebrow}
            </span>
            <h1 style={{ color: brands.funkful.accentInk }} className="text-4xl md:text-5xl font-black uppercase leading-tight mb-3">
              Funkful Originals
            </h1>
            <p style={{ color: "#4a4438" }} className="text-sm leading-relaxed max-w-lg mb-2">
              Original designs made by Funkful and created after you order.
            </p>
            <p style={{ color: "#4a4438" }} className="text-sm leading-relaxed max-w-lg mb-6">
              Choose a design, pick your options, then add a name or short message for an additional R50 where personalization is available.
            </p>
            <a href="#catalog" style={{ background: palette.black, color: palette.cream }} className="inline-block font-bold text-xs uppercase tracking-wide px-6 py-4 rounded-full">
              Shop the Originals
            </a>
          </div>
        </div>
      </section>
      <OriginalsCatalog products={catalog} />
    </main>
  );
}
