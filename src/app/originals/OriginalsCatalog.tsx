"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { brands, palette } from "@/lib/brands";
import WishlistButton from "@/components/wishlist/WishlistButton";

type Option = {
  label: string;
  priceDeltaCents: number;
};

type Group = {
  name: string;
  options: Option[];
};

type Product = {
  id: string;
  category: string;
  product_type: "made-to-order" | "personalize";
  name: string;
  description: string | null;
  base_price_cents: number;
  swatch: string | null;
  badge: string | null;
  personalization_prompt: string | null;
  allow_personalization: boolean;
  slug: string | null;
  personalization_price_delta_cents: number;
  personalization_max_length: number;
  design_group: string | null;
  sort_order: number;
  variantGroups: Group[];
  images: {
    url: string;
    alt: string;
    primary: boolean;
  }[];
};

function money(cents: number) {
  return `R${(cents / 100).toFixed(0)}`;
}

function categoryLabel(category: string) {
  switch (category) {
    case "mugs":
      return "Mugs";
    case "tumblers":
      return "Tumblers";
    case "glassware":
      return "Glassware";
    case "apparel":
      return "Apparel";
    default:
      return "Seasonal";
  }
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OriginalsCatalog({
  products,
}: {
  products: Product[];
}) {
  const { addItem } = useCart();

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))],
    [products]
  );

  const [activeCategory, setActiveCategory] = useState("all");

  const [selections, setSelections] = useState<
    Record<string, Record<string, string>>
  >({});

  const [personalization, setPersonalization] = useState<
    Record<string, string>
  >({});

  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  function selected(product: Product) {
    return (
      selections[product.id] ??
      Object.fromEntries(
        product.variantGroups.map((group) => [
          group.name,
          group.options[0]?.label ?? "",
        ])
      )
    );
  }

  function price(product: Product) {
    const selection = selected(product);

    const variantTotal = product.variantGroups.reduce(
      (sum, group) =>
        sum +
        (group.options.find(
          (option) => option.label === selection[group.name]
        )?.priceDeltaCents ?? 0),
      0
    );

    const personalizationTotal =
      product.allow_personalization &&
      personalization[product.id]?.trim()
        ? product.personalization_price_delta_cents
        : 0;

    return (
      product.base_price_cents +
      variantTotal +
      personalizationTotal
    );
  }

  function add(product: Product) {
    const selection = selected(product);

    const text = personalization[product.id]?.trim() ?? "";

    const parts = Object.entries(selection)
      .filter(([, value]) => value)
      .map(([, value]) => value);

    if (product.allow_personalization && text) {
      parts.push(`"${text}"`);
    }

    const suffix = [...parts]
      .map(slugPart)
      .filter(Boolean)
      .join("-");

    addItem({
      id: suffix ? `${product.id}-${suffix}` : product.id,
      brand: "funkful",
      name: product.name,
      variant: parts.join(" · ") || undefined,
      priceCents: price(product),
      productType: product.product_type,
    });
  }

  const visible =
    activeCategory === "all"
      ? products
      : products.filter(
          (product) => product.category === activeCategory
        );

  /**
   * Group products first by category and then by design_group.
   *
   * Example:
   *
   * Apparel
   *   ├── Hoodies
   *   └── T-Shirts
   *
   * Mugs
   *   ├── Character Mugs
   *   └── Quote Mugs
   *
   * The composite key prevents a design_group with the same name
   * from accidentally being combined across different categories.
   */
  const groupedProducts = useMemo(() => {
    const groups = new Map<
      string,
      {
        category: string;
        designGroup: string;
        products: Product[];
      }
    >();

    [...visible]
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((product) => {
        const designGroup =
          product.design_group?.trim() ||
          categoryLabel(product.category);

        const groupKey = `${product.category}::${designGroup}`;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            category: product.category,
            designGroup,
            products: [],
          });
        }

        groups.get(groupKey)!.products.push(product);
      });

    return [...groups.values()];
  }, [visible]);

  return (
    <>
      {/* CATEGORY FILTERS */}
      <div
        style={{
          borderBottom: "1px solid rgba(17,17,17,0.08)",
        }}
        className="sticky top-[57px] z-40 bg-[#f8f1e6] py-4"
      >
        <div className="max-w-[1180px] mx-auto px-8 flex gap-2.5 flex-wrap">
          {["all", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              style={
                activeCategory === category
                  ? {
                      background: palette.black,
                      color: palette.cream,
                      borderColor: palette.black,
                    }
                  : {
                      borderColor: "rgba(17,17,17,0.18)",
                    }
              }
              className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-full border"
            >
              {category === "all"
                ? "All Originals"
                : categoryLabel(category)}
            </button>
          ))}
        </div>
      </div>

      {/* CATALOG */}
      <section id="catalog" className="py-14">
        <div className="max-w-[1180px] mx-auto px-8">
          {/* INFORMATION BANNER */}
          <div className="mb-10 rounded-2xl border border-black/10 bg-white/60 px-5 py-4">
            <p className="text-xs font-extrabold uppercase tracking-wide">
              Made to order · Personalization available
            </p>

            <p className="text-xs text-neutral-600 leading-relaxed mt-1">
              Most Originals can be personalized for an additional R50.
              Enter the wording exactly as you want it produced. Design
              artwork itself is not changed unless the product specifically
              says otherwise.
            </p>
          </div>

          {/* EMPTY STATE */}
          {visible.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-white p-10 text-center">
              <h2 className="text-xl font-black mb-2">
                No Originals found
              </h2>

              <p className="text-sm text-neutral-600">
                The Originals catalog is currently empty for this
                selection.
              </p>
            </div>
          ) : (
            <div className="space-y-16">
              {groupedProducts.map((group) => (
                <section
                  key={`${group.category}::${group.designGroup}`}
                >
                  {/* GROUP HEADING */}
                  <div className="mb-7">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-400 mb-1.5">
                      {categoryLabel(group.category)}
                    </p>

                    <div className="flex items-end justify-between gap-4">
                      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                        {group.designGroup}
                      </h2>

                      <span className="hidden sm:block text-[10px] font-bold uppercase tracking-wide text-neutral-400 whitespace-nowrap">
                        {group.products.length}{" "}
                        {group.products.length === 1
                          ? "Original"
                          : "Originals"}
                      </span>
                    </div>

                    <div className="mt-4 h-px bg-black/10" />
                  </div>

                  {/* PRODUCTS IN GROUP */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.products.map((product) => {
                      const selectedProduct = selected(product);

                      const primaryImage =
                        product.images.find(
                          (image) => image.primary
                        ) ?? product.images[0];

                      const showFallback =
                        !primaryImage || imageErrors[product.id];

                      return (
                        <article
                          key={product.id}
                          className="bg-white border border-black/10 rounded-[20px] overflow-hidden flex flex-col"
                        >
                          {/* PRODUCT IMAGE */}
                          <div
                            style={{
                              background:
                                product.swatch || "#F2E7D5",
                            }}
                            className="relative aspect-square flex items-center justify-center p-5"
                          >
                            {primaryImage && !showFallback ? (
                              <Image
                                src={primaryImage.url}
                                alt={primaryImage.alt}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-contain p-5"
                                onError={() =>
                                  setImageErrors((prev) => ({
                                    ...prev,
                                    [product.id]: true,
                                  }))
                                }
                              />
                            ) : (
                              <Image
                                src={brands.funkful.logo}
                                alt="Funkful"
                                width={90}
                                height={90}
                                className="object-contain opacity-50"
                              />
                            )}

                            {/* PRODUCT BADGE */}
                            {product.badge && (
                              <span
                                style={{
                                  background: palette.cream,
                                }}
                                className="absolute top-3.5 left-3.5 border-2 border-dashed rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                              >
                                {product.badge}
                              </span>
                            )}

                            {/* WISHLIST */}
                            <WishlistButton
                              productId={product.id}
                              productName={product.name}
                              className="absolute top-3.5 right-3.5 z-10"
                            />
                          </div>

                          {/* PRODUCT CONTENT */}
                          <div className="p-5 flex flex-col flex-1">
                            {/* NAME + PRICE */}
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                                  {product.design_group ||
                                    categoryLabel(product.category)}
                                </p>

                                <h3 className="text-sm font-bold">
                                  {product.name}
                                </h3>
                              </div>

                              <span className="text-sm font-black whitespace-nowrap">
                                {money(price(product))}
                              </span>
                            </div>

                            {/* DESCRIPTION */}
                            {product.description && (
                              <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                                {product.description}
                              </p>
                            )}

                            {/* VARIANT OPTIONS */}
                            {product.variantGroups.map((group) => (
                              <label
                                key={group.name}
                                className="flex flex-col gap-1 mb-3 text-xs"
                              >
                                <span className="font-semibold uppercase tracking-wide text-[10.5px] text-neutral-600">
                                  {group.name}
                                </span>

                                <select
                                  value={
                                    selectedProduct[group.name]
                                  }
                                  onChange={(event) =>
                                    setSelections((prev) => ({
                                      ...prev,
                                      [product.id]: {
                                        ...selectedProduct,
                                        [group.name]:
                                          event.target.value,
                                      },
                                    }))
                                  }
                                  className="border border-black/20 rounded-lg px-2.5 py-2 text-xs bg-white"
                                >
                                  <option value="">
                                    Select {group.name}
                                  </option>

                                  {group.options.map((option) => (
                                    <option
                                      key={option.label}
                                      value={option.label}
                                    >
                                      {option.label}
                                      {option.priceDeltaCents
                                        ? ` (+${money(
                                            option.priceDeltaCents
                                          )})`
                                        : ""}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))}

                            {/* PERSONALIZATION */}
                            {product.allow_personalization && (
                              <label className="flex flex-col gap-1 mb-4 text-xs">
                                <span className="font-semibold uppercase tracking-wide text-[10.5px] text-neutral-700">
                                  {product.personalization_prompt ||
                                    "Personalization"}{" "}
                                  · +
                                  {money(
                                    product.personalization_price_delta_cents
                                  )}
                                </span>

                                <input
                                  value={
                                    personalization[product.id] ?? ""
                                  }
                                  maxLength={
                                    product.personalization_max_length
                                  }
                                  onChange={(event) =>
                                    setPersonalization((prev) => ({
                                      ...prev,
                                      [product.id]:
                                        event.target.value,
                                    }))
                                  }
                                  placeholder="Optional — e.g. Thabo"
                                  className="border border-black/20 rounded-lg px-2.5 py-2 text-xs bg-white"
                                />

                                {product.personalization_max_length >
                                  0 && (
                                  <span className="text-[9px] text-neutral-400 text-right">
                                    {
                                      (
                                        personalization[
                                          product.id
                                        ] ?? ""
                                      ).length
                                    }
                                    /
                                    {
                                      product.personalization_max_length
                                    }
                                  </span>
                                )}
                              </label>
                            )}

                            {/* ACTIONS */}
                            <div className="mt-auto pt-2 flex items-center justify-between gap-3">
                              {product.slug ? (
                                <Link
                                  href={`/products/${product.slug}`}
                                  className="text-[11px] font-bold uppercase underline underline-offset-2"
                                >
                                  View details
                                </Link>
                              ) : (
                                <span className="text-[11px] font-bold uppercase text-neutral-300">
                                  Details unavailable
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => add(product)}
                                style={{
                                  background: palette.black,
                                  color: palette.cream,
                                }}
                                className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full"
                              >
                                Add to bag
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SCOOPFUL CTA */}
      <section className="py-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <div
            style={{
              background: brands.scoopful.accent,
            }}
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

              <h3
                style={{
                  color: brands.scoopful.accentInk,
                }}
                className="text-xl font-extrabold uppercase mb-2 max-w-sm"
              >
                Add a mystery scoop to the same order
              </h3>

              <p
                style={{
                  color: "#5b3d38",
                }}
                className="text-sm max-w-md leading-relaxed"
              >
                Pair a Funkful Original with a Scoopful surprise — it
                all ships and checks out together.
              </p>
            </div>

            <Link
              href={brands.scoopful.href}
              style={{
                background: palette.black,
                color: palette.cream,
              }}
              className="font-bold text-xs uppercase tracking-wide px-6 py-4 rounded-full"
            >
              Shop Scoopful
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

