import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { brands, palette } from "@/lib/brands";
import AddToCart from "./add-to-cart";
import WishlistButton from "@/components/wishlist/WishlistButton";
import ProductGallery from "./ProductGallery";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id,brand,category,product_type,name,slug,description,base_price_cents,swatch,badge,personalization_prompt,allow_personalization,personalization_price_delta_cents,personalization_max_length"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();

  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("group_name,option_name,price_delta_cents,sort_order")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("sort_order"),

    admin
      .from("product_images")
      .select(
        "id,image_url,alt_text,is_primary,sort_order"
      )
      .eq("product_id", product.id)
      .order("is_primary", { ascending: false })
      .order("sort_order"),
  ]);

  const groups = new Map<
    string,
    { label: string; priceDeltaCents: number }[]
  >();

  for (const variant of variants ?? []) {
    if (!groups.has(variant.group_name)) {
      groups.set(variant.group_name, []);
    }

    groups
      .get(variant.group_name)!
      .push({
        label: variant.option_name,
        priceDeltaCents: variant.price_delta_cents,
      });
  }

  const productForCart = {
    ...product,
    variantGroups: [...groups.entries()].map(
      ([name, options]) => ({
        name,
        options,
      })
    ),
  };

  const brand =
    brands[product.brand as keyof typeof brands] ??
    brands.funkful;

  return (
    <main
      style={{
        background: palette.cream,
        color: palette.black,
      }}
      className="min-h-screen"
    >
      {/* Breadcrumb */}
      <div className="mx-auto max-w-[1180px] px-8 pt-5 text-xs text-neutral-500">
        <Link href="/">Home</Link>
        {" / "}
        <Link href={brand.href}>{brand.name}</Link>
        {" / "}
        <span className="text-black">{product.name}</span>
      </div>

      <section className="mx-auto grid max-w-[1180px] items-start gap-12 px-8 py-12 md:grid-cols-2">
        {/* PRODUCT GALLERY */}
        <ProductGallery
          images={images ?? []}
          productName={product.name}
          fallbackImage={brand.logo}
          fallbackBackground={
            product.swatch || brand.accent
          }
        />

        {/* PRODUCT INFORMATION */}
        <div className="pt-2">
          {product.badge && (
            <span
              style={{
                background: palette.black,
                color: palette.cream,
              }}
              className="mb-4 inline-flex rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
            >
              {product.badge}
            </span>
          )}

          <p
            style={{ color: "#8a4a45" }}
            className="mb-2 text-xs font-bold uppercase tracking-[0.14em]"
          >
            {brand.name}
          </p>

          <h1 className="mb-4 text-3xl font-black uppercase leading-tight md:text-4xl">
            {product.name}
          </h1>

          <p className="mb-7 text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>

          {product.product_type === "made-to-order" && (
            <div className="mb-7 rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-wide">
                Made to order
              </p>

              <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                This Funkful Original is made after you place
                your order. Please allow{" "}
                <strong>5–7 working days</strong> for completion.
                Personalization is available where shown.
              </p>
            </div>
          )}

          <AddToCart product={productForCart} />

          <div className="mt-4">
            <WishlistButton
              productId={product.id}
              productName={product.name}
              variant="labelled"
            />
          </div>

          <div className="mt-8 space-y-2 border-t pt-6 text-xs leading-relaxed text-neutral-600">
            <p>✓ Secure checkout through Yoco</p>
            <p>✓ Free delivery on orders over R400</p>
            <p>
              ✓ Your order is confirmed by our payment webhook
              before fulfilment
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}