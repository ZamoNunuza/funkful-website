// src/app/api/checkout/route.ts
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface CheckoutLineItem {
  id: string;
  name: string;
  variant?: string;
  priceCents: number;
  quantity: number;
}

interface CheckoutRequestBody {
  email: string;
  items: CheckoutLineItem[];
  shipping?: {
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  };
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.YOCO_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!secretKey || !siteUrl) {
    console.error("Missing YOCO_SECRET_KEY or NEXT_PUBLIC_SITE_URL env vars.");
    return NextResponse.json({ error: "Checkout is not configured." }, { status: 500 });
  }

  const body = (await req.json()) as CheckoutRequestBody;

  if (!body.items?.length) {
    return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
  }

  const amount = body.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  // Yoco won't accept a charge under R2.
  if (amount < 200) {
    return NextResponse.json({ error: "Order total is below the minimum payable amount." }, { status: 400 });
  }

  // Our own order id — separate from Yoco's checkout id (`data.id` below).
  // Yoco's webhook only confirms a payment; this is what you'd use to look
  // the order back up in your own database and fulfill it.
  const orderId = randomUUID();

  const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      amount, // cents
      currency: "ZAR",
      lineItems: body.items.map((item) => ({
        displayName: item.variant ? `${item.name} (${item.variant})` : item.name,
        quantity: item.quantity,
        pricingDetails: { price: item.priceCents },
      })),
      successUrl: `${siteUrl}/checkout/success?order=${orderId}`,
      cancelUrl: `${siteUrl}/cart`,
      failureUrl: `${siteUrl}/checkout/failed?order=${orderId}`,
      metadata: {
        orderId,
        email: body.email,
        ...body.shipping,
      },
    }),
  });

  if (!yocoRes.ok) {
    console.error("Yoco checkout creation failed:", await yocoRes.text());
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }

  const data: { id: string; redirectUrl: string } = await yocoRes.json();

  // TODO: persist an order record here — { orderId, yocoCheckoutId: data.id,
  // email: body.email, items: body.items, amount, status: "pending" } — to
  // whatever you're using for storage (Postgres, Supabase, etc). The webhook
  // in /api/webhooks/yoco only tells you a payment succeeded; without a
  // saved order to match it against, you won't know what to fulfill.

  return NextResponse.json({ redirectUrl: data.redirectUrl });
}
