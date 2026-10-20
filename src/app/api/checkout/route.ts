import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildCheckoutKey,
  CHECKOUT_REUSE_WINDOW_MS,
  createYocoCheckout,
  isFresh,
  RECENTLY_PAID_WINDOW_MS,
  sortYocoLineItems,
} from "@/lib/yoco-checkout";

export const runtime = "nodejs";
// Yoco creation retries up to 3 times (7s each) with the same idempotency key.
export const maxDuration = 30;

interface CheckoutLineItem {
  id: string;
  name: string;
  variant?: string;
  priceCents?: number;
  quantity: number;
}

interface CheckoutRequestBody {
  email: string;
  items: CheckoutLineItem[];
  shipping?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  promoCode?: string;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function makeOrderNumber() {
  return `FUNK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.YOCO_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!secretKey || !siteUrl) {
    return NextResponse.json({ error: "Checkout is not configured." }, { status: 500 });
  }

  let body: CheckoutRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const email = clean(body.email).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
  }
  if (body.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) {
    return NextResponse.json({ error: "Invalid item quantity." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Checkout database is not configured." }, { status: 500 });
  }

  // The browser cart is only a request. Prices and product names are always
  // rebuilt from Supabase so a customer cannot change the amount in DevTools.
  const productIds = [...new Set(body.items.map((item) => item.id))];
  const { data: exactProducts } = await supabase
  .from("products")
  .select()
  .in("id", productIds);

  /*const { data: allProducts, error: productError } = await supabase
    .from("products")
    .select("id,name,brand,product_type,base_price_cents,stock_quantity,track_inventory,is_active")
    .eq("is_active", true);*/

    const { data: catalogue, error: productError } = await supabase
  .from("products")
  .select(
    "id,name,brand,product_type,base_price_cents,is_active,stock_quantity,track_inventory"
  )
  .eq("is_active", true);

    if (productError) {
  console.error("PRODUCT CATALOGUE ERROR:", {
    message: productError.message,
    details: productError.details,
    hint: productError.hint,
    code: productError.code,
  });

  return NextResponse.json(
    {
      error: "Could not load the product catalogue.",
      details: productError.message,
      code: productError.code,
    },
    { status: 500 }
  );
}

const allProducts = catalogue ?? [];

  //if (productError || !allProducts) {
    //return NextResponse.json({ error: "Could not load the product catalogue." }, { status: 500 });
 // }


  const products = exactProducts ?? [];
  const resolveProduct = (cartId: string) =>
    products.find((p) => p.id === cartId) ??
    allProducts
      .filter((p) => cartId === p.id || cartId.startsWith(`${p.id}-`))
      .sort((a, b) => b.id.length - a.id.length)[0];

  const { data: variants } = await supabase
    .from("product_variants")
    .select("product_id,group_name,option_name,price_delta_cents,is_active")
    .eq("is_active", true);

  const normalizedItems: Array<{
    product_id: string; product_name: string; brand: string; variant?: string;
    personalization_text?: string; unit_price_cents: number; quantity: number;
  }> = [];

  for (const item of body.items) {
    const product = resolveProduct(item.id);
    if (!product || !product.is_active) {
      return NextResponse.json({ error: `Product unavailable: ${item.name}` }, { status: 400 });
    }

    const optionParts = clean(item.variant).split(" · ").map((v) => v.trim()).filter(Boolean);
    let unitPrice = product.base_price_cents;
    const productVariants = (variants ?? []).filter((v) => v.product_id === product.id);
    const groups = [...new Set(productVariants.map((v) => v.group_name))];

    for (const group of groups) {
      const options = productVariants.filter((v) => v.group_name === group);
      const selected = options.find((v) => optionParts.includes(v.option_name));
      if (selected) unitPrice += selected.price_delta_cents;
      else if (options.length) unitPrice += options.find((v) => v.price_delta_cents === 0)?.price_delta_cents ?? 0;
    }

    const personalization = optionParts.find((v) => v.startsWith('"') && v.endsWith('"'))?.slice(1, -1);
    if (product.product_type === "personalize" && !personalization) {
      return NextResponse.json({ error: `${product.name} needs personalization details.` }, { status: 400 });
    }

    if (personalization) {
      const { data: personalizationSettings, error: personalizationError } = await supabase
        .from("products")
        .select("allow_personalization,personalization_price_delta_cents,personalization_max_length")
        .eq("id", product.id)
        .maybeSingle();

      if (personalizationError) {
        return NextResponse.json({ error: "Could not validate personalization." }, { status: 500 });
      }
      if (!personalizationSettings?.allow_personalization) {
        return NextResponse.json({ error: `${product.name} does not support personalization.` }, { status: 400 });
      }
      if (personalization.length > (personalizationSettings.personalization_max_length ?? 80)) {
        return NextResponse.json({ error: "Your personalization is too long." }, { status: 400 });
      }
      unitPrice += personalizationSettings.personalization_price_delta_cents ?? 0;
    }

    if (product.track_inventory && product.stock_quantity < item.quantity) {
      return NextResponse.json({ error: `${product.name} does not have enough stock.` }, { status: 409 });
    }

    normalizedItems.push({
      product_id: product.id,
      product_name: product.name,
      brand: product.brand,
      variant: clean(item.variant) || undefined,
      personalization_text: personalization,
      unit_price_cents: unitPrice,
      quantity: item.quantity,
    });
  }

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
  let discount = 0;
  let promoCode: string | null = null;

  const requestedPromo = clean(body.promoCode).toUpperCase();
  if (requestedPromo) {
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("id,code,discount_type,discount_value,min_order_cents,max_uses,uses_count,starts_at,expires_at,is_active")
      .eq("code", requestedPromo)
      .maybeSingle();

    const now = Date.now();
    const valid = promo?.is_active &&
      (!promo.starts_at || new Date(promo.starts_at).getTime() <= now) &&
      (!promo.expires_at || new Date(promo.expires_at).getTime() > now) &&
      subtotal >= promo.min_order_cents &&
      (promo.max_uses == null || promo.uses_count < promo.max_uses);

    if (!valid) return NextResponse.json({ error: "That promo code is invalid or expired." }, { status: 400 });

    discount = promo.discount_type === "percentage"
      ? Math.floor(subtotal * promo.discount_value / 100)
      : Math.min(promo.discount_value, subtotal);
    promoCode = promo.code;
  }

  // Free delivery above R400, otherwise R99, matching the site banner.
  const shipping = subtotal - discount >= 40000 ? 0 : 9900;
  const total = Math.max(0, subtotal - discount + shipping);

  if (total < 200) {
    return NextResponse.json({ error: "Order total is below the minimum payable amount." }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const authClient = await createClient();
    const { data } = await authClient.auth.getUser();
    userId = data.user?.id ?? null;
  } catch { /* guest checkout */ }

  const shippingDetails = {
    firstName: clean(body.shipping?.firstName),
    lastName: clean(body.shipping?.lastName),
    phone: clean(body.shipping?.phone),
    address: clean(body.shipping?.address),
    city: clean(body.shipping?.city),
    province: clean(body.shipping?.province),
    postalCode: clean(body.shipping?.postalCode),
    country: clean(body.shipping?.country) || "South Africa",
  };

  // Identical basket + customer + delivery details => identical key. This is what
  // lets a double click, a network retry or a "back" from Yoco find the order that
  // is already open instead of creating a second payable one.
  const checkoutKey = buildCheckoutKey({
    userId,
    email,
    items: normalizedItems,
    shipping: shippingDetails,
    promoCode,
    totalCents: total,
  });

  // 1. The same basket was paid moments ago (the customer pressed back after
  //    paying, or the cart was never cleared): never charge it again.
  const { data: recentlyPaid } = await supabase
    .from("orders")
    .select("id")
    .eq("checkout_key", checkoutKey)
    .eq("payment_status", "paid")
    .gte("payment_confirmed_at", new Date(Date.now() - RECENTLY_PAID_WINDOW_MS).toISOString())
    .limit(1)
    .maybeSingle();
  if (recentlyPaid) {
    return NextResponse.json({ alreadyPaid: true, orderId: recentlyPaid.id });
  }

  type OpenOrder = { id: string; created_at: string; yoco_checkout_id: string | null; yoco_redirect_url: string | null };
  const findOpenOrder = async (): Promise<OpenOrder | null> => {
    const { data } = await supabase
      .from("orders")
      .select("id,created_at,yoco_checkout_id,yoco_redirect_url")
      .eq("checkout_key", checkoutKey)
      .eq("status", "pending")
      .eq("payment_status", "pending")
      .maybeSingle();
    return (data as OpenOrder | null) ?? null;
  };

  // 2. An unpaid order for this exact basket is already open: resume it.
  let orderId: string = randomUUID();
  let resuming = false;
  const existing = await findOpenOrder();

  if (existing) {
    if (!isFresh(existing.created_at, CHECKOUT_REUSE_WINDOW_MS)) {
      // Too old to trust the stored Yoco page. Release it and start fresh. If it
      // is paid late, the webhook still finalises it (finalize_paid_order does
      // not depend on the order being pending).
      await supabase.from("orders").update({ status: "cancelled" })
        .eq("id", existing.id).eq("status", "pending").eq("payment_status", "pending");
    } else if (existing.yoco_checkout_id && existing.yoco_redirect_url) {
      return NextResponse.json({ redirectUrl: existing.yoco_redirect_url, orderId: existing.id, resumed: true });
    } else {
      orderId = existing.id;
      resuming = true;
    }
  }

  if (!resuming) {
    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      user_id: userId,
      order_number: makeOrderNumber(),
      email,
      first_name: shippingDetails.firstName || null,
      last_name: shippingDetails.lastName || null,
      phone: shippingDetails.phone || null,
      shipping_address: shippingDetails.address || null,
      shipping_city: shippingDetails.city || null,
      shipping_province: shippingDetails.province || null,
      shipping_postal_code: shippingDetails.postalCode || null,
      shipping_country: shippingDetails.country,
      subtotal_cents: subtotal,
      discount_cents: discount,
      shipping_cents: shipping,
      total_cents: total,
      promo_code: promoCode,
      checkout_key: checkoutKey,
      status: "pending",
      payment_status: "pending",
    });

    if (orderError) {
      if (orderError.code === "23505" && orderError.message?.includes("orders_open_checkout_key_idx")) {
        // A simultaneous request for the same basket won the race (double click).
        // Resume its order rather than creating a second one.
        const winner = await findOpenOrder();
        if (winner?.yoco_checkout_id && winner.yoco_redirect_url) {
          return NextResponse.json({ redirectUrl: winner.yoco_redirect_url, orderId: winner.id, resumed: true });
        }
        return NextResponse.json(
          { error: "Your order is already being prepared. Please wait a moment and try again.", retryable: true },
          { status: 409 },
        );
      }
      console.error(orderError);
      return NextResponse.json({ error: "Could not save your order." }, { status: 500 });
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      normalizedItems.map((item) => ({ order_id: orderId, ...item }))
    );

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", orderId);
      return NextResponse.json({ error: "Could not save your order items." }, { status: 500 });
    }
  }

  // Always build the Yoco request from the SAVED order rows, whether this is the
  // first attempt or a resume, so the body is identical every time. Yoco refuses
  // (422) a reused idempotency key with a different body.
  const { data: savedItems } = await supabase
    .from("order_items")
    .select("product_name,variant,unit_price_cents,quantity")
    .eq("order_id", orderId);

  if (!savedItems?.length) {
    return NextResponse.json(
      { error: "Your order is still being saved. Please try again in a moment.", retryable: true },
      { status: 409 },
    );
  }

  const checkout = await createYocoCheckout(
    secretKey,
    {
      amount: total,
      currency: "ZAR",
      lineItems: sortYocoLineItems(
        savedItems.map((item) => ({
          displayName: item.variant ? `${item.product_name} (${item.variant})` : item.product_name,
          quantity: item.quantity,
          pricingDetails: { price: item.unit_price_cents },
        })),
      ),
      successUrl: `${siteUrl}/checkout/success?order=${orderId}`,
      cancelUrl: `${siteUrl}/cart`,
      failureUrl: `${siteUrl}/checkout/failed?order=${orderId}`,
      metadata: { orderId, email },
    },
    // One key per order: a retry for this order can only ever get the same checkout.
    `funkful-checkout-${orderId}`,
  );

  if (!checkout.ok) {
    if (!checkout.retryable) {
      // Yoco definitively refused, so no payable checkout exists: release the order.
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("payment_status", "pending");
      return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
    }
    // Outcome unknown (timeout / network / 5xx). Yoco may have created a checkout,
    // so do NOT cancel. The order stays open and the customer's next click resumes
    // it with the same idempotency key, which returns that same checkout.
    return NextResponse.json(
      { error: "Our payment provider is not responding. You have not been charged. Please try again in a moment.", retryable: true },
      { status: 503 },
    );
  }

  const { error: saveError } = await supabase
    .from("orders")
    .update({ yoco_checkout_id: checkout.id, yoco_redirect_url: checkout.redirectUrl })
    .eq("id", orderId);

  if (saveError) {
    // Not fatal: the webhook matches on metadata.orderId, and a later retry gets
    // this same checkout back from Yoco and saves it again.
    console.error("Could not save Yoco checkout on order:", { orderId, checkoutId: checkout.id, error: saveError });
  }

  return NextResponse.json({ redirectUrl: checkout.redirectUrl, orderId });
}
