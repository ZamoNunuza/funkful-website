import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    .select("id,name,brand,product_type,base_price_cents,is_active,stock_quantity,track_inventory")
    .in("id", productIds);

  const { data: allProducts, error: productError } = await supabase
    .from("products")
    .select("id,name,brand,product_type,base_price_cents,stock_quantity,track_inventory,is_active")
    .eq("is_active", true);

  if (productError || !allProducts) {
    return NextResponse.json({ error: "Could not load the product catalogue." }, { status: 500 });
  }


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

  const orderId = randomUUID();
  let userId: string | null = null;
  try {
    const authClient = await createClient();
    const { data } = await authClient.auth.getUser();
    userId = data.user?.id ?? null;
  } catch { /* guest checkout */ }

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    user_id: userId,
    order_number: makeOrderNumber(),
    email,
    first_name: clean(body.shipping?.firstName) || null,
    last_name: clean(body.shipping?.lastName) || null,
    phone: clean(body.shipping?.phone) || null,
    shipping_address: clean(body.shipping?.address) || null,
    shipping_city: clean(body.shipping?.city) || null,
    shipping_province: clean(body.shipping?.province) || null,
    shipping_postal_code: clean(body.shipping?.postalCode) || null,
    shipping_country: clean(body.shipping?.country) || "South Africa",
    subtotal_cents: subtotal,
    discount_cents: discount,
    shipping_cents: shipping,
    total_cents: total,
    promo_code: promoCode,
    status: "pending",
    payment_status: "pending",
  });

  if (orderError) {
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

  const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secretKey}` },
    body: JSON.stringify({
      amount: total,
      currency: "ZAR",
      lineItems: normalizedItems.map((item) => ({
        displayName: item.variant ? `${item.product_name} (${item.variant})` : item.product_name,
        quantity: item.quantity,
        pricingDetails: { price: item.unit_price_cents },
      })),
      successUrl: `${siteUrl}/checkout/success?order=${orderId}`,
      cancelUrl: `${siteUrl}/cart`,
      failureUrl: `${siteUrl}/checkout/failed?order=${orderId}`,
      metadata: { orderId, email },
    }),
  });

  if (!yocoRes.ok) {
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    console.error("Yoco checkout creation failed:", await yocoRes.text());
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }

  const data: { id: string; redirectUrl: string } = await yocoRes.json();
  await supabase.from("orders").update({ yoco_checkout_id: data.id }).eq("id", orderId);

  return NextResponse.json({ redirectUrl: data.redirectUrl, orderId });
}
