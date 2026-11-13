import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/account-shared";
import { listMaterials } from "@/lib/inventory/inventory";
import { materialTitle } from "@/lib/inventory/inventory-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { CountList, FinishStocktake, type CountLine } from "../../stocktake-forms";
import { Card, formatDateTime, PageHeader } from "../../ui";

export default async function StocktakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const admin = createAdminClient();
  const [{ data: st }, { data: rows }, materials] = await Promise.all([
    admin.from("inv_stocktakes").select("*").eq("id", id).maybeSingle(),
    admin.from("inv_stocktake_lines").select("material_id,expected_qty,counted_qty").eq("stocktake_id", id).limit(2000),
    listMaterials({ includeInactive: true }),
  ]);
  if (!st) notFound();

  const byId = new Map(materials.map((m) => [m.id, m]));
  const lines: CountLine[] = (rows ?? [])
    .map((r) => {
      const m = byId.get(r.material_id);
      if (!m) return null;
      const counted = r.counted_qty === null ? null : Number(r.counted_qty);
      return {
        materialId: m.id,
        code: m.code,
        barcode: m.external_barcode,
        title: materialTitle(m),
        category: m.category?.name ?? "",
        unit: m.unit,
        // Uncounted rows show live stock; counted rows show the quantity at the moment they were counted.
        systemQty: counted === null ? m.quantity_on_hand : Number(r.expected_qty),
        counted,
      } satisfies CountLine;
    })
    .filter((l): l is CountLine => l !== null)
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  const open = st.status === "open";
  const countedN = lines.filter((l) => l.counted !== null).length;

  return (
    <>
      <Link href="/admin/inventory/stocktaking" className="text-sm font-bold">← Stocktaking</Link>
      <div className="mt-4" />
      <PageHeader
        title={st.name}
        subtitle={`${open ? "In progress" : st.status === "completed" ? `Completed ${st.completed_at ? formatDateTime(st.completed_at) : ""}` : "Cancelled"} · ${countedN} of ${lines.length} counted`}
      />
      {open ? (
        <Card className="mb-5">
          <FinishStocktake stocktakeId={id} counted={countedN} total={lines.length} />
        </Card>
      ) : null}
      <CountList stocktakeId={id} lines={lines} open={open} />
    </>
  );
}
