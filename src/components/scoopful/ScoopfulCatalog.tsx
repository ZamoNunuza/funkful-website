"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { getProductThumbnailUrl } from "@/lib/product-images/paths";
import { brands, palette, scoopfulBright as bright } from "@/lib/brands";
import { useCart } from "@/lib/cart-context";

type ProductImage = {
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

type ScoopfulProduct = {
  id: string;
  brand: "scoopful";
  category: string;
  product_type:
    | "ready-made"
    | "made-to-order"
    | "personalize"
    | "mystery"
    | "addon";
  name: string;
  slug: string;
  description: string | null;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  badge: string | null;
  swatch?: string | null;
  featured: boolean;
  sort_order: number;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
  product_images: ProductImage[];
};

type Props = {
  products: ScoopfulProduct[];
  scoops: ScoopfulProduct[];
  addOns: ScoopfulProduct[];
};

// Keep in step with src/app/cart/page.tsx (checkout uses the database value).
const FREE_SHIPPING_THRESHOLD_CENTS = 50000;

const B = bright.balls;

const heroBalls = [
  { color: B.yellow, size: "38%", top: "2%", left: "8%" },
  { color: B.blue, size: "44%", top: "10%", right: "4%" },
  { color: B.red, size: "34%", bottom: "6%", left: "2%" },
  { color: B.green, size: "40%", bottom: "0%", right: "12%" },
  { color: B.orange, size: "30%", top: "36%", left: "34%" },
];

const ballSystem = [
  { name: "Blue", tag: "Everyday", desc: "Scrunchies, makeup puffs, pimple patches — small daily joys.", color: B.blue },
  { name: "Yellow", tag: "Common", desc: "Lip balm, hand cream, roll-on perfume, coin purses.", color: B.yellow },
  { name: "Green", tag: "Uncommon", desc: "Mini perfumes, key holders, notebook & pen sets.", color: B.green },
  { name: "Red", tag: "Rare", desc: "Glowing serum, sunscreen — skincare heroes.", color: B.red },
  { name: "Orange", tag: "Grand Prize", desc: "Cosmetic bags, jewelry pouches, care sets.", color: B.orange },
];

const howItWorks = [
  { n: "01", title: "Pick your scoop", body: "Each tier sets exactly which ball colors are guaranteed — not the exact items inside them." },
  { n: "02", title: "We pack the mystery", body: "Curated from real stock, sealed and packed for your surprise." },
  { n: "03", title: "You scoop, you share", body: "Unbox on camera or just for you — either way, tag us for a shot at a restock feature." },
];

const ballShadow =
  "inset -4px -5px 9px rgba(0,0,0,0.18), inset 3px 4px 7px rgba(255,255,255,0.45)";

function formatRands(cents: number) {
  return `R${(cents / 100).toFixed(0)}`;
}

/** Strips the old "hand-packed same day" promise from product copy stored in Supabase. */
function cleanCopy(text: string | null, fallback: string) {
  if (!text) return fallback;
  const cleaned = text.replace(/[,;]?\s*hand-?packed same[- ]day\.?/gi, "").trim();
  if (!cleaned) return fallback;
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}


function getPrimaryImage(product: ScoopfulProduct): ProductImage | null {
  const images = (product.product_images ?? [])
    .filter(
      (image) =>
        typeof image.image_url === "string" &&
        image.image_url.trim().length > 0
    )
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1;
      }

      return a.sort_order - b.sort_order;
    });

  return images[0] ?? null;
}


function getBallColors(product: ScoopfulProduct) {
  const name = product.name.toLowerCase();
  if (name.includes("lucky")) return [B.blue, B.blue, B.blue, B.yellow, B.yellow, B.green];
  if (name.includes("deluxe")) return [B.blue, B.blue, B.yellow, B.yellow, B.green, B.green, B.red];
  if (name.includes("vip")) return [B.blue, B.yellow, B.yellow, B.green, B.green, B.red, B.red, B.orange];
  if (name.includes("grand")) return [B.yellow, B.green, B.red, B.red, B.orange, B.orange];
  return [B.blue, B.yellow, B.green, B.red, B.orange];
}

function getThumbBackground(product: ScoopfulProduct) {
  const name = product.name.toLowerCase();
  if (name.includes("lucky")) return bright.blush;
  if (name.includes("deluxe")) return bright.sage;
  if (name.includes("vip")) return bright.lavender;
  if (name.includes("grand")) return bright.gold;
  return palette.cream;
}

function isSoldOut(product: ScoopfulProduct) {
  return product.track_inventory && product.stock_quantity <= 0;
}

function BallRow({ colors, size = 18 }: { colors: string[]; size?: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap" aria-hidden="true">
      {colors.map((color, i) => (
        <span
          key={i}
          className="rounded-full inline-block"
          style={{ width: size, height: size, background: color, boxShadow: ballShadow }}
        />
      ))}
    </div>
  );
}

function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{ color: color ?? "var(--brand-ink)" }}
      className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5"
    >
      {children}
    </span>
  );
}

function AddToBagButton({
  product,
  kind,
}: {
  product: ScoopfulProduct;
  kind: "mystery" | "addon";
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = isSoldOut(product);

  function handleAdd() {
    addItem({
      id: product.id,
      brand: "scoopful",
      name: product.name,
      priceCents: product.base_price_cents,
      imageUrl: getPrimaryImage(product)?.image_url ?? null,
      productType: kind,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={handleAdd}
      style={{
        background: added ? bright.balls.green : bright.blushDeep,
        color: "#fff",
      }}
      className="flex-1 text-[12px] font-extrabold uppercase tracking-wide px-5 py-3 rounded-full disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
    >
      {soldOut ? "Sold out" : added ? "Added ✓" : "Add to bag"}
    </button>
  );
}

function PriceLine({ product }: { product: ScoopfulProduct }) {
  const hasCompare =
    product.compare_at_price_cents &&
    product.compare_at_price_cents > product.base_price_cents;
  return (
    <div>
      {hasCompare && (
        <span className="line-through text-neutral-400 text-xs mr-2">
          {formatRands(product.compare_at_price_cents as number)}
        </span>
      )}
      <span className="text-2xl font-black">{formatRands(product.base_price_cents)}</span>
    </div>
  );
}

/** Live free-delivery progress, driven by what is already in the bag. */
function DeliveryMeter() {
  const { subtotalCents, itemCount, hydrated } = useCart();
  const hasItems = hydrated && itemCount > 0;
  const unlocked = hasItems && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
  const pct = hasItems
    ? Math.min(100, Math.round((subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100))
    : 0;

  return (
    <div style={{ background: palette.black, color: palette.cream }}>
      <div className="max-w-[1180px] mx-auto px-8 py-3 flex items-center gap-4 flex-wrap justify-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-wide">
          {unlocked ? (
            <>🎉 You’ve unlocked <span style={{ color: bright.gold }}>free delivery</span></>
          ) : hasItems ? (
            <>Add <span style={{ color: bright.gold }}>{formatRands(remaining)}</span> more for free delivery</>
          ) : (
            <>🚚 Free standard delivery on orders of <span style={{ color: bright.gold }}>R500+</span></>
          )}
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[260px]">
          <div
            className="h-2 flex-1 rounded-full overflow-hidden"
            style={{ background: "rgba(250,248,244,0.2)" }}
            role="progressbar"
            aria-label="Progress to free delivery"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: unlocked ? B.green : bright.gold }}
            />
          </div>
          {hasItems && (
            <Link href="/cart" className="text-[11px] font-bold uppercase tracking-wide underline">
              View bag
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoopImageArea({ product }: { product: ScoopfulProduct }) {
  const image = getPrimaryImage(product);
  const balls = getBallColors(product);

  return (
    <div
      className="relative min-h-[210px] overflow-hidden flex items-center justify-center"
      style={{ background: getThumbBackground(product) }}
    >
      {product.badge && (
        <span
          style={{ background: palette.black, color: palette.cream }}
          className="absolute z-10 top-4 left-4 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide"
        >
          {product.badge}
        </span>
      )}

      {image ? (
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block" aria-label={`View ${product.name}`}>
          <Image
            src={getProductThumbnailUrl(image.image_url) ?? image.image_url}
            alt={image.alt_text || product.name}
            fill
            unoptimized
            className="object-contain p-7 transition-transform duration-300 hover:scale-105"
          />
        </Link>
      ) : (
        <div className="px-10 max-w-[220px]">
          <BallRow colors={balls} size={28} />
        </div>
      )}
    </div>
  );
}

export default function ScoopfulCatalog({ scoops, addOns }: Props) {
  const scoopful = brands.scoopful;
  const { subtotalCents, itemCount, hydrated } = useCart();

  const cheapest = scoops.length
    ? Math.min(...scoops.map((s) => s.base_price_cents))
    : null;
  const bagHasItems = hydrated && itemCount > 0;

  return (
    <>
      <DeliveryMeter />

      {/* Breadcrumb */}
      <div className="max-w-[1180px] mx-auto px-8 pt-4 text-xs text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> /{" "}
        <span className="text-black font-medium">Scoopful</span>
      </div>

      {/* Hero */}
      <section style={{ background: bright.blush }} className="mt-4 py-11 md:py-14 overflow-hidden">
        <div className="max-w-[1180px] mx-auto px-8 grid md:grid-cols-[240px_1fr] gap-10 items-center">
          <div className="relative w-full aspect-square max-w-[240px] mx-auto md:mx-0">
            {heroBalls.map((ball, index) => (
              <div
                key={index}
                className="absolute rounded-full"
                style={{
                  width: ball.size,
                  height: ball.size,
                  top: ball.top,
                  left: ball.left,
                  right: ball.right,
                  bottom: ball.bottom,
                  background: ball.color,
                  boxShadow:
                    "inset -6px -8px 14px rgba(0,0,0,0.16), inset 4px 6px 10px rgba(255,255,255,0.45)",
                }}
              />
            ))}
            <Image unoptimized
              src={scoopful.logo}
              alt={scoopful.name}
              width={500}
              height={500}
              priority
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto drop-shadow-lg"
              draggable={false}
            />
          </div>

          <div>
            <span
              style={{ background: palette.black, color: palette.cream }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide mb-4"
            >
              {scoopful.eyebrow}
            </span>

            <h1 style={{ color: "var(--brand-ink)" }} className="text-4xl md:text-6xl font-black uppercase leading-[1.05] mb-4">
              Scoop. Surprise. <span style={{ color: "#fff", textShadow: "0 2px 0 rgba(91,47,43,0.25)" }}>Smile.</span>
            </h1>

            <p style={{ color: "#5b3d38" }} className="text-base leading-relaxed max-w-lg mb-7">
              Pick a scoop and we’ll pack the mystery. Every scoop guarantees a
              mix of colors — and the rarer the color, the bigger the prize.
              No two scoops are ever identical.
            </p>

            <div className="flex gap-3 flex-wrap">
              <a
                href="#catalog"
                style={{ background: palette.black, color: palette.cream }}
                className="font-extrabold text-xs uppercase tracking-wide px-7 py-4 rounded-full shadow-md"
              >
                Shop mystery scoops{cheapest ? ` · from ${formatRands(cheapest)}` : ""}
              </a>
              <a
                href="#unboxing"
                style={{ borderColor: "var(--brand-ink)", color: "var(--brand-ink)" }}
                className="font-bold text-xs uppercase tracking-wide px-6 py-4 rounded-full border-2"
              >
                ▶ Watch an unboxing
              </a>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold" style={{ color: "#5b3d38" }}>
              <li>✨ No two scoops identical</li>
              <li>🎯 Colors guaranteed per tier</li>
              <li>🚚 Live Courier Guy rates</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Scoops — first thing after the hero */}
      <section id="catalog" className="pt-14 pb-14 scroll-mt-4">
        <div className="max-w-[1180px] mx-auto px-8">
          <Eyebrow>Choose your surprise</Eyebrow>
          <div className="flex items-end justify-between gap-5 flex-wrap mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-2">Mystery scoops</h2>
              <p className="text-sm text-neutral-600 max-w-xl leading-relaxed">
                Four tiers, one rule: the higher the tier, the better the guaranteed finds.
              </p>
            </div>
          </div>

          {scoops.length === 0 ? (
            <div className="rounded-[20px] border p-10 text-center" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
              <h3 className="font-extrabold uppercase mb-2">Scoops are being restocked</h3>
              <p className="text-sm text-neutral-600">Check back soon for the next Scoopful drop.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {scoops.map((scoop) => {
                const popular = scoop.badge?.toLowerCase().includes("best");
                return (
                  <div
                    key={scoop.id}
                    style={{
                      background: "#fff",
                      borderColor: popular ? bright.blushDeep : "rgba(17,17,17,0.08)",
                      borderWidth: popular ? 2 : 1,
                    }}
                    className="border rounded-[20px] overflow-hidden flex flex-col shadow-sm"
                  >
                    <ScoopImageArea product={scoop} />

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-base font-extrabold uppercase mb-1">{scoop.name}</h3>
                      <div className="mb-3">
                        <div className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
                          Colors in your scoop
                        </div>
                        <BallRow colors={getBallColors(scoop)} />
                      </div>

                      <p className="text-xs text-neutral-600 leading-relaxed mb-5 flex-1">
                        {cleanCopy(scoop.description, "A mystery Scoopful packed with surprise finds.")}
                      </p>

                      <div className="flex items-end justify-between gap-3 mb-3">
                        <PriceLine product={scoop} />
                      </div>

                      <div className="flex gap-2">
                        <AddToBagButton product={scoop} kind="mystery" />
                        <Link
                          href={`/products/${scoop.slug}`}
                          className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-3 rounded-full border"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Premium add-ons — product image front and centre */}
      <section id="addons" className="pb-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <Eyebrow>Skip the mystery</Eyebrow>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-2">Premium add-ons</h2>
          <p className="text-sm text-neutral-600 max-w-xl leading-relaxed mb-8">
            Some finds are too good to leave to chance. These full-size items
            aren’t part of any scoop’s odds — add one straight to your bag and
            it’s guaranteed.
          </p>

          {addOns.length === 0 ? (
            <div className="rounded-[20px] border p-10 text-center" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
              <h3 className="font-extrabold uppercase mb-2">No premium add-ons yet</h3>
              <p className="text-sm text-neutral-600">New guaranteed finds will appear here when they are added.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {addOns.map((addOn) => {
                const image = getPrimaryImage(addOn);
                return (
                  <div
                    key={addOn.id}
                    style={{ background: "#fff", borderColor: "rgba(17,17,17,0.08)" }}
                    className="border rounded-[24px] overflow-hidden grid md:grid-cols-[minmax(0,420px)_1fr] shadow-sm">

                    <div
                      className="relative min-h-[320px] md:min-h-[380px] overflow-hidden flex items-center justify-center"
                      style={{
                        background: addOn.swatch || bright.gold,
                      }}
                    >
                      {addOn.badge && (
                        <span
                          style={{
                            background: palette.black,
                            color: palette.cream,
                          }}
                          className="absolute z-20 top-4 left-4 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                        >
                          {addOn.badge}
                        </span>
                      )}

                      {image ? (
                        <Link
                          href={`/products/${addOn.slug}`}
                          className="absolute inset-0 flex items-center justify-center p-5"
                          aria-label={`View ${addOn.name}`}
                        >
                          <Image
                            src={getProductThumbnailUrl(image.image_url) ?? image.image_url}
                            alt={image.alt_text || addOn.name}
                            fill
                            unoptimized
                            priority={false}
                            className="object-contain p-6 transition-transform duration-500 hover:scale-105"
                          />
                        </Link>
                        ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                          <span className="text-5xl mb-3">🎁</span>
                          <p className="text-xs font-bold uppercase tracking-wide">
                            Product image coming soon
                          </p>
                        </div>
                      )}
                    </div>


                    <div className="p-7 md:p-10 flex flex-col justify-center">
                      <span
                        style={{ background: bright.sage, color: "#1c2617" }}
                        className="self-start text-[11px] font-bold uppercase tracking-wide px-3.5 py-1.5 rounded-full mb-4"
                      >
                        ✓ Guaranteed — no mystery
                      </span>
                      <h3 className="text-2xl font-black uppercase mb-3">{addOn.name}</h3>
                      <p className="text-sm text-neutral-600 leading-relaxed mb-6 max-w-md">
                        {cleanCopy(addOn.description, "A guaranteed premium Scoopful add-on.")}
                      </p>
                      <div className="flex items-center gap-5 flex-wrap">
                        <PriceLine product={addOn} />
                        <div className="flex gap-2 flex-1 min-w-[220px] max-w-[320px]">
                          <AddToBagButton product={addOn} kind="addon" />
                          <Link
                            href={`/products/${addOn.slug}`}
                            className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-3 rounded-full border"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Unboxing video */}
      <section id="unboxing" style={{ background: bright.lavender }} className="py-14 scroll-mt-4">
        <div className="max-w-[1180px] mx-auto px-8 grid md:grid-cols-[320px_1fr] gap-10 items-center">
          <div
            className="w-full max-w-[320px] mx-auto md:mx-0 rounded-[24px] overflow-hidden shadow-lg"
            style={{ aspectRatio: "9 / 16", background: palette.black }}
          >
            <video
              controls
              playsInline
              preload="none"
              poster="/assets/scoopful/unboxing-poster.jpg"
              className="w-full h-full object-cover"
            >
              <source src="/assets/scoopful/unboxing.mp4" type="video/mp4" />
              Your browser doesn’t support video playback.
            </video>
          </div>

          <div>
            <Eyebrow color="#241a45">See it for yourself</Eyebrow>
            <h2 style={{ color: "#241a45" }} className="text-2xl md:text-4xl font-black uppercase mb-3">
              A real Scoopful unboxing
            </h2>
            <p style={{ color: "#3b2f63" }} className="text-sm leading-relaxed max-w-md mb-6">
              Pop the balls, find your colors and see what’s inside. Every
              scoop is a little different — that’s the fun.
            </p>
            <a
              href="#catalog"
              style={{ background: palette.black, color: palette.cream }}
              className="inline-block font-extrabold text-xs uppercase tracking-wide px-7 py-4 rounded-full"
            >
              Pick my scoop
            </a>
          </div>
        </div>
      </section>

      {/* Ball system */}
      <section className="pt-16 pb-4">
        <div className="max-w-[1180px] mx-auto px-8">
          <Eyebrow>The Ball System</Eyebrow>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-2">Five colors. Five rarities.</h2>
          <p className="text-sm text-neutral-600 max-w-xl leading-relaxed mb-9">
            Every item in the pit is sorted into a color by value — the deeper
            into the rainbow you go, the bigger the find. Every scoop tells you
            exactly which colors are guaranteed.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {ballSystem.map((ball) => (
              <div
                key={ball.name}
                style={{ borderColor: "rgba(17,17,17,0.08)", background: "#fff" }}
                className="border rounded-[18px] p-5 text-center"
              >
                <div
                  className="w-[46px] h-[46px] rounded-full mx-auto mb-3.5"
                  style={{ background: ball.color, boxShadow: ballShadow }}
                />
                <h4 className="text-sm font-extrabold uppercase mb-1.5">{ball.name}</h4>
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-2.5">{ball.tag}</div>
                <p className="text-xs text-neutral-600 leading-relaxed">{ball.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ background: palette.black, color: palette.cream }} className="py-16 mt-12">
        <div className="max-w-[1180px] mx-auto px-8">
          <Eyebrow color={bright.gold}>Scoop. Surprise. Smile.</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase mb-10 max-w-xl">How scooping works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((step) => (
              <div key={step.n} style={{ borderColor: "rgba(250,248,244,0.16)" }} className="border rounded-2xl p-6">
                <div style={{ color: bright.blush }} className="font-black text-sm mb-3.5">{step.n}</div>
                <h4 className="text-base font-extrabold uppercase mb-2">{step.title}</h4>
                <p className="text-sm text-neutral-300 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross sell */}
      <section className="py-16 pb-28 md:pb-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <div style={{ background: bright.gold }} className="rounded-3xl p-8 md:p-11 flex items-center justify-between gap-8 flex-wrap">
            <div>
              <span
                style={{ background: "#fff", color: "#1c2617" }}
                className="inline-block text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full mb-3.5"
              >
                🛍️ One cart, every brand
              </span>
              <h3 className="text-xl font-extrabold uppercase mb-2 max-w-sm">Pair your scoop with a custom Funkful gift</h3>
              <p className="text-sm max-w-md leading-relaxed" style={{ color: "#4a3a12" }}>
                Add a personalized mug, tumbler, apparel item or another Funkful
                product to the same order.
              </p>
            </div>
            <Link
              href="/originals"
              style={{ background: palette.black, color: palette.cream }}
              className="font-extrabold text-xs uppercase tracking-wide px-7 py-4 rounded-full"
            >
              Shop Funkful Originals
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile sticky CTA (leaves room on the right for the WhatsApp button) */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 pl-4 pr-20 pt-3"
        style={{
          background: "#fff",
          borderTop: "1px solid rgba(17,17,17,0.1)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <span className="text-xs font-bold">
          {bagHasItems
            ? `Bag · ${formatRands(subtotalCents)}`
            : cheapest
              ? `Scoops from ${formatRands(cheapest)}`
              : "Mystery scoops"}
        </span>
        <Link
          href={bagHasItems ? "/cart" : "#catalog"}
          style={{ background: bright.blushDeep, color: "#fff" }}
          className="text-[11.5px] font-extrabold uppercase tracking-wide px-5 py-2.5 rounded-full"
        >
          {bagHasItems ? "View bag" : "Shop scoops"}
        </Link>
      </div>
    </>
  );
}
