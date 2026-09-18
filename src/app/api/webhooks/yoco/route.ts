import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendOrderConfirmation,
  sendOrderNotification,
  sendPaymentFailedEmail,
  type OrderEmailItem,
  type OrderEmailOrder,
} from "@/lib/order-email";

export const runtime = "nodejs";

interface YocoWebhookEvent {
  type?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

function firstNumber(...values: unknown[]) {
  return values.find((value): value is number => typeof value === "number" && Number.isFinite(value)) ?? null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });

  const rawBody = await req.text();
  const webhookId = req.headers.get("webhook-id");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  const webhookSignature = req.headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return NextResponse.json({ error: "Missing webhook headers." }, { status: 400 });
  }

  let event: YocoWebhookEvent;
  try {
    event = new Webhook(secret).verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-timestamp": webhookTimestamp,
      "webhook-signature": webhookSignature,
    }) as YocoWebhookEvent;
  } catch (error) {
    console.error("Yoco webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const payload = asRecord(event.payload ?? event.data);
  const metadata = asRecord(payload.metadata);
  const nestedData = asRecord(payload.data);
  const nestedMetadata = asRecord(nestedData.metadata);

  const orderId = firstString(
    metadata.orderId,
    nestedMetadata.orderId,
    payload.orderId,
    nestedData.orderId,
  );

  // Ignore valid Yoco events that are unrelated to Funkful orders.
  if (!orderId) return NextResponse.json({ received: true });

  try {
    const supabase = createAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const { data: lines, error: linesError } = await supabase
      .from("order_items")
      .select("product_name,variant,quantity,unit_price_cents,product_id")
      .eq("order_id", orderId);

    if (linesError) throw linesError;

    const emailOrder: OrderEmailOrder = order;
    const emailItems: OrderEmailItem[] = (lines ?? []).map(({ product_name, variant, quantity, unit_price_cents }) => ({
      product_name,
      variant,
      quantity,
      unit_price_cents,
    }));

    const eventType = firstString(event.type, payload.type, nestedData.type);
    const paymentId = firstString(payload.id, nestedData.id, payload.paymentId, nestedData.paymentId);
    const checkoutId = firstString(payload.checkoutId, nestedData.checkoutId, payload.checkout_id, nestedData.checkout_id);
    const amount = firstNumber(payload.amount, nestedData.amount, payload.amountCents, nestedData.amountCents);

    if (eventType === "payment.succeeded") {
      if (amount == null) {
        console.error("Yoco payment.succeeded did not include an amount", { orderId, webhookId });
        return NextResponse.json({ error: "Payment amount missing." }, { status: 400 });
      }

      const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_paid_order", {
        p_order_id: orderId,
        p_yoco_payment_id: paymentId,
        p_yoco_checkout_id: checkoutId,
        p_amount_cents: amount,
      });

      if (finalizeError) throw finalizeError;

      // The RPC is idempotent. On a replay, finalized is false and no stock or
      // promo usage is changed again. Resend idempotency keys prevent duplicate
      // messages even if we send on a replay.
      if (finalized) {
        const results = await Promise.allSettled([
          sendOrderConfirmation(emailOrder, emailItems),
          sendOrderNotification(emailOrder, emailItems),
        ]);
        for (const result of results) {
          if (result.status === "rejected") console.error("Order email failed:", result.reason);
        }
      } else {
        // Still call the email functions: if the first webhook marked the order
        // paid but crashed before sending, the Resend idempotency key lets this
        // replay safely recover the messages.
        const results = await Promise.allSettled([
          sendOrderConfirmation(emailOrder, emailItems),
          sendOrderNotification(emailOrder, emailItems),
        ]);
        for (const result of results) {
          if (result.status === "rejected") console.error("Order email retry failed:", result.reason);
        }
      }
    } else if (eventType === "payment.failed") {
      if (order.payment_status !== "paid") {
        const { error } = await supabase
          .from("orders")
          .update({ status: "cancelled", payment_status: "failed" })
          .eq("id", orderId)
          .neq("payment_status", "paid");
        if (error) throw error;
      }

      const result = await sendPaymentFailedEmail(emailOrder);
      if (result?.error) console.error("Payment-failed email failed:", result.error);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Could not process Yoco webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
