import Link from "next/link";
import { getLookups } from "@/lib/inventory/inventory";
import { createAdminClient } from "@/lib/supabase/admin";
import { StartStocktakeForm } from "../stocktake-forms";
import { Card, formatDateTime, PageHeader } from "../ui";

export default async function StocktakingPage() {
  const [lookups, { data }] = await Promise.all([
    getLookups(),
    createAdminClient().from("inv_stocktakes").select("id,name,status,started_at,completed_at,started_by").order("started_at", { ascending: false }).limit(30),
  ]);
  const counts = data ?? [];
  return (
    <>
      <PageHeader title="Stocktaking" subtitle="Count what’s physically on the shelf. Differences are applied to stock only when you complete the count." />
      <Card>
        <h2 className="mb-4 text-lg font-black">Start a new count</h2>
        <StartStocktakeForm categories={lookups.categories.filter((c) => c.is_active)} />
      </Card>
      <Card className="mt-5">
        <h2 className="mb-3 text-lg font-black">Counts</h2>
        {counts.length ? (
          <ul className="divide-y divide-black/10">
            {counts.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/inventory/stocktaking/${c.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2">
                  <span><span className="font-bold">{c.name}</span><span className="block text-xs text-neutral-600">Started {formatDateTime(c.started_at)}{c.started_by ? ` by ${c.started_by}` : ""}</span></span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${c.status === "open" ? "bg-[#F6E3B4]" : c.status === "completed" ? "bg-[#DDE7D8]" : "bg-black/10"}`}>{c.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">No stock counts yet.</p>
        )}
      </Card>
    </>
  );
}
