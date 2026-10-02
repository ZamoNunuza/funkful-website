"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  brand: string;
  category: string;
  product_type: string;
  name: string;
  slug: string;
  description: string | null;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  swatch: string | null;
  badge: string | null;
  personalization_prompt: string | null;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
  featured: boolean;
  sort_order: number;
  allow_personalization: boolean;
  personalization_price_delta_cents: number;
  personalization_max_length: number;
  design_group: string | null;
};

type Variant = {
  id: string;
  product_id: string;
  group_name: string;
  option_name: string;
  price_delta_cents: number;
  stock_quantity: number;
  sku: string | null;
  is_active: boolean;
  sort_order: number;
};

type Draft = Omit<Product, "id"> & {
  id?: string;
  variants: Variant[];
};

const emptyDraft: Draft = {
  brand: "funkful",
  category: "mugs",
  product_type: "ready-made",
  name: "",
  slug: "",
  description: "",
  base_price_cents: 0,
  compare_at_price_cents: null,
  swatch: "",
  badge: "",
  personalization_prompt: "",
  stock_quantity: 0,
  track_inventory: true,
  is_active: true,
  featured: false,
  sort_order: 0,
  allow_personalization: false,
  personalization_price_delta_cents: 0,
  personalization_max_length: 80,
  design_group: "",
  variants: [],
};

const money = (cents: number | null | undefined) =>
  `R${((Number(cents ?? 0) || 0) / 100).toFixed(2)}`;

function toDraft(product: Product, variants: Variant[]): Draft {
  return { ...product, variants: variants.filter((v) => v.product_id === product.id) };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-black/50">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-black/30"
      />
    </label>
  );
}

export default function ProductManager({
  products: initialProducts,
  variants: initialVariants,
}: {
  products: Product[];
  variants: Variant[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [variants, setVariants] = useState(initialVariants);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products]);
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const status = filter === "all" || (filter === "active" ? p.is_active : !p.is_active);
      const matchesSearch =
        !q ||
        [p.name, p.slug, p.id, p.category, p.brand, p.product_type]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q));
      return status && matchesSearch && (brand === "all" || p.brand === brand) &&
        (category === "all" || p.category === category);
    });
  }, [products, filter, search, brand, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageStart = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);

  const activeCount = products.filter((p) => p.is_active).length;
  const inactiveCount = products.length - activeCount;

  function startNew() {
    setEditing({ ...emptyDraft, variants: [] });
    setMessage("");
  }

  function startEdit(product: Product) {
    setEditing(toDraft(product, variants));
    setMessage("");
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateVariant(id: string, patch: Partial<Variant>) {
    setEditing((current) =>
      current
        ? { ...current, variants: current.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)) }
        : current
    );
  }

  function addVariant() {
    setEditing((current) =>
      current
        ? {
            ...current,
            variants: [
              ...current.variants,
              {
                id: `new-${crypto.randomUUID()}`,
                product_id: current.id ?? "",
                group_name: "Size",
                option_name: "",
                price_delta_cents: 0,
                stock_quantity: 0,
                sku: null,
                is_active: true,
                sort_order: current.variants.length,
              },
            ],
          }
        : current
    );
  }

  function removeVariant(id: string) {
    setEditing((current) =>
      current ? { ...current, variants: current.variants.filter((v) => v.id !== id) } : current
    );
  }

  async function refreshProducts() {
    const response = await fetch("/api/admin/products", {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not reload products.");
    }

      setProducts(result.products ?? []);
      setVariants(result.variants ?? []);
  }

  async function save() {
    if (!editing) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editing),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not save product."
        );
      }

      await refreshProducts();

      setEditing(null);
      setMessage("Product saved successfully.");
      setPage(1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save product."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(product: Product) {
    if (!confirm(`Deactivate "${product.name}"? It will remain in the database.`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not deactivate product.");
      setProducts((current) => current.map((p) => p.id === product.id ? { ...p, is_active: false } : p));
      setVariants((current) => current.map((v) => v.product_id === product.id ? { ...v, is_active: false } : v));
      setMessage(`${product.name} was deactivated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not deactivate product.");
    } finally {
      setBusy(false);
    }
  }

  async function activate(product: Product) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...toDraft({ ...product, is_active: true }, variants), is_active: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not activate product.");
      setProducts((current) => current.map((p) => p.id === product.id ? { ...p, is_active: true } : p));
      setMessage(`${product.name} is active again.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not activate product.");
    } finally {
      setBusy(false);
    }
  }

  async function permanentDelete(product: Product) {
    if (!confirm(`Permanently delete "${product.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, permanent: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete product.");
      setProducts((current) => current.filter((p) => p.id !== product.id));
      setVariants((current) => current.filter((v) => v.product_id !== product.id));
      setMessage(`${product.name} was permanently deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Total products", products.length, "bg-white"],
          ["Active", activeCount, "bg-[#DDE7D8]"],
          ["Inactive", inactiveCount, "bg-[#EBC6C2]/60"],
        ].map(([label, value, bg]) => (
          <div key={String(label)} className={`rounded-2xl border border-black/10 p-4 ${bg}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-black/50">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "inactive"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
                  filter === value ? "bg-black text-white" : "bg-white border border-black/10"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <button type="button" onClick={startNew} className="rounded-xl bg-black px-4 py-2.5 text-sm font-black text-white hover:bg-neutral-800">
            + New product
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, slug or ID…" className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-black/30" />
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">
            <option value="all">All brands</option>
            {brands.map((value) => <option key={value}>{value}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">
            <option value="all">All categories</option>
            {categories.map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>

        {message && <p className="mt-4 rounded-xl bg-white px-3 py-3 text-sm">{message}</p>}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-black/10 bg-[#F7F4EF] text-[11px] font-black uppercase tracking-[0.12em] text-black/50">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => {
                const count = variants.filter((v) => v.product_id === product.id).length;
                return (
                  <tr key={product.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-4">
                      <button type="button" onClick={() => startEdit(product)} className="text-left font-black hover:underline">{product.name}</button>
                      <p className="mt-0.5 text-xs text-neutral-500">{product.slug}</p>
                    </td>
                    <td className="px-4 py-4">{product.brand}</td>
                    <td className="px-4 py-4">{product.product_type}</td>
                    <td className="px-4 py-4 font-bold">{money(product.base_price_cents)}</td>
                    <td className="px-4 py-4">{count}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${product.is_active ? "bg-[#DDE7D8]" : "bg-neutral-200"}`}>
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(product)} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold">Edit</button>
                        {product.is_active ? (
                          <button type="button" disabled={busy} onClick={() => deactivate(product)} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold">Deactivate</button>
                        ) : (
                          <>
                            <button type="button" disabled={busy} onClick={() => activate(product)} className="rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white">Activate</button>
                            <button type="button" disabled={busy} onClick={() => permanentDelete(product)} className="rounded-lg border border-[#8a4a45]/30 px-3 py-1.5 text-xs font-bold text-[#8a4a45]">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!paginatedProducts.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-neutral-500">No products match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-neutral-500">
              Showing <span className="font-black text-black">{pageStart}–{pageEnd}</span> of <span className="font-black text-black">{filtered.length}</span> products
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="min-w-[90px] text-center text-xs font-black">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 sm:p-8">
          <div className="mx-auto max-w-5xl rounded-3xl bg-[#F7F4EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-3xl border-b border-black/10 bg-[#F7F4EF]/95 px-5 py-4 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a4a45]">{editing.id ? "Edit product" : "New product"}</p>
                <h2 className="mt-1 text-2xl font-black">{editing.name || "Untitled product"}</h2>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold">Close</button>
            </div>

            <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-2">
              <section className="rounded-2xl border border-black/10 bg-white p-5">
                <h3 className="font-black uppercase">Product details</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Name" value={editing.name} onChange={(v) => update("name", v)} />
                  <Field label="Slug" value={editing.slug} onChange={(v) => update("slug", v)} />
                  <Field label="Brand" value={editing.brand} onChange={(v) => update("brand", v)} />
                  <Field label="Category" value={editing.category} onChange={(v) => update("category", v)} />
                  <Field label="Product type" value={editing.product_type} onChange={(v) => update("product_type", v)} />
                  <Field label="Design group" value={editing.design_group ?? ""} onChange={(v) => update("design_group", v)} />
                  <Field label="Badge" value={editing.badge ?? ""} onChange={(v) => update("badge", v)} />
                  <Field label="Swatch" value={editing.swatch ?? ""} onChange={(v) => update("swatch", v)} placeholder="#F2E7D5" />
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-black/50">Description</span>
                  <textarea value={editing.description ?? ""} onChange={(e) => update("description", e.target.value)} rows={5} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black/30" />
                </label>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-5">
                <h3 className="font-black uppercase">Pricing & inventory</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Base price (R)" value={(editing.base_price_cents / 100).toFixed(2)} onChange={(v) => update("base_price_cents", Math.round(Number(v || 0) * 100))} type="number" />
                  <Field label="Compare-at price (R)" value={editing.compare_at_price_cents == null ? "" : (editing.compare_at_price_cents / 100).toFixed(2)} onChange={(v) => update("compare_at_price_cents", v === "" ? null : Math.round(Number(v) * 100))} type="number" />
                  <Field label="Stock quantity" value={editing.stock_quantity} onChange={(v) => update("stock_quantity", Number(v || 0))} type="number" />
                  <Field label="Sort order" value={editing.sort_order} onChange={(v) => update("sort_order", Number(v || 0))} type="number" />
                  <Field label="Personalization extra (R)" value={(editing.personalization_price_delta_cents / 100).toFixed(2)} onChange={(v) => update("personalization_price_delta_cents", Math.round(Number(v || 0) * 100))} type="number" />
                  <Field label="Max personalization length" value={editing.personalization_max_length} onChange={(v) => update("personalization_max_length", Number(v || 0))} type="number" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["is_active", "Active / visible"],
                    ["featured", "Featured"],
                    ["track_inventory", "Track inventory"],
                    ["allow_personalization", "Allow personalization"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 rounded-xl border border-black/10 p-3 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={Boolean(editing[key as keyof Draft])}
                        onChange={(e) => update(key as keyof Draft, e.target.checked as never)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-black/50">Personalization prompt</span>
                  <input value={editing.personalization_prompt ?? ""} onChange={(e) => update("personalization_prompt", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
                </label>
              </section>

              <section className="lg:col-span-2 rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black uppercase">Variants</h3>
                    <p className="mt-1 text-xs text-neutral-500">Size, colour, capacity or any other product option.</p>
                  </div>
                  <button type="button" onClick={addVariant} className="rounded-xl bg-black px-4 py-2.5 text-xs font-black uppercase text-white">+ Add variant</button>
                </div>

                <div className="mt-4 space-y-3">
                  {editing.variants.map((variant) => (
                    <div key={variant.id} className="grid gap-3 rounded-2xl border border-black/10 bg-[#FAF8F4] p-4 md:grid-cols-[1fr_1fr_120px_120px_1fr_auto]">
                      <Field label="Group" value={variant.group_name} onChange={(v) => updateVariant(variant.id, { group_name: v })} />
                      <Field label="Option" value={variant.option_name} onChange={(v) => updateVariant(variant.id, { option_name: v })} />
                      <Field label="Extra (R)" value={(variant.price_delta_cents / 100).toFixed(2)} onChange={(v) => updateVariant(variant.id, { price_delta_cents: Math.round(Number(v || 0) * 100) })} type="number" />
                      <Field label="Stock" value={variant.stock_quantity} onChange={(v) => updateVariant(variant.id, { stock_quantity: Number(v || 0) })} type="number" />
                      <Field label="SKU" value={variant.sku ?? ""} onChange={(v) => updateVariant(variant.id, { sku: v })} />
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 pb-2 text-xs font-bold"><input type="checkbox" checked={variant.is_active} onChange={(e) => updateVariant(variant.id, { is_active: e.target.checked })} /> Active</label>
                        <button type="button" onClick={() => removeVariant(variant.id)} className="mb-1 rounded-lg border border-[#8a4a45]/30 px-2.5 py-1.5 text-xs font-bold text-[#8a4a45]">Remove</button>
                      </div>
                    </div>
                  ))}
                  {!editing.variants.length && <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-neutral-500">No variants. Add one if this product has options.</div>}
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 rounded-b-3xl border-t border-black/10 bg-[#F7F4EF]/95 px-5 py-4 backdrop-blur sm:px-7">
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold">Cancel</button>
              <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-black px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Saving…" : "Save product"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
