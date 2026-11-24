"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { brands, palette } from "@/lib/brands";
import { getProductThumbnailUrl } from "@/lib/product-images/paths";

function formatRands(cents: number) { return `R${(cents / 100).toFixed(2)}`; }

// Keep in step with shipping_settings.free_shipping_threshold_cents (checkout uses the database value).
const FREE_SHIPPING_THRESHOLD_CENTS = 50000;

export default function CartPage() {
  const { items, hydrated, setQuantity, removeItem, subtotalCents, itemCount } = useCart();
  const qualifiesForFreeShipping = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const shippingLabel = qualifiesForFreeShipping ? <span className="font-semibold" style={{ color: "#4a6b3c" }}>Free standard delivery</span> : "Calculated at checkout";
  const totalCents = subtotalCents;
  const remainingForFreeCents = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
  const freeShippingProgress = Math.min(100, Math.round((subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100));
  const brandsInCart = new Set(items.map((item) => item.brand));

  if (!hydrated) return <CartShell><div className="py-20 text-center text-sm text-neutral-500">Loading your bag…</div></CartShell>;

  return (
    <CartShell>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-10 sm:py-14 pb-24">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-[0.15em] mb-2">Your Funkful bag</p>
            <h1 className="text-3xl sm:text-4xl font-black uppercase">{items.length ? "Ready when you are" : "Your bag is empty"}</h1>
          </div>
          {items.length > 0 && <span className="text-sm text-neutral-500">{itemCount} {itemCount === 1 ? "item" : "items"}</span>}
        </div>

        {items.length === 0 ? (
          <div style={{ background: palette.beige }} className="rounded-[28px] p-8 sm:p-12 text-center max-w-2xl">
            <div className="text-5xl mb-5">🛍️</div>
            <h2 className="text-xl font-black uppercase mb-3">Nothing in your bag yet</h2>
            <p className="text-sm text-neutral-600 leading-relaxed mb-7">Find something personalized, grab a mystery scoop, or browse both. You can mix Funkful Originals and Scoopful in one order.</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link href="/originals" style={{ background: palette.black, color: palette.cream }} className="px-6 py-3.5 rounded-full text-xs font-extrabold uppercase">Shop Funkful</Link>
              <Link href="/scoopful" className="px-6 py-3.5 rounded-full border-2 border-black text-xs font-extrabold uppercase">Shop Scoopful</Link>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1.55fr_0.75fr] gap-10 items-start">
            <section>
              {items.some((item) => item.productType === "made-to-order") && (
                <div className="mb-5 rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-wide">Made-to-order items</p>
                  <p className="text-xs text-neutral-600 leading-relaxed mt-1">Funkful Originals are made to order and take 5–7 working days to complete before packaging and shipping. They cannot be personalised.</p>
                </div>
              )}
              {brandsInCart.size > 1 && <div style={{ background: palette.sage, color: "#1c2617" }} className="text-xs font-bold uppercase tracking-wide px-4 py-3 rounded-2xl mb-5">🛍️ Funkful + Scoopful in one order — one shipment, one checkout</div>}
              <div className="divide-y border-y" style={{ borderColor: "rgba(17,17,17,0.1)" }}>
                {items.map((item) => {
                  const brand = brands[item.brand];
                  const imageUrl = getProductThumbnailUrl(item.imageUrl);
                  return <div key={item.id} className="py-5 grid grid-cols-[72px_1fr_auto] sm:grid-cols-[92px_1fr_auto] gap-4 items-center">
                    <div style={{ background: brand.accent }} className="w-[72px] h-[72px] sm:w-[92px] sm:h-[92px] rounded-2xl flex items-center justify-center p-4">
                      <Image
                        src={imageUrl || brand.logo}
                        alt=""
                        width={54}
                        height={54}
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p style={{ color: "#8a4a45" }} className="text-[10px] font-bold uppercase tracking-wide">{brand.name}</p>
                      <h2 className="font-bold text-sm sm:text-base mt-1">{item.name}</h2>
                      {item.variant && <p className="text-xs text-neutral-500 mt-1.5 break-words">{item.variant}</p>}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="inline-flex items-center border rounded-full overflow-hidden" style={{ borderColor: "rgba(17,17,17,0.2)" }}>
                          <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="w-8 h-8" aria-label={`Decrease quantity of ${item.name}`}>−</button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="w-8 h-8" aria-label={`Increase quantity of ${item.name}`}>+</button>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="text-xs underline text-neutral-500">Remove</button>
                      </div>
                    </div>
                    <div className="text-right font-bold text-sm sm:text-base">{formatRands(item.priceCents * item.quantity)}</div>
                  </div>;
                })}
              </div>
              <Link href="/originals" className="inline-block mt-6 text-xs font-bold uppercase underline">← Continue shopping</Link>
            </section>

            <aside style={{ background: palette.beige }} className="rounded-[24px] p-6 sm:p-7 lg:sticky lg:top-24">
              <h2 className="text-sm font-black uppercase mb-4">Order summary</h2>
              <SummaryRow label={`Subtotal (${itemCount} ${itemCount === 1 ? "item" : "items"})`} value={formatRands(subtotalCents)} />
              <SummaryRow label="Shipping" value={shippingLabel} />
              <div className="mt-2 rounded-2xl bg-white/60 px-4 py-3">
                {qualifiesForFreeShipping ? (
                  <p className="text-xs font-bold" style={{ color: "#4a6b3c" }}>🎉 You&apos;ve unlocked free standard delivery!</p>
                ) : (
                  <>
                    <p className="text-xs font-bold" style={{ color: "#4a4438" }}>Add <span style={{ color: "#8a4a45" }}>{formatRands(remainingForFreeCents)}</span> more for free standard delivery</p>
                    <div
                      className="mt-2 h-2 w-full overflow-hidden rounded-full"
                      style={{ background: "rgba(17,17,17,0.1)" }}
                      role="progressbar"
                      aria-label="Progress towards free delivery"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={freeShippingProgress}
                    >
                      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${freeShippingProgress}%`, background: "#4a6b3c" }} />
                    </div>
                  </>
                )}
              </div>
              <div className="border-t mt-3 pt-4 flex justify-between font-black"><span>Merchandise subtotal</span><span>{formatRands(totalCents)}</span></div>
              <Link href="/checkout" style={{ background: palette.black, color: palette.cream }} className="block text-center w-full py-4 rounded-full mt-6 text-xs font-extrabold uppercase tracking-wide">Continue to checkout</Link>
              <p className="text-xs text-neutral-500 leading-relaxed mt-4">Delivered by The Courier Guy to your door, or to a locker, kiosk or pickup point near you. Free standard delivery on orders of R500 or more. Orders below R500 get a live delivery quote at checkout once you choose how you&apos;d like it delivered. Secure payment is handled by Yoco.</p>
            </aside>
          </div>
        )}
      </div>
    </CartShell>
  );
}

function CartShell({ children }: { children: React.ReactNode }) {
  return <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen"><header style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }}><div className="max-w-[1180px] mx-auto px-5 sm:px-8 flex items-center justify-between py-4"><Link href="/"><Image unoptimized src={brands.funkful.logo} alt="Funkful" width={110} height={24} className="h-6 w-auto" /></Link><span className="text-sm font-semibold text-neutral-500">🔒 Secure checkout</span></div></header>{children}</main>;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex justify-between text-sm py-2" style={{ color: "#4a4438" }}><span>{label}</span><span>{value}</span></div>; }