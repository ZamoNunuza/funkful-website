// src/lib/order-fulfilment.ts
//
// The one place an order moves from paid -> shipped -> delivered. Server-only
// (uses the service-role client) — never import this from a "use client" file.
//
// Every transition:
//   1. checks the order is really in the right stage (same rules the customer
//      sees, via orderStage in account-shared.ts),
//   2. updates the row with a compare-and-swap on `status`, so a double click or
//      two admins can't send the same email twice,
//   3. writes a row to order_status_events,
//   4. emails the customer. A failed email never undoes the status change; it's
//      reported back so the admin can use "Resend email".

import { createAdminClient } from "@/lib/supabase/admin";
import { orderStage } from "@/lib/account-shared";
import {
  sendOrderDelivered,
  sendOrderShipped,
  type OrderEmailItem,
  type OrderEmailOrder,
} from "@/lib/order-email";

export type FulfilmentResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string };

export interface ShipmentDetails {
  courier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

type AdminClient = ReturnType<typeof createAdminClient>;
type EmailKind = "shipped" | "delivered";

function field(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

/** Validates the ship / edit-tracking form. Courier is required; the rest is optional. */
export function parseShipment(form: FormData): { value: ShipmentDetails } | { error: string } {
  const courier = field(form, "courier", 60);
  const trackingNumber = field(form, "trackingNumber", 80);
  const rawUrl = field(form, "trackingUrl", 500);

  if (!courier) return { error: "Enter the courier (e.g. The Courier Guy or GoDash)." };

  let trackingUrl: string | null = null;
  if (rawUrl) {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad protocol");
      trackingUrl = url.toString();
    } catch {
      return { error: "The tracking link must be a full web address starting with https://" };
    }
  }

  return { value: { courier, trackingNumber: trackingNumber || null, trackingUrl } };
}

function getAdmin(): AdminClient | null {
  try {
    return createAdminClient();
  } catch (error) {
    console.error("Fulfilment: admin client unavailable:", error);
    return null;
  }
}

async function loadOrder(admin: AdminClient, orderId: string) {
  const { data, error } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) console.error("Fulfilment: could not load order:", error);
  return { order: data as (OrderEmailOrder & { status: string; payment_status: string }) | null, failed: Boolean(error) };
}

async function loadItems(admin: AdminClient, orderId: string): Promise<OrderEmailItem[]> {
  const { data, error } = await admin
    .from("order_items")
    .select("product_name,variant,quantity,unit_price_cents")
    .eq("order_id", orderId);
  if (error) console.error("Fulfilment: could not load order items:", error);
  return (data ?? []) as OrderEmailItem[];
}

async function logEvent(
  admin: AdminClient,
  orderId: string,
  from: string | null,
  to: string,
  actor: string,
  note?: string,
) {
  // The history is a nice-to-have; never fail a shipment because it couldn't be logged.
  const { error } = await admin
    .from("order_status_events")
    .insert({ order_id: orderId, from_status: from, to_status: to, actor_email: actor, note: note ?? null });
  if (error) console.error("Fulfilment: could not write status event:", error);
}

/** Returns an error message if the email failed, otherwise null. */
async function sendFulfilmentEmail(
  kind: EmailKind,
  order: OrderEmailOrder,
  items: OrderEmailItem[],
  force = false,
): Promise<string | null> {
  try {
    const result =
      kind === "shipped"
        ? await sendOrderShipped(order, items, { force })
        : await sendOrderDelivered(order, items, { force });
    if (result.error) {
      console.error(`Fulfilment: ${kind} email rejected:`, result.error);
      return result.error.message || "The email provider rejected the message.";
    }
    return null;
  } catch (error) {
    console.error(`Fulfilment: ${kind} email failed:`, error);
    return error instanceof Error ? error.message : "The email could not be sent.";
  }
}

export async function markOrderShipped(
  orderId: string,
  shipment: ShipmentDetails,
  actor: string,
): Promise<FulfilmentResult> {
  const admin = getAdmin();
  if (!admin) return { ok: false, error: "The server is missing its Supabase admin configuration." };

  const { order, failed } = await loadOrder(admin, orderId);
  if (failed) return { ok: false, error: "Could not load the order." };
  if (!order) return { ok: false, error: "Order not found." };
  if (orderStage(order.status, order.payment_status) !== 1) {
    return { ok: false, error: "Only paid orders that haven't shipped yet can be marked as shipped." };
  }

  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({
      status: "shipped",
      courier: shipment.courier,
      tracking_number: shipment.trackingNumber,
      tracking_url: shipment.trackingUrl,
      shipped_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", order.status) // compare-and-swap: fails if someone else changed it first
    .eq("payment_status", "paid")
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("Fulfilment: could not mark shipped:", updateError);
    return { ok: false, error: "Could not update the order. Has the fulfilment SQL migration been run?" };
  }
  if (!updated) return { ok: false, error: "This order was just changed by someone else. Refresh and check its status." };

  await logEvent(admin, orderId, order.status, "shipped", actor, shipment.courier);

  const emailError = await sendFulfilmentEmail("shipped", updated as OrderEmailOrder, await loadItems(admin, orderId));
  return emailError
    ? {
        ok: true,
        message: `${order.order_number} is marked as shipped.`,
        warning: `The customer email did not send (${emailError}). Use “Resend email” once that's fixed.`,
      }
    : { ok: true, message: `${order.order_number} is marked as shipped and the customer has been emailed.` };
}

export async function markOrderDelivered(orderId: string, actor: string): Promise<FulfilmentResult> {
  const admin = getAdmin();
  if (!admin) return { ok: false, error: "The server is missing its Supabase admin configuration." };

  const { order, failed } = await loadOrder(admin, orderId);
  if (failed) return { ok: false, error: "Could not load the order." };
  if (!order) return { ok: false, error: "Order not found." };
  if (orderStage(order.status, order.payment_status) !== 2) {
    return { ok: false, error: "Only shipped orders can be marked as delivered." };
  }

  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", order.status)
    .eq("payment_status", "paid")
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("Fulfilment: could not mark delivered:", updateError);
    return { ok: false, error: "Could not update the order. Has the fulfilment SQL migration been run?" };
  }
  if (!updated) return { ok: false, error: "This order was just changed by someone else. Refresh and check its status." };

  await logEvent(admin, orderId, order.status, "delivered", actor);

  const emailError = await sendFulfilmentEmail("delivered", updated as OrderEmailOrder, await loadItems(admin, orderId));
  return emailError
    ? {
        ok: true,
        message: `${order.order_number} is marked as delivered.`,
        warning: `The customer email did not send (${emailError}). Use “Resend email” once that's fixed.`,
      }
    : { ok: true, message: `${order.order_number} is marked as delivered and the customer has been emailed.` };
}

/** Fix a typo in the courier / tracking details after shipping. No status change, no email. */
export async function updateTrackingDetails(
  orderId: string,
  shipment: ShipmentDetails,
  actor: string,
): Promise<FulfilmentResult> {
  const admin = getAdmin();
  if (!admin) return { ok: false, error: "The server is missing its Supabase admin configuration." };

  const { order, failed } = await loadOrder(admin, orderId);
  if (failed) return { ok: false, error: "Could not load the order." };
  if (!order) return { ok: false, error: "Order not found." };
  if (orderStage(order.status, order.payment_status) !== 2) {
    return { ok: false, error: "Tracking details can only be edited while the order is shipped." };
  }

  const { error } = await admin
    .from("orders")
    .update({ courier: shipment.courier, tracking_number: shipment.trackingNumber, tracking_url: shipment.trackingUrl })
    .eq("id", orderId)
    .eq("status", order.status);

  if (error) {
    console.error("Fulfilment: could not update tracking:", error);
    return { ok: false, error: "Could not update the tracking details." };
  }

  await logEvent(admin, orderId, order.status, order.status, actor, "Tracking details edited");
  return { ok: true, message: "Tracking details updated. The customer's order page shows the new details straight away." };
}

/** Re-sends whichever email matches the order's current stage (shipped or delivered). */
export async function resendFulfilmentEmail(orderId: string): Promise<FulfilmentResult> {
  const admin = getAdmin();
  if (!admin) return { ok: false, error: "The server is missing its Supabase admin configuration." };

  const { order, failed } = await loadOrder(admin, orderId);
  if (failed) return { ok: false, error: "Could not load the order." };
  if (!order) return { ok: false, error: "Order not found." };

  const stage = orderStage(order.status, order.payment_status);
  if (stage !== 2 && stage !== 3) return { ok: false, error: "There's no shipping or delivery email to resend yet." };

  const kind: EmailKind = stage === 2 ? "shipped" : "delivered";
  const emailError = await sendFulfilmentEmail(kind, order, await loadItems(admin, orderId), true);
  return emailError
    ? { ok: false, error: `The email did not send: ${emailError}` }
    : { ok: true, message: `The ${kind} email was sent to ${order.email}.` };
}
