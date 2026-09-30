"use client";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { palette } from "@/lib/brands";

type Product = {
  id: string;
  brand: "funkful" | "scoopful" | "anime-box";
  name: string;
  product_type: "ready-made" | "made-to-order" | "personalize" | "mystery" | "addon";
  base_price_cents: number;
  personalization_prompt: string | null;
  allow_personalization: boolean;
  personalization_price_delta_cents: number;
  personalization_max_length: number;
  variantGroups: { name: string; options: { label: string; priceDeltaCents: number }[] }[];
};

function formatRands(cents: number) { return `R${(cents / 100).toFixed(0)}`; }

export default function AddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selection, setSelection] = useState<Record<string, string>>(() => Object.fromEntries(product.variantGroups.map((g) => [g.name, g.options[0]?.label ?? ""])));
  const [personalization, setPersonalization] = useState("");
  const personalizationEnabled = product.allow_personalization || product.product_type === "personalize";
  const price = useMemo(() => {
    const variants = product.variantGroups.reduce((sum, group) => sum + (group.options.find((o) => o.label === selection[group.name])?.priceDeltaCents ?? 0), 0);
    const personal = personalizationEnabled && personalization.trim() ? product.personalization_price_delta_cents : 0;
    return product.base_price_cents + variants + personal;
  }, [product, selection, personalization, personalizationEnabled]);

  function add() {
    const parts = Object.values(selection).filter(Boolean);
    if (personalizationEnabled) {
      if (product.product_type === "personalize" && !personalization.trim()) return;
      if (personalization.trim()) parts.push(`"${personalization.trim()}"`);
    }
    addItem({ id: `${product.id}-${parts.join("-")}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"), brand: product.brand, name: product.name, variant: parts.join(" · ") || undefined, priceCents: price, productType: product.product_type === "addon" ? "addon" : product.product_type === "mystery" ? "mystery" : product.product_type === "personalize" ? "personalize" : "made-to-order" });
  }

  return <div>
    {product.variantGroups.map((group) => <label key={group.name} className="flex flex-col gap-2 mb-4"><span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{group.name}</span><select value={selection[group.name]} onChange={(e) => setSelection({ ...selection, [group.name]: e.target.value })} className="border rounded-xl px-4 py-3 bg-white text-sm">{group.options.map((o) => <option key={o.label} value={o.label}>{o.label}{o.priceDeltaCents ? ` (+${formatRands(o.priceDeltaCents)})` : ""}</option>)}</select></label>)}
    {personalizationEnabled && <label className="flex flex-col gap-2 mb-5"><span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{product.personalization_prompt ?? "Personalization"}{product.personalization_price_delta_cents ? ` · +${formatRands(product.personalization_price_delta_cents)}` : ""}</span><input value={personalization} onChange={(e) => setPersonalization(e.target.value)} maxLength={product.personalization_max_length} className="border rounded-xl px-4 py-3 bg-white text-sm" placeholder="Optional — enter your text" /></label>}
    <div className="flex items-center justify-between gap-5"><span className="text-xl font-black">{formatRands(price)}</span><button onClick={add} disabled={product.product_type === "personalize" && !personalization.trim()} style={{ background: palette.black, color: palette.cream }} className="px-7 py-4 rounded-full text-xs font-extrabold uppercase disabled:opacity-40">Add to bag</button></div>
  </div>;
}
