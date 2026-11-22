"use client";

import { useEffect, useRef, useState } from "react";
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
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [shippingCents, setShippingCents] = useState<number | null>(null);
  const [shippingQuote, setShippingQuote] = useState<{ deliveryMethod: "door" | "locker"; serviceLevelCode?: string; totalPriceCents?: number; serviceName?: string } | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"door" | "locker">("door");
  const [lockerSearch, setLockerSearch] = useState("");
  const [lockers, setLockers] = useState<Array<{code:string;name:string;address:string;type?:string;latitude:string;longitude:string;place?:{town?:string;postalCode?:string};openinghours?:Array<{day:string;open_time:string;close_time:string}>}>>([]);
  const [selectedLocker, setSelectedLocker] = useState<{code:string;name:string;address:string;latitude:string;longitude:string;place?:{town?:string;postalCode?:string}} | null>(null);
  const [lockerLoading, setLockerLoading] = useState(false);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  // State updates are async, so two quick clicks can both pass a `loading` check.
  // A ref blocks the second click immediately.
  const submitting = useRef(false);

  const totalCents = Math.max(0, subtotalCents - discountCents + (shippingCents ?? 0));

  useEffect(() => {
    if (!hydrated) return;
    if (!items.length) window.location.replace("/cart");
  }, [hydrated, items.length]);

  // Signed-in customers can check out with their saved profile and default address.
  // Guests receive a 401 from this endpoint, which is intentionally ignored.
  useEffect(() => {
    let cancelled = false;
    async function loadSavedDetails() {
      try {
        const response = await fetch("/api/account/checkout-default", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        if (data.email) setEmail((current: string) => current || data.email);
        if (data.profile) {
          setFirstName((current: string) => current || data.profile.firstName || "");
          setLastName((current: string) => current || data.profile.lastName || "");
          setPhone((current: string) => current || data.profile.phone || "");
        }
        const savedAddress = Array.isArray(data.addresses)
          ? data.addresses.find((item: { isDefault?: boolean }) => item.isDefault) ?? data.addresses[0]
          : null;
        if (savedAddress) {
          setFirstName((current: string) => current || savedAddress.firstName || "");
          setLastName((current: string) => current || savedAddress.lastName || "");
          setPhone((current: string) => current || savedAddress.phone || "");
          setAddress((current: string) => current || savedAddress.street || "");
          setSuburb((current: string) => current || savedAddress.suburb || "");
          setCity((current: string) => current || savedAddress.city || "");
          setProvince((current: string) => current || savedAddress.province || "");
          setPostalCode((current: string) => current || savedAddress.postalCode || "");
        }
      } catch {
        // Saved details are a convenience; checkout remains usable if loading fails.
      }
    }
    void loadSavedDetails();
    return () => { cancelled = true; };
  }, []);

  // Pressing Back from the Yoco page can restore this page from the browser's
  // back/forward cache with the button still stuck on "Opening secure payment…".
  // Reset it so the customer can continue; the server resumes the same order.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        submitting.current = false;
        setLoading(false);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setError(null);
    try {
      const res = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoCode, subtotalCents }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not apply promo code.");
      setAppliedPromo(data.code); setPromoCode(data.code); setDiscountCents(data.discountCents); setShippingCents(null); setShippingQuote(null);
    } catch (e) { setAppliedPromo(""); setDiscountCents(0); setShippingCents(null); setShippingQuote(null); setError(e instanceof Error ? e.message : "Could not apply promo code."); }
    finally { setPromoLoading(false); }
  }

  async function getShippingQuote() {
    setShippingLoading(true); setError(null); setShippingCents(null); setShippingQuote(null);
    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, variant: item.variant, quantity: item.quantity })),
          promoCode: appliedPromo, deliveryMethod, lockerCode: selectedLocker?.code,
          delivery: { address, suburb, city, province, postalCode },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not calculate delivery.");
      setShippingCents(Number(data.shippingCents));
      setShippingQuote({ deliveryMethod, serviceLevelCode: data.serviceLevelCode, totalPriceCents: Number(data.shippingCents), serviceName: data.serviceName });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not calculate delivery."); }
    finally { setShippingLoading(false); }
  }

  async function findLockers() {
    if (lockerSearch.trim().length < 2) return;
    setLockerLoading(true); setError(null); setSelectedLocker(null); setShippingCents(null); setShippingQuote(null);
    try { const response = await fetch(`/api/shipping/lockers?q=${encodeURIComponent(lockerSearch.trim())}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not find lockers."); setLockers(data.lockers ?? []); if (!data.lockers?.length) setError("No pickup points matched that search. Try a suburb, town or postal code."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not find lockers."); } finally { setLockerLoading(false); }
  }

  async function placeOrder() {
    setError(null);
    if (!items.length) return setError("Your bag is empty.");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!firstName.trim() || !lastName.trim()) return setError("Please enter your first and last name.");
    if (deliveryMethod === "locker" && phone.trim().length < 7) return setError("Enter a contact phone number for pickup point collection.");
    if (deliveryMethod === "door" && (!address.trim() || !suburb.trim() || !city.trim() || !province.trim() || !postalCode.trim())) return setError("Please complete your delivery address.");
    if (deliveryMethod === "locker" && !selectedLocker) return setError("Please select a pickup point.");
    if (shippingCents === null || !shippingQuote) return setError("Please calculate your delivery quote before continuing.");
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(35000), body: JSON.stringify({
        email, shipping: { firstName, lastName, phone, address, suburb, city, province, postalCode, country: "South Africa" }, promoCode: appliedPromo, deliveryMethod, locker: selectedLocker, shippingQuote,
        items: items.map((i) => ({ id: i.id, name: i.name, variant: i.variant, quantity: i.quantity })),
      }) });
      const data = await res.json();
      // This exact bag was paid moments ago. Show that order instead of charging again.
      if (data.alreadyPaid && data.orderId) { window.location.assign(`/checkout/success?order=${data.orderId}`); return; }
      if (!res.ok || !data.redirectUrl) throw new Error(data.error ?? "Could not start secure payment.");
      window.location.assign(data.redirectUrl);
    } catch (e) {
      // A timeout here is safe to retry: the server resumes the same order and
      // Yoco checkout, so pressing the button again cannot create a second charge.
      const timedOut = e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");
      setError(timedOut ? "That took longer than expected. You have not been charged. Please try again." : e instanceof Error ? e.message : "Checkout failed. Please try again.");
      submitting.current = false;
      setLoading(false);
    }
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
            <fieldset><legend className="text-xs font-black uppercase tracking-wide mb-4">Contact</legend><div className="grid sm:grid-cols-2 gap-4"><Field label="First name" value={firstName} onChange={setFirstName} placeholder="Thabo" /><Field label="Last name" value={lastName} onChange={setLastName} placeholder="Mokoena" /><Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@email.com" /><Field label={deliveryMethod === "locker" ? "Phone (required for locker collection)" : "Phone (optional)"} value={phone} onChange={setPhone} placeholder="082 123 4567" /></div></fieldset>
            <fieldset><legend className="text-xs font-black uppercase tracking-wide mb-4">Delivery method</legend><div className="grid sm:grid-cols-2 gap-3"><button type="button" onClick={() => { setDeliveryMethod("door"); setShippingCents(null); setShippingQuote(null); setSelectedLocker(null); }} className={`rounded-2xl border p-4 text-left ${deliveryMethod === "door" ? "border-black bg-white" : "border-black/15"}`}><span className="block text-sm font-black">Door-to-door</span><span className="mt-1 block text-xs text-neutral-500">Deliver to your address</span></button><button type="button" onClick={() => { setDeliveryMethod("locker"); setShippingCents(null); setShippingQuote(null); setSelectedLocker(null); }} className={`rounded-2xl border p-4 text-left ${deliveryMethod === "locker" ? "border-black bg-white" : "border-black/15"}`}><span className="block text-sm font-black">Pickup point collection</span><span className="mt-1 block text-xs text-neutral-500">Collect from a locker, kiosk or pickup point</span></button></div></fieldset>
            {deliveryMethod === "door" ? <fieldset><legend className="text-xs font-black uppercase tracking-wide mb-4">Shipping address</legend><div className="mt-4"><Field label="Street address" value={address} onChange={(v) => { setAddress(v); setShippingCents(null); setShippingQuote(null); }} placeholder="12 Vilakazi Street" /></div><div className="grid sm:grid-cols-2 gap-4 mt-4"><Field label="Suburb" value={suburb} onChange={(v) => { setSuburb(v); setShippingCents(null); setShippingQuote(null); }} placeholder="e.g. Rosebank" /><Field label="City" value={city} onChange={(v) => { setCity(v); setShippingCents(null); setShippingQuote(null); }} placeholder="Johannesburg" /></div><div className="grid sm:grid-cols-2 gap-4 mt-4"><Field label="Province" value={province} onChange={(v) => { setProvince(v); setShippingCents(null); setShippingQuote(null); }} placeholder="Gauteng" /><Field label="Postal code" value={postalCode} onChange={(v) => { setPostalCode(v); setShippingCents(null); setShippingQuote(null); }} placeholder="2001" /></div></fieldset> : <fieldset><legend className="text-xs font-black uppercase tracking-wide mb-4">Choose a pickup point</legend><div className="flex gap-2"><input value={lockerSearch} onChange={(e)=>setLockerSearch(e.target.value)} className={inputClass} placeholder="Search suburb, town or postal code" /><button type="button" onClick={findLockers} disabled={lockerLoading || lockerSearch.trim().length < 2} className="rounded-xl bg-black px-4 text-xs font-black uppercase text-white disabled:opacity-50">{lockerLoading ? "Searching" : "Find"}</button></div><div className="mt-3 space-y-2">{lockers.map((locker)=> <button type="button" key={locker.code} onClick={()=>{setSelectedLocker(locker);setShippingCents(null);setShippingQuote(null);}} className={`w-full rounded-xl border p-3 text-left ${selectedLocker?.code===locker.code?"border-black bg-white":"border-black/10 bg-white/50"}`}><span className="block text-sm font-bold">{locker.name}</span><span className="mt-1 block text-xs text-neutral-600">{locker.address}</span><span className="mt-1 block text-[11px] text-neutral-500">{locker.type?<span className="capitalize">{locker.type} · </span>:null}{locker.code}{locker.place?.town?` · ${locker.place.town}`:""}{locker.place?.postalCode?` · ${locker.place.postalCode}`:""}</span>{locker.openinghours?.length ? <span className="mt-1 block text-[11px] text-neutral-500">Hours: {locker.openinghours.slice(0, 3).map((hours) => `${hours.day} ${hours.open_time.slice(0,5)}–${hours.close_time.slice(0,5)}`).join(" · ")}{locker.openinghours.length > 3 ? " · More hours" : ""}</span> : null}</button>)}</div>{selectedLocker && <p className="mt-3 rounded-lg bg-white p-3 text-xs font-bold">Selected: {selectedLocker.name}</p>}</fieldset>}
            <fieldset><legend className="text-xs font-black uppercase tracking-wide mb-4">Promo code</legend><div className="flex gap-2"><input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} className={inputClass} placeholder="Enter code" /><button type="button" onClick={applyPromo} disabled={promoLoading} style={{ background: palette.black, color: palette.cream }} className="px-5 rounded-xl text-xs font-black uppercase disabled:opacity-50">{promoLoading ? "Checking" : appliedPromo ? "Applied" : "Apply"}</button></div></fieldset>
          </div>
          {error && <div role="alert" className="mt-7 rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>}
        </section>

        <aside style={{ background: palette.beige }} className="rounded-[24px] p-6 sm:p-7 lg:sticky lg:top-24">
          <h2 className="text-sm font-black uppercase mb-5">Your order</h2>
          {items.some((item) => item.productType === "made-to-order") && (
            <div className="mb-5 rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-wide">Made-to-order items</p>
              <p className="text-xs text-neutral-600 leading-relaxed mt-1">Funkful Originals take 5–7 working days to complete before packaging and shipping.</p>
            </div>
          )}
          <div className="space-y-4 mb-5">
            {items.map((item) => {
              const brand = brands[item.brand];
              const productImage = item.imageUrl || brand.logo;

              return (
                <div key={item.id} className="flex gap-3 items-start">
                  <div
                    style={{ background: brand.accent }}
                    className="w-12 h-12 rounded-xl p-1 flex items-center justify-center shrink-0"
                  >
                    <Image
                      src={productImage}
                      alt={item.imageUrl ? item.name : `${item.brand} logo`}
                      width={48}
                      height={48}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="text-xs text-neutral-500">
                      Qty {item.quantity}
                      {item.variant ? ` · ${item.variant?.replace(/Reference image: pending\/[0-9a-f-]{36}\.(?:jpg|png|webp)/g, "Reference image attached")}` : ""}
                    </p>
                  </div>

                  <span className="font-bold text-sm">
                    {formatRands(item.priceCents * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>
          <SummaryRow label="Subtotal" value={formatRands(subtotalCents)} /><SummaryRow label="Discount" value={discountCents ? `-${formatRands(discountCents)}` : "—"} /><SummaryRow label="Shipping" value={shippingCents === null ? "Calculate quote" : shippingCents === 0 ? <span style={{ color: "#4a6b3c" }}>Free</span> : formatRands(shippingCents)} />
          {shippingQuote?.serviceName && <p className="text-xs text-neutral-600">{shippingQuote.serviceName}</p>}
          <button type="button" onClick={getShippingQuote} disabled={shippingLoading || (deliveryMethod === "door" ? (!address.trim() || !suburb.trim() || !city.trim() || !province.trim() || !postalCode.trim()) : !selectedLocker)} className="w-full rounded-full border border-black/20 py-3 mt-4 text-xs font-black uppercase disabled:opacity-50">{shippingLoading ? "Calculating delivery…" : shippingCents === null ? "Calculate delivery" : "Refresh delivery quote"}</button>
          <div className="border-t mt-3 pt-4 flex justify-between font-black text-lg"><span>Total</span><span>{shippingCents === null ? "Calculate delivery" : formatRands(totalCents)}</span></div>
          <button type="button" onClick={placeOrder} disabled={loading || shippingCents === null || !shippingQuote} style={{ background: palette.black, color: palette.cream }} className="w-full py-4 rounded-full mt-6 text-xs font-black uppercase disabled:opacity-60">{loading ? "Opening secure payment…" : "Continue to secure payment"}</button>
          <p className="text-xs text-neutral-500 leading-relaxed mt-4 text-center">Your delivery quote is confirmed. You will be redirected to Yoco to complete payment. We only treat a verified payment webhook as confirmation of payment.</p>
        </aside>
      </div>
    </div>
  </CheckoutShell>;
}

function CheckoutShell({ children }: { children: React.ReactNode }) { return <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen"><header style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }}><div className="max-w-[1180px] mx-auto px-5 sm:px-8 flex items-center justify-between py-4"><Link href="/"><Image src={brands.funkful.logo} alt="Funkful" width={110} height={24} className="w-auto" /></Link><span className="text-sm font-semibold text-neutral-500">🔒 Secure checkout</span></div></header>{children}</main>; }
function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} autoComplete={label.toLowerCase().includes("email") ? "email" : label.toLowerCase().includes("first") ? "given-name" : label.toLowerCase().includes("last") ? "family-name" : "off"} /></label>; }
function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex justify-between text-sm py-2" style={{ color: "#4a4438" }}><span>{label}</span><span>{value}</span></div>; }
