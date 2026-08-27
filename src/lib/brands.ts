// src/lib/brands.ts
//
// Central brand registry. Every brand-aware component (headers, brand-split
// cards, layouts) reads from here instead of hardcoding copy or colors.
// Adding a new sub-brand later = adding one entry here + a route folder.

export type BrandSlug = "funkful" | "scoopful" | "anime-box";

export interface Brand {
  slug: BrandSlug;
  /** Display name, e.g. "Scoopful by Funkful" */
  name: string;
  /** Short tagline shown under/near the name */
  tagline: string;
  /** Small uppercase label used above the name, e.g. "The Fun Bestie" */
  eyebrow: string;
  /** One or two sentence description used in cards and meta tags */
  description: string;
  /** Path under /public, e.g. "/assets/scoopful-logo.png" */
  logo: string;
  /** Brand accent color (hex) — background for cards, badges, etc. */
  accent: string;
  /** Ink/text color that reads well on top of `accent` */
  accentInk: string;
  status: "live" | "coming-soon";
  /** Route to the brand's landing page */
  href: string;
}

export const brands: Record<BrandSlug, Brand> = {
  funkful: {
    slug: "funkful",
    name: "Funkful Originals",
    tagline: "Made with personality",
    eyebrow: "The Creative Friend",
    description:
      "Custom mugs, tumblers and apparel — bespoke, affordable lifestyle goods that trigger a little self-expression every day.",
    logo: "/assets/funkful-logo.png",
    accent: "#E8DDD0", // beige
    accentInk: "#111111",
    status: "live",
    href: "/originals",
  },
  scoopful: {
    slug: "scoopful",
    name: "Scoopful by Funkful",
    tagline: "Scoop. Surprise. Smile.",
    eyebrow: "The Fun Bestie",
    description:
      "A gamified mystery scoop event — five ball colors, five rarities, and every scoop tells you exactly which colors are guaranteed.",
    logo: "/assets/scoopful-logo.png",
    accent: "#EBC6C2", // blush
    accentInk: "#5b2f2b",
    status: "live",
    href: "/scoopful",
  },
  "anime-box": {
    slug: "anime-box",
    name: "Anime Box by Funkful",
    tagline: "Otaku culture, curated",
    eyebrow: "Coming soon",
    description:
      "Curated anime-themed mystery boxes and merch. Name's still TBD — join the waitlist to help us reveal it first.",
    logo: "/assets/funkful-logo.png", // swap once the brand has its own mark
    accent: "#CFC5E8", // lavender
    accentInk: "#241a45",
    status: "coming-soon",
    href: "#anime",
  },
};

// Shared palette (matches the design mockups). Brand-neutral chrome — the
// black header, cream background, sage/gold accent stickers — pulls from
// here rather than duplicating hex values across components.
export const palette = {
  black: "#111111",
  cream: "#FAF8F4",
  beige: "#E8DDD0",
  blush: "#EBC6C2",
  sage: "#A8B5A0",
  lavender: "#CFC5E8",
  gold: "#D8BE85",
} as const;

// Scoopful's "ball system" — five rarity tiers used across the hero,
// the ball-legend section, and each product card's guaranteed-odds line.
// Ordered lowest → highest rarity.
export const ballColors = {
  blue: "#5C7FA6",
  yellow: "#E3B23C",
  green: "#7C9473",
  red: "#A6564B",
  orange: "#D98A42",
} as const;

export function getBrand(slug: BrandSlug): Brand {
  return brands[slug];
}

export const brandList = Object.values(brands);

// Primary nav links shared across the site header. Kept here (not in the
// component) so both the Funkful homepage and each brand layout stay in sync.
export const navLinks = [
  { label: "Personalized", href: "/originals" },
  { label: "Scoopful", href: "/scoopful" },
  { label: "Anime Boxes ✨", href: "/#anime", soon: true },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/contact" }
];
