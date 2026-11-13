import { listMaterials } from "@/lib/inventory/inventory";
import { labelUrl, qrSvg } from "@/lib/inventory/inventory-qr";
import { materialTitle } from "@/lib/inventory/inventory-shared";
import PrintButton from "./print-button";
import { PageHeader } from "../ui";

export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const wanted = ids ? new Set(ids.split(",")) : null;
  const materials = (await listMaterials()).filter((m) => !wanted || wanted.has(m.id));
  const labels = await Promise.all(
    materials.map(async (m) => ({ m, svg: await qrSvg(await labelUrl(m.code)) })),
  );

  return (
    <>
      <style>{`@media print { .print-hide, nav { display: none !important; } main { background: #fff !important; } .label { break-inside: avoid; } }`}</style>
      <div className="print-hide">
        <PageHeader
          title="QR labels"
          subtitle={wanted ? "Selected labels" : "All active materials"}
          actions={<PrintButton />}
        />
        <p className="mb-5 text-sm text-neutral-600">Stick one on each roll, tube or box. Scan it with the Scan button, or just with the iPhone camera, to open the material.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {labels.map(({ m, svg }) => (
          <div key={m.id} className="label flex items-center gap-3 rounded-lg border border-dashed border-black/40 bg-white p-3">
            <div className="w-20 shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight">{materialTitle(m)}</p>
              <p className="mt-1 text-xs">{[m.finish, m.width_mm ? `${m.width_mm} mm` : null].filter(Boolean).join(" · ")}</p>
              <p className="mt-1 font-mono text-xs font-bold">{m.code}</p>
            </div>
          </div>
        ))}
      </div>
      {!labels.length ? <p className="text-sm text-neutral-600">No materials to label yet.</p> : null}
    </>
  );
}
