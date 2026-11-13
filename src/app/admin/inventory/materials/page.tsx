import Link from "next/link";
import { getLookups, getOpenLots, listMaterials, lotsByMaterial, statusOf } from "@/lib/inventory/inventory";
import { formatQty, formatRand, materialTitle, stockStatus } from "@/lib/inventory/inventory-shared";
import { Bar, btnGhost, btnPrimary, Card, EmptyState, PageHeader, StatusPill } from "../ui";

type Search = { q?: string; category?: string; brand?: string; status?: string; inactive?: string };

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const showInactive = sp.inactive === "1";
  const [all, lots, lookups] = await Promise.all([
    listMaterials({ includeInactive: showInactive }),
    getOpenLots(),
    getLookups(),
  ]);
  const byMaterial = lotsByMaterial(lots);

  const q = (sp.q ?? "").trim().toLowerCase();
  const materials = all.filter((m) => {
    if (sp.category && m.category_id !== sp.category) return false;
    if (sp.brand && m.brand_id !== sp.brand) return false;
    if (sp.status === "attention" && statusOf(m) === "ok") return false;
    if (sp.status === "ok" && statusOf(m) !== "ok") return false;
    return !q || `${materialTitle(m)} ${m.code} ${m.finish ?? ""} ${m.category?.name ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader
        title="Materials"
        subtitle="Every roll, sheet and supply you stock. Open one to see its history, print its QR label or record usage."
        actions={
          <>
            <Link href="/admin/inventory/labels" className={btnGhost}>Print labels</Link>
            <Link href="/admin/inventory/materials/new" className={btnPrimary}>+ New material</Link>
          </>
        }
      />

      <form className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, colour, code" className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base lg:col-span-2" />
        <select name="category" defaultValue={sp.category ?? ""} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base">
          <option value="">All categories</option>
          {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="brand" defaultValue={sp.brand ?? ""} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base">
          <option value="">All brands</option>
          {lookups.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base">
          <option value="">Any stock level</option>
          <option value="attention">Low or out</option>
          <option value="ok">In stock</option>
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input type="checkbox" name="inactive" value="1" defaultChecked={showInactive} /> Show deactivated
        </label>
        <button className={btnGhost}>Apply filters</button>
      </form>

      {materials.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {materials.map((m) => {
            const status = stockStatus(m.quantity_on_hand, m.reorder_level);
            const current = byMaterial.get(m.id)?.[0];
            const pct = current ? (current.remaining_qty / current.received_qty) * 100 : 0;
            return (
              <Link key={m.id} href={`/admin/inventory/materials/${m.id}`} className="block">
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wider text-black/45">{m.category?.name} · {m.code}</p>
                      <h2 className="mt-1 truncate text-lg font-black">{materialTitle(m)}</h2>
                      <p className="text-xs text-neutral-600">
                        {[m.finish, m.width_mm ? `${m.width_mm} mm wide` : null, m.size_label].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    {m.is_active ? <StatusPill status={status} /> : <span className="rounded-full bg-black/10 px-3 py-1 text-xs font-black">Deactivated</span>}
                  </div>
                  <p className="mt-4 text-3xl font-black">{formatQty(m.quantity_on_hand, m.unit)}</p>
                  {current ? (
                    <div className="mt-2">
                      <Bar pct={pct} status={status} />
                      <p className="mt-1 text-xs text-neutral-600">{Math.round(pct)}% left on current roll ({formatQty(current.received_qty, m.unit)} originally)</p>
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-neutral-600">
                    Reorder at {formatQty(m.reorder_level, m.unit)}
                    {m.last_cost_cents ? ` · ${formatRand(m.last_cost_cents)} per ${m.unit === "unit" ? "item" : m.unit}` : ""}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState href="/admin/inventory/materials/new" cta="Add a material">
          {all.length ? "No materials match those filters." : "No materials yet."}
        </EmptyState>
      )}
    </>
  );
}
