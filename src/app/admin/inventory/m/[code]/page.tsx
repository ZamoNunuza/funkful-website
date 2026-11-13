import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { findMaterialByCode } from "@/lib/inventory/inventory";
import { Card, PageHeader } from "../../ui";

// Target of every QR label (works from the iPhone's built-in camera too) and of the in-app scanner.
export default async function ScanLookupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const material = await findMaterialByCode(decodeURIComponent(code));
  if (material) redirect(`/admin/inventory/materials/${material.id}`);
  if (!code) notFound();
  return (
    <>
      <PageHeader title="Not found" />
      <Card>
        <p className="text-sm">No material matches that code. It may belong to something that isn’t in the inventory yet.</p>
        <Link href="/admin/inventory/materials/new" className="mt-3 inline-block text-sm font-bold underline">Add it as a new material</Link>
      </Card>
    </>
  );
}
