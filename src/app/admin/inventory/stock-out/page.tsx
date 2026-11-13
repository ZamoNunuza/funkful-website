import { getRecentOrders, listMaterials } from "@/lib/inventory/inventory";
import MovementForm from "../movement-form";
import { toPicker } from "../picker-data";
import { Card, EmptyState, PageHeader } from "../ui";

export default async function StockOutPage() {
  const [materials, orders] = await Promise.all([listMaterials(), getRecentOrders()]);
  const picker = materials.map(toPicker);
  return (
    <>
      <PageHeader title="Stock out" subtitle="Record materials used for an order, plus wastage, test cuts and damaged material." />
      {materials.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-black">Use material</h2>
            <MovementForm mode="out" materials={picker} orders={orders} />
          </Card>
          <Card>
            <h2 className="mb-1 text-lg font-black">Manual adjustment</h2>
            <p className="mb-4 text-sm text-neutral-600">Correct a mistake or record stock you found.</p>
            <MovementForm mode="adjust" materials={picker} />
          </Card>
        </div>
      ) : (
        <EmptyState href="/admin/inventory/materials/new" cta="Add a material first">There are no materials to take stock from yet.</EmptyState>
      )}
    </>
  );
}
