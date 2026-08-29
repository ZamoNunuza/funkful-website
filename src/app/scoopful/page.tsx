// src/app/scoopful/page.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { brands, palette, ballColors, navLinks } from "@/lib/brands";
import { useCart } from "@/lib/cart-context";

// Five ball colors positioned as a loose cluster behind the hero copy —
// purely decorative, matches the mock's floating-balls hero art.
const heroBalls = [
  { color: ballColors.yellow, size: "38%", top: "2%", left: "8%" },
  { color: ballColors.blue, size: "44%", top: "10%", right: "4%" },
  { color: ballColors.red, size: "34%", bottom: "6%", left: "2%" },
  { color: ballColors.green, size: "40%", bottom: "0%", right: "12%" },
  { color: ballColors.orange, size: "30%", top: "36%", left: "34%" },
];

// The ball-rarity legend — lowest to highest value. Every scoop's
// "guaranteed odds" line below is built from these same five colors.
const ballSystem = [
  { name: "Blue", tag: "Everyday", desc: "Scrunchies, makeup puffs, pimple patches — small daily joys.", color: ballColors.blue },
  { name: "Yellow", tag: "Common", desc: "Lip balm, hand cream, roll-on perfume, coin purses.", color: ballColors.yellow },
  { name: "Green", tag: "Uncommon", desc: "Full-size perfumes, key holders, notebook & pen sets.", color: ballColors.green },
  { name: "Red", tag: "Rare", desc: "Glowing serum, sunscreen — skincare heroes.", color: ballColors.red },
  { name: "Orange", tag: "Grand Prize", desc: "Cosmetic bags, jewelry pouches, care set.", color: ballColors.orange },
];

// Sticker (badge) color treatments used on the eyebrow tag and product cards.
const stickerStyles = {
  gold: { background: palette.gold, color: "#3e2f0d", borderColor: "rgba(62,47,13,0.4)" },
  dark: { background: palette.black, color: palette.cream, borderColor: "rgba(250,248,244,0.4)" },
  sage: { background: palette.sage, color: "#1c2617", borderColor: "rgba(28,38,23,0.35)" },
  plain: { background: palette.cream, color: palette.black, borderColor: "rgba(17,17,17,0.35)" },
} as const;

const scoops = [
  {
    id: "scoopful-lucky-scoop-classic",
    name: "Lucky Scoop",
    odds: "3 Blue · 2 Yellow · 1 Green — guaranteed",
    desc: "Our original mystery scoop. A friendly mix of everyday and daily-favorite finds, hand-packed same day.",
    priceCents: 16900,
    badge: "Bestseller",
    badgeStyle: "gold" as const,
    thumbBg: palette.blush,
    balls: [ballColors.blue, ballColors.blue, ballColors.blue, ballColors.yellow, ballColors.yellow, ballColors.green],
  },
  {
    id: "scoopful-deluxe-scoop",
    name: "Deluxe Scoop",
    odds: "2 Blue · 2 Yellow · 2 Green · 1 Red — guaranteed",
    desc: "A bigger scoop with your first guaranteed rare find — think glowing serum or sunscreen.",
    priceCents: 27900,
    badge: "Restocked",
    badgeStyle: "sage" as const,
    thumbBg: palette.beige,
    balls: [ballColors.blue, ballColors.blue, ballColors.yellow, ballColors.yellow, ballColors.green, ballColors.green, ballColors.red],
  },
  {
    id: "scoopful-vip-premium-scoop",
    name: "VIP Premium Scoop",
    odds: "1 Blue · 2 Yellow · 2 Green · 2 Red · 1 Orange — guaranteed",
    desc: "Rare, high-tier finds only. Every color in the pit, with a guaranteed Grand Prize orange item.",
    priceCents: 46900,
    //wasCents: 45000,
    badge: "VIP",
    badgeStyle: "plain" as const,
    thumbBg: palette.lavender,
    balls: [ballColors.blue, ballColors.yellow, ballColors.yellow, ballColors.green, ballColors.green, ballColors.red, ballColors.red, ballColors.orange],
  },
  {
    id: "scoopful-grand-prize-scoop",
    name: "Grand Prize Scoop",
    odds: "1 Yellow · 1 Green · 2 Red · 2 Orange — guaranteed",
    desc: "Our most-hyped scoop. Two guaranteed Grand Prize items — cosmetic bags, jewelry pouches, or care set.",
    priceCents: 52900,
    badge: "Rarest",
    badgeStyle: "gold" as const,
    thumbBg: palette.gold,
    balls: [ballColors.yellow, ballColors.green, ballColors.red, ballColors.red, ballColors.orange, ballColors.orange],
  },
];

// Full-size, non-mystery items that sit above every scoop tier's price
// ceiling — sold as guaranteed add-ons rather than crammed into the ball
// odds. Purchased directly, stacks with any scoop in the same cart.
const addOns = [
  {
    id: "scoopful-addon-future-avenue-perfume-100ml",
    name: "Future Avenue Perfume 100ml",
    desc: "The full-size bottle — the same scent that shows up mini in our Orange grand-prize pulls, guaranteed and yours to keep.",
    priceCents: 54900,
    badge: "Guaranteed",
    badgeStyle: "gold" as const,
    thumbBg: palette.gold,
  },
];

const filters = ["All Scoops", "Lucky", "Deluxe", "VIP", "Grand Prize"];

const howItWorks = [
  { n: "01", title: "Pick your scoop", body: "Each tier sets exactly which ball colors are guaranteed — not the exact items inside them." },
  { n: "02", title: "We hand-pack the mystery", body: "Curated same day from real stock, sealed, and never repeated the same way twice." },
  { n: "03", title: "You scoop, you share", body: "Unbox on camera or just for you — either way, tag us for a shot at a restock feature." },
];

function formatrands(cents: number) {
    return `R${(cents / 100).toFixed(0)}`;
}

export default function ScoopfulPage() {
  const scoopful = brands.scoopful;
  const {addItem} = useCart();

  return (
    <>
      {/* Breadcrumb */}
      <div className="max-w-[1180px] mx-auto px-8 pt-4 text-xs text-neutral-500">
        <Link href="/">Home</Link> / <span className="text-black font-medium">Scoopful</span>
      </div>

      {/* Hero */}
      <section style={{ background: "var(--brand-accent)" }} className="mt-4 py-11 md:py-14 overflow-hidden">
        <div className="max-w-[1180px] mx-auto px-8 grid md:grid-cols-[220px_1fr] gap-10 items-center">
          <div className="relative w-full aspect-square max-w-[220px] mx-auto md:mx-0">
            {heroBalls.map((ball, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: ball.size,
                  height: ball.size,
                  top: ball.top,
                  left: ball.left,
                  right: ball.right,
                  bottom: ball.bottom,
                  background: ball.color,
                  boxShadow: "inset -6px -8px 14px rgba(0,0,0,0.18), inset 4px 6px 10px rgba(255,255,255,0.35)",
                }}
              />
            ))}
            <Image
              src={scoopful.logo}
              alt={scoopful.name}
              width={500}
              height={500}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto drop-shadow-lg"
              draggable={false}
            />
          </div>
          <div>
            <span
              style={{ background: palette.black, color: palette.cream }}
              className="inline-flex items-center gap-2 border rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide mb-4"
            >
              {scoopful.eyebrow}
            </span>
            <h1 style={{ color: "var(--brand-ink)" }} className="text-4xl md:text-5xl font-black uppercase leading-tight mb-3">
              {scoopful.tagline}
            </h1>
            <p style={{ color: "#5b3d38" }} className="text-sm leading-relaxed max-w-lg mb-6">
              Five ball colors, one mystery scoop. Every scoop guarantees a mix of colors — and the rarer
              the color, the bigger the prize. No two scoops are ever identical.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a href="#catalog" style={{ background: palette.black, color: palette.cream }} className="font-bold text-xs uppercase tracking-wide px-6.5 py-4 rounded-full">
                Shop all scoops
              </a>
              <a href="#how" style={{ borderColor: "var(--brand-ink)", color: "var(--brand-ink)" }} className="font-bold text-xs uppercase tracking-wide px-6.5 py-4 rounded-full border-2">
                How scooping works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* The Ball System — rarity legend */}
      <section className="pt-16 pb-2">
        <div className="max-w-[1180px] mx-auto px-8">
          <span style={{ color: "var(--brand-ink)" }} className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5">
            The Ball System
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-2">Five colors. Five rarities.</h2>
          <p className="text-sm text-neutral-600 max-w-xl leading-relaxed mb-9">
            Every item in the pit is sorted into a color by value — the deeper into the rainbow you go, the
            bigger the find. Every scoop tells you exactly which colors are guaranteed.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4.5">
            {ballSystem.map((ball) => (
              <div key={ball.name} style={{ borderColor: "rgba(17,17,17,0.1)" }} className="border rounded-[18px] p-5.5 text-center bg-[--cream]">
                <div
                  className="w-[42px] h-[42px] rounded-full mx-auto mb-3.5"
                  style={{ background: ball.color, boxShadow: "inset -5px -6px 10px rgba(0,0,0,0.2), inset 3px 4px 8px rgba(255,255,255,0.35)" }}
                />
                <h4 className="text-sm font-extrabold uppercase mb-1.5">{ball.name}</h4>
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-2.5">{ball.tag}</div>
                <p className="text-xs text-neutral-600 leading-relaxed">{ball.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }} className="sticky top-[57px] z-40 bg-[color:var(--tw-bg,inherit)] py-4 mt-14">
        <div className="max-w-[1180px] mx-auto px-8 flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-2.5 flex-wrap">
            {filters.map((f, i) => (
              <span
                key={f}
                style={i === 0 ? { background: palette.black, color: palette.cream, borderColor: palette.black } : { borderColor: "rgba(17,17,17,0.18)" }}
                className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-full border"
              >
                {f}
              </span>
            ))}
          </div>
          <span className="text-sm font-semibold text-neutral-600">Sort: Trending ▾</span>
        </div>
      </div>

      {/* Product grid */}
      <section id="catalog" className="py-14">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="grid sm:grid-cols-2 gap-6">
            {scoops.map((scoop) => (
              <div key={scoop.id} style={{ borderColor: "rgba(17,17,17,0.08)" }} className="bg-[--cream] border rounded-[20px] overflow-hidden">
                <div style={{ background: scoop.thumbBg }} className="relative flex items-center justify-center gap-2.5 p-8 text-center flex-wrap">
                  <span style={stickerStyles[scoop.badgeStyle]} className="absolute top-3.5 left-3.5 border-2 border-dashed rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide" >
                    {scoop.badge}
                  </span>
                  {scoop.balls.map((color, i) => (
                    <div key={i} className="w-6.5 h-6.5 rounded-full" style={{ background: color, boxShadow: "inset -3px -4px 7px rgba(0,0,0,0.2), inset 2px 3px 5px rgba(255,255,255,0.35)" }} />
                  ))}
                </div>
                <div className="p-5">
                  <h4 className="text-base font-extrabold uppercase mb-1">{scoop.name}</h4>
                  <div className="text-[11.5px] font-bold text-neutral-500 uppercase tracking-wide mb-2.5">{scoop.odds}</div>
                  <p className="text-xs text-neutral-600 leading-relaxed mb-3.5">{scoop.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold">
                        {/*{scoop.wasCents && (<span className="line-through text-neutral-400 mr-1">{formatrands(scoop.wasCents)}</span>)}*/}
                        {formatrands(scoop.priceCents)}</span>
                    <button type="button" 
                    onClick={() =>
                        addItem({
                            id: scoop.id,
                            brand: "scoopful",
                            name: scoop.name,
                            priceCents: scoop.priceCents,
                        })
                    }
                      style={{ background: palette.black, color: palette.cream }}
                      className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full hover:bg-gray-900">
                      Add to bag
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Add-Ons — guaranteed, full-price items too big for the ball system */}
            <section id="addons" className="pb-14">
              <div className="max-w-[1180px] mx-auto px-8">
                <span style={{ color: "var(--brand-ink)" }} className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5">
                  Skip the mystery
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-2">Premium add-ons</h2>
                <p className="text-sm text-neutral-600 max-w-xl leading-relaxed mb-9">
                  Some finds are too good to leave to chance. These full-size items aren&apos;t part of any
                  scoop&apos;s odds — add one straight to your bag and it&apos;s guaranteed, no ball pull required.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {addOns.map((addOn) => (
                    <div key={addOn.id} style={{ borderColor: "rgba(17,17,17,0.08)" }} className="bg-[--cream] border rounded-[20px] overflow-hidden">
                      <div style={{ background: addOn.thumbBg }} className="relative flex items-center justify-center p-10 text-center">
                        <span style={stickerStyles[addOn.badgeStyle]} className="absolute top-3.5 left-3.5 border-2 border-dashed rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide">
                          {addOn.badge}
                        </span>
                        <div
                          className="w-14 h-14 rounded-full"
                          style={{ background: palette.black, boxShadow: "inset -5px -6px 10px rgba(0,0,0,0.25), inset 3px 4px 8px rgba(255,255,255,0.2)" }}
                        />
                      </div>
                      <div className="p-5">
                        <h4 className="text-base font-extrabold uppercase mb-1">{addOn.name}</h4>
                        <p className="text-xs text-neutral-600 leading-relaxed mb-3.5">{addOn.desc}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-extrabold">{formatrands(addOn.priceCents)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              addItem({
                                id: addOn.id,
                                brand: "scoopful",
                                name: addOn.name,
                                priceCents: addOn.priceCents,
                              })
                            }
                            style={{ background: palette.black, color: palette.cream }}
                            className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full hover:bg-gray-900"
                          >
                            Add to bag
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

      {/* How it works */}
      <section id="how" style={{ background: palette.black, color: palette.cream }} className="py-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <span style={{ color: palette.gold }} className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5">
            Scoop. Surprise. Smile.
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase mb-10 max-w-xl">How scooping works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((step) => (
              <div key={step.n} style={{ borderColor: "rgba(250,248,244,0.16)" }} className="border rounded-2xl p-6">
                <div style={{ color: palette.blush }} className="font-black text-sm mb-3.5">{step.n}</div>
                <h4 className="text-base font-extrabold uppercase mb-2">{step.title}</h4>
                <p className="text-sm text-neutral-300 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-sell back to Funkful */}
      <section className="py-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <div style={{ background: palette.beige }} className="rounded-3xl p-11 flex items-center justify-between gap-8 flex-wrap">
            <div>
              <span
                style={{ background: palette.sage, color: "#1c2617" }}
                className="inline-block text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full mb-3.5"
              >
                🛍️ One cart, every brand
              </span>
              <h3 className="text-xl font-extrabold uppercase mb-2 max-w-sm">Pair your scoop with a custom Funkful gift</h3>
              <p className="text-sm text-neutral-600 max-w-md leading-relaxed">
                Add a personalized mug or tumbler to the same order — it all ships and checks out together.
              </p>
            </div>
            <Link href="/originals" style={{ background: palette.black, color: palette.cream }} className="font-bold text-xs uppercase tracking-wide px-6.5 py-4 rounded-full">
              Shop Funkful Originals
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
