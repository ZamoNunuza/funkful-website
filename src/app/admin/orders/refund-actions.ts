"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/account-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundYocoCheckout } from "@/lib/yoco-checkout";

export type RefundState = { success?: string; error?: string } | null;

/**
 * Starts a Yoco refund for a paid order. Yoco only ACCEPTS the request here
 * (202); the order is marked refunded by the refund.succeeded webhook, so
 * nothing in the orders table changes until Yoco confirms.
 */
export async function refundOrderAction(_prev: RefundState, formData: FormData): Promise<RefundState> {
  // Server actions are public endpoints, so re-check admin here.
  const user = await requireAdmin();
  const actor = user.email ?? "unknown";

  const orderId = String(formData.get("orderId") ?? "");
  const attempt = String(formData.get("attempt") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const amountRands = Number(String(formData.get("amountRands") ?? "").replace(",", "."));

  if (!isUuid(orderId) || !isUuid(attempt)) return { error: "Invalid refund request." };
  if (!reason) return { error: "Enter a reason for the refund." };
  if (!Number.isFinite(amountRands) || amountRands <= 0) return { error: "Enter an amount greater than R0." };
  const amountCents = Math.round(amountRands * 100);

  const secretKey = process.env.YOCO_SECRET_KEY;
  if (!secretKey) return { error: "YOCO_SECRET_KEY is not configured." };

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id,status,payment_status,total_cents,yoco_checkout_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) return { error: "Could not load that order." };
  if (order.payment_status !== "paid") return { error: "Only paid orders can be refunded." };
  if (!order.yoco_checkout_id) return { error: "This order has no Yoco checkout on record. Refund it in the Yoco dashboard." };
  if (amountCents > Number(order.total_cents)) return { error: "The refund can't be more than the order total." };

  const refund = await refundYocoCheckout(
    secretKey,
    order.yoco_checkout_id,
    amountCents,
    `funkful-admin-refund-${orderId}-${attempt}`,
  );

  const rand = `R${(amountCents / 100).toFixed(2)}`;
  const { error: eventError } = await admin.from("order_status_events").insert({
    order_id: orderId,
    from_status: order.status,
    to_status: order.status,
    actor_email: actor,
    note: refund.ok
      ? `Refund of ${rand} requested from Yoco (${reason}). Awaiting Yoco's confirmation.`
      : `Refund of ${rand} FAILED to start (Yoco ${refund.status}: ${refund.body.slice(0, 160)}).`,
  });
  if (eventError) console.error("Could not record refund request:", eventError);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");

  if (!refund.ok) {
    return { error: `Yoco refused the refund (${refund.status}). ${refund.body.slice(0, 160)}` };
  }
  return { success: `Refund of ${rand} requested. The order shows as refunded once Yoco confirms it.` };
}
