import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLockerRates, getStandardRates, ShippingConfigurationError } from "@/lib/shipping/the-courier-guy";

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
    const deliveryMethod = body.deliveryMethod === "locker" ? "locker" : "door";
    if (deliveryMethod === "door" && ![delivery.address, delivery.suburb, delivery.city, delivery.province, delivery.postalCode].every((value) => typeof value === "string" && value.trim().length > 0)) {
      return NextResponse.json({ error: "Complete your delivery address before calculating shipping." }, { status: 400 });
    }
    if (deliveryMethod === "locker" && (typeof body.lockerCode !== "string" || !body.lockerCode.trim())) {
      return NextResponse.json({ error: "Choose a pickup locker before calculating shipping." }, { status: 400 });
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
      const isGlassCup = product.id === "original-glass-personalize-bamboo";
      const glassDesign = isGlassCup ? optionParts.find((value) => value.startsWith("Design: "))?.slice("Design: ".length) : undefined;
      if (isGlassCup) {
        const finish = optionParts.find((value) => value.startsWith("Finish: "))?.slice("Finish: ".length);
        const colour = optionParts.find((value) => value.startsWith("Colour: "))?.slice("Colour: ".length);
        if (!finish || !glassDesign || !colour) return NextResponse.json({ error: "Please review your glass cup finish, design and colour selections." }, { status: 400 });
        optionParts.push(finish, glassDesign, colour);
      }
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
      if (isGlassCup) {
        const requiredOptions = [
          { group: "Finish", value: optionParts.find((value) => value.startsWith("Finish: "))?.slice("Finish: ".length) },
          { group: "Design", value: glassDesign },
          { group: "Colour", value: optionParts.find((value) => value.startsWith("Colour: "))?.slice("Colour: ".length) },
        ];
        if (requiredOptions.some(({ group, value }) => !value || !productVariants.some((variant) => variant.group_name === group && variant.option_name === value))) {
          return NextResponse.json({ error: "One or more glass cup options are unavailable. Please refresh and choose again." }, { status: 400 });
        }
      }
      const needsCaricaturePhoto = ["original-hoodie-caricature-personalize", "original-mug-personalize", "original-tshirt-caricature-personalize"].includes(product.id);
      if (needsCaricaturePhoto || (isGlassCup && glassDesign === "Custom design")) {
        const reference = optionParts.find((value) => value.startsWith("Reference image: "))?.slice("Reference image: ".length);
        if (!reference || !/^pending\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(reference)) return NextResponse.json({ error: needsCaricaturePhoto ? "A photo is required to create your caricature." : "A reference image is required for your custom glass cup design." }, { status: 400 });
        const { data: uploaded, error: uploadCheckError } = await admin.storage.from("personalization-uploads").exists(reference);
        if (uploadCheckError || !uploaded) return NextResponse.json({ error: "Your uploaded image could not be found. Please upload it again." }, { status: 400 });
      }
      if (isGlassCup && !personalization) return NextResponse.json({ error: `${product.name} needs your name or text.` }, { status: 400 });
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

    const isFree = subtotalCents - discountCents >= settings.free_shipping_threshold_cents;
    const itemsForRate = normalizedItems;
    const rateResult = deliveryMethod === "locker"
      ? await getLockerRates(admin, clean(body.lockerCode), itemsForRate)
      : await getStandardRates(admin, {
          streetAddress: clean(delivery.address), suburb: clean(delivery.suburb), city: clean(delivery.city),
          province: clean(delivery.province), postalCode: clean(delivery.postalCode),
        }, itemsForRate, subtotalCents - discountCents);
    const rate = rateResult.rate;
    return NextResponse.json({
      shippingCents: isFree ? 0 : Math.round(Number(rate.rate) * 100),
      isFree,
      deliveryMethod,
      serviceName: rate.service_level.name,
      serviceLevelCode: rate.service_level.code,
      serviceLevelId: rate.service_level.id,
      rateRevisionId: rate.rate_revision_id ?? null,
      deliveryDescription: rate.service_level.description ?? null,
    });
  } catch (error) {
    const message = error instanceof ShippingConfigurationError ? error.message : "Could not calculate delivery. Please try again.";
    if (!(error instanceof ShippingConfigurationError)) console.error("Shipping quote failed:", error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
