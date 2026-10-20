import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enqueueAndProcessOrderNotification,
  type ProcessResult,
} from "@/lib/order-notifications";

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

export async function POST(req: NextRequest) {
  const secret = process.env.YOCO_WEBHOOK_SECRET ?? "";
//testing 
  const encoded = secret.startsWith("whsec_")
  ? secret.slice(6)
  : "";

console.log("Yoco secret check:", {
  present: Boolean(secret),
  hasPrefix: secret.startsWith("whsec_"),
  encodedLength: encoded.length,
  validBase64Characters: /^[A-Za-z0-9+/]*={0,2}$/.test(encoded),
});

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

  const orderId = firstString(
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

  console.log("Yoco webhook received:", {
    webhookId,
    eventType,
    orderId,
  });

  // Valid Yoco event, but not a Funkful order.
  if (!orderId) {
    console.log("Ignoring Yoco event without Funkful order ID:", {
      webhookId,
      eventType,
    });

    return NextResponse.json({ received: true });
  }

  try {
    const supabase = createAdminClient();

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
    // Extract Yoco payment information
    // -----------------------------------------------------------------------

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
      if (order.payment_status !== "paid") {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "cancelled",
            payment_status: "failed",
          })
          .eq("id", orderId)
          .neq("payment_status", "paid");

        if (updateError) {
          console.error("Failed marking order payment as failed:", {
            orderId,
            error: updateError,
          });

          throw updateError;
        }

        // Release a custom quotation for another attempt if Yoco reports a
        // failed payment. A later verified success will mark it paid.
        const { error: quoteRetryError } = await supabase
          .from("custom_quotes")
          .update({ 
            status: "sent", 
            order_id: null, 
            updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .eq("status", "accepted");
        if (quoteRetryError) {
          console.error("Could not reopen quotation after failed payment:", { orderId, error: quoteRetryError });
        }
      }

      const [failedEmail] = await Promise.allSettled([
        enqueueAndProcessOrderNotification(orderId, "payment_failed", "customer_email"),
      ]);
      logNotification("Payment-failed email", orderId, failedEmail);

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