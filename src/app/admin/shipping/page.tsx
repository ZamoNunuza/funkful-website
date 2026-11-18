import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import ShippingSettings from "./shipping-settings";

export const metadata = { title: "Shipping & Packaging | Funkful Admin", robots: { index: false, follow: false } };

export default async function AdminShippingPage() {
  await requireAdmin("/admin/shipping");
  const admin = createAdminClient();
  const [settings, profiles, products] = await Promise.all([
    admin.from("shipping_settings").select("*").eq("id", 1).single(),
    admin.from("shipping_parcel_profiles").select("*").order("name"),
    admin.from("products").select("id,name,brand,category,product_type,shipping_profile_code,is_active").order("brand").order("name"),
  ]);
  if (settings.error || profiles.error || products.error) throw new Error("Could not load shipping settings.");
  return <main className="min-h-screen bg-[#FAF8F4] px-5 py-8 text-[#171512] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="text-sm font-bold underline">← Admin dashboard</Link>
      <div className="mb-8 mt-5"><p className="text-xs font-black uppercase tracking-[.16em] text-[#8a4a45]">Fulfilment</p><h1 className="mt-2 text-3xl font-black uppercase">Shipping & packaging</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">Configure Bob Go, your collection address, the R500 free-shipping threshold and parcel profiles. Dimensions are intentionally blank until you measure real packed parcels.</p></div>
      <ShippingSettings initialSettings={settings.data} initialProfiles={profiles.data ?? []} initialProducts={products.data ?? []} />
    </div>
  </main>;
}
