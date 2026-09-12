"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { products } from "@/lib/products";
import { brands, palette } from "@/lib/brands";

export default function SearchPage() {
  const [query,setQuery]=useState("");
  const results=useMemo(()=>products.filter(p=>`${p.name} ${p.description} ${p.category}`.toLowerCase().includes(query.toLowerCase())),[query]);
  return <main style={{background:palette.cream,color:palette.black}} className="min-h-screen">
    <div className="max-w-[1180px] mx-auto px-8 py-12">
      <p className="text-xs font-bold uppercase tracking-[.14em]" style={{color:"#8a4a45"}}>Find your next favourite</p>
      <h1 className="text-4xl font-black uppercase mt-2 mb-6">Search</h1>
      <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search mugs, tumblers, hoodies, scoops…" className="w-full border rounded-full bg-white px-5 py-4 text-sm mb-10" />
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-5">{results.length} result{results.length===1?"":"s"}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map(p=><Link key={p.id} href={`/products/${p.id}`} className="border rounded-[20px] overflow-hidden bg-white hover:-translate-y-0.5 transition-transform">
          <div style={{background:p.swatch}} className="aspect-square flex items-center justify-center"><Image src={brands[p.brand].logo} alt="" width={130} height={130} className="object-contain"/></div>
          <div className="p-5"><p className="text-[10px] uppercase font-bold text-neutral-500">{p.category}</p><h2 className="font-extrabold mt-1">{p.name}</h2><p className="text-sm mt-2">R{(p.basePriceCents/100).toFixed(0)}</p></div>
        </Link>)}
      </div>
    </div>
  </main>;
}
