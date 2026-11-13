import Link from "next/link";
import { getDashboard } from "@/lib/inventory/inventory";
import { formatQty, formatRand, materialTitle, REASON_LABEL, stockStatus } from "@/lib/inventory/inventory-shared";
import { btnGhost, btnPrimary, Card, EmptyState, formatDateTime, PageHeader, Stat, StatusPill } from "./ui";

export default async function InventoryDashboardPage() {
  const d = await getDashboard();

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Craft supplies on the shelf right now. Stock updates instantly on every device."
        actions={
          <>
            <Link href="/admin/inventory/stock-out" className={btnPrimary}>Record usage</Link>
            <Link href="/admin/inventory/stock-in" className={btnGhost}>Receive stock</Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Materials tracked" value={d.materials.length} hint={`${d.attention.length} need attention`} />
        <Stat label="Stock value" value={formatRand(d.valueCents)} hint="At what you paid, remaining stock only" />
        <Stat label="Low stock" value={d.attention.filter((m) => stockStatus(m.quantity_on_hand, m.reorder_level) === "low").length} hint="At or below reorder level" />
        <Stat label="Out of stock" value={d.attention.filter((m) => m.quantity_on_hand <= 0).length} hint="Nothing left" />
      </div>

      {d.totals.length ? (
        <Card className="mt-5">
          <h2 className="text-lg font-black">Total stock by unit</h2>
          <p className="text-sm text-neutral-600">Different units can’t be added together, so each is totalled separately.</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {d.totals.map((t) => (
              <div key={t.unit} className="rounded-2xl bg-[#FAF8F4] p-4">
                <dt className="text-xs font-bold text-neutral-600">{t.count} material{t.count === 1 ? "" : "s"}</dt>
                <dd className="mt-1 text-xl font-black">{formatQty(t.qty, t.unit)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Needs reordering</h2>
            <Link href="/admin/inventory/reports" className="text-sm font-bold underline">Reorder report</Link>
          </div>
          {d.attention.length ? (
            <ul className="divide-y divide-black/10">
              {d.attention.slice(0, 8).map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/inventory/materials/${m.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{materialTitle(m)}</span>
                      <span className="text-xs text-neutral-600">{formatQty(m.quantity_on_hand, m.unit)} left · reorder at {formatQty(m.reorder_level, m.unit)}</span>
                    </span>
                    <StatusPill status={stockStatus(m.quantity_on_hand, m.reorder_level)} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-neutral-600">Nothing is running low.</p>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Latest movements</h2>
            <Link href="/admin/inventory/history" className="text-sm font-bold underline">Full history</Link>
          </div>
          {d.movements.length ? (
            <ul className="divide-y divide-black/10">
              {d.movements.map((mv) => {
                const m = d.materialsById.get(mv.material_id);
                return (
                  <li key={mv.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{m ? materialTitle(m) : "Material"}</span>
                      <span className="text-xs text-neutral-600">{REASON_LABEL[mv.reason] ?? mv.reason} · {formatDateTime(mv.created_at)}</span>
                    </span>
                    <span className={`shrink-0 font-black ${mv.quantity_change < 0 ? "text-red-800" : "text-green-800"}`}>
                      {mv.quantity_change > 0 ? "+" : ""}{m ? formatQty(mv.quantity_change, m.unit) : mv.quantity_change}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-sm text-neutral-600">No stock movements yet.</p>
          )}
        </Card>
      </div>

      {!d.materials.length ? (
        <div className="mt-5">
          <EmptyState href="/admin/inventory/materials/new" cta="Add your first material">
            No materials yet. Add a material, then receive your current stock into it (or run a stock count) to set the opening balance.
          </EmptyState>
        </div>
      ) : null}
    </>
  );
}
