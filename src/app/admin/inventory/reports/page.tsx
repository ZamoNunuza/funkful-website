import Link from "next/link";
import { getOpenLots, listMaterials, listMovements, lotsByMaterial, stockValueCents, statusOf } from "@/lib/inventory/inventory";
import { formatQty, formatRand, materialTitle } from "@/lib/inventory/inventory-shared";
import { btnGhost, Card, EmptyState, PageHeader, Stat } from "../ui";

type Search = { from?: string; to?: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
const sast = (d: string) => new Date(`${d}T00:00:00+02:00`);
const iso = (d: Date) => new Date(d.getTime() + 2 * 3_600_000).toISOString().slice(0, 10); // SAST calendar date

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const today = iso(new Date());
  const to = sp.to && DATE.test(sp.to) ? sp.to : today;
  const from = sp.from && DATE.test(sp.from) ? sp.from : iso(new Date(sast(to).getTime() - 29 * DAY));

  const [materials, lots, movements] = await Promise.all([
    listMaterials({ includeInactive: true }),
    getOpenLots(),
    listMovements({ from: sast(from).toISOString(), to: new Date(sast(to).getTime() + DAY).toISOString(), limit: 5000 }),
  ]);
  const byId = new Map(materials.map((m) => [m.id, m]));
  const lotMap = lotsByMaterial(lots);

  // Usage: everything taken out except stock-count corrections (reported separately as shrinkage).
  const usage = new Map<string, { order: number; other: number; cost: number }>();
  let purchaseSpend = 0;
  let countLoss = 0;
  for (const mv of movements) {
    const cost = Math.abs(mv.quantity_change) * mv.unit_cost_cents;
    if (mv.reason === "purchase") purchaseSpend += cost;
    else if (mv.quantity_change < 0 && mv.reason === "stocktake_correction") countLoss += cost;
    else if (mv.quantity_change < 0) {
      const row = usage.get(mv.material_id) ?? { order: 0, other: 0, cost: 0 };
      if (mv.reason === "order_usage") row.order += -mv.quantity_change;
      else row.other += -mv.quantity_change;
      row.cost += cost;
      usage.set(mv.material_id, row);
    }
  }
  const usageRows = [...usage.entries()].map(([id, u]) => ({ m: byId.get(id), ...u })).filter((r) => r.m).sort((a, b) => b.cost - a.cost);
  const usageCost = usageRows.reduce((s, r) => s + r.cost, 0);

  const valueByCategory = new Map<string, number>();
  for (const m of materials) {
    const v = (lotMap.get(m.id) ?? []).reduce((s, l) => s + l.remaining_qty * l.unit_cost_cents, 0);
    if (v > 0) valueByCategory.set(m.category?.name ?? "Other", (valueByCategory.get(m.category?.name ?? "Other") ?? 0) + v);
  }

  // Suggested order tops stock back up to twice the reorder level, rounded up to whole rolls where a roll size is set.
  const reorder = materials
    .filter((m) => m.is_active && statusOf(m) !== "ok")
    .map((m) => {
      const target = m.reorder_level * 2;
      const gap = Math.max(target - m.quantity_on_hand, 0);
      const suggested = m.roll_length ? Math.ceil(gap / m.roll_length) * m.roll_length : gap;
      return { m, suggested, estCost: suggested * m.last_cost_cents };
    })
    .sort((a, b) => a.m.quantity_on_hand - b.m.quantity_on_hand);

  return (
    <>
      <PageHeader title="Reports" subtitle="Usage, purchase spend, stock value and what needs reordering." />
      <form method="get" className="mb-5 flex flex-wrap items-end gap-2">
        <label className="text-sm font-bold">From<input type="date" name="from" defaultValue={from} className="mt-1 block min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base font-normal" /></label>
        <label className="text-sm font-bold">To<input type="date" name="to" defaultValue={to} className="mt-1 block min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base font-normal" /></label>
        <button className={btnGhost}>Update</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Purchases" value={formatRand(purchaseSpend)} hint="Bought in this period" />
        <Stat label="Materials used" value={formatRand(usageCost)} hint="Cost of stock taken out" />
        <Stat label="Count losses" value={formatRand(countLoss)} hint="Missing at stock counts" />
        <Stat label="Stock value now" value={formatRand(stockValueCents(lots))} hint="Remaining stock at cost" />
      </div>
      {movements.length >= 5000 ? <p className="mt-3 text-xs font-bold text-red-800">This period has more than 5,000 movements; figures are partial. Use a shorter range.</p> : null}

      <Card className="mt-5 overflow-x-auto">
        <h2 className="mb-3 text-lg font-black">Usage and cost by material</h2>
        {usageRows.length ? (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-neutral-600"><tr>{["Material", "Used on orders", "Wastage & other", "Cost"].map((h) => <th key={h} className="py-2 pr-4">{h}</th>)}</tr></thead>
            <tbody>
              {usageRows.map(({ m, order, other, cost }) => (
                <tr key={m!.id} className="border-t border-black/10">
                  <td className="py-2 pr-4 font-bold"><Link href={`/admin/inventory/materials/${m!.id}`} className="underline">{materialTitle(m!)}</Link></td>
                  <td className="py-2 pr-4">{formatQty(order, m!.unit)}</td>
                  <td className="py-2 pr-4">{formatQty(other, m!.unit)}</td>
                  <td className="py-2 pr-4 font-bold">{formatRand(cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState>No materials were used between {from} and {to}.</EmptyState>}
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-black">Stock value by category</h2>
          {valueByCategory.size ? (
            <ul className="divide-y divide-black/10 text-sm">
              {[...valueByCategory.entries()].sort((a, b) => b[1] - a[1]).map(([name, v]) => (
                <li key={name} className="flex justify-between py-2"><span className="font-bold">{name}</span><span>{formatRand(v)}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-neutral-600">No stock on the shelf yet.</p>}
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-black">Reorder requirements</h2>
          <p className="mb-3 text-xs text-neutral-600">Suggested quantity brings stock back to twice its reorder level (whole rolls where a roll size is set). It’s a starting point, not a rule.</p>
          {reorder.length ? (
            <ul className="divide-y divide-black/10 text-sm">
              {reorder.map(({ m, suggested, estCost }) => (
                <li key={m.id} className="py-2">
                  <div className="flex justify-between gap-3"><span className="font-bold">{materialTitle(m)}</span><span className="shrink-0">{formatQty(m.quantity_on_hand, m.unit)} left</span></div>
                  <p className="text-xs text-neutral-600">
                    {suggested ? `Suggest ordering ${formatQty(suggested, m.unit)}${estCost ? ` (about ${formatRand(estCost)} at last price)` : ""}` : "Set a reorder level to get a suggestion"}
                    {m.supplier ? ` · ${m.supplier.name}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-neutral-600">Nothing needs reordering.</p>}
        </Card>
      </div>
    </>
  );
}
