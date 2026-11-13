import { getLookups, getRecentPurchases, listMaterials } from "@/lib/inventory/inventory";
import StockInForm from "../stock-in-form";
import { toPicker } from "../picker-data";
import { Card, EmptyState, formatDate, PageHeader } from "../ui";

export default async function StockInPage() {
  const [materials, lookups, purchases] = await Promise.all([listMaterials(), getLookups(), getRecentPurchases()]);
  return (
    <>
      <PageHeader title="Stock in" subtitle="Record purchases and deliveries. Each line becomes a roll or batch with its own price, so costs stay accurate." />
      {materials.length ? (
        <Card>
          <StockInForm materials={materials.map(toPicker)} suppliers={lookups.suppliers.filter((s) => s.is_active)} />
        </Card>
      ) : (
        <EmptyState href="/admin/inventory/materials/new" cta="Add a material first">Create the materials you buy, then come back to receive stock into them.</EmptyState>
      )}
      <Card className="mt-5">
        <h2 className="mb-3 text-lg font-black">Recent deliveries</h2>
        {purchases.length ? (
          <ul className="divide-y divide-black/10 text-sm">
            {purchases.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <span className="font-bold">{p.supplier?.name ?? "Supplier not recorded"}{p.invoice_number ? ` · ${p.invoice_number}` : ""}</span>
                <span className="text-neutral-600">{formatDate(p.purchase_date)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">No deliveries recorded yet.</p>
        )}
      </Card>
    </>
  );
}
