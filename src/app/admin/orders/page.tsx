import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { palette } from "@/lib/brands";
import { formatDate, formatRands, orderStage, orderStatusMeta } from "@/lib/account-shared";
import { Card, EmptyState, StatusBadge } from "@/components/account/ui";

export const metadata = { title: "Orders | Funkful admin", robots: { index: false, follow: false } };

const VIEWS = [
  { key: "to-ship", label: "To ship", stage: 1 },
  { key: "shipped", label: "Shipped", stage: 2 },
  { key: "delivered", label: "Delivered", stage: 3 },
  { key: "all", label: "All", stage: null },
] as const;

interface ListRow {
  id: string;
  order_number: string;
  created_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  total_cents: number;
  status: string;
  payment_status: string;
  courier: string | null;
  tracking_number: string | null;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireAdmin();
  const { view: viewParam } = await searchParams;
  const view = VIEWS.find((v) => v.key === viewParam) ?? VIEWS[0];

  const admin = createAdminClient();
  // Volume is low, so we fetch the latest orders and bucket them in code using
  // the same orderStage() rules the customer sees — the two can never disagree.
  let query = admin
    .from("orders")
    .select("id,order_number,created_at,email,first_name,last_name,total_cents,status,payment_status,courier,tracking_number")
    .order("created_at", { ascending: false })
    .limit(200);
  if (view.key !== "all") query = query.eq("payment_status", "paid");

  const { data, error } = await query;

  if (error) {
    console.error("Admin orders list failed:", error);
    return (
      <Shell>
        <EmptyState title="Couldn't load orders">
          Something went wrong reading the orders table. If you haven&apos;t run the fulfilment SQL migration yet, run it in the Supabase SQL editor and refresh.
        </EmptyState>
      </Shell>
    );
  }

  const rows = (data ?? []) as ListRow[];
  const stageOf = (row: ListRow) => orderStage(row.status, row.payment_status);
  const counts = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  for (const row of rows) {
    const s = stageOf(row);
    if (s === 1 || s === 2 || s === 3) counts[s] += 1;
  }

  let visible = view.stage === null ? rows : rows.filter((row) => stageOf(row) === view.stage);
  // Work the queue oldest-first so nobody's order waits longest.
  if (view.key === "to-ship") visible = [...visible].reverse();

  return (
    <Shell>
      <nav aria-label="Order views" className="flex flex-wrap gap-2 mb-6">
        {VIEWS.map((v) => {
          const active = v.key === view.key;
          const count = v.stage ? counts[v.stage] : null;
          return (
            <Link
              key={v.key}
              href={`/admin/orders?view=${v.key}`}
              aria-current={active ? "page" : undefined}
              style={active ? { background: palette.black, color: palette.cream } : { borderColor: "rgba(17,17,17,0.2)" }}
              className="text-xs font-extrabold uppercase tracking-wide px-4 py-2 rounded-full border"
            >
              {v.label}
              {count !== null && ` · ${count}`}
            </Link>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <EmptyState title="Nothing here">
          {view.key === "to-ship" ? "No paid orders are waiting to be shipped." : "No orders in this view."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map((order) => {
            const meta = orderStatusMeta(order.status, order.payment_status);
            const name = [order.first_name, order.last_name].filter(Boolean).join(" ") || order.email;
            return (
              <li key={order.id}>
                  <Link href={`/admin/orders/${order.id}`} className="block" aria-label={`Open order ${order.order_number}`}>
                    <Card compact>
                      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                        <div className="min-w-0">
                          <p className="font-black text-base">{order.order_number}</p>
                          <p className="text-sm text-neutral-700 mt-1 break-all">{name}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Placed {formatDate(order.created_at)}
                          </p>

                          {(order.courier || order.tracking_number) && (
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {[order.courier, order.tracking_number].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge label={meta.label} tone={meta.tone} />
                          <span className="font-black">
                            {formatRands(order.total_cents)}
                          </span>

                          <span className="text-xs font-extrabold uppercase">
                            Open
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen">
      <div className="max-w-[1000px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 mb-2">
          <span style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-wide" >
            Funkful admin
          </span>
          <Link href="/admin/" style={{ color: "#8a4a45" }}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide hover:opacity-70 transition-opacity">
            <span aria-hidden="true">←</span>
            Back to dashboard
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase mt-2 mb-8">Orders</h1>
        {children}
      </div>
    </main>
  );
}
