import Link from "next/link";
import { getLookups, getOpenLots, listMaterials, lotsByMaterial, statusOf } from "@/lib/inventory/inventory";
import { formatQty, formatRand, materialTitle, stockStatus } from "@/lib/inventory/inventory-shared";
import { MaterialThumb } from "../material-photo";
import { Bar, btnGhost, btnPrimary, EmptyState, PageHeader, StatusPill } from "../ui";

type Search = {
  q?: string; category?: string; brand?: string; status?: string; inactive?: string;
  view?: string; sort?: string; page?: string;
};

// Only this many rows (and therefore photos) are rendered at a time, so the page stays light.
const PAGE_SIZE = 50;
const RANK = { out: 0, low: 1, ok: 2 } as const;
const selectCls = "min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base";

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const showInactive = sp.inactive === "1";
  const view = sp.view === "grid" ? "grid" : "list";
  const sort = sp.sort === "stock" || sp.sort === "added" ? sp.sort : "code";

  const [all, lots, lookups] = await Promise.all([
    listMaterials({ includeInactive: showInactive }),
    getOpenLots(),
    getLookups(),
  ]);
  const byMaterial = lotsByMaterial(lots);

  const q = (sp.q ?? "").trim().toLowerCase();
  const filtered = all.filter((m) => {
    if (sp.category && m.category_id !== sp.category) return false;
    if (sp.brand && m.brand_id !== sp.brand) return false;
    if (sp.status === "attention" && statusOf(m) === "ok") return false;
    if (sp.status === "ok" && statusOf(m) !== "ok") return false;
    return !q || `${materialTitle(m)} ${m.code} ${m.finish ?? ""} ${m.category?.name ?? ""}`.toLowerCase().includes(q);
  });

  const sorted = [...filtered];
  if (sort === "code") {
    sorted.sort(
      (a, b) =>
        a.code.localeCompare(b.code, "en", {
          numeric: true,
          sensitivity: "base",
        })
    );
  } else if (sort === "stock") {
    sorted.sort(
      (a, b) =>
        RANK[statusOf(a)] - RANK[statusOf(b)] ||
        a.quantity_on_hand - b.quantity_on_hand
    );
  } else {
    sorted.reverse();
  }

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, parseInt(sp.page ?? "1", 10) || 1));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hrefFor = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (typeof v === "string" && v) params.set(k, v);
    const s = params.toString();
    return `/admin/inventory/materials${s ? `?${s}` : ""}`;
  };
  const segment = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-black ${active ? "bg-black text-white" : "hover:bg-black/5"}`;

  const rowData = (m: (typeof visible)[number]) => {
    const status = stockStatus(m.quantity_on_hand, m.reorder_level);
    const current = byMaterial.get(m.id)?.[0];
    const pct = current ? (current.remaining_qty / current.received_qty) * 100 : 0;
    return { status, current, pct };
  };

  return (
    <>
      <PageHeader
        title="Materials"
        subtitle="Every roll, sheet and supply you stock. Tap a photo to enlarge it, or open a material to see its history, print its QR label or record usage."
        actions={
          <>
            <Link href="/admin/inventory/labels" className={btnGhost}>Print labels</Link>
            <Link href="/admin/inventory/materials/new" className={btnPrimary}>+ New material</Link>
          </>
        }
      />

      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" method="get">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, colour, code" className={`${selectCls} lg:col-span-2`} />
        <select name="category" defaultValue={sp.category ?? ""} className={selectCls}>
          <option value="">All categories</option>
          {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="brand" defaultValue={sp.brand ?? ""} className={selectCls}>
          <option value="">All brands</option>
          {lookups.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={selectCls}>
          <option value="">Any stock level</option>
          <option value="attention">Low or out</option>
          <option value="ok">In stock</option>
        </select>
        <select name="sort" defaultValue={sort} className={selectCls} aria-label="Sort by">
          <option value="code">Sort: Material code</option>
          <option value="stock">Sort: Lowest stock first</option>
          <option value="added">Sort: Newest first</option>
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold lg:col-span-2">
          <input type="checkbox" name="inactive" value="1" defaultChecked={showInactive} /> Show deactivated
        </label>
        <button className={`${btnGhost} lg:col-span-2`}>Apply filters</button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          {total ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(total, page * PAGE_SIZE)} of ${total}` : "No results"}
        </p>
        <div className="inline-flex rounded-xl border border-black/15 bg-white p-1" role="group" aria-label="View">
          <Link href={hrefFor({ view: "list" })} className={segment(view === "list")} aria-current={view === "list" ? "true" : undefined}>List</Link>
          <Link href={hrefFor({ view: "grid" })} className={segment(view === "grid")} aria-current={view === "grid" ? "true" : undefined}>Gallery</Link>
        </div>
      </div>

      {visible.length && view === "list" ? (
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
          <div className="hidden items-center gap-4 border-b border-black/10 bg-[#FAF8F4] px-4 py-2 text-xs font-black uppercase tracking-wider text-black/45 lg:flex">
            <span className="w-14 shrink-0">Photo</span>
            <span className="min-w-0 flex-1">Material</span>
            <span className="w-40 shrink-0">In stock</span>
            <span className="w-44 shrink-0">Current roll</span>
            <span className="w-28 shrink-0 text-right">Reorder / price</span>
          </div>
          <ul className="divide-y divide-black/10">
            {visible.map((m) => {
              const { status, current, pct } = rowData(m);
              return (
                <li key={m.id} className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
                  <MaterialThumb materialId={m.id} imageKey={m.image_key} title={materialTitle(m)} />
                  <Link href={`/admin/inventory/materials/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black uppercase tracking-wider text-black/45">{m.category?.name} · {m.code}</p>
                      <p className="truncate text-base font-black">{materialTitle(m)}</p>
                      <p className="truncate text-xs text-neutral-600">
                        {[m.finish, m.width_mm ? `${m.width_mm} mm wide` : null, m.size_label].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="w-28 shrink-0 text-right lg:w-40 lg:text-left">
                      <p className="text-lg font-black">{formatQty(m.quantity_on_hand, m.unit)}</p>
                      {m.is_active ? <StatusPill status={status} /> : <span className="inline-block rounded-full bg-black/10 px-3 py-1 text-xs font-black">Deactivated</span>}
                    </div>
                    <div className="hidden w-44 shrink-0 lg:block">
                      {current ? (
                        <>
                          <Bar pct={pct} status={status} />
                          <p className="mt-1 text-xs text-neutral-600">{Math.round(pct)}% of {formatQty(current.received_qty, m.unit)}</p>
                        </>
                      ) : (
                        <p className="text-xs text-neutral-600">No open roll</p>
                      )}
                    </div>
                    <div className="hidden w-28 shrink-0 text-right text-xs text-neutral-600 lg:block">
                      <p>Reorder at {formatQty(m.reorder_level, m.unit)}</p>
                      {m.last_cost_cents ? <p className="font-bold text-black">{formatRand(m.last_cost_cents)} / {m.unit === "unit" ? "item" : m.unit}</p> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {visible.length && view === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((m) => {
            const { status, current, pct } = rowData(m);
            return (
              <li key={m.id} className="overflow-hidden rounded-3xl border border-black/10 bg-white">
                <MaterialThumb materialId={m.id} imageKey={m.image_key} title={materialTitle(m)} fill />
                <Link href={`/admin/inventory/materials/${m.id}`} className="block p-3 sm:p-4">
                  <p className="truncate text-[11px] font-black uppercase tracking-wider text-black/45">{m.category?.name} · {m.code}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-black">{materialTitle(m)}</p>
                  <p className="mt-2 text-xl font-black">{formatQty(m.quantity_on_hand, m.unit)}</p>
                  {current ? <div className="mt-2"><Bar pct={pct} status={status} /></div> : null}
                  <div className="mt-2">
                    {m.is_active ? <StatusPill status={status} /> : <span className="inline-block rounded-full bg-black/10 px-3 py-1 text-xs font-black">Deactivated</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!visible.length ? (
        <EmptyState href="/admin/inventory/materials/new" cta="Add a material">
          {all.length ? "No materials match those filters." : "No materials yet."}
        </EmptyState>
      ) : null}

      {pages > 1 ? (
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Pages">
          {page > 1 ? <Link href={hrefFor({ page: String(page - 1) })} className={btnGhost}>← Previous</Link> : <span />}
          <span className="text-sm font-bold">Page {page} of {pages}</span>
          {page < pages ? <Link href={hrefFor({ page: String(page + 1) })} className={btnGhost}>Next →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
