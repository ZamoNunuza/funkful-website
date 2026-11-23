"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-context";
import { palette } from "@/lib/brands";
import type { ColdVinylColour } from "@/lib/inventory/cold-vinyl";

type Product = {
  id: string;
  brand: "funkful" | "scoopful" | "anime-box";
  name: string;
  imageUrl?: string | null;
  product_type: "ready-made" | "made-to-order" | "personalize" | "mystery" | "addon";
  base_price_cents: number;
  personalization_prompt: string | null;
  allow_personalization: boolean;
  personalization_price_delta_cents: number;
  personalization_max_length: number;
  variantGroups: { name: string; options: { label: string; priceDeltaCents: number }[] }[];
};

const GLASS_CUP_ID = "original-glass-personalize-bamboo";
const COLD_FINISH = "Cold Colour-Changing Vinyl";
const FINISHES = [
  { name: "UV DTF", description: "Full-colour, glossy and slightly raised." },
  { name: "Permanent Adhesive Vinyl", description: "A crisp, clean single-colour finish." },
  { name: "Cold Colour-Changing Vinyl", description: "Reveals its colour when the glass gets cold." },
] as const;
const DESIGNS = ["Name or initials", "Name with crown", "Name with heart", "Custom design"] as const;
const COLOURS = ["Black", "White", "Gold", "Silver", "Pink", "Other / Surprise me"] as const;

function formatRands(cents: number) { return `R${(cents / 100).toFixed(0)}`; }
function selectionKey(parts: string[]) {
  let hash = 2166136261;
  for (const char of parts.join("|").toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export default function AddToCart({ product, coldVinylColours = [] }: { product: Product; coldVinylColours?: ColdVinylColour[] }) {
  const { addItem } = useCart();
  const isGlassCup = product.id === GLASS_CUP_ID;
  const isCaricatureProduct = ["original-hoodie-caricature-personalize", "original-mug-personalize", "original-tshirt-caricature-personalize"].includes(product.id);
  const [selection, setSelection] = useState<Record<string, string>>(() => Object.fromEntries(product.variantGroups.map((g) => [g.name, g.options[0]?.label ?? ""])));
  const [personalization, setPersonalization] = useState("");
  const [finish, setFinish] = useState<string>("UV DTF");
  const [design, setDesign] = useState<string>("Name or initials");
  const [colour, setColour] = useState<string>("Black");
  const [vinylCode, setVinylCode] = useState("");
  const [instructions, setInstructions] = useState("");
  const [reference, setReference] = useState<File | null>(null);
  const [referencePath, setReferencePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const personalizationEnabled = product.allow_personalization || product.product_type === "personalize";
  const useVinylPicker = isGlassCup && finish === COLD_FINISH && coldVinylColours.length > 0;
  const chosenVinyl = coldVinylColours.find((c) => c.code === vinylCode && c.inStock);
  const requiresReference = isCaricatureProduct || (isGlassCup && design === "Custom design");
  const finishGroup = product.variantGroups.find((group) => group.name === "Finish");
  const designGroup = product.variantGroups.find((group) => group.name === "Design");
  const colourGroup = product.variantGroups.find((group) => group.name === "Colour");
  const finishChoices = finishGroup?.options ?? FINISHES.map((item) => ({ label: item.name, priceDeltaCents: 0 }));
  const designChoices = designGroup?.options.map((item) => item.label) ?? [...DESIGNS];
  const colourChoices = colourGroup?.options.map((item) => item.label) ?? [...COLOURS];
  const finishPrice = isGlassCup ? product.base_price_cents + (finishGroup?.options.find((item) => item.label === finish)?.priceDeltaCents ?? 0) : product.base_price_cents;
  const price = useMemo(() => {
    const variants = product.variantGroups.reduce((sum, group) => sum + (isGlassCup && group.name === "Finish" ? 0 : group.options.find((o) => o.label === selection[group.name])?.priceDeltaCents ?? 0), 0);
    const personal = !isGlassCup && personalizationEnabled && personalization.trim() ? product.personalization_price_delta_cents : 0;
    return (isGlassCup ? finishPrice : product.base_price_cents) + variants + personal;
  }, [product, selection, personalization, personalizationEnabled, isGlassCup, finishPrice]);

  async function uploadReference() {
    if (!reference) return "";
    const prepared = await fetch("/api/personalization/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, fileName: reference.name, contentType: reference.type, size: reference.size }),
    });
    const payload = await prepared.json();
    if (!prepared.ok) throw new Error(payload.error || "Could not prepare your image upload.");
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from(payload.bucket).uploadToSignedUrl(payload.path, payload.token, reference, { contentType: reference.type, upsert: false });
    if (uploadError) throw new Error("Your reference image didn't upload. Please try again.");
    return payload.path as string;
  }

  async function add() {
    setError("");
    setAdded(false);
    if (isGlassCup && !personalization.trim()) {
      setError("Add the name or text you want on your glass cup.");
      return;
    }
    if (useVinylPicker && !chosenVinyl) {
      setError("Choose your cold colour-changing vinyl colour.");
      return;
    }
    if (requiresReference && !reference && !referencePath) {
      setError(isCaricatureProduct ? "Upload the photo you'd like us to turn into a caricature." : "Upload a reference image for your custom design.");
      return;
    }

    try {
      setUploading(true);
      const uploadedPath = requiresReference ? referencePath || await uploadReference() : "";
      if (uploadedPath) setReferencePath(uploadedPath);
      const parts = isGlassCup ? [] : Object.values(selection).filter(Boolean);
      if (isGlassCup) {
        parts.push(`Finish: ${finish}`, `Design: ${design}`);
        if (useVinylPicker && chosenVinyl) parts.push(`Cold vinyl: ${chosenVinyl.range} – ${chosenVinyl.colour}`, `Vinyl code: ${chosenVinyl.code}`);
        else parts.push(`Colour: ${colour}`);
        if (instructions.trim()) parts.push(`Instructions: ${instructions.trim()}`);
      }
      if (uploadedPath) parts.push(`Reference image: ${uploadedPath}`);
      if (personalization.trim()) parts.push(`"${personalization.trim()}"`);
      addItem({
        id: `${product.id}-${selectionKey(parts)}`,
        brand: product.brand,
        name: product.name,
        imageUrl: product.imageUrl ?? null,
        variant: parts.join(" · ") || undefined,
        priceCents: price,
        productType: product.product_type === "addon" ? "addon" : product.product_type === "mystery" ? "mystery" : product.product_type === "personalize" ? "personalize" : "made-to-order",
      });
      setAdded(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "We couldn't add this custom product. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return <div className="space-y-6">
    {isGlassCup && <section className="rounded-3xl border border-black/10 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><h2 className="text-lg font-black">Make it yours</h2><span className="text-xs font-bold text-neutral-500">Live preview</span></div>
      <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-5 items-center">
        <div className="min-h-[240px] rounded-2xl bg-[#f2eadf] flex items-center justify-center p-5">
          <div className="relative w-[142px] h-[190px] rounded-b-[28px] rounded-t-[18px] border-[3px] border-white/90 bg-white/35 shadow-[inset_-10px_0_18px_rgba(255,255,255,.65),0_12px_25px_rgba(0,0,0,.08)] overflow-hidden">
            <div className="absolute -top-1 left-[-5px] right-[-5px] h-3 rounded-full bg-[#c6a878] border border-[#a98b5c]" />
            <div className="absolute top-2 left-0 right-0 h-2 bg-[#e6d4b4]" />
            <div className="absolute top-[78px] left-2 right-2 text-center font-bold text-[13px] leading-tight break-words" style={{ color: useVinylPicker || colour === "Other / Surprise me" ? "#222" : colour.toLowerCase() }}>{personalization.trim() || "Your name"}{design === "Name with crown" ? " ♛" : design === "Name with heart" ? " ♥" : ""}</div>
            <div className="absolute bottom-4 left-0 right-0 text-center text-[8px] uppercase tracking-[.18em] text-black/35">FUNKFUL</div>
            <div className="absolute top-5 left-3 w-3 h-28 rounded-full bg-white/45 blur-[1px]" />
          </div>
        </div>
        <div className="space-y-3 text-sm text-neutral-600"><p className="font-bold text-black">16oz glass can cup</p><p>Bamboo lid and reusable glass straw. Your preview updates as you type; final placement and scale may vary slightly during production.</p><p className="text-xs">Finish shown: <strong className="text-black">{finish}</strong>{useVinylPicker && chosenVinyl ? <> · <strong className="text-black">{chosenVinyl.colour}</strong></> : null}</p><p className="text-xs">Preview is an on-screen guide, not a production proof.</p></div>
      </div>
    </section>}

    {isGlassCup && <fieldset className="space-y-3"><legend className="text-xs font-extrabold uppercase tracking-[.14em] mb-3">Choose your finish</legend><div className="grid gap-2">
      {finishChoices.map((item) => { const details = FINISHES.find((finishItem) => finishItem.name === item.label); return <label key={item.label} className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition ${finish === item.label ? "border-black bg-white" : "border-black/10 bg-white/50"}`}><span className="flex items-start gap-3"><input type="radio" name="glass-finish" checked={finish === item.label} onChange={() => setFinish(item.label)} className="mt-1 accent-black"/><span><strong className="block text-sm">{item.label}</strong><span className="text-xs text-neutral-500">{details?.description ?? "Personalisation finish."}</span></span></span><strong className="text-sm whitespace-nowrap">{formatRands(product.base_price_cents + item.priceDeltaCents)}</strong></label>; })}
    </div></fieldset>}

    {product.variantGroups.filter((group) => !isGlassCup || !["Finish", "Design", "Colour"].includes(group.name)).map((group) => <label key={group.name} className="flex flex-col gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-neutral-600">{group.name}</span><select value={selection[group.name]} onChange={(e) => setSelection({ ...selection, [group.name]: e.target.value })} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm">{group.options.map((o) => <option key={o.label} value={o.label}>{o.label}{o.priceDeltaCents ? ` (+${formatRands(o.priceDeltaCents)})` : ""}</option>)}</select></label>)}

    {isGlassCup && <fieldset className="space-y-3"><legend className="text-xs font-extrabold uppercase tracking-[.14em] mb-3">Choose your design</legend><div className="grid grid-cols-2 gap-2">{designChoices.map((item) => <label key={item} className={`flex items-center gap-2 rounded-xl border p-3 text-sm cursor-pointer ${design === item ? "border-black bg-white" : "border-black/10"}`}><input type="radio" name="glass-design" checked={design === item} onChange={() => setDesign(item)} className="accent-black"/><span>{item}</span></label>)}</div></fieldset>}

    {personalizationEnabled && <label className="flex flex-col gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-neutral-600">{isGlassCup ? "Name or text to print" : product.personalization_prompt ?? "Personalization"} <span className={isGlassCup ? "text-red-700" : "text-neutral-500"}>{isGlassCup ? "Required" : "Optional"}</span></span><input value={personalization} onChange={(e) => setPersonalization(e.target.value)} maxLength={product.personalization_max_length} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm" placeholder="Enter your name or wording"/><span className="text-right text-[11px] text-neutral-500">{personalization.length}/{product.personalization_max_length}</span></label>}

    {isGlassCup && <>{useVinylPicker ? <fieldset className="space-y-4"><legend className="text-xs font-extrabold uppercase tracking-wide text-neutral-600 mb-2">Choose your cold colour-changing vinyl <span className="text-red-700">Required</span></legend><p className="text-xs text-neutral-500">The first colour is how it looks at room temperature; the second appears when the glass is cold.</p>{["Classic", "Neon", "Shimmer", "Clear"].filter((range) => coldVinylColours.some((c) => c.range === range)).map((range) => <div key={range}><p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-neutral-500">{range}</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{coldVinylColours.filter((c) => c.range === range).map((c) => <button key={c.code} type="button" disabled={!c.inStock} aria-pressed={vinylCode === c.code} onClick={() => setVinylCode(c.code)} className={`rounded-xl border p-2 text-left text-xs transition ${vinylCode === c.code ? "border-black bg-white ring-2 ring-black" : "border-black/10 bg-white/60 hover:border-black/40"} ${!c.inStock ? "cursor-not-allowed opacity-40" : ""}`}>{c.imageUrl ? <Image src={c.imageUrl} alt={c.colour} width={160} height={160} sizes="(max-width: 640px) 33vw, 160px" loading="lazy" className="mb-1 aspect-square w-full rounded-lg object-cover" /> : <span className="mb-1 block aspect-square w-full rounded-lg bg-neutral-100" />}<span className="block font-bold leading-tight">{c.colour}</span>{!c.inStock && <span className="block text-neutral-500">Out of stock</span>}</button>)}</div></div>)}</fieldset> : <label className="flex flex-col gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-neutral-600">Preferred colour</span><select value={colour} onChange={(e) => setColour(e.target.value as (typeof COLOURS)[number])} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm">{colourChoices.map((item) => <option key={item}>{item}</option>)}</select></label>}<label className="flex flex-col gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-neutral-600">Additional design instructions <span className="font-normal normal-case text-neutral-500">(optional)</span></span><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={500} rows={3} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm" placeholder="Tell us about placement, style or any details to consider."/></label></>}

    {requiresReference && <label className="flex flex-col gap-2 rounded-2xl border border-dashed border-black/25 bg-white/60 p-4"><span className="text-xs font-extrabold uppercase tracking-wide">{isCaricatureProduct ? "Photo for your caricature" : "Reference image"} <span className="text-red-700">Required</span></span><span className="text-xs text-neutral-500">JPG, PNG or WebP · up to 8 MB. Use a clear, well-lit photo.</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setReference(e.target.files?.[0] ?? null); setReferencePath(""); }} className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"/>{reference && <span className="text-xs text-neutral-700">Selected: {reference.name}</span>}{referencePath && <span className="text-xs text-green-800">Photo uploaded.</span>}{isCaricatureProduct && <span className="text-xs text-neutral-500">Our team will use this photo to create the caricature artwork after checkout.</span>}</label>}

    <div className="border-t border-black/10 pt-5"><div className="flex items-center justify-between gap-4 mb-4"><span className="text-sm text-neutral-600">Your product total</span><strong className="text-2xl font-black tabular-nums">{formatRands(price)}</strong></div>{error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}{added && <p role="status" className="mb-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">Added to your bag.</p>}<button onClick={add} disabled={uploading || (requiresReference && !reference && !referencePath) || (useVinylPicker && !chosenVinyl)} style={{ background: palette.black, color: palette.cream }} className="w-full rounded-full px-7 py-4 text-xs font-extrabold uppercase disabled:opacity-50">{uploading ? "Uploading your reference…" : "Add to bag"}</button><p className="mt-3 text-[11px] leading-relaxed text-neutral-500">Personalised items are made to order. Please check your spelling and instructions before adding to your bag.</p></div>
  </div>;
}
