"use client";
import { useState } from "react";

type Line = { description: string; quantity: number; price: string; details: string };

const blank = (): Line => ({ description: "", quantity: 1, price: "", details: "" });

export default function QuoteManager() {
  const [customerName, setCustomerName] = useState(""); const [customerEmail, setCustomerEmail] = useState(""); const [customerPhone, setCustomerPhone] = useState("");
  const [shipping, setShipping] = useState("0"); const [notes, setNotes] = useState(""); const [items, setItems] = useState<Line[]>([{ ...blank() }]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [result, setResult] = useState<{ quoteNumber: string; url: string; total: number } | null>(null);
  const total = items.reduce((sum, i) => sum + Math.max(0, Number(i.price) || 0) * Math.max(1, Number(i.quantity) || 1), 0) + Math.max(0, Number(shipping) || 0);
  
  function update(index: number, patch: Partial<Line>) { 
    setItems(old => old.map((item, i) => i === index ? { ...item, ...patch } : item)); 
}
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/admin/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName, customerEmail, customerPhone, shippingCents: Math.round(Number(shipping) * 100), notes, items: items.map(i => ({ description: i.description, quantity: Number(i.quantity), unitPriceCents: Math.round(Number(i.price) * 100), details: i.details })) }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Could not create quotation.");
      setResult({ quoteNumber: payload.quote.quote_number, url: payload.quote.url, total: payload.quote.total_cents / 100 });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create quotation."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="rounded-3xl border border-black/10 bg-white p-5 sm:p-7"><h2 className="text-xl font-black">Create a quotation</h2><p className="mt-1 text-sm text-neutral-600">Enter prices in rand. The customer will receive a unique link to review the quote and pay online.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-bold">Customer name<input required value={customerName} onChange={e=>setCustomerName(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
        <label className="text-sm font-bold">Email (optional)<input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
        <label className="text-sm font-bold">WhatsApp / phone<input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
    </div>
    <h3 className="mt-7 font-black">Items</h3>
    <div className="mt-3 space-y-4">{items.map((item,index)=>
        <div key={index} className="grid gap-3 rounded-2xl bg-neutral-50 p-4 sm:grid-cols-12">
            <label className="text-sm font-bold sm:col-span-4">Description<input required value={item.description} onChange={e=>update(index,{description:e.target.value})} placeholder="Personalised glass can mug" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>
            <label className="text-sm font-bold sm:col-span-2">Qty<input required type="number" min="1" max="100" value={item.quantity} onChange={e=>update(index,{quantity:Number(e.target.value)})} className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>
            <label className="text-sm font-bold sm:col-span-2">Unit price (R)<input required type="number" min="0" step="0.01" value={item.price} onChange={e=>update(index,{price:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>
            <label className="text-sm font-bold sm:col-span-4">Personalisation / details<input value={item.details} onChange={e=>update(index,{details:e.target.value})} placeholder="Name, design, wording…" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>
            <div className="sm:col-span-12 flex justify-end">{items.length>1 && <button type="button" onClick={()=>setItems(old=>old.filter((_,i)=>i!==index))} className="text-xs font-bold text-red-700">Remove item</button>}</div>
        </div>
        )}
    </div>
    <button type="button" onClick={()=>setItems(old=>[...old,{...blank()}])} className="mt-3 rounded-full border border-black/20 px-4 py-2 text-sm font-bold">+ Add item</button>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Delivery (R)<input type="number" min="0" step="0.01" value={shipping} onChange={e=>setShipping(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
        <label className="text-sm font-bold">Internal / customer notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" rows={2}/></label>
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
        <p className="text-lg font-black">Total: R{total.toFixed(2)}</p>
        <button disabled={busy} className="rounded-full bg-black px-6 py-3 text-sm font-black text-white disabled:opacity-50">{busy?"Creating…":"Create quotation link"}</button>
    </div>
    {error && <p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}{result && <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm"><p className="font-bold">Created {result.quoteNumber} · R{result.total.toFixed(2)}</p><a className="break-all underline" href={result.url}>{result.url}</a></div>}
  </form>;
}
