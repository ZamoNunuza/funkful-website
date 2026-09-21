import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { palette } from "@/lib/brands";
import {
  formatDate,
  formatRands,
  isUuid,
  orderStage,
  orderStatusMeta,
  type OrderItemRow,
  type OrderRow,
} from "@/lib/account-shared";
import { Card, CardTitle, StatusBadge } from "@/components/account/ui";
import FulfilmentPanel from "../fulfilment-panel";

export const metadata = { title: "Order | Funkful admin", robots: { index: false, follow: false } };

interface EventRow {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor_email: string | null;
  created_at: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  await requireAdmin(`/admin/orders/${id}`);

  const admin = createAdminClient();
  const [orderResult, itemsResult, eventsResult] = await Promise.all([
    admin.from("orders").select("*").eq("id", id).maybeSingle(),
    admin
      .from("order_items")
      .select("order_id, product_id, product_name, brand, variant, personalization_text, unit_price_cents, quantity")
      .eq("order_id", id),
    admin
      .from("order_status_events")
      .select("id, from_status, to_status, note, actor_email, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!orderResult.data) notFound();
  const order = orderResult.data as OrderRow;
  const items = (itemsResult.data ?? []) as OrderItemRow[];
  // If the migration hasn't been run yet this simply comes back empty.
  const events = (eventsResult.data ?? []) as EventRow[];

  const meta = orderStatusMeta(order.status, order.payment_status);
  const stage = orderStage(order.status, order.payment_status);

  const addressLines = [
    [order.first_name, order.last_name].filter(Boolean).join(" "),
    order.shipping_address,
    [order.shipping_city, order.shipping_province].filter(Boolean).join(", "),
    order.shipping_postal_code,
    order.shipping_country,
  ].filter(Boolean) as string[];

  return (
    <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-6">
        <div>
          <Link href="/admin/orders" className="text-xs font-bold uppercase underline">
            ← All orders
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4 mt-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase break-all">{order.order_number}</h1>
              <p className="text-sm text-neutral-600 mt-1">Placed {formatDate(order.created_at)}</p>
            </div>
            <StatusBadge label={meta.label} tone={meta.tone} />
          </div>
        </div>

        <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 items-start">
          <div className="space-y-6">
            <Card>
              <CardTitle>Items to pack</CardTitle>
              {items.length === 0 ? (
                <p className="text-sm text-neutral-600">No items found for this order.</p>
              ) : (
                <ul className="divide-y divide-black/10">
                  {items.map((item, index) => (
                    <li key={`${item.product_id}-${index}`} className="py-4 first:pt-0 last:pb-0 flex justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-sm">{item.product_name}</p>
                        {item.variant && <p className="text-xs text-neutral-500 mt-1 break-words">{item.variant}</p>}
                        {item.personalization_text && !item.variant?.includes(item.personalization_text) && (
                          <p className="text-xs text-neutral-500 mt-1 break-words">Personalization: “{item.personalization_text}”</p>
                        )}
                        <p className="text-xs text-neutral-500 mt-1">
                          Qty {item.quantity} × {formatRands(item.unit_price_cents)}
                        </p>
                      </div>
                      <p className="font-bold text-sm whitespace-nowrap">{formatRands(item.unit_price_cents * item.quantity)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t mt-5 pt-4 text-sm flex justify-between font-black" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
                <span>Total (incl. {order.shipping_cents ? formatRands(order.shipping_cents) : "free"} shipping)</span>
                <span>{formatRands(order.total_cents)}</span>
              </div>
            </Card>

            <Card>
              <CardTitle>History</CardTitle>
              {events.length === 0 ? (
                <p className="text-sm text-neutral-600">No status changes recorded yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {events.map((event) => (
                    <li key={event.id} className="flex flex-wrap justify-between gap-x-4">
                      <span>
                        <span className="font-bold capitalize">{event.to_status}</span>
                        {event.note && <span className="text-neutral-500"> · {event.note}</span>}
                        {event.actor_email && <span className="text-neutral-500"> · {event.actor_email}</span>}
                      </span>
                      <span className="text-neutral-500">{formatDateTime(event.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardTitle>Fulfilment</CardTitle>
              <FulfilmentPanel
                orderId={order.id}
                orderNumber={order.order_number}
                stage={stage}
                courier={order.courier ?? null}
                trackingNumber={order.tracking_number ?? null}
                trackingUrl={order.tracking_url ?? null}
              />
            </Card>

            <Card tint={palette.beige}>
              <CardTitle>Ship to</CardTitle>
              {addressLines.length ? (
                <address className="not-italic text-sm leading-relaxed text-neutral-700">
                  {addressLines.map((line, index) => (
                    <span key={index} className={index === 0 ? "font-bold text-black block" : "block"}>
                      {line}
                    </span>
                  ))}
                </address>
              ) : (
                <p className="text-sm text-neutral-600">No delivery address on this order.</p>
              )}
              {order.phone && <p className="text-sm text-neutral-700 mt-3">{order.phone}</p>}
              <p className="text-sm text-neutral-700 mt-1 break-all">{order.email}</p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
