import { getLookups } from "@/lib/inventory/inventory";
import { SupplierForm } from "../setup-forms";
import { Card, PageHeader } from "../ui";

export default async function SuppliersPage() {
  const { suppliers } = await getLookups();
  return (
    <>
      <PageHeader title="Suppliers" subtitle="Who you buy from. Pick a supplier when receiving stock to keep purchase prices traceable." />
      <Card>
        <h2 className="mb-4 text-lg font-black">Add a supplier</h2>
        <SupplierForm />
      </Card>
      <div className="mt-5 space-y-4">
        {suppliers.map((s) => (
          <Card key={s.id}>
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-black">
                <span>{s.name}{s.is_active ? "" : " (deactivated)"}</span>
                <span className="text-xs font-normal text-neutral-600">{[s.contact_name, s.phone].filter(Boolean).join(" · ")}</span>
              </summary>
              <div className="mt-4"><SupplierForm supplier={s} /></div>
            </details>
          </Card>
        ))}
        {!suppliers.length ? <p className="text-sm text-neutral-600">No suppliers yet.</p> : null}
      </div>
    </>
  );
}
