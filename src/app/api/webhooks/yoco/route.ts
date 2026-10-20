import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enqueueAndProcessOrderNotification,
  type ProcessResult,
} from "@/lib/order-notifications";
import { refundYocoCheckout } from "@/lib/yoco-checkout";

export const runtime = "nodejs";

interface YocoWebhookEvent {
  type?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(...values: unknown[]): string | null {
  return (
    values.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    ) ?? null
  );
}

function firstNumber(...values: unknown[]): number | null {
  return (
    values.find(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    ) ?? null
  );
}

function logNotification(
  label: string,
  orderId: string,
  settled: PromiseSettledResult<ProcessResult>,
) {
  if (settled.status === "rejected") {
    console.error(`${label} could not be queued or processed:`, { orderId, error: settled.reason });
    return;
  }
  const result = settled.value;
  if (result.ok) {
    console.log(`${label} sent:`, { orderId });
  } else if (result.alreadyProcessed) {
    console.log(`${label} already handled; not sending again:`, { orderId });
  } else {
    // Saved on the order_notifications row; retry it from the admin order page.
    console.error(`${label} failed (saved for retry):`, { orderId, error: result.error });
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function logOrderEvent(
  supabase: AdminClient,
  order: { id: string; status: string },
  note: string,
) {
  const { error } = await supabase.from("order_status_events").insert({
    order_id: order.id,
    from_status: order.status,
    to_status: order.status,
    note,
    actor_email: "system",
  });
  if (error) console.error("Could not record order event:", { orderId: order.id, error });
}

/**
 * A verified payment arrived that does not belong to this order's own checkout:
 * either the customer paid twice (order already paid) or paid a checkout we did
 * not record. Previously finalize_paid_order() threw on this, so Yoco retried
 * forever and nobody was told. Now it is recorded loudly, acknowledged (200, so
 * Yoco stops retrying) and, only if YOCO_AUTO_REFUND_DUPLICATES=true, refunded.
 */
async function handleUnmatchedPayment(
  supabase: AdminClient,
  order: { id: string; status: string; yoco_checkout_id: string | null },
  info: { paymentId: string | null; checkoutId: string | null; amount: number; alreadyPaid: boolean },
) {
  const kind = info.alreadyPaid ? "DUPLICATE PAYMENT" : "UNMATCHED PAYMENT";
  const detail = `${kind}: Yoco payment ${info.paymentId ?? "?"} on checkout ${info.checkoutId ?? "?"} (R${(info.amount / 100).toFixed(2)}) does not match this order's checkout ${order.yoco_checkout_id ?? "?"}.`;
  console.error(detail, { orderId: order.id });
  await logOrderEvent(supabase, order, `${detail} Needs manual review.`);

  const isDifferentCheckout = Boolean(info.checkoutId && order.yoco_checkout_id && info.checkoutId !== order.yoco_checkout_id);
  if (!info.alreadyPaid || !isDifferentCheckout || !info.checkoutId) return;

  if (process.env.YOCO_AUTO_REFUND_DUPLICATES !== "true") {
    console.error("Auto-refund is off (YOCO_AUTO_REFUND_DUPLICATES). Refund this checkout in the Yoco dashboard:", info.checkoutId);
    return;
  }
  const secretKey = process.env.YOCO_SECRET_KEY;
  if (!secretKey) return;

  const refund = await refundYocoCheckout(secretKey, info.checkoutId);
  console.error("Duplicate payment refund result:", { orderId: order.id, checkoutId: info.checkoutId, refund });
  await logOrderEvent(
    supabase,
    order,
    refund.ok
      ? `Duplicate payment on checkout ${info.checkoutId} was refunded automatically.`
      : `Automatic refund of duplicate checkout ${info.checkoutId} FAILED (${refund.status}). Refund it in the Yoco dashboard.`,
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.YOCO_WEBHOOK_SECRET ?? "";
  if (!secret) {
    console.error("YOCO_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 },
    );
  }

  const rawBody = await req.text();

  const webhookId = req.headers.get("webhook-id");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  const webhookSignature = req.headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.error("Yoco webhook headers missing.", {
      hasWebhookId: Boolean(webhookId),
      hasWebhookTimestamp: Boolean(webhookTimestamp),
      hasWebhookSignature: Boolean(webhookSignature),
    });

    return NextResponse.json(
      { error: "Missing webhook headers." },
      { status: 400 },
    );
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

    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 },
    );
  }

  const payload = asRecord(event.payload ?? event.data);
  const nestedData = asRecord(payload.data);

  const metadata = asRecord(payload.metadata);
  const nestedMetadata = asRecord(nestedData.metadata);

  let orderId = firstString(
    metadata.orderId,
    metadata.order_id,
    nestedMetadata.orderId,
    nestedMetadata.order_id,
    payload.orderId,
    payload.order_id,
    nestedData.orderId,
    nestedData.order_id,
  );

  const eventType = firstString(
    event.type,
    payload.type,
    nestedData.type,
  );

  const paymentId = firstString(
    payload.id,
    nestedData.id,
    payload.paymentId,
    nestedData.paymentId,
    payload.payment_id,
    nestedData.payment_id,
  );

  const checkoutId = firstString(
    payload.checkoutId,
    nestedData.checkoutId,
    payload.checkout_id,
    nestedData.checkout_id,
    metadata.checkoutId,
    metadata.checkout_id,
    nestedMetadata.checkoutId,
    nestedMetadata.checkout_id,
  );

  const amount = firstNumber(
    payload.amount,
    nestedData.amount,
    payload.amountCents,
    nestedData.amountCents,
    payload.amount_cents,
    nestedData.amount_cents,
  );

  const currency = firstString(payload.currency, nestedData.currency);

  console.log("Yoco webhook received:", {
    webhookId,
    eventType,
    orderId,
    paymentId,
    checkoutId,
  });

  try {
    const supabase = createAdminClient();

    // If the order id is missing from the metadata, fall back to the checkout id
    // we stored when the checkout was created, so a verified payment is never
    // dropped just because metadata was not echoed back.
    if (!orderId && checkoutId) {
      const { data: byCheckout } = await supabase
        .from("orders")
        .select("id")
        .eq("yoco_checkout_id", checkoutId)
        .maybeSingle();
      orderId = byCheckout?.id ?? null;
    }

    // Valid Yoco event, but not a Funkful order.
    if (!orderId) {
      if (eventType === "payment.succeeded") {
        console.error("Verified Yoco payment could not be matched to any Funkful order:", {
          webhookId,
          paymentId,
          checkoutId,
          amount,
        });
      } else {
        console.log("Ignoring Yoco event without Funkful order ID:", { webhookId, eventType });
      }
      return NextResponse.json({ received: true });
    }

    // -----------------------------------------------------------------------
    // Load order
    // -----------------------------------------------------------------------

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Failed loading order:", {
        orderId,
        error: orderError,
      });

      throw orderError;
    }

    if (!order) {
      console.error("Yoco webhook referenced unknown order:", {
        orderId,
        webhookId,
        eventType,
      });

      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 },
      );
    }

    // -----------------------------------------------------------------------
    // PAYMENT SUCCESS
    // -----------------------------------------------------------------------

    if (eventType === "payment.succeeded") {
      if (amount == null) {
        console.error(
          "Yoco payment.succeeded did not contain a usable amount.",
          {
            orderId,
            webhookId,
            eventType,
            paymentId,
            checkoutId,
          },
        );

        return NextResponse.json(
          { error: "Payment amount missing." },
          { status: 400 },
        );
      }

      const alreadyPaid = order.payment_status === "paid";

      if (currency && order.currency && currency.toUpperCase() !== String(order.currency).toUpperCase()) {
        console.error("Yoco payment currency does not match the order:", { orderId, currency, expected: order.currency });
        await logOrderEvent(supabase, order, `Payment currency ${currency} does not match order currency ${order.currency}. Needs manual review.`);
        return NextResponse.json({ received: true, event: eventType, orderId, flagged: true });
      }

      // A different payment or checkout than the one this order was paid with.
      // A redelivery of the SAME payment is not caught here and simply returns
      // finalized: false from the idempotent database function below.
      const differentPayment = alreadyPaid && paymentId && order.yoco_payment_id && paymentId !== order.yoco_payment_id;
      const differentCheckout = checkoutId && order.yoco_checkout_id && checkoutId !== order.yoco_checkout_id;
      if (differentPayment || differentCheckout) {
        await handleUnmatchedPayment(supabase, order, { paymentId, checkoutId, amount, alreadyPaid });
        return NextResponse.json({ received: true, event: eventType, orderId, flagged: true });
      }

      console.log("Finalizing paid Funkful order:", {
        orderId,
        paymentId,
        checkoutId,
        amount,
      });

      const { data: finalized, error: finalizeError } =
        await supabase.rpc("finalize_paid_order", {
          p_order_id: orderId,
          p_yoco_payment_id: paymentId,
          p_yoco_checkout_id: checkoutId,
          p_amount_cents: amount,
        });

      if (finalizeError) {
        console.error("finalize_paid_order failed:", {
          orderId,
          error: finalizeError,
        });

        throw finalizeError;
      }

      console.log("Funkful order finalization result:", {
        orderId,
        finalized,
      });

      // Keep custom quotations in sync with the verified payment event.
      const { data: updatedQuotes, error: quoteUpdateError } = await supabase
        .from("custom_quotes")
        .update({ 
          status: "paid", 
          updated_at: new Date().toISOString() 
        })
        .eq("order_id", orderId)
        .select("id");
      if (quoteUpdateError || !updatedQuotes?.length) {
        // Do not fail payment processing or suppress customer emails if the
        // quote table has not been migrated yet; log for operational follow-up.
        console.error("Linked quotation was not marked paid:", {
          orderId,
          error: quoteUpdateError,
          updatedCount: updatedQuotes?.length ?? 0,
        });
      } 

      // ---------------------------------------------------------------------
      // Send both emails through the notification queue.
      //
      // Each send is recorded in order_notifications, so a failure (for example
      // an unverified sending domain) is saved and can be retried from the
      // admin order page instead of only appearing in the logs. A webhook retry
      // can't double-send: already-sent jobs are not claimed again.
      // ---------------------------------------------------------------------

      const [customerEmail, adminEmail] = await Promise.allSettled([
        enqueueAndProcessOrderNotification(orderId, "payment_confirmed", "customer_email"),
        enqueueAndProcessOrderNotification(orderId, "payment_confirmed", "admin_email"),
      ]);

      logNotification("Customer order confirmation", orderId, customerEmail);
      logNotification("Admin order notification", orderId, adminEmail);

      return NextResponse.json({
        received: true,
        event: eventType,
        orderId,
        finalized: Boolean(finalized),
      });
    }

    // -----------------------------------------------------------------------
    // PAYMENT FAILED
    // -----------------------------------------------------------------------

    if (eventType === "payment.failed") {
      // A failed ATTEMPT is not the end of the checkout: the customer can try
      // another card on the same Yoco page. So the order is deliberately left
      // open (not cancelled, quote not released). Cancelling here let a customer
      // start a second checkout while the first could still be paid, which is
      // how a double charge happens. Stale unpaid orders are released by the
      // checkout route instead.
      if (order.payment_status !== "paid") {
        await logOrderEvent(
          supabase,
          order,
          "Yoco reported a failed payment attempt. Order left open so the customer can retry on the same checkout.",
        );

        const [failedEmail] = await Promise.allSettled([
          enqueueAndProcessOrderNotification(orderId, "payment_failed", "customer_email"),
        ]);
        logNotification("Payment-failed email", orderId, failedEmail);
      }

      return NextResponse.json({
        received: true,
        event: eventType,
        orderId,
      });
    }
    // -----------------------------------------------------------------------
    // Other valid Yoco events
    // -----------------------------------------------------------------------

    console.log("Ignoring unsupported Yoco event:", {
      eventType,
      orderId,
      webhookId,
    });

    return NextResponse.json({
      received: true,
      ignored: true,
      event: eventType,
    });
  } catch (error) {
    console.error("Could not process Yoco webhook:", {
      orderId,
      webhookId,
      eventType,
      error,
    });

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}