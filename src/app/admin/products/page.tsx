import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductManager from "../../../components/admin/ProductManager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Products | Funkful admin",
  robots: { index: false, follow: false },
};

export default async function ProductsPage() {
  await requireAdmin("/admin/products");
  const admin = createAdminClient();

  const [{ data: products, error: productsError }, { data: variants, error: variantsError }] =
    await Promise.all([
      admin.from("products").select("*").order("brand").order("sort_order").order("name"),
      admin
        .from("product_variants")
        .select("id,product_id,group_name,option_name,price_delta_cents,stock_quantity,sku,is_active,sort_order")
        .order("product_id")
        .order("group_name")
        .order("sort_order")
        .order("option_name"),
    ]);

  if (productsError || variantsError) {
    return (
      <main className="min-h-screen bg-[#F7F4EF] p-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-black/10 bg-white p-8">
          <h1 className="text-2xl font-black">Couldn&apos;t load products</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {productsError?.message ?? variantsError?.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EF] text-[#111111]">
      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a4a45]">
              Funkful admin
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Products</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Create, edit, activate, deactivate and manage product variants without
              editing the database directly. Active and inactive products are shown.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/products/images"
              className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/5"
            >
              Product images →
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/5"
            >
              ← Admin dashboard
            </Link>
          </div>
        </div>

        <ProductManager products={products ?? []} variants={variants ?? []} />
      </div>
    </main>
  );
}
