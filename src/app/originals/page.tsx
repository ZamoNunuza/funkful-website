// src/app/originals/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { brands, palette, navLinks } from "@/lib/brands";
import { products, productCategories, getProductsByCategory, type ProductVariantGroup, type ProductCategory, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

function formatRands(cents: number) {
  return `R${(cents / 100).toFixed(0)}`;
}

function defaultVariantSelection(groups: ProductVariantGroup[] = []) {
  const sel: Record<string, string> = {};
  for (const g of groups) sel[g.name] = g.options[0].label;
  return sel;
}

function priceWithVariants(baseCents: number, groups: ProductVariantGroup[] = [], selection: Record<string, string>) {
  let cents = baseCents;
  for (const g of groups) {
    const chosen = g.options.find((o) => o.label === selection[g.name]);
    cents += chosen?.priceDeltaCents ?? 0;
  }
  return cents;
}

export default function OriginalsPage() {
  const funkful = brands.funkful;
  const { addItem, itemCount } = useCart();

  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">("all");

  const [variantSelections, setVariantSelections] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(products.map((p) => [p.id, defaultVariantSelection(p.variantGroups)]))
  );
  const [personalizationText, setPersonalizationText] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.filter((p) => p.type === "personalize").map((p) => [p.id, ""]))
  );

  function setVariant(id: string, groupName: string, value: string) {
    setVariantSelections((prev) => ({ ...prev, [id]: { ...prev[id], [groupName]: value } }));
  }

  function handleAddToBag(product: Product) {
    const sel = variantSelections[product.id] ?? {};
    const text = personalizationText[product.id]?.trim();

    const variantParts = Object.values(sel);
    if (product.type === "personalize" && text) variantParts.push(`"${text}"`);
    const variantText = variantParts.join(" · ");

    const slug = [...Object.values(sel), text ?? ""]
      .join("-")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    addItem({
      id: slug ? `${product.id}-${slug}` : product.id,
      brand: "funkful",
      name: product.name,
      variant: variantText || undefined,
      priceCents: priceWithVariants(product.basePriceCents, product.variantGroups, sel),
    });
  }

  const categoriesToShow: ProductCategory[] =
    activeCategory === "all" ? productCategories.map((c) => c.value) : [activeCategory];

  return (
    <main style={{ background: palette.cream, color: palette.black }}>
      {/* Breadcrumb */}
      <div className="max-w-[1180px] mx-auto px-8 pt-4 text-xs text-neutral-500">
        <Link href="/">Home</Link> / <span className="text-black font-medium">Personalized</span>
      </div>

      {/* Hero */}
      <section style={{ background: funkful.accent }} className="mt-4 py-11 md:py-14">
        <div className="max-w-[1180px] mx-auto px-8 grid md:grid-cols-[220px_1fr] gap-10 items-center">
          <Image src={funkful.logo} alt={funkful.name} width={220} height={220} className="w-full opacity-90" />
          <div>
            <span
              style={{ background: palette.black, color: palette.cream }}
              className="inline-flex items-center gap-2 border rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide mb-4"
            >
              {funkful.eyebrow}
            </span>
            <h1 style={{ color: funkful.accentInk }} className="text-4xl md:text-5xl font-black uppercase leading-tight mb-3">
              {funkful.tagline}
            </h1>
            <p style={{ color: "#4a4438" }} className="text-sm leading-relaxed max-w-lg mb-2">
              {funkful.description}
            </p>
            <p style={{ color: "#4a4438" }} className="text-sm leading-relaxed max-w-lg mb-6">
              Every category comes two ways: grab a ready-made design and ship today, or build your own with a
              name, initials, or short message.
            </p>
            <a
              href="#catalog"
              style={{ background: palette.black, color: palette.cream }}
              className="inline-block font-bold text-xs uppercase tracking-wide px-6.5 py-4 rounded-full"
            >
              Shop the full range
            </a>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }} className="sticky top-[57px] z-40 bg-inherit py-4">
        <div className="max-w-[1180px] mx-auto px-8 flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              style={
                activeCategory === "all"
                  ? { background: palette.black, color: palette.cream, borderColor: palette.black }
                  : { borderColor: "rgba(17,17,17,0.18)" }
              }
              className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-full border"
            >
              All Originals
            </button>
            {productCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveCategory(cat.value)}
                style={
                  activeCategory === cat.value
                    ? { background: palette.black, color: palette.cream, borderColor: palette.black }
                    : { borderColor: "rgba(17,17,17,0.18)" }
                }
                className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-full border"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Catalog — grouped by category, each with a ready-made grid and a personalize grid */}
      <section id="catalog" className="py-14">
        <div className="max-w-[1180px] mx-auto px-8 space-y-16">
          {categoriesToShow.map((catValue) => {
            const catLabel = productCategories.find((c) => c.value === catValue)!.label;
            const all = getProductsByCategory(catValue);
            const readyMade = all.filter((p) => p.type === "ready-made");
            const personalize = all.filter((p) => p.type === "personalize");

            return (
              <div key={catValue}>
                <h2 className="text-2xl font-extrabold uppercase mb-7">{catLabel}</h2>

                {readyMade.length > 0 && (
                  <div className="mb-10">
                    <h3 style={{ color: "#6a6458" }} className="text-xs font-extrabold uppercase tracking-wide mb-4">
                      Ready to ship
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {readyMade.map((product) => {
                        const sel = variantSelections[product.id] ?? {};
                        const price = priceWithVariants(product.basePriceCents, product.variantGroups, sel);
                        return (
                          <div
                            key={product.id}
                            style={{ borderColor: "rgba(17,17,17,0.08)" }}
                            className="bg-white border rounded-[20px] overflow-hidden flex flex-col"
                          >
                            <div style={{ background: product.swatch }} className="relative aspect-square flex items-center justify-center p-5">
                              {product.badge && (
                                <span
                                  style={{ background: palette.cream }}
                                  className="absolute top-3.5 left-3.5 border-2 border-dashed rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                                >
                                  {product.badge}
                                </span>
                              )}
                              <Image src={funkful.logo} alt="" width={56} height={56} className="object-contain opacity-80" />
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                              <h4 className="text-sm font-bold mb-1.5">{product.name}</h4>
                              <p className="text-xs text-neutral-600 leading-relaxed mb-4">{product.description}</p>

                              {(product.variantGroups ?? []).map((group) => (
                                <label key={group.name} className="flex flex-col gap-1 mb-3 text-xs">
                                  <span style={{ color: "#6a6458" }} className="font-semibold uppercase tracking-wide text-[10.5px]">
                                    {group.name}
                                  </span>
                                  <select
                                    value={sel[group.name]}
                                    onChange={(e) => setVariant(product.id, group.name, e.target.value)}
                                    style={{ borderColor: "rgba(17,17,17,0.2)" }}
                                    className="border rounded-lg px-2.5 py-2 text-xs bg-white"
                                  >
                                    {group.options.map((option) => (
                                      <option key={option.label} value={option.label}>
                                        {option.label}
                                        {option.priceDeltaCents ? ` (+${formatRands(option.priceDeltaCents)})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ))}

                              <div className="mt-auto pt-3 flex items-center justify-between">
                                <span className="text-sm font-bold">{formatRands(price)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddToBag(product)}
                                  style={{ background: palette.black, color: palette.cream }}
                                  className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full"
                                >
                                  Add to bag
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {personalize.length > 0 && (
                  <div>
                    <h3 style={{ color: "#8a4a45" }} className="text-xs font-extrabold uppercase tracking-wide mb-4">
                      Personalize your own
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {personalize.map((product) => {
                        const sel = variantSelections[product.id] ?? {};
                        const price = priceWithVariants(product.basePriceCents, product.variantGroups, sel);
                        return (
                          <div
                            key={product.id}
                            style={{ background: product.swatch, borderColor: "rgba(17,17,17,0.1)" }}
                            className="border-2 border-dashed rounded-[20px] overflow-hidden flex flex-col"
                          >
                            <div className="p-5 flex flex-col flex-1">
                              {product.badge && (
                                <span
                                  style={{ background: palette.black, color: palette.cream }}
                                  className="self-start rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide mb-3"
                                >
                                  {product.badge}
                                </span>
                              )}
                              <h4 className="text-sm font-bold mb-1.5">{product.name}</h4>
                              <p className="text-xs text-neutral-700 leading-relaxed mb-4">{product.description}</p>

                              {(product.variantGroups ?? []).map((group) => (
                                <label key={group.name} className="flex flex-col gap-1 mb-3 text-xs">
                                  <span className="font-semibold uppercase tracking-wide text-[10.5px] text-neutral-700">
                                    {group.name}
                                  </span>
                                  <select
                                    value={sel[group.name]}
                                    onChange={(e) => setVariant(product.id, group.name, e.target.value)}
                                    style={{ borderColor: "rgba(17,17,17,0.25)" }}
                                    className="border rounded-lg px-2.5 py-2 text-xs bg-white/70"
                                  >
                                    {group.options.map((option) => (
                                      <option key={option.label} value={option.label}>
                                        {option.label}
                                        {option.priceDeltaCents ? ` (+${formatRands(option.priceDeltaCents)})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ))}

                              {product.personalizationPrompt && (
                                <label className="flex flex-col gap-1 mb-4 text-xs">
                                  <span className="font-semibold uppercase tracking-wide text-[10.5px] text-neutral-700">
                                    {product.personalizationPrompt}
                                  </span>
                                  <input
                                    type="text"
                                    value={personalizationText[product.id] ?? ""}
                                    onChange={(e) =>
                                      setPersonalizationText((prev) => ({ ...prev, [product.id]: e.target.value }))
                                    }
                                    placeholder="e.g. Thabo"
                                    maxLength={30}
                                    style={{ borderColor: "rgba(17,17,17,0.25)" }}
                                    className="border rounded-lg px-2.5 py-2 text-xs bg-white/70"
                                  />
                                </label>
                              )}

                              <div className="mt-auto pt-2 flex items-center justify-between">
                                <span className="text-sm font-bold">{formatRands(price)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddToBag(product)}
                                  style={{ background: palette.black, color: palette.cream }}
                                  className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full"
                                >
                                  Add to bag
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Cross-sell to Scoopful */}
      <section className="py-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <div style={{ background: brands.scoopful.accent }} className="rounded-3xl p-11 flex items-center justify-between gap-8 flex-wrap">
            <div>
              <span
                style={{ background: palette.sage, color: "#1c2617" }}
                className="inline-block text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full mb-3.5"
              >
                🛍️ One cart, every brand
              </span>
              <h3 style={{ color: brands.scoopful.accentInk }} className="text-xl font-extrabold uppercase mb-2 max-w-sm">
                Add a mystery scoop to the same order
              </h3>
              <p style={{ color: "#5b3d38" }} className="text-sm max-w-md leading-relaxed">
                Pair a personalized gift with a Scoopful surprise — it all ships and checks out together.
              </p>
            </div>
            <Link href={brands.scoopful.href} style={{ background: palette.black, color: palette.cream }} className="font-bold text-xs uppercase tracking-wide px-6.5 py-4 rounded-full">
              Shop Scoopful
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
