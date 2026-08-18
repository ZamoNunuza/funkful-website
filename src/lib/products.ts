// src/lib/products.ts
//
// Product catalog for Funkful Originals. Scoopful's scoops stay defined
// inline on its own page (they're simple, no variants) — this file is for
// products that need variant groups (size/color/capacity) and optional
// personalization, which is most of the Funkful line.

import type { BrandSlug } from "@/lib/brands";
import { palette } from "@/lib/brands";

export type ProductCategory = "mugs" | "tumblers" | "apparel" | "glassware";
export type ProductType = "ready-made" | "personalize";

export interface ProductVariantOption {
  label: string;
  /** Extra cost in cents for this option, if any (e.g. an upsized color) */
  priceDeltaCents?: number;
}

export interface ProductVariantGroup {
  /** e.g. "Size", "Color", "Capacity" */
  name: string;
  options: ProductVariantOption[];
}

export interface Product {
  id: string;
  brand: BrandSlug;
  category: ProductCategory;
  type: ProductType;
  name: string;
  description: string;
  /** Starting price in cents (ZAR), before any variant deltas */
  basePriceCents: number;
  badge?: string;
  /** Thumbnail background — one of the shared palette hex values */
  swatch: string;
  variantGroups?: ProductVariantGroup[];
  /** Only set on type: "personalize" — placeholder copy for the free-text field */
  personalizationPrompt?: string;
}

export const productCategories: { value: ProductCategory; label: string }[] = [
  { value: "mugs", label: "Mugs" },
  { value: "tumblers", label: "Tumblers" },
  { value: "apparel", label: "Apparel" },
  { value: "glassware", label: "Glassware" },
];

export const products: Product[] = [
  // ---------- Mugs — ready-made ----------
  {
    id: "mug-ready-sunburst",
    brand: "funkful",
    category: "mugs",
    type: "ready-made",
    name: "Sunburst Ceramic Mug",
    description: "Hand-glazed 11oz mug in our signature sunburst print. Ready to ship, no personalization.",
    basePriceCents: 17900,
    badge: "Ready to ship",
    swatch: palette.gold,
  },
  {
    id: "mug-ready-wildflower",
    brand: "funkful",
    category: "mugs",
    type: "ready-made",
    name: "Wildflower Ceramic Mug",
    description: "Pressed-wildflower print on an 11oz ceramic mug. Ready to ship.",
    basePriceCents: 17900,
    swatch: palette.blush,
  },

  // ---------- Mugs — personalize ----------
  {
    id: "mug-personalize",
    brand: "funkful",
    category: "mugs",
    type: "personalize",
    name: "Personalize Your Own Mug",
    description: "Ceramic 11oz mug — add any name, initials, or short message.",
    basePriceCents: 19900,
    badge: "Make it yours",
    swatch: palette.beige,
    personalizationPrompt: "Name or short message",
    variantGroups: [{ name: "Color", options: [{ label: "White" }, { label: "Black" }, { label: "Blush" }] }],
  },

  // ---------- Tumblers — ready-made ----------
  {
    id: "tumbler-ready-ocean-20oz",
    brand: "funkful",
    category: "tumblers",
    type: "ready-made",
    name: "Ocean Wave Tumbler — 20oz",
    description: "Pre-printed ocean wave wrap, double-wall insulated stainless steel. Ready to ship.",
    basePriceCents: 29900,
    swatch: palette.sage,
  },
  {
    id: "tumbler-ready-sunset-15oz",
    brand: "funkful",
    category: "tumblers",
    type: "ready-made",
    name: "Sunset Ombré Tumbler — 15oz",
    description: "Pre-printed sunset ombré wrap, double-wall insulated stainless steel. Ready to ship.",
    basePriceCents: 26900,
    swatch: palette.gold,
  },

  // ---------- Tumblers — personalize ----------
  {
    id: "tumbler-personalize-20oz",
    brand: "funkful",
    category: "tumblers",
    type: "personalize",
    name: "Personalize Your Own Tumbler — 20oz",
    description: "Double-wall insulated, keeps drinks cold 24h / hot 8h. Laser-etched name or initials.",
    basePriceCents: 28900,
    badge: "Bestseller",
    swatch: palette.gold,
    personalizationPrompt: "Name or initials",
    variantGroups: [
      {
        name: "Color",
        options: [
          { label: "Black" },
          { label: "White" },
          { label: "Sage" },
          { label: "Rose Gold", priceDeltaCents: 2000 },
        ],
      },
    ],
  },
  {
    id: "tumbler-personalize-15oz",
    brand: "funkful",
    category: "tumblers",
    type: "personalize",
    name: "Personalize Your Own Tumbler — 15oz",
    description: "Same insulated build as our 20oz, in a slightly more compact size. Laser-etched name or initials.",
    basePriceCents: 25900,
    swatch: palette.lavender,
    personalizationPrompt: "Name or initials",
    variantGroups: [
      {
        name: "Color",
        options: [
          { label: "Black" },
          { label: "White" },
          { label: "Sage" },
          { label: "Rose Gold", priceDeltaCents: 1500 },
        ],
      },
    ],
  },

  // ---------- Glassware — ready-made ----------
  {
    id: "glass-ready-classic-bamboo",
    brand: "funkful",
    category: "glassware",
    type: "ready-made",
    name: "Classic Bamboo Lid Glass Mug",
    description: "Borosilicate glass mug with a natural bamboo lid, Funkful logo etched. Ready to ship.",
    basePriceCents: 22900,
    badge: "Ready to ship",
    swatch: palette.lavender,
  },

  // ---------- Glassware — personalize ----------
  {
    id: "glass-personalize-bamboo",
    brand: "funkful",
    category: "glassware",
    type: "personalize",
    name: "Personalize Your Own Glass Mug with Bamboo Lid",
    description: "Borosilicate glass mug, laser-etched, with a natural bamboo lid that doubles as a coaster.",
    basePriceCents: 24900,
    badge: "New",
    swatch: palette.sage,
    personalizationPrompt: "Name, initials, or small icon",
    variantGroups: [{ name: "Lid finish", options: [{ label: "Natural Bamboo" }, { label: "Dark Bamboo" }] }],
  },

  // ---------- Apparel — ready-made ----------
  {
    id: "tee-ready-logo",
    brand: "funkful",
    category: "apparel",
    type: "ready-made",
    name: "Funkful Logo Tee",
    description: "Soft cotton tee with the Funkful script logo across the chest. Ready to ship.",
    basePriceCents: 22900,
    swatch: palette.beige,
    variantGroups: [
      {
        name: "Size",
        options: [{ label: "S" }, { label: "M" }, { label: "L" }, { label: "XL" }, { label: "XXL", priceDeltaCents: 2000 }],
      },
      { name: "Color", options: [{ label: "Black" }, { label: "White" }, { label: "Sage" }] },
    ],
  },
  {
    id: "hoodie-ready-script",
    brand: "funkful",
    category: "apparel",
    type: "ready-made",
    name: "Funkful Script Hoodie",
    description: "Heavyweight fleece hoodie with the Funkful script logo across the front. Ready to ship.",
    basePriceCents: 42900,
    badge: "Bestseller",
    swatch: palette.blush,
    variantGroups: [
      {
        name: "Size",
        options: [{ label: "S" }, { label: "M" }, { label: "L" }, { label: "XL" }, { label: "XXL", priceDeltaCents: 3000 }],
      },
      { name: "Color", options: [{ label: "Black" }, { label: "Heather Grey" }, { label: "Sage" }] },
    ],
  },

  // ---------- Apparel — personalize ----------
  {
    id: "tee-personalize",
    brand: "funkful",
    category: "apparel",
    type: "personalize",
    name: "Personalize Your Own T-Shirt",
    description: "Soft, breathable cotton tee with your name, initials, or a custom design printed on front.",
    basePriceCents: 24900,
    badge: "New",
    swatch: palette.beige,
    personalizationPrompt: "Name, quote, or short design note",
    variantGroups: [
      {
        name: "Size",
        options: [{ label: "S" }, { label: "M" }, { label: "L" }, { label: "XL" }, { label: "XXL", priceDeltaCents: 2000 }],
      },
      { name: "Color", options: [{ label: "Black" }, { label: "White" }, { label: "Sage" }, { label: "Blush" }] },
    ],
  },
  {
    id: "hoodie-personalize",
    brand: "funkful",
    category: "apparel",
    type: "personalize",
    name: "Personalize Your Own Hoodie",
    description: "Heavyweight fleece hoodie, personalized front print, built for cooler evenings.",
    basePriceCents: 44900,
    badge: "Cozy Season",
    swatch: palette.blush,
    personalizationPrompt: "Name or short design note",
    variantGroups: [
      {
        name: "Size",
        options: [{ label: "S" }, { label: "M" }, { label: "L" }, { label: "XL" }, { label: "XXL", priceDeltaCents: 3000 }],
      },
      { name: "Color", options: [{ label: "Black" }, { label: "Heather Grey" }, { label: "Sage" }] },
    ],
  },
];

export function getProductsByCategory(category: ProductCategory | "all"): Product[] {
  if (category === "all") return products;
  return products.filter((p) => p.category === category);
}

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
