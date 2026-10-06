"use client";

import Image from "next/image";
import Link from "next/link";

import { brands, palette, ballColors } from "@/lib/brands";
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

const heroBalls = [
  { color: ballColors.yellow, size: "38%", top: "2%", left: "8%" },
  { color: ballColors.blue, size: "44%", top: "10%", right: "4%" },
  { color: ballColors.red, size: "34%", bottom: "6%", left: "2%" },
  { color: ballColors.green, size: "40%", bottom: "0%", right: "12%" },
  { color: ballColors.orange, size: "30%", top: "36%", left: "34%" },
];

const ballSystem = [
  {
    name: "Blue",
    tag: "Everyday",
    desc: "Scrunchies, makeup puffs, pimple patches — small daily joys.",
    color: ballColors.blue,
  },
  {
    name: "Yellow",
    tag: "Common",
    desc: "Lip balm, hand cream, roll-on perfume, coin purses.",
    color: ballColors.yellow,
  },
  {
    name: "Green",
    tag: "Uncommon",
    desc: "Mini perfumes, key holders, notebook & pen sets.",
    color: ballColors.green,
  },
  {
    name: "Red",
    tag: "Rare",
    desc: "Glowing serum, sunscreen — skincare heroes.",
    color: ballColors.red,
  },
  {
    name: "Orange",
    tag: "Grand Prize",
    desc: "Cosmetic bags, jewelry pouches, care sets.",
    color: ballColors.orange,
  },
];

const stickerStyles = {
  gold: {
    background: palette.gold,
    color: "#3e2f0d",
    borderColor: "rgba(62,47,13,0.4)",
  },
  dark: {
    background: palette.black,
    color: palette.cream,
    borderColor: "rgba(250,248,244,0.4)",
  },
  sage: {
    background: palette.sage,
    color: "#1c2617",
    borderColor: "rgba(28,38,23,0.35)",
  },
  plain: {
    background: palette.cream,
    color: palette.black,
    borderColor: "rgba(17,17,17,0.35)",
  },
} as const;

const howItWorks = [
  {
    n: "01",
    title: "Pick your scoop",
    body: "Each tier sets exactly which ball colors are guaranteed — not the exact items inside them.",
  },
  {
    n: "02",
    title: "We hand-pack the mystery",
    body: "Curated from real stock, sealed and packed for your surprise.",
  },
  {
    n: "03",
    title: "You scoop, you share",
    body: "Unbox on camera or just for you — either way, tag us for a shot at a restock feature.",
  },
];

function formatRands(cents: number) {
  return `R${(cents / 100).toFixed(0)}`;
}

function getPrimaryImage(product: ScoopfulProduct) {
  const images = [...(product.product_images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }

    return a.sort_order - b.sort_order;
  });

  return images[0]?.image_url ?? null;
}

function getBadgeStyle(
  product: ScoopfulProduct,
  index: number
): keyof typeof stickerStyles {
  if (product.badge?.toLowerCase().includes("vip")) {
    return "plain";
  }

  if (
    product.badge?.toLowerCase().includes("rare") ||
    product.badge?.toLowerCase().includes("grand")
  ) {
    return "gold";
  }

  if (index % 2 === 0) {
    return "gold";
  }

  return "sage";
}

function getBallColors(product: ScoopfulProduct, index: number) {
  const name = product.name.toLowerCase();

  if (name.includes("lucky")) {
    return [
      ballColors.blue,
      ballColors.blue,
      ballColors.blue,
      ballColors.yellow,
      ballColors.yellow,
      ballColors.green,
    ];
  }

  if (name.includes("deluxe")) {
    return [
      ballColors.blue,
      ballColors.blue,
      ballColors.yellow,
      ballColors.yellow,
      ballColors.green,
      ballColors.green,
      ballColors.red,
    ];
  }

  if (name.includes("vip")) {
    return [
      ballColors.blue,
      ballColors.yellow,
      ballColors.yellow,
      ballColors.green,
      ballColors.green,
      ballColors.red,
      ballColors.red,
      ballColors.orange,
    ];
  }

  if (name.includes("grand")) {
    return [
      ballColors.yellow,
      ballColors.green,
      ballColors.red,
      ballColors.red,
      ballColors.orange,
      ballColors.orange,
    ];
  }

  const fallback = [
    ballColors.blue,
    ballColors.yellow,
    ballColors.green,
    ballColors.red,
    ballColors.orange,
  ];

  return fallback.slice(0, Math.min(6, 3 + index));
}

function getThumbBackground(product: ScoopfulProduct) {
  const name = product.name.toLowerCase();

  if (name.includes("lucky")) return palette.blush;
  if (name.includes("deluxe")) return palette.beige;
  if (name.includes("vip")) return palette.lavender;
  if (name.includes("grand")) return palette.gold;

  return palette.cream;
}

function ProductImageArea({
  product,
  fallbackBalls,
  background,
}: {
  product: ScoopfulProduct;
  fallbackBalls?: string[];
  background: string;
}) {
  const image = getPrimaryImage(product);

  return (
    <div
      className="relative min-h-[230px] overflow-hidden flex items-center justify-center"
      style={{ background }}
    >
      {product.badge && (
        <span
          style={stickerStyles.gold}
          className="absolute z-10 top-4 left-4 border-2 border-dashed rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide"
        >
          {product.badge}
        </span>
      )}

      {image ? (
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 block"
          aria-label={`View ${product.name}`}
        >
          <Image
            src={image}
            alt={
              product.product_images?.find((item) => item.is_primary)
                ?.alt_text ||
              product.product_images?.[0]?.alt_text ||
              product.name
            }
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-7 transition-transform duration-300 hover:scale-105"
          />
        </Link>
      ) : fallbackBalls ? (
        <div className="flex items-center justify-center gap-2.5 flex-wrap px-12">
          {fallbackBalls.map((color, index) => (
            <div
              key={`${product.id}-ball-${index}`}
              className="w-7 h-7 rounded-full"
              style={{
                background: color,
                boxShadow:
                  "inset -3px -4px 7px rgba(0,0,0,0.2), inset 2px 3px 5px rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      ) : (
        <div
          className="w-24 h-24 rounded-full"
          style={{
            background: palette.black,
            boxShadow:
              "inset -8px -10px 16px rgba(0,0,0,0.25), inset 5px 6px 12px rgba(255,255,255,0.2)",
          }}
        />
      )}
    </div>
  );
}

export default function ScoopfulCatalog({
  scoops,
  addOns,
}: Props) {
  const scoopful = brands.scoopful;
  const { addItem } = useCart();

  return (
    <>
      {/* Breadcrumb */}
      <div className="max-w-[1180px] mx-auto px-8 pt-4 text-xs text-neutral-500">
        <Link href="/" className="hover:text-black">
          Home
        </Link>{" "}
        / <span className="text-black font-medium">Scoopful</span>
      </div>

      {/* Hero */}
      <section
        style={{ background: "var(--brand-accent)" }}
        className="mt-4 py-11 md:py-14 overflow-hidden"
      >
        <div className="max-w-[1180px] mx-auto px-8 grid md:grid-cols-[220px_1fr] gap-10 items-center">
          <div className="relative w-full aspect-square max-w-[220px] mx-auto md:mx-0">
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
                    "inset -6px -8px 14px rgba(0,0,0,0.18), inset 4px 6px 10px rgba(255,255,255,0.35)",
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
              style={{
                background: palette.black,
                color: palette.cream,
              }}
              className="inline-flex items-center gap-2 border rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide mb-4"
            >
              {scoopful.eyebrow}
            </span>

            <h1
              style={{ color: "var(--brand-ink)" }}
              className="text-4xl md:text-5xl font-black uppercase leading-tight mb-3"
            >
              {scoopful.tagline}
            </h1>

            <p
              style={{ color: "#5b3d38" }}
              className="text-sm leading-relaxed max-w-lg mb-6"
            >
              Five ball colors, one mystery scoop. Every scoop guarantees a
              mix of colors — and the rarer the color, the bigger the prize.
              No two scoops are ever identical.
            </p>

            <div className="flex gap-3 flex-wrap">
              <a
                href="#catalog"
                style={{
                  background: palette.black,
                  color: palette.cream,
                }}
                className="font-bold text-xs uppercase tracking-wide px-6 py-4 rounded-full"
              >
                Shop all scoops
              </a>

              <a
                href="#how"
                style={{
                  borderColor: "var(--brand-ink)",
                  color: "var(--brand-ink)",
                }}
                className="font-bold text-xs uppercase tracking-wide px-6 py-4 rounded-full border-2"
              >
                How scooping works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Ball System */}
      <section className="pt-16 pb-2">
        <div className="max-w-[1180px] mx-auto px-8">
          <span
            style={{ color: "var(--brand-ink)" }}
            className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5"
          >
            The Ball System
          </span>

          <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-2">
            Five colors. Five rarities.
          </h2>

          <p className="text-sm text-neutral-600 max-w-xl leading-relaxed mb-9">
            Every item in the pit is sorted into a color by value — the deeper
            into the rainbow you go, the bigger the find. Every scoop tells
            you exactly which colors are guaranteed.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {ballSystem.map((ball) => (
              <div
                key={ball.name}
                style={{ borderColor: "rgba(17,17,17,0.1)" }}
                className="border rounded-[18px] p-5 text-center bg-[--cream]"
              >
                <div
                  className="w-[42px] h-[42px] rounded-full mx-auto mb-3.5"
                  style={{
                    background: ball.color,
                    boxShadow:
                      "inset -5px -6px 10px rgba(0,0,0,0.2), inset 3px 4px 8px rgba(255,255,255,0.35)",
                  }}
                />

                <h4 className="text-sm font-extrabold uppercase mb-1.5">
                  {ball.name}
                </h4>

                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-2.5">
                  {ball.tag}
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  {ball.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalogue heading */}
      <section id="catalog" className="pt-16 pb-7">
        <div className="max-w-[1180px] mx-auto px-8">
          <span
            style={{ color: "var(--brand-ink)" }}
            className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5"
          >
            Choose your surprise
          </span>

          <div className="flex items-end justify-between gap-5 flex-wrap">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-2">
                Mystery scoops
              </h2>

              <p className="text-sm text-neutral-600 max-w-xl leading-relaxed">
                Choose your tier. We handle the mystery.
              </p>
            </div>

            <span className="text-sm font-semibold text-neutral-500">
              {scoops.length} scoop{scoops.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </section>

      {/* Scoop grid */}
      <section className="pb-14">
        <div className="max-w-[1180px] mx-auto px-8">
          {scoops.length === 0 ? (
            <div
              className="rounded-[20px] border p-10 text-center"
              style={{ borderColor: "rgba(17,17,17,0.08)" }}
            >
              <h3 className="font-extrabold uppercase mb-2">
                Scoops are being restocked
              </h3>

              <p className="text-sm text-neutral-600">
                Check back soon for the next Scoopful drop.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {scoops.map((scoop, index) => {
                const image = getPrimaryImage(scoop);
                const balls = getBallColors(scoop, index);
                const badgeStyle = getBadgeStyle(scoop, index);

                return (
                  <div
                    key={scoop.id}
                    style={{ borderColor: "rgba(17,17,17,0.08)" }}
                    className="bg-[--cream] border rounded-[20px] overflow-hidden"
                  >
                    <ProductImageArea
                      product={scoop}
                      fallbackBalls={image ? undefined : balls}
                      background={getThumbBackground(scoop)}
                    />

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-extrabold uppercase mb-1">
                            {scoop.name}
                          </h3>

                          <div className="text-[11.5px] font-bold text-neutral-500 uppercase tracking-wide mb-2.5">
                            {scoop.category}
                          </div>
                        </div>

                        <span
                          style={stickerStyles[badgeStyle]}
                          className="shrink-0 border rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                        >
                          {scoop.badge ?? "Scoop"}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                        {scoop.description ||
                          "A mystery Scoopful packed with surprise finds."}
                      </p>

                      <div className="flex items-center justify-between gap-4">
                        <div>
                          {scoop.compare_at_price_cents &&
                            scoop.compare_at_price_cents >
                              scoop.base_price_cents && (
                              <span className="line-through text-neutral-400 text-xs mr-2">
                                {formatRands(scoop.compare_at_price_cents)}
                              </span>
                            )}

                          <span className="text-base font-extrabold">
                            {formatRands(scoop.base_price_cents)}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/products/${scoop.slug}`}
                            className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full border"
                          >
                            View
                          </Link>

                          <button
                            type="button"
                            disabled={
                              scoop.track_inventory &&
                              scoop.stock_quantity <= 0
                            }
                            onClick={() =>
                              addItem({
                                id: scoop.id,
                                brand: "scoopful",
                                name: scoop.name,
                                priceCents: scoop.base_price_cents,
                              })
                            }
                            style={{
                              background: palette.black,
                              color: palette.cream,
                            }}
                            className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {scoop.track_inventory &&
                            scoop.stock_quantity <= 0
                              ? "Sold Out"
                              : "Add to bag"}
                          </button>
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

      {/* Premium Add-ons */}
      <section id="addons" className="pb-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <span
            style={{ color: "var(--brand-ink)" }}
            className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5"
          >
            Skip the mystery
          </span>

          <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-2">
            Premium add-ons
          </h2>

          <p className="text-sm text-neutral-600 max-w-xl leading-relaxed mb-9">
            Some finds are too good to leave to chance. These full-size items
            aren&apos;t part of any scoop&apos;s odds — add one straight to
            your bag and it&apos;s guaranteed.
          </p>

          {addOns.length === 0 ? (
            <div
              className="rounded-[20px] border p-10 text-center"
              style={{ borderColor: "rgba(17,17,17,0.08)" }}
            >
              <h3 className="font-extrabold uppercase mb-2">
                No premium add-ons yet
              </h3>

              <p className="text-sm text-neutral-600">
                New guaranteed finds will appear here when they are added.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {addOns.map((addOn) => {
                const image = getPrimaryImage(addOn);

                return (
                  <div
                    key={addOn.id}
                    style={{ borderColor: "rgba(17,17,17,0.08)" }}
                    className="bg-[--cream] border rounded-[20px] overflow-hidden"
                  >
                    {/* THIS IS NOW THE REAL PRODUCT IMAGE */}
                    <div
                      className="relative h-[270px] overflow-hidden"
                      style={{
                        background: addOn.swatch || palette.gold,
                      }}
                    >
                      {addOn.badge && (
                        <span
                          style={stickerStyles.gold}
                          className="absolute z-10 top-4 left-4 border-2 border-dashed rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                        >
                          {addOn.badge}
                        </span>
                      )}

                      {image ? (
                        <Link
                          href={`/products/${addOn.slug}`}
                          className="absolute inset-0"
                        >
                          <Image
                            src={image}
                            alt={
                              addOn.product_images?.find(
                                (item) => item.is_primary
                              )?.alt_text ||
                              addOn.product_images?.[0]?.alt_text ||
                              addOn.name
                            }
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-contain p-8 transition-transform duration-300 hover:scale-105"
                          />
                        </Link>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="w-24 h-24 rounded-full"
                            style={{
                              background: palette.black,
                              boxShadow:
                                "inset -8px -10px 16px rgba(0,0,0,0.25), inset 5px 6px 12px rgba(255,255,255,0.2)",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="text-base font-extrabold uppercase mb-1">
                        {addOn.name}
                      </h3>

                      <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                        {addOn.description ||
                          "A guaranteed premium Scoopful add-on."}
                      </p>

                      <div className="flex items-center justify-between gap-4">
                        <div>
                          {addOn.compare_at_price_cents &&
                            addOn.compare_at_price_cents >
                              addOn.base_price_cents && (
                              <span className="line-through text-neutral-400 text-xs mr-2">
                                {formatRands(addOn.compare_at_price_cents)}
                              </span>
                            )}

                          <span className="text-base font-extrabold">
                            {formatRands(addOn.base_price_cents)}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/products/${addOn.slug}`}
                            className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full border"
                          >
                            View
                          </Link>

                          <button
                            type="button"
                            disabled={
                              addOn.track_inventory &&
                              addOn.stock_quantity <= 0
                            }
                            onClick={() =>
                              addItem({
                                id: addOn.id,
                                brand: "scoopful",
                                name: addOn.name,
                                priceCents: addOn.base_price_cents,
                              })
                            }
                            style={{
                              background: palette.black,
                              color: palette.cream,
                            }}
                            className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {addOn.track_inventory &&
                            addOn.stock_quantity <= 0
                              ? "Sold Out"
                              : "Add to bag"}
                          </button>
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

      {/* How it works */}
      <section
        id="how"
        style={{
          background: palette.black,
          color: palette.cream,
        }}
        className="py-16"
      >
        <div className="max-w-[1180px] mx-auto px-8">
          <span
            style={{ color: palette.gold }}
            className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5"
          >
            Scoop. Surprise. Smile.
          </span>

          <h2 className="text-3xl md:text-4xl font-extrabold uppercase mb-10 max-w-xl">
            How scooping works
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((step) => (
              <div
                key={step.n}
                style={{
                  borderColor: "rgba(250,248,244,0.16)",
                }}
                className="border rounded-2xl p-6"
              >
                <div
                  style={{ color: palette.blush }}
                  className="font-black text-sm mb-3.5"
                >
                  {step.n}
                </div>

                <h4 className="text-base font-extrabold uppercase mb-2">
                  {step.title}
                </h4>

                <p className="text-sm text-neutral-300 leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross sell */}
      <section className="py-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <div
            style={{ background: palette.beige }}
            className="rounded-3xl p-11 flex items-center justify-between gap-8 flex-wrap"
          >
            <div>
              <span
                style={{
                  background: palette.sage,
                  color: "#1c2617",
                }}
                className="inline-block text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full mb-3.5"
              >
                🛍️ One cart, every brand
              </span>

              <h3 className="text-xl font-extrabold uppercase mb-2 max-w-sm">
                Pair your scoop with a custom Funkful gift
              </h3>

              <p className="text-sm text-neutral-600 max-w-md leading-relaxed">
                Add a personalized mug, tumbler, apparel item or another
                Funkful product to the same order.
              </p>
            </div>

            <Link
              href="/originals"
              style={{
                background: palette.black,
                color: palette.cream,
              }}
              className="font-bold text-xs uppercase tracking-wide px-6 py-4 rounded-full"
            >
              Shop Funkful Originals
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}