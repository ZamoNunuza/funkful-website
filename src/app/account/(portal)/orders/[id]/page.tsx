import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/brands";
import { getSessionUser } from "@/lib/account-server";
import {
  ORDER_STEPS,
  formatDate,
  formatRands,
  isUuid,
  orderStage,
  orderStatusMeta,
  type OrderItemRow,
  type OrderRow,
} from "@/lib/account-shared";
import { Card, CardTitle, StatusBadge, outlineButtonClass } from "@/components/account/ui";
import ReorderButton from "./reorder-button";

export const metadata = { title: "Order details | Funkful" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const user = await getSessionUser();
  if (!user) redirect(`/account/login?next=/account/orders/${id}`);

  const supabase = await createClient();

  // Both the explicit user_id filter and the RLS policy scope this to the
  // signed-in customer, so another customer's order id simply 404s.
  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!orderData) notFound();
  const order = orderData as OrderRow;

  const { data: itemData } = await supabase
    .from("order_items")
    .select("order_id, product_id, product_name, brand, variant, personalization_text, unit_price_cents, quantity")
    .eq("order_id", order.id);
  const items = (itemData ?? []) as OrderItemRow[];

  const meta = orderStatusMeta(order.status, order.payment_status);
  const stage = orderStage(order.status, order.payment_status);
  const canReorder = order.payment_status === "paid" && items.length > 0;

  const addressLines = [
    [order.first_name, order.last_name].filter(Boolean).join(" "),
    order.shipping_address,
    [order.shipping_city, order.shipping_province].filter(Boolean).join(", "),
    order.shipping_postal_code,
    order.shipping_country,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/account/orders" className="text-xs font-bold uppercase underline">
          ← All orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4 mt-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase break-all">{order.order_number}</h2>
            <p className="text-sm text-neutral-600 mt-1">Placed {formatDate(order.created_at)}</p>
          </div>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
        <p className="text-sm text-neutral-700 leading-relaxed mt-4 max-w-xl">{meta.description}</p>
      </div>

      {stage !== null && (
        <Card compact>
          <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
            {ORDER_STEPS.map((step, index) => {
              const reached = index <= stage;
              return (
                <li key={step} aria-current={index === stage ? "step" : undefined} className="text-center">
                  <div
                    style={{ background: reached ? palette.black : "rgba(17,17,17,0.12)" }}
                    className="h-1.5 rounded-full mb-2"
                  />
                  <span
                    style={{ color: reached ? palette.black : "#8b8578" }}
                    className="text-[10.5px] sm:text-xs font-bold uppercase tracking-wide"
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
          {(order.tracking_number || order.tracking_url) && (
            <p className="text-sm mt-5 pt-4 border-t" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
              <span className="text-neutral-500">{order.courier ? `${order.courier} tracking: ` : "Tracking: "}</span>
              {order.tracking_url ? (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  {order.tracking_number || "Track your parcel"}
                </a>
              ) : (
                <span className="font-bold">{order.tracking_number}</span>
              )}
            </p>
          )}
        </Card>
      )}

      <div className="grid md:grid-cols-[1.5fr_1fr] gap-6 items-start">
        <Card>
          <CardTitle>Items</CardTitle>
          {items.length === 0 ? (
            <p className="text-sm text-neutral-600">We couldn&apos;t load the items for this order. Please contact us if this keeps happening.</p>
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

          <div className="border-t mt-5 pt-4 text-sm space-y-2" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
            <TotalRow label="Subtotal" value={formatRands(order.subtotal_cents)} />
            {order.discount_cents > 0 && (
              <TotalRow
                label={order.promo_code ? `Discount (${order.promo_code})` : "Discount"}
                value={`−${formatRands(order.discount_cents)}`}
              />
            )}
            <TotalRow label="Shipping" value={order.shipping_cents ? formatRands(order.shipping_cents) : "Free"} />
            <div className="flex justify-between pt-3 border-t font-black text-base" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
              <span>Total</span>
              <span>{formatRands(order.total_cents)}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card tint={palette.beige}>
            <CardTitle>Delivering to</CardTitle>
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
          </Card>

          <Card>
            <CardTitle>Need a hand?</CardTitle>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Quote <span className="font-bold text-black">{order.order_number}</span> when you get in touch and we&apos;ll find it straight away.
            </p>
            <div className="flex flex-wrap gap-3">
              {canReorder && (
                <ReorderButton
                  lines={items.map((i) => ({
                    product_id: i.product_id,
                    product_name: i.product_name,
                    brand: i.brand,
                    variant: i.variant,
                    unit_price_cents: i.unit_price_cents,
                    quantity: i.quantity,
                  }))}
                />
              )}
              <Link href="/contact" className={outlineButtonClass}>
                Contact us
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between" style={{ color: "#4a4438" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
