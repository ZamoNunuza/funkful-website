import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBobGoCheckoutRates, ShippingConfigurationError } from "@/lib/shipping/bobgo";

export const runtime = "nodejs";
export const maxDuration = 30;

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export async function POST(request: Request) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = request.headers.get("origin");
    if (!siteUrl || !origin || new URL(origin).origin !== new URL(siteUrl).origin) {
      return NextResponse.json({ error: "Invalid checkout request." }, { status: 403 });
    }

    const body = await request.json();
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) {
      return NextResponse.json({ error: "Your bag is empty or invalid." }, { status: 400 });
    }
    const requestedItems = body.items as Array<{ id: string; quantity: number; variant?: string }>;
    if (requestedItems.some((item) => typeof item.id !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) {
      return NextResponse.json({ error: "Invalid cart items." }, { status: 400 });
    }

    const delivery = body.delivery ?? {};
    if (![delivery.address, delivery.suburb, delivery.city, delivery.province, delivery.postalCode].every((value) => typeof value === "string" && value.trim().length > 0)) {
      return NextResponse.json({ error: "Complete your delivery address before calculating shipping." }, { status: 400 });
    }

    const admin = createAdminClient();
    const [{ data: settings, error: settingsError }, { data: products, error: productsError }, { data: variants, error: variantsError }] = await Promise.all([
      admin.from("shipping_settings").select("free_shipping_threshold_cents").eq("id", 1).single(),
      admin.from("products").select("id,name,brand,base_price_cents,product_type,is_active,allow_personalization,personalization_price_delta_cents,personalization_max_length").eq("is_active", true),
      admin.from("product_variants").select("product_id,group_name,option_name,price_delta_cents,is_active").eq("is_active", true),
    ]);
    if (settingsError || !settings || productsError || !products || variantsError) {
      return NextResponse.json({ error: "Shipping settings or product catalogue are unavailable." }, { status: 503 });
    }

    const resolve = (cartId: string) => products.find((product) => product.id === cartId) ?? products.filter((product) => cartId.startsWith(`${product.id}-`)).sort((a, b) => b.id.length - a.id.length)[0];
    const normalizedItems: Array<{ id: string; quantity: number; unitPriceCents: number }> = [];
    for (const item of requestedItems) {
      const product = resolve(item.id);
      if (!product) return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
      const optionParts = clean(item.variant).split(" · ").map((value) => value.trim()).filter(Boolean);
      let unitPrice = Number(product.base_price_cents);
      const productVariants = (variants ?? []).filter((variant) => variant.product_id === product.id);
      const groups = [...new Set(productVariants.map((variant) => variant.group_name))];
      for (const group of groups) {
        const options = productVariants.filter((variant) => variant.group_name === group);
        const selected = options.find((option) => optionParts.includes(option.option_name));
        if (selected) unitPrice += Number(selected.price_delta_cents);
        else if (options.length) unitPrice += Number(options.find((option) => option.price_delta_cents === 0)?.price_delta_cents ?? 0);
      }
      const personalization = optionParts.find((value) => value.startsWith('"') && value.endsWith('"'))?.slice(1, -1);
      if (product.product_type === "personalize" && !personalization) return NextResponse.json({ error: `${product.name} needs personalization details.` }, { status: 400 });
      if (personalization) {
        if (!product.allow_personalization || personalization.length > Number(product.personalization_max_length ?? 80)) return NextResponse.json({ error: `Personalization details for ${product.name} are invalid.` }, { status: 400 });
        unitPrice += Number(product.personalization_price_delta_cents ?? 0);
      }
      normalizedItems.push({ id: product.id, quantity: item.quantity, unitPriceCents: unitPrice });
    }

    const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    let discountCents = 0;
    const requestedPromo = clean(body.promoCode).toUpperCase();
    if (requestedPromo) {
      const { data: promo } = await admin.from("promo_codes").select("code,discount_type,discount_value,min_order_cents,max_uses,uses_count,starts_at,expires_at,is_active").eq("code", requestedPromo).maybeSingle();
      const now = Date.now();
      const valid = promo?.is_active && (!promo.starts_at || new Date(promo.starts_at).getTime() <= now) && (!promo.expires_at || new Date(promo.expires_at).getTime() > now) && subtotalCents >= promo.min_order_cents && (promo.max_uses == null || promo.uses_count < promo.max_uses);
      if (!valid) return NextResponse.json({ error: "That promo code is invalid or expired. Reapply it before calculating delivery." }, { status: 400 });
      discountCents = promo.discount_type === "percentage" ? Math.floor(subtotalCents * promo.discount_value / 100) : Math.min(promo.discount_value, subtotalCents);
    }

    if (subtotalCents - discountCents >= settings.free_shipping_threshold_cents) {
      return NextResponse.json({ shippingCents: 0, isFree: true, serviceName: "Free standard delivery" });
    }

    const { rate } = await getBobGoCheckoutRates(admin, {
      delivery: {
        streetAddress: clean(delivery.address), suburb: clean(delivery.suburb), city: clean(delivery.city),
        province: clean(delivery.province), postalCode: clean(delivery.postalCode),
      },
      items: normalizedItems,
      orderTotalCents: subtotalCents - discountCents,
    });
    return NextResponse.json({ shippingCents: Math.round(rate.total_price * 100), isFree: false, serviceName: rate.service_name, rateId: rate.id, serviceCode: rate.service_code, deliveryDescription: rate.description ?? null });
  } catch (error) {
    const message = error instanceof ShippingConfigurationError ? error.message : "Could not calculate delivery. Please try again.";
    if (!(error instanceof ShippingConfigurationError)) console.error("Shipping quote failed:", error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
