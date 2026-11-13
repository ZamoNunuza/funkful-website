import Link from "next/link";
import { getLookups } from "@/lib/inventory/inventory";
import MaterialForm from "../../material-form";
import { Card, PageHeader } from "../../ui";

export default async function NewMaterialPage() {
  const l = await getLookups();
  return (
    <>
      <Link href="/admin/inventory/materials" className="text-sm font-bold">← Materials</Link>
      <div className="mt-4" />
      <PageHeader title="New material" subtitle="Set it up once, then receive stock into it. A QR label code is generated automatically." />
      <Card>
        <MaterialForm brands={l.brands} categories={l.categories} types={l.types} suppliers={l.suppliers} />
      </Card>
    </>
  );
}
