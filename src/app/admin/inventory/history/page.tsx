import Link from "next/link";
import { listMaterials, listMovements } from "@/lib/inventory/inventory";
import { formatQty, formatRand, materialTitle, REASON_LABEL } from "@/lib/inventory/inventory-shared";
import { btnGhost, Card, EmptyState, formatDateTime, PageHeader } from "../ui";

type Search = { material?: string; reason?: string; from?: string; to?: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// Dates are interpreted in South African time (UTC+2, no daylight saving).
const dayStart = (d: string) => new Date(`${d}T00:00:00+02:00`).toISOString();
const dayAfter = (d: string) => new Date(new Date(`${d}T00:00:00+02:00`).getTime() + 86_400_000).toISOString();

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const from = sp.from && DATE.test(sp.from) ? sp.from : "";
  const to = sp.to && DATE.test(sp.to) ? sp.to : "";
  const [materials, movements] = await Promise.all([
    listMaterials({ includeInactive: true }),
    listMovements({
      materialId: sp.material || undefined,
      reason: sp.reason || undefined,
      from: from ? dayStart(from) : undefined,
      to: to ? dayAfter(to) : undefined,
      limit: 300,
    }),
  ]);
  const byId = new Map(materials.map((m) => [m.id, m]));

  return (
    <>
      <PageHeader title="Stock history" subtitle="Every addition, deduction and adjustment, with who did it and why. History can’t be edited or deleted." />
      <form method="get" className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select name="material" defaultValue={sp.material ?? ""} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base lg:col-span-2">
          <option value="">All materials</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{materialTitle(m)} ({m.code})</option>)}
        </select>
        <select name="reason" defaultValue={sp.reason ?? ""} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base">
          <option value="">Any reason</option>
          {Object.entries(REASON_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" name="from" defaultValue={from} aria-label="From date" className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base" />
        <input type="date" name="to" defaultValue={to} aria-label="To date" className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base" />
        <button className={btnGhost}>Apply filters</button>
      </form>

      {movements.length ? (
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-black/5 text-xs uppercase tracking-wider">
              <tr>{["When", "Material", "Reason", "Change", "Balance", "Cost", "Details"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {movements.map((mv) => {
                const m = byId.get(mv.material_id);
                return (
                  <tr key={mv.id} className="border-t border-black/10 align-top">
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(mv.created_at)}</td>
                    <td className="px-4 py-3 font-bold">{m ? <Link href={`/admin/inventory/materials/${m.id}`} className="underline">{materialTitle(m)}</Link> : "—"}</td>
                    <td className="px-4 py-3">{REASON_LABEL[mv.reason] ?? mv.reason}</td>
                    <td className={`whitespace-nowrap px-4 py-3 font-black ${mv.quantity_change < 0 ? "text-red-800" : "text-green-800"}`}>
                      {mv.quantity_change > 0 ? "+" : ""}{m ? formatQty(mv.quantity_change, m.unit) : mv.quantity_change}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{m ? formatQty(mv.balance_after, m.unit) : mv.balance_after}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatRand(Math.abs(mv.quantity_change) * mv.unit_cost_cents)}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {[mv.order_ref, mv.note, mv.actor].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState>No movements match those filters.</EmptyState>
      )}
      {movements.length === 300 ? <p className="mt-3 text-xs text-neutral-600">Showing the latest 300. Narrow the filters to see older entries.</p> : null}
    </>
  );
}
