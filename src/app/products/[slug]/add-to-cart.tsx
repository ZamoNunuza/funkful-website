"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { palette } from "@/lib/brands";
import type { Product } from "@/lib/products";

function formatRands(cents: number) { return `R${(cents / 100).toFixed(0)}`; }

export default function AddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selection, setSelection] = useState<Record<string,string>>(
    Object.fromEntries((product.variantGroups ?? []).map(g => [g.name, g.options[0].label]))
  );
  const [personalization, setPersonalization] = useState("");

  let price = product.basePriceCents;
  for (const group of product.variantGroups ?? []) {
    price += group.options.find(o => o.label === selection[group.name])?.priceDeltaCents ?? 0;
  }

  function add() {
    const parts = Object.values(selection);
    if (product.type === "personalize") {
      if (!personalization.trim()) return;
      parts.push(`"${personalization.trim()}"`);
    }
    addItem({
      id: `${product.id}-${Object.values(selection).join("-")}-${personalization.trim()}`.toLowerCase().replace(/[^a-z0-9-]+/g,"-"),
      brand: product.brand,
      name: product.name,
      variant: parts.join(" · ") || undefined,
      priceCents: price,
      productType: product.type,
    });
  }

  return <div>
    {(product.variantGroups ?? []).map(group => (
      <label key={group.name} className="flex flex-col gap-2 mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{group.name}</span>
        <select value={selection[group.name]} onChange={e => setSelection({...selection,[group.name]:e.target.value})} className="border rounded-xl px-4 py-3 bg-white text-sm">
          {group.options.map(o => <option key={o.label}>{o.label}{o.priceDeltaCents ? ` (+${formatRands(o.priceDeltaCents)})` : ""}</option>)}
        </select>
      </label>
    ))}
    {product.type === "personalize" && (
      <label className="flex flex-col gap-2 mb-5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{product.personalizationPrompt ?? "Personalization"}</span>
        <input value={personalization} onChange={e=>setPersonalization(e.target.value)} maxLength={80} className="border rounded-xl px-4 py-3 bg-white text-sm" placeholder="Enter your text" />
      </label>
    )}
    <div className="flex items-center justify-between gap-5">
      <span className="text-xl font-black">{formatRands(price)}</span>
      <button onClick={add} disabled={product.type === "personalize" && !personalization.trim()} style={{background:palette.black,color:palette.cream}} className="px-7 py-4 rounded-full text-xs font-extrabold uppercase disabled:opacity-40">Add to bag</button>
    </div>
  </div>;
}
