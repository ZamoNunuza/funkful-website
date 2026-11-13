import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/account-shared";
import { getLookups, getMaterial, getOpenLots, listMaterials, listMovements, statusOf } from "@/lib/inventory/inventory";
import { labelUrl, qrSvg } from "@/lib/inventory/inventory-qr";
import { formatQty, formatRand, materialTitle, REASON_LABEL } from "@/lib/inventory/inventory-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import MaterialForm from "../../material-form";
import MovementForm from "../../movement-form";
import { toPicker } from "../../picker-data";
import { ToggleMaterial } from "../../setup-forms";
import { Bar, btnGhost, btnPrimary, Card, formatDate, formatDateTime, PageHeader, StatusPill } from "../../ui";

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  if (!isUuid(id)) notFound();
  const material = await getMaterial(id);
  if (!material) notFound();

  const [lots, movements, lookups, allMaterials] = await Promise.all([
    getOpenLots(id),
    listMovements({ materialId: id, limit: 40 }),
    getLookups(),
    listMaterials({ includeInactive: true }),
  ]);
  const hasHistory = movements.length > 0;
  const current = lots[0];

  // "Used on orders" for the current roll only.
  let usedOnOrders = 0;
  if (current) {
    const { data } = await createAdminClient()
      .from("inv_movements")
      .select("quantity_change")
      .eq("lot_id", current.id)
      .eq("reason", "order_usage");
    usedOnOrders = (data ?? []).reduce((s, r) => s + Math.abs(Number(r.quantity_change)), 0);
  }

  const url = await labelUrl(material.code);
  const svg = await qrSvg(url);
  const status = statusOf(material);
  const pct = current ? (current.remaining_qty / current.received_qty) * 100 : 0;
  const picker = allMaterials.map(toPicker);

  return (
    <>
      <Link href="/admin/inventory/materials" className="text-sm font-bold">← Materials</Link>
      <div className="mt-4" />
      <PageHeader
        eyebrow={`${material.category?.name ?? "Material"} · ${material.code}`}
        title={materialTitle(material)}
        actions={
          <>
            <Link href={`/admin/inventory/stock-in`} className={btnGhost}>Receive stock</Link>
            <Link href={`/admin/inventory/stocktaking`} className={btnGhost}>Count</Link>
          </>
        }
      />
      {created ? <p className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-bold text-green-900">Material created. Receive your current stock into it to set the opening balance.</p> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-black/45">In stock</p>
              <p className="mt-1 text-5xl font-black">{formatQty(material.quantity_on_hand, material.unit)}</p>
            </div>
            <StatusPill status={status} />
          </div>
          {current ? (
            <div className="mt-5">
              <Bar pct={pct} status={status} />
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-neutral-600">Original quantity</dt><dd className="font-black">{formatQty(current.received_qty, material.unit)}</dd></div>
                <div><dt className="text-xs text-neutral-600">Remaining</dt><dd className="font-black">{Math.round(pct)}%</dd></div>
                <div><dt className="text-xs text-neutral-600">Used on orders</dt><dd className="font-black">{formatQty(usedOnOrders, material.unit)}</dd></div>
                <div><dt className="text-xs text-neutral-600">Reorder at</dt><dd className="font-black">{formatQty(material.reorder_level, material.unit)}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-neutral-600">Figures are for the current (oldest open) roll, received {formatDate(current.received_at)}. Stock is always used oldest-first.</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">No stock on the shelf. Receive stock to start tracking.</p>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-neutral-600">Brand</dt><dd className="font-bold">{material.brand?.name}</dd></div>
            <div><dt className="text-xs text-neutral-600">Type</dt><dd className="font-bold">{material.type?.name ?? "—"}</dd></div>
            <div><dt className="text-xs text-neutral-600">Width</dt><dd className="font-bold">{material.width_mm ? `${material.width_mm} mm` : "—"}</dd></div>
            <div><dt className="text-xs text-neutral-600">Last price</dt><dd className="font-bold">{material.last_cost_cents ? `${formatRand(material.last_cost_cents)} / ${material.unit === "unit" ? "item" : material.unit}` : "—"}</dd></div>
            <div><dt className="text-xs text-neutral-600">Supplier</dt><dd className="font-bold">{material.supplier?.name ?? "—"}</dd></div>
            <div><dt className="text-xs text-neutral-600">Finish</dt><dd className="font-bold">{material.finish ?? "—"}</dd></div>
            <div><dt className="text-xs text-neutral-600">Roll / pack size</dt><dd className="font-bold">{material.roll_length ? formatQty(material.roll_length, material.unit) : material.size_label ?? "—"}</dd></div>
            <div><dt className="text-xs text-neutral-600">Manufacturer barcode</dt><dd className="font-bold">{material.external_barcode ?? "—"}</dd></div>
          </dl>
        </Card>

        <Card className="text-center">
          <p className="text-xs font-black uppercase tracking-wider text-black/45">QR label</p>
          <div className="mx-auto mt-3 w-40" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-2 text-lg font-black">{material.code}</p>
          <p className="text-xs text-neutral-600">{materialTitle(material)}</p>
          <Link href={`/admin/inventory/labels?ids=${material.id}`} className={`${btnPrimary} mt-4`}>Print this label</Link>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-lg font-black">Use this material</h2>
          <p className="mb-4 text-sm text-neutral-600">Orders, wastage, test cuts and damage. Enter cm if that’s easier than metres.</p>
          <MovementForm mode="out" materials={picker} fixedMaterialId={material.id} />
        </Card>
        <Card>
          <h2 className="mb-1 text-lg font-black">Manual adjustment</h2>
          <p className="mb-4 text-sm text-neutral-600">Fix a mistake or record found stock. Stock counts are better for general corrections.</p>
          <MovementForm mode="adjust" materials={picker} fixedMaterialId={material.id} />
        </Card>
      </div>

      {lots.length > 1 ? (
        <Card className="mt-5">
          <h2 className="mb-3 text-lg font-black">Open rolls / batches</h2>
          <ul className="divide-y divide-black/10 text-sm">
            {lots.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{formatDate(l.received_at)}{l.lot_label ? ` · ${l.lot_label}` : ""}</span>
                <span className="font-bold">{formatQty(l.remaining_qty, material.unit)} of {formatQty(l.received_qty, material.unit)} · {formatRand(l.unit_cost_cents)} / {material.unit === "unit" ? "item" : material.unit}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">Recent history</h2>
          <Link href={`/admin/inventory/history?material=${material.id}`} className="text-sm font-bold underline">All history</Link>
        </div>
        {movements.length ? (
          <ul className="divide-y divide-black/10 text-sm">
            {movements.map((mv) => (
              <li key={mv.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-bold">{REASON_LABEL[mv.reason] ?? mv.reason}</span>
                  {mv.order_ref ? ` · ${mv.order_ref}` : ""}
                  {mv.note ? ` · ${mv.note}` : ""}
                  <span className="block text-xs text-neutral-600">{formatDateTime(mv.created_at)}{mv.actor ? ` · ${mv.actor}` : ""}</span>
                </span>
                <span className={`font-black ${mv.quantity_change < 0 ? "text-red-800" : "text-green-800"}`}>
                  {mv.quantity_change > 0 ? "+" : ""}{formatQty(mv.quantity_change, material.unit)}
                  <span className="ml-2 text-xs font-normal text-neutral-600">balance {formatQty(mv.balance_after, material.unit)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">Nothing recorded yet.</p>
        )}
      </Card>

      <Card className="mt-5">
        <h2 className="mb-4 text-lg font-black">Edit material</h2>
        <MaterialForm material={material} brands={lookups.brands} categories={lookups.categories} types={lookups.types} suppliers={lookups.suppliers} unitLocked={hasHistory} />
        <div className="mt-6 border-t border-black/10 pt-4">
          <ToggleMaterial id={material.id} active={material.is_active} />
          <p className="mt-2 text-xs text-neutral-600">Materials are deactivated rather than deleted so their stock history is always kept.</p>
        </div>
      </Card>
    </>
  );
}
