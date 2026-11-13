// src/lib/inventory-shared.ts
//
// Pure helpers shared by the inventory server code and client components
// (units, formatting, labels). No server-only imports here.

export type Unit = "m" | "sheet" | "roll" | "ml" | "g" | "kg" | "unit";

export const UNITS: { value: Unit; label: string; short: string }[] = [
  { value: "m", label: "Metres", short: "m" },
  { value: "sheet", label: "Sheets", short: "sheets" },
  { value: "roll", label: "Rolls", short: "rolls" },
  { value: "ml", label: "Millilitres", short: "ml" },
  { value: "g", label: "Grams", short: "g" },
  { value: "kg", label: "Kilograms", short: "kg" },
  { value: "unit", label: "Individual units", short: "pcs" },
];

export const unitShort = (u: string) => UNITS.find((x) => x.value === u)?.short ?? u;

/** Alternative units you may type a quantity in, with the factor to the material's own unit. */
export const INPUT_UNITS: Record<Unit, { value: string; label: string; factor: number }[]> = {
  m: [{ value: "m", label: "m", factor: 1 }, { value: "cm", label: "cm", factor: 0.01 }],
  kg: [{ value: "kg", label: "kg", factor: 1 }, { value: "g", label: "g", factor: 0.001 }],
  g: [{ value: "g", label: "g", factor: 1 }],
  ml: [{ value: "ml", label: "ml", factor: 1 }, { value: "l", label: "litres", factor: 1000 }],
  sheet: [{ value: "sheet", label: "sheets", factor: 1 }],
  roll: [{ value: "roll", label: "rolls", factor: 1 }],
  unit: [{ value: "unit", label: "pcs", factor: 1 }],
};

/** Converts a typed quantity into the material's own unit. Returns null if invalid. */
export function toBaseQuantity(value: number, inputUnit: string, base: Unit): number | null {
  if (!Number.isFinite(value)) return null;
  const option = INPUT_UNITS[base]?.find((o) => o.value === inputUnit) ?? INPUT_UNITS[base]?.[0];
  if (!option) return null;
  // Round to 3 dp to match numeric(14,3) and avoid 0.1 + 0.2 style noise.
  return Math.round(value * option.factor * 1000) / 1000;
}

const trim = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString("en-ZA", { maximumFractionDigits: 3 });

export function formatQty(qty: number, unit: string): string {
  return `${trim(qty)} ${unitShort(unit)}`;
}

/** Cents (may be fractional for per-ml / per-gram costs) → "R65.00". */
export function formatRand(cents: number, maxDp = 2): string {
  return "R" + (cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: maxDp });
}

export type StockStatus = "out" | "low" | "ok";
export function stockStatus(onHand: number, reorderLevel: number): StockStatus {
  if (onHand <= 0) return "out";
  if (reorderLevel > 0 && onHand <= reorderLevel) return "low";
  return "ok";
}

export const REASON_LABEL: Record<string, string> = {
  purchase: "Purchase / delivery",
  order_usage: "Used on order",
  wastage: "Wastage",
  damaged: "Damaged",
  test_cut: "Test cut",
  stocktake_correction: "Stock count correction",
  manual_correction: "Manual correction",
  other: "Other",
};

export const STOCK_OUT_REASONS = ["order_usage", "wastage", "damaged", "test_cut", "other"] as const;
export const ADJUST_REASONS = ["manual_correction", "damaged", "wastage", "test_cut"] as const;

export interface MaterialLike {
  brand?: { name: string } | null;
  type?: { name: string } | null;
  range_name?: string | null;
  colour?: string | null;
  finish?: string | null;
  category?: { name: string } | null;
}

/** "Siser Glitter – Gold" style display name. */
export function materialTitle(m: MaterialLike): string {
  const brand = m.brand?.name && m.brand.name !== "Other / Unbranded" ? m.brand.name : "";
  const kind = m.range_name || m.type?.name || m.category?.name || "Material";
  const head = [brand, kind].filter(Boolean).join(" ");
  return m.colour ? `${head} – ${m.colour}` : head;
}

/** A scanned code may be a plain code, a manufacturer barcode, or one of our label URLs. */
export function extractScanCode(raw: string): string {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/admin\/inventory\/m\/([^/]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    /* not a URL */
  }
  return text;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);
