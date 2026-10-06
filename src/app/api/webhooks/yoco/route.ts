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

export async function POST(req: NextRequest) {
  const secret = process.env.YOCO_WEBHOOK_SECRET;

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
    // Load order items
    // -----------------------------------------------------------------------

    const { data: lines, error: linesError } = await supabase
      .from("order_items")
      .select(
        "product_name,variant,quantity,unit_price_cents,product_id",
      )
      .eq("order_id", orderId);

    if (linesError) {
      console.error("Failed loading order items:", {
        orderId,
        error: linesError,
      });

      throw linesError;
    }

    const emailOrder: OrderEmailOrder = order;

    const emailItems: OrderEmailItem[] = (lines ?? []).map((item) => ({
      product_name: item.product_name,
      variant: item.variant,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
    }));

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

      // ---------------------------------------------------------------------
      // Send both emails.
      //
      // These functions use stable Resend idempotency keys, so retrying this
      // webhook is safe.
      // ---------------------------------------------------------------------

      const results = await Promise.allSettled([
        sendOrderConfirmation(emailOrder, emailItems),
        sendOrderNotification(emailOrder, emailItems),
      ]);

      const confirmationResult = results[0];
      const notificationResult = results[1];

      if (confirmationResult.status === "rejected") {
        console.error("Customer order confirmation email failed:", {
          orderId,
          error: confirmationResult.reason,
        });
      } else if (confirmationResult.value?.error) {
        console.error("Customer order confirmation email returned an error:", {
          orderId,
          error: confirmationResult.value.error,
        });
      } else {
        console.log("Customer order confirmation email sent:", {
          orderId,
        });
      }

      if (notificationResult.status === "rejected") {
        console.error("Admin order notification email failed:", {
          orderId,
          error: notificationResult.reason,
        });
      } else if (
        "error" in notificationResult.value &&
        notificationResult.value.error
      ) {
        console.error("Admin order notification email returned an error:", {
          orderId,
          error: notificationResult.value.error,
        });
      } else if (
        "skipped" in notificationResult.value &&
        notificationResult.value.skipped
      ) {
        console.warn(
          "Admin order notification email was skipped because ORDER_NOTIFICATION_EMAIL is not configured.",
          {
            orderId,
          },
        );
      } else {
        console.log("Admin order notification email sent:", {
          orderId,
        });
      }

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
      }

      const result = await sendPaymentFailedEmail(emailOrder);

      if (result?.error) {
        console.error("Payment-failed email returned an error:", {
          orderId,
          error: result.error,
        });
      } else {
        console.log("Payment-failed email sent:", {
          orderId,
        });
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