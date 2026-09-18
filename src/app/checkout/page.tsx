"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { brands, palette } from "@/lib/brands";

function formatRands(cents: number) { return `R${(cents / 100).toFixed(2)}`; }
const inputClass = "w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";

export default function CheckoutPage() {
  const { items, hydrated, subtotalCents } = useCart();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const shippingCents = useMemo(() => Math.max(0, subtotalCents - discountCents) >= 40000 ? 0 : items.length ? 9900 : 0, [subtotalCents, discountCents, items.length]);
  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents);

  useEffect(() => {
    if (!hydrated) return;
    if (!items.length) window.location.replace("/cart");
  }, [hydrated, items.length]);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setError(null);
    try {
      const res = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoCode, subtotalCents }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not apply promo code.");
      setAppliedPromo(data.code); setPromoCode(data.code); setDiscountCents(data.discountCents);
    } catch (e) { setAppliedPromo(""); setDiscountCents(0); setError(e instanceof Error ? e.message : "Could not apply promo code."); }
    finally { setPromoLoading(false); }
  }

  async function placeOrder() {
    setError(null);
    if (!items.length) return setError("Your bag is empty.");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!firstName.trim() || !lastName.trim() || !address.trim() || !city.trim() || !postalCode.trim()) return setError("Please complete your delivery details.");
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        email, shipping: { firstName, lastName, phone, address, city, province, postalCode, country: "South Africa" }, promoCode: appliedPromo,
        items: items.map((i) => ({ id: i.id, name: i.name, variant: i.variant, quantity: i.quantity })),
      }) });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) throw new Error(data.error ?? "Could not start secure payment.");
      window.location.assign(data.redirectUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout failed. Please try again."); setLoading(false); }
  }

  if (!hydrated) return <CheckoutShell><div className="py-24 text-center text-sm text-neutral-500">Loading secure checkout…</div></CheckoutShell>;
  if (!items.length) return null;

  return <CheckoutShell>
    <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 sm:py-12 pb-24">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-400 mb-8"><span className="text-black">1 Bag</span><span>→</span><span className="text-black">2 Details</span><span>→</span><span>3 Payment</span></div>
      <div className="grid lg:grid-cols-[1.45fr_0.75fr] gap-10 items-start">
        <section>
          <Link href="/cart" className="text-xs font-bold uppercase underline">← Back to bag</Link>
          <h1 className="text-3xl sm:text-4xl font-black uppercase mt-4 mb-2">Delivery details</h1>
          <p className="text-sm text-neutral-500 mb-8">Tell us where to send your order. Payment happens securely on Yoco.</p>

          <div className="space-y-8">
            <fieldset><legend className="text-xs font-black uppercase tracking-wide mb-4">Contact</legend><div className="grid sm:grid-cols-2 gap-4"><Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@email.com" /><Field label="Phone (optional)" value={phone} onChange={setPhone} placeholder="082 123 4567" /></div></fieldset>
            <fieldset><legend className="text-xs font-black uppercase tracking-wide mb-4">Shipping address</legend><div className="grid sm:grid-cols-2 gap-4"><Field label="First name" value={firstName} onChange={setFirstName} placeholder="Thabo" /><Field label="Last name" value={lastName} onChange={setLastName} placeholder="Mokoena" /></div><div className="mt-4"><Field label="Street address" value={address} onChange={setAddress} placeholder="12 Vilakazi Street" /></div><div className="grid sm:grid-cols-3 gap-4 mt-4"><Field label="City" value={city} onChange={setCity} placeholder="Johannesburg" /><Field label="Province" value={province} onChange={setProvince} placeholder="Gauteng" /><Field label="Postal code" value={postalCode} onChange={setPostalCode} placeholder="2001" /></div></fieldset>
            <fieldset><legend className="text-xs font-black uppercase tracking-wide mb-4">Promo code</legend><div className="flex gap-2"><input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} className={inputClass} placeholder="Enter code" /><button type="button" onClick={applyPromo} disabled={promoLoading} style={{ background: palette.black, color: palette.cream }} className="px-5 rounded-xl text-xs font-black uppercase disabled:opacity-50">{promoLoading ? "Checking" : appliedPromo ? "Applied" : "Apply"}</button></div></fieldset>
          </div>
          {error && <div role="alert" className="mt-7 rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>}
        </section>

        <aside style={{ background: palette.beige }} className="rounded-[24px] p-6 sm:p-7 lg:sticky lg:top-24">
          <h2 className="text-sm font-black uppercase mb-5">Your order</h2>
          <div className="space-y-4 mb-5">{items.map((item) => <div key={item.id} className="flex gap-3 items-start"><div style={{ background: brands[item.brand].accent }} className="w-12 h-12 rounded-xl p-2 flex items-center justify-center shrink-0"><Image src={brands[item.brand].logo} alt="" width={32} height={32} className="object-contain" /></div><div className="min-w-0 flex-1"><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-neutral-500">Qty {item.quantity}{item.variant ? ` · ${item.variant}` : ""}</p></div><span className="font-bold text-sm">{formatRands(item.priceCents * item.quantity)}</span></div>)}</div>
          <SummaryRow label="Subtotal" value={formatRands(subtotalCents)} /><SummaryRow label="Discount" value={discountCents ? `-${formatRands(discountCents)}` : "—"} /><SummaryRow label="Shipping" value={shippingCents === 0 ? <span style={{ color: "#4a6b3c" }}>Free</span> : formatRands(shippingCents)} />
          <div className="border-t mt-3 pt-4 flex justify-between font-black text-lg"><span>Total</span><span>{formatRands(totalCents)}</span></div>
          <button type="button" onClick={placeOrder} disabled={loading} style={{ background: palette.black, color: palette.cream }} className="w-full py-4 rounded-full mt-6 text-xs font-black uppercase disabled:opacity-60">{loading ? "Opening secure payment…" : "Continue to secure payment"}</button>
          <p className="text-xs text-neutral-500 leading-relaxed mt-4 text-center">You will be redirected to Yoco to complete payment. We only treat a verified payment webhook as confirmation of payment.</p>
        </aside>
      </div>
    </div>
  </CheckoutShell>;
}

function CheckoutShell({ children }: { children: React.ReactNode }) { return <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen"><header style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }}><div className="max-w-[1180px] mx-auto px-5 sm:px-8 flex items-center justify-between py-4"><Link href="/"><Image src={brands.funkful.logo} alt="Funkful" width={110} height={24} className="w-auto" /></Link><span className="text-sm font-semibold text-neutral-500">🔒 Secure checkout</span></div></header>{children}</main>; }
function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} autoComplete={label.toLowerCase().includes("email") ? "email" : label.toLowerCase().includes("first") ? "given-name" : label.toLowerCase().includes("last") ? "family-name" : "off"} /></label>; }
function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex justify-between text-sm py-2" style={{ color: "#4a4438" }}><span>{label}</span><span>{value}</span></div>; }
