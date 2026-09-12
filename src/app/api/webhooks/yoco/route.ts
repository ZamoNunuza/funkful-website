// src/app/api/webhooks/yoco/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface YocoWebhookEvent {
  type: string;
  payload: {
    id?: string;
    metadata?: { orderId?: string; email?: string };
    [key: string]: unknown;
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("YOCO_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  // Signature verification needs the exact raw bytes Yoco sent — read as
  // text, never JSON.parse before verifying, or the signature check breaks.
  const rawBody = await req.text();

  const webhookId = req.headers.get("webhook-id");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  const webhookSignature = req.headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return NextResponse.json({ error: "Missing webhook headers." }, { status: 400 });
  }

  const wh = new Webhook(secret);
  let event: YocoWebhookEvent;

  try {
    event = wh.verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-timestamp": webhookTimestamp,
      "webhook-signature": webhookSignature,
    }) as YocoWebhookEvent;
  } catch (err) {
    console.error("Yoco webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "payment.succeeded") {
    const orderId = event.payload.metadata?.orderId;

    // TODO: look up the order you saved in /api/checkout/route.ts by
    // orderId, mark it paid, and trigger fulfillment (confirmation email,
    // stock decrement, etc). This webhook — not the browser's redirect to
    // successUrl — is the only trustworthy signal the payment went through;
    // Yoco's own docs warn against trusting successUrl for that.
    if (orderId) {
      try {
        const supabase = createAdminClient();
        const { data: order } = await supabase
          .from("orders")
          .select("id,status,promo_code")
          .eq("id", orderId)
          .maybeSingle();

        if (order && order.status !== "paid") {
          await supabase.from("orders").update({
            status: "paid",
            payment_status: "paid",
            yoco_payment_id: event.payload.id ?? null,
          }).eq("id", orderId);

          const { data: lines } = await supabase
            .from("order_items")
            .select("product_id,quantity")
            .eq("order_id", orderId);

          for (const line of lines ?? []) {
            if (line.product_id) {
              await supabase.rpc("decrement_product_stock", {
                p_product_id: line.product_id,
                p_quantity: line.quantity,
              });
            }
          }

          if (order.promo_code) {
            const { data: promo } = await supabase
              .from("promo_codes")
              .select("id")
              .eq("code", order.promo_code)
              .maybeSingle();
            if (promo) {
              await supabase.rpc("record_promo_redemption", {
                p_promo_id: promo.id,
                p_order_id: orderId,
              });
            }
          }
        }
      } catch (err) {
        console.error("Could not finalize paid order:", err);
        return NextResponse.json({ error: "Order finalization failed." }, { status: 500 });
      }
    }

    console.log("Yoco payment succeeded for order:", orderId, "payment id:", event.payload.id);
  }

  return NextResponse.json({ received: true });
}
