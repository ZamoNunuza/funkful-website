import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductImageManager from "./ProductImageManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Product images | Funkful admin", robots: { index: false, follow: false } };

export default async function ProductImagesPage() {
  await requireAdmin("/admin/products/images");
  const admin = createAdminClient();
  const { data: roleCheck, error: roleCheckError } = await admin.rpc(
  "get_current_user_role"
);

  const [{ data: products, error: productsError }, { data: images, error: imagesError }] = await Promise.all([
    admin.from("products").select("id,name,slug,brand,category,is_active").order("brand").order("sort_order").order("name"),
    admin.from("product_images").select("id,product_id,image_url,alt_text,is_primary,sort_order").order("product_id").order("is_primary", { ascending: false }).order("sort_order"),
  ]);

  if (productsError || imagesError) {
    return (
      <main className="min-h-screen bg-[#F7F4EF] p-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-black/10 bg-white p-8">
          <h1 className="text-2xl font-black">Couldn&apos;t load product images</h1>
          <p className="mt-2 text-sm text-neutral-600">{productsError?.message ?? imagesError?.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EF] text-[#111111]">
      <div className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a4a45]">Funkful admin</p>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Product images</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Upload one or more product images, set the primary image, reorder the gallery, and edit accessible alt text. Images are stored in Supabase Storage and linked to the exact product.</p>
          </div>
          <Link href="/admin" className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/5">← Admin dashboard</Link>
        </div>
        <ProductImageManager products={products ?? []} initialImages={images ?? []} />
      </div>
    </main>
  );
}
