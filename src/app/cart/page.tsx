// src/app/cart/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { brands, palette } from "@/lib/brands";

function formatRands(cents: number) {
  return `R${(cents / 100).toFixed(0)}`;
}

const paymentMethods = ["Card", "Instant EFT", "SnapScan", "Payflex"];

export default function CartPage() {
  const { items, setQuantity, removeItem, subtotalCents } = useCart();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandsInCart = new Set(items.map((i) => i.brand));
  const totalCents = subtotalCents; // shipping is free, no promo logic wired yet

  async function handlePlaceOrder() {
    setError(null);

    if (!items.length) {
      setError("Your bag is empty.");
      return;
    }
    if (!email) {
      setError("Enter an email so we can send your order confirmation.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          shipping: { firstName, lastName, address, city, postalCode },
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            variant: i.variant,
            priceCents: i.priceCents,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        throw new Error(data.error ?? "Something went wrong starting checkout.");
      }

      // Yoco hosts the actual payment page — send the customer there.
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ background: palette.cream, color: palette.black }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
        <div className="max-w-[1180px] mx-auto px-8 flex items-center justify-between py-4">
          <Link href="/">
            <Image src={brands.funkful.logo} alt="Funkful" width={110} height={24} className="h-6 w-auto" />
          </Link>
          <span className="text-sm font-semibold text-neutral-500">🔒 Secure checkout</span>
        </div>
      </header>

      {/* Stepper */}
      <div className="max-w-[1180px] mx-auto px-8 pt-6 pb-2">
        <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wide text-neutral-400">
          <span className="flex items-center gap-1.5" style={{ color: palette.black }}>
            <span style={{ background: palette.black, color: palette.cream }} className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10.5px]">1</span>
            Bag
          </span>
          <span className="w-7 h-px bg-black/20" />
          <span>Details</span>
          <span className="w-7 h-px bg-black/20" />
          <span>Shipping</span>
          <span className="w-7 h-px bg-black/20" />
          <span>Payment</span>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-8 py-9 pb-24 grid lg:grid-cols-[1.5fr_1fr] gap-11 items-start">
        {/* LEFT: bag + delivery form */}
        <div>
          <h1 className="text-[28px] font-extrabold uppercase mb-5">Your bag</h1>

          {brandsInCart.size > 1 && (
            <div
              style={{ background: palette.sage, color: "#1c2617" }}
              className="text-xs font-bold uppercase tracking-wide px-4.5 py-3 rounded-2xl flex items-center gap-2.5 mb-6"
            >
              🛍️ Funkful + Scoopful in one order — one shipment, one checkout
            </div>
          )}

          {items.length === 0 && (
            <p className="text-sm text-neutral-500 py-8">
              Your bag is empty. <Link href="/scoopful" className="underline">Go find a scoop.</Link>
            </p>
          )}

          {items.map((item) => {
            const brand = brands[item.brand];
            return (
              <div key={item.id} style={{ borderColor: "rgba(17,17,17,0.1)" }} className="grid grid-cols-[88px_1fr_auto] gap-4.5 items-center py-5 border-b">
                <div style={{ background: brand.accent }} className="w-[88px] h-[88px] rounded-2xl flex items-center justify-center p-2.5">
                  <Image src={brand.logo} alt="" width={44} height={44} className="object-contain" />
                </div>
                <div>
                  <span style={{ color: "#8a4a45" }} className="text-[10.5px] font-bold uppercase tracking-wide block mb-1">
                    {brand.name.split(" ")[0]}
                  </span>
                  <h4 className="text-sm font-bold mb-1">{item.name}</h4>
                  {item.variant && <div className="text-xs text-neutral-500 mb-2.5">{item.variant}</div>}
                  <div style={{ borderColor: "rgba(17,17,17,0.2)" }} className="inline-flex items-center border rounded-full overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 text-sm"
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 text-sm"
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm mb-2.5">{formatRands(item.priceCents * item.quantity)}</div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-xs underline"
                    style={{ color: "#a48f8b" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex gap-2.5 mt-6.5">
            <input
              type="text"
              placeholder="Promo code"
              style={{ borderColor: "rgba(17,17,17,0.2)" }}
              className="flex-1 border rounded-full px-4.5 py-3.5 text-sm bg-transparent"
            />
            <button
              type="button"
              style={{ background: palette.black, color: palette.cream }}
              className="font-bold text-xs uppercase tracking-wide px-5.5 py-3.5 rounded-full"
            >
              Apply
            </button>
          </div>

          {/* Delivery details */}
          <div className="mt-12">
            <h2 className="text-[22px] font-extrabold uppercase mb-6">Delivery details</h2>

            <div className="mb-8">
              <h3 style={{ color: "#4a4438" }} className="text-xs font-extrabold uppercase tracking-wide mb-4">Contact</h3>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} className="w-full" />
              </Field>
            </div>

            <div className="mb-8">
              <h3 style={{ color: "#4a4438" }} className="text-xs font-extrabold uppercase tracking-wide mb-4">Shipping address</h3>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <Field label="First name">
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Thabo" style={inputStyle} className="w-full" />
                </Field>
                <Field label="Last name">
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mokoena" style={inputStyle} className="w-full" />
                </Field>
              </div>
              <div className="mt-3.5">
                <Field label="Address">
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 Vilakazi Street" style={inputStyle} className="w-full" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3.5 mt-3.5">
                <Field label="City">
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Johannesburg" style={inputStyle} className="w-full" />
                </Field>
                <Field label="Postal code">
                  <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="2001" style={inputStyle} className="w-full" />
                </Field>
              </div>
            </div>

            <div>
              <h3 style={{ color: "#4a4438" }} className="text-xs font-extrabold uppercase tracking-wide mb-4">Payment method</h3>
              <div className="flex gap-2.5 flex-wrap">
                {paymentMethods.map((method, i) => (
                  <span
                    key={method}
                    style={i === 0 ? { background: palette.black, color: palette.cream, borderColor: palette.black } : { borderColor: "rgba(17,17,17,0.2)" }}
                    className="border rounded-xl px-4 py-3 text-xs font-bold uppercase"
                  >
                    {method}
                  </span>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                You&apos;ll enter your card details on Yoco&apos;s secure payment page after clicking Place order.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: order summary */}
        <div style={{ background: palette.beige }} className="rounded-[22px] p-7 sticky top-5">
          <h3 className="text-sm font-extrabold uppercase mb-4.5">Order summary</h3>
          <Row label={`Subtotal (${items.reduce((n, i) => n + i.quantity, 0)} items)`} value={formatRands(subtotalCents)} />
          <Row label="Shipping" value={<span style={{ color: "#4a6b3c" }} className="font-semibold">Free</span>} />
          <div style={{ borderColor: "rgba(17,17,17,0.15)" }} className="border-t mt-2 pt-4 flex justify-between font-extrabold text-base">
            <span>Total</span>
            <span>{formatRands(totalCents)}</span>
          </div>

          {error && <p className="text-xs mt-4" style={{ color: "#8a2f2b" }}>{error}</p>}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={loading}
            style={{ background: palette.black, color: palette.cream }}
            className="w-full font-extrabold text-xs uppercase tracking-wide py-4 rounded-full mt-5 disabled:opacity-60"
          >
            {loading ? "Redirecting to Yoco…" : "Place order"}
          </button>

          <div style={{ borderColor: "rgba(17,17,17,0.2)" }} className="flex gap-2.5 items-start mt-5 pt-4.5 border-t border-dashed text-xs leading-relaxed" >
            <span>🎁</span>
            <span style={{ color: "#5a5248" }}>
              Every order ships in one box with a hand-signed thank-you card, loyalty QR, and a die-cut sticker for whichever brand you scooped.
            </span>
          </div>
        </div>
      </div>

      <footer style={{ background: palette.beige }} className="py-9">
        <div className="max-w-[1180px] mx-auto px-8 flex justify-between text-xs text-neutral-600 flex-wrap gap-2.5">
          <span>© 2026 Funkful (Pty) Ltd. All rights reserved.</span>
          <span>funkful.co.za</span>
        </div>
      </footer>
    </main>
  );
}

const inputStyle = {
  borderColor: "rgba(17,17,17,0.2)",
  background: palette.cream,
} as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ color: "#6a6458" }} className="text-[11.5px] font-semibold uppercase tracking-wide">{label}</span>
      <span className="[&>input]:border [&>input]:rounded-xl [&>input]:px-3.5 [&>input]:py-3 [&>input]:text-sm">{children}</span>
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-2" style={{ color: "#4a4438" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
