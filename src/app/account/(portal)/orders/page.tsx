import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimGuestOrders, getSessionUser } from "@/lib/account-server";
import { formatDate, formatRands, orderStatusMeta } from "@/lib/account-shared";
import {
  Card,
  EmptyState,
  PageTitle,
  StatusBadge,
  outlineButtonClass,
  primaryButtonClass,
  primaryButtonStyle,
} from "@/components/account/ui";

export const metadata = { title: "Your orders | Funkful" };

const PAGE_SIZE = 10;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account/orders");

  await claimGuestOrders(user);

  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;

  const { data: orders, count } = await supabase
    .from("orders")
    .select("id, order_number, total_cents, status, payment_status, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const list = orders ?? [];
  const total = count ?? list.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // One-line item summaries ("Sunburst Ceramic Mug + 2 more"). If this lookup
  // fails the list still renders, just without the summaries.
  const summaries = new Map<string, string>();
  if (list.length) {
    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, product_name, quantity")
      .in("order_id", list.map((o) => o.id));

    const byOrder = new Map<string, { name: string; quantity: number }[]>();
    for (const item of items ?? []) {
      byOrder.set(item.order_id, [...(byOrder.get(item.order_id) ?? []), { name: item.product_name, quantity: item.quantity }]);
    }
    for (const [orderId, lines] of byOrder) {
      const first = lines[0];
      const label = `${first.name}${first.quantity > 1 ? ` × ${first.quantity}` : ""}`;
      summaries.set(orderId, lines.length > 1 ? `${label} + ${lines.length - 1} more` : label);
    }
  }

  return (
    <div>
      <PageTitle title="Orders">Follow your orders and buy your favourites again.</PageTitle>

      {list.length === 0 ? (
        <EmptyState
          title={page > 1 ? "No orders on this page" : "No orders yet"}
          action={
            page > 1 ? (
              <Link href="/account/orders" className={outlineButtonClass}>
                Back to first page
              </Link>
            ) : (
              <Link href="/originals" style={primaryButtonStyle} className={primaryButtonClass}>
                Start shopping
              </Link>
            )
          }
        >
          {page > 1
            ? "You've reached the end of your order history."
            : "When you place an order, it will show up here — including orders you placed as a guest with this email address."}
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-4">
            {list.map((order) => {
              const meta = orderStatusMeta(order.status, order.payment_status);
              const summary = summaries.get(order.id);
              return (
                <li key={order.id}>
                  <Card compact>
                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                      <div className="min-w-0">
                        <p className="font-black text-base">{order.order_number}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Placed {formatDate(order.created_at)}</p>
                        {summary && <p className="text-sm text-neutral-700 mt-3">{summary}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge label={meta.label} tone={meta.tone} />
                        <span className="font-black">{formatRands(order.total_cents)}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-end" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
                      <Link href={`/account/orders/${order.id}`} className="text-xs font-extrabold uppercase underline">
                        View order
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav aria-label="Order pages" className="flex items-center justify-between mt-8 text-xs font-bold uppercase tracking-wide">
              {page > 1 ? (
                <Link href={`/account/orders?page=${page - 1}`} className="underline">
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              <span className="text-neutral-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={`/account/orders?page=${page + 1}`} className="underline">
                  Older →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
