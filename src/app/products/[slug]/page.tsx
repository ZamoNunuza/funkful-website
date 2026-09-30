import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brands, palette } from "@/lib/brands";
import AddToCart from "./add-to-cart";
import WishlistButton from "@/components/wishlist/WishlistButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,brand,category,product_type,name,slug,description,base_price_cents,swatch,badge,personalization_prompt,allow_personalization,personalization_price_delta_cents,personalization_max_length")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();

  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase.from("product_variants").select("group_name,option_name,price_delta_cents,sort_order").eq("product_id", product.id).eq("is_active", true).order("sort_order"),
    supabase.from("product_images").select("image_url,alt_text,is_primary,sort_order").eq("product_id", product.id).order("is_primary", { ascending: false }).order("sort_order"),
  ]);

  const groups = new Map<string, { label: string; priceDeltaCents: number }[]>();
  for (const variant of variants ?? []) {
    if (!groups.has(variant.group_name)) groups.set(variant.group_name, []);
    groups.get(variant.group_name)!.push({ label: variant.option_name, priceDeltaCents: variant.price_delta_cents });
  }

  const productForCart = {
    ...product,
    variantGroups: [...groups.entries()].map(([name, options]) => ({ name, options })),
  };
  const primaryImage = (images ?? [])[0];
  const brand = brands[product.brand as keyof typeof brands] ?? brands.funkful;

  return (
    <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen">
      <div className="max-w-[1180px] mx-auto px-8 pt-5 text-xs text-neutral-500">
        <Link href="/">Home</Link> / <Link href={brand.href}>{brand.name}</Link> / <span className="text-black">{product.name}</span>
      </div>
      <section className="max-w-[1180px] mx-auto px-8 py-12 grid md:grid-cols-2 gap-12 items-start">
        <div style={{ background: product.swatch || brand.accent }} className="aspect-square rounded-[28px] flex items-center justify-center p-8 relative overflow-hidden">
          {primaryImage ? <img src={primaryImage.image_url} alt={primaryImage.alt_text ?? product.name} className="w-full h-full object-contain" /> : <img src={brand.logo} alt={brand.name} width={260} height={260} className="object-contain max-h-full" />}
        </div>
        <div className="pt-2">
          {product.badge && <span style={{ background: palette.black, color: palette.cream }} className="inline-flex rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide mb-4">{product.badge}</span>}
          <p style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-[0.14em] mb-2">{brand.name}</p>
          <h1 className="text-3xl md:text-4xl font-black uppercase leading-tight mb-4">{product.name}</h1>
          <p className="text-sm text-neutral-600 leading-relaxed mb-7">{product.description}</p>
          {product.product_type === "made-to-order" && <div className="mb-7 rounded-2xl border border-black/10 bg-white/60 px-4 py-3"><p className="text-xs font-extrabold uppercase tracking-wide">Made to order</p><p className="text-xs text-neutral-600 leading-relaxed mt-1">This Funkful Original is made after you place your order. Please allow <strong>5–7 working days</strong> for completion. Personalization is available where shown.</p></div>}
          <AddToCart product={productForCart} />
          <div className="mt-4"><WishlistButton productId={product.id} productName={product.name} variant="labelled" /></div>
          <div className="mt-8 border-t pt-6 text-xs text-neutral-600 leading-relaxed space-y-2"><p>✓ Secure checkout through Yoco</p><p>✓ Free delivery on orders over R400</p><p>✓ Your order is confirmed by our payment webhook before fulfilment</p></div>
        </div>
      </section>
    </main>
  );
}
