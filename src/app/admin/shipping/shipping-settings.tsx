"use client";

import { useMemo, useState } from "react";

type Settings = Record<string, string | number | null>;
type Profile = { code: string; name: string; description: string | null; length_cm: number | null; width_cm: number | null; height_cm: number | null; weight_kg: number | null; is_fragile: boolean; is_active: boolean };
type Product = { id: string; name: string; brand: string; category: string; product_type: string; shipping_profile_code: string | null; is_active: boolean };
const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm";

export default function ShippingSettings({ initialSettings, initialProfiles, initialProducts }: { initialSettings: Settings; initialProfiles: Profile[]; initialProducts: Product[] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [products, setProducts] = useState(initialProducts);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const grouped = useMemo(() => products.filter((p) => p.is_active && (filter === "all" || p.brand === filter)), [products, filter]);
  const brands = [...new Set(products.map((p) => p.brand))].sort();
  const activeProducts = products.filter((product) => product.is_active);
  const mappedProducts = activeProducts.filter((product) => Boolean(product.shipping_profile_code)).length;

  async function save(payload: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/shipping", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save changes.");
      setMessage("Changes saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save changes."); }
    finally { setBusy(false); }
  }

  function setSetting(key: string, value: string | number) { setSettings((current) => ({ ...current, [key]: value })); }
  function updateProfile(code: string, key: keyof Profile, value: string | number | boolean | null) { setProfiles((current) => current.map((profile) => profile.code === code ? { ...profile, [key]: value } : profile)); }

  return <div className="space-y-6">
    <section className="rounded-3xl border border-black/10 bg-white p-5 sm:p-7">
      <div className="mb-5"><h2 className="text-xl font-black">Delivery rules & collection address</h2><p className="mt-1 text-sm text-neutral-600">Free standard delivery applies when the discounted merchandise subtotal reaches the threshold.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Free shipping threshold (R)" value={Number(settings.free_shipping_threshold_cents ?? 50000) / 100} onChange={(v) => setSetting("free_shipping_threshold_cents", Math.round(Number(v) * 100))} type="number" />
        <Field label="Collection company" value={String(settings.collection_company ?? "Funkful")} onChange={(v) => setSetting("collection_company", v)} />
        <Field label="Street address" value={String(settings.collection_street_address ?? "")} onChange={(v) => setSetting("collection_street_address", v)} />
        <Field label="Suburb / local area" value={String(settings.collection_local_area ?? "")} onChange={(v) => setSetting("collection_local_area", v)} />
        <Field label="City" value={String(settings.collection_city ?? "")} onChange={(v) => setSetting("collection_city", v)} />
        <Field label="Province" value={String(settings.collection_province ?? "")} onChange={(v) => setSetting("collection_province", v)} />
        <Field label="Postal code (optional)" value={String(settings.collection_postal_code ?? "")} onChange={(v) => setSetting("collection_postal_code", v)} />
        <Field label="Collection contact name" value={String(settings.collection_contact_name ?? "")} onChange={(v) => setSetting("collection_contact_name", v)} />
        <Field label="Collection contact phone" value={String(settings.collection_contact_phone ?? "")} onChange={(v) => setSetting("collection_contact_phone", v)} />
        <Field label="Collection contact email" value={String(settings.collection_contact_email ?? "")} onChange={(v) => setSetting("collection_contact_email", v)} />
        <Field label="Handling time (working days)" value={Number(settings.handling_time_days ?? 5)} onChange={(v) => setSetting("handling_time_days", Number(v))} type="number" />
        <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-black/50">Bob Go environment</span><select className={input} value={String(settings.bobgo_environment ?? "sandbox")} onChange={(e) => setSetting("bobgo_environment", e.target.value)}><option value="sandbox">Sandbox / testing</option><option value="production">Production / live</option></select></label>
        <Field label="Standard service name (exact, optional)" value={String(settings.standard_service_name ?? "")} onChange={(v) => setSetting("standard_service_name", v)} />
      </div>
      <p className="mt-4 rounded-xl bg-[#F6F1E8] p-3 text-xs leading-5 text-neutral-700">Collection address currently saved as 8 Pembroke Street, Sydenham, Johannesburg, Gauteng. Add the collection postal code and contact details when available. Keep Bob Go in sandbox until test quotes have been verified.</p>
      <button disabled={busy} onClick={() => void save({ kind: "settings", ...settings })} className="mt-5 rounded-full bg-black px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50">Save delivery settings</button>
    </section>

    <section className="rounded-3xl border border-black/10 bg-white p-5 sm:p-7">
      <div className="mb-5"><h2 className="text-xl font-black">Parcel profiles</h2><p className="mt-1 text-sm text-neutral-600">Enter the measurements of the complete packed parcel, not the bare product. Blank measurements prevent live courier quotes rather than generating a guessed price.</p></div>
      <div className="space-y-4">
        {profiles.map((profile) => <div key={profile.code} className="rounded-2xl border border-black/10 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black">{profile.name}</h3><p className="text-xs text-neutral-500">{profile.description}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${profile.length_cm && profile.width_cm && profile.height_cm && profile.weight_kg ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{profile.length_cm && profile.width_cm && profile.height_cm && profile.weight_kg ? "Measurements entered" : "Needs measurements"}</span></div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4"><ProfileField label="Length (cm)" value={profile.length_cm} onChange={(v) => updateProfile(profile.code, "length_cm", v)} /><ProfileField label="Width (cm)" value={profile.width_cm} onChange={(v) => updateProfile(profile.code, "width_cm", v)} /><ProfileField label="Height (cm)" value={profile.height_cm} onChange={(v) => updateProfile(profile.code, "height_cm", v)} /><ProfileField label="Weight (kg)" value={profile.weight_kg} onChange={(v) => updateProfile(profile.code, "weight_kg", v)} /></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={profile.is_fragile} onChange={(e) => updateProfile(profile.code, "is_fragile", e.target.checked)} /> Fragile packaging</label><button disabled={busy} onClick={() => void save({ kind: "profile", ...profile })} className="rounded-full border border-black/20 px-4 py-2 text-xs font-black uppercase disabled:opacity-50">Save profile</button></div>
        </div>)}
      </div>
    </section>

    <section className="rounded-3xl border border-black/10 bg-white p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Product packaging assignments</h2><p className="mt-1 text-sm text-neutral-600">Assign each product to the package it normally needs. Mixed carts will send the individual item dimensions to Bob Go for its stacking calculation.</p><p className="mt-2 text-xs font-bold text-neutral-500">{mappedProducts} of {activeProducts.length} active products assigned · {activeProducts.length - mappedProducts} need an assignment</p></div><select className={`${input} max-w-48`} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All brands</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></div>
      <div className="divide-y divide-black/10">{grouped.map((product) => <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{product.name}</p><p className="text-xs text-neutral-500">{product.brand} · {product.category}</p></div><select className={`${input} max-w-64`} value={product.shipping_profile_code ?? ""} onChange={async (e) => { const shipping_profile_code = e.target.value || null; setProducts((current) => current.map((item) => item.id === product.id ? { ...item, shipping_profile_code } : item)); await save({ kind: "mapping", product_id: product.id, shipping_profile_code }); }}><option value="">Select packaging profile</option>{profiles.filter((p) => p.is_active).map((profile) => <option key={profile.code} value={profile.code}>{profile.name}</option>)}</select></div>)}</div>
    </section>
    {message && <p role="status" className="rounded-xl border border-black/10 bg-white p-3 text-sm">{message}</p>}
  </div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-black/50">{label}</span><input className={input} type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function ProfileField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-black/50">{label}</span><input className={input} type="number" min="0" step="0.01" placeholder="Not measured" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} /></label>; }
