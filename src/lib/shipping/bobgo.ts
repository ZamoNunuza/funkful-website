import type { SupabaseClient } from "@supabase/supabase-js";

export type ShippingAddressInput = {
  address?: string;
  streetAddress?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
};

export type BobGoCheckoutRate = {
  id: number;
  service_name: string;
  service_code: string;
  total_price: number;
  currency?: string;
  description?: string;
  type?: string;
  service_level_priority?: number;
  min_delivery_date?: string | null;
  max_delivery_date?: string | null;
};

export class ShippingConfigurationError extends Error {}

export function bobGoBaseUrl(environment: string) {
  return environment === "production"
    ? "https://api.bobgo.co.za/v2"
    : "https://api.sandbox.bobgo.co.za/v2";
}

export async function getBobGoCheckoutRates(
  admin: SupabaseClient,
  input: {
    delivery: ShippingAddressInput;
    items: Array<{ id: string; quantity: number; unitPriceCents: number }>;
    orderTotalCents: number;
  },
) {
  const [{ data: settings, error: settingsError }, { data: products, error: productsError }] = await Promise.all([
    admin.from("shipping_settings").select("*").eq("id", 1).single(),
    admin.from("products").select("id,name,brand,shipping_profile_code").in("id", [...new Set(input.items.map((item) => item.id))]),
  ]);
  if (settingsError || !settings) throw new ShippingConfigurationError("Shipping settings are unavailable.");
  const token = settings.bobgo_environment === "production" ? process.env.BOBGO_PRODUCTION_API_KEY : process.env.BOBGO_SANDBOX_API_KEY;
  if (!token) throw new ShippingConfigurationError(`Bob Go ${settings.bobgo_environment} API key is not configured. Please contact Funkful.`);
  if (productsError) throw new ShippingConfigurationError("Could not load product packaging settings.");

  const productById = new Map<string, (typeof products)[number]>(
    (products ?? []).map((product) => [product.id, product] as const),
  );
  const profileCodes = [...new Set((products ?? []).map((product) => product.shipping_profile_code).filter((code): code is string => Boolean(code)))];
  if (profileCodes.length === 0 || (products ?? []).some((product) => !product.shipping_profile_code)) {
    throw new ShippingConfigurationError("Some products still need a packaging profile. Funkful is configuring accurate parcel measurements; please contact us to arrange delivery.");
  }

  const { data: profiles, error: profilesError } = await admin
    .from("shipping_parcel_profiles")
    .select("code,name,length_cm,width_cm,height_cm,weight_kg,is_active")
    .in("code", profileCodes)
    .eq("is_active", true);
  if (profilesError) throw new ShippingConfigurationError("Could not load parcel measurements.");

  const profileByCode = new Map<string, (typeof profiles)[number]>(
    (profiles ?? []).map((profile) => [profile.code, profile] as const),
  );
  const bobItems = input.items.map((item) => {
    const product = productById.get(item.id);
    const profile = product?.shipping_profile_code ? profileByCode.get(product.shipping_profile_code) : null;
    if (!product || !profile || !profile.length_cm || !profile.width_cm || !profile.height_cm || !profile.weight_kg) {
      throw new ShippingConfigurationError(`Packaging measurements are incomplete for ${product?.name ?? "one of your products"}. Please contact Funkful to arrange delivery.`);
    }
    return {
      description: product.name,
      vendor: product.brand,
      price: item.unitPriceCents / 100,
      quantity: item.quantity,
      length_cm: Number(profile.length_cm),
      width_cm: Number(profile.width_cm),
      height_cm: Number(profile.height_cm),
      weight_kg: Number(profile.weight_kg),
    };
  });

  const payload = {
    collection_address: {
      type: "business",
      company: settings.collection_company || "Funkful",
      street_address: settings.collection_street_address,
      local_area: settings.collection_local_area,
      city: settings.collection_city,
      zone: settings.collection_province,
      country: settings.collection_country || "ZA",
      ...(settings.collection_postal_code ? { code: settings.collection_postal_code } : {}),
    },
    delivery_address: {
      type: "residential",
      street_address: input.delivery.streetAddress || input.delivery.address || "",
      local_area: input.delivery.suburb || "",
      city: input.delivery.city || "",
      zone: input.delivery.province || "",
      country: "ZA",
      code: input.delivery.postalCode || "",
    },
    items: bobItems,
    declared_value: input.orderTotalCents / 100,
    order_total_price: input.orderTotalCents / 100,
    handling_time: Number(settings.handling_time_days ?? 5),
    delivery_type: ["door"],
  };

  const response = await fetch(`${bobGoBaseUrl(settings.bobgo_environment)}/rates-at-checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  const result = await response.json().catch(() => null) as { rates?: BobGoCheckoutRate[] | null; message?: string; error?: string } | null;
  if (!response.ok) {
    console.error("Bob Go checkout rate request failed", { status: response.status, message: result?.message ?? result?.error });
    throw new ShippingConfigurationError("We couldn't retrieve a delivery quote right now. Please try again shortly.");
  }

  const rates = (result?.rates ?? []).filter((rate) => rate.type === "door" && Number.isFinite(rate.total_price) && rate.total_price >= 0);
  if (!rates.length) throw new ShippingConfigurationError("Bob Go has no standard delivery service available for this address. Please check the address or contact Funkful.");

  const serviceName = String(settings.standard_service_name ?? "").trim().toLowerCase();
  const standardMatches = serviceName ? rates.filter((rate) => rate.service_name.toLowerCase() === serviceName) : rates;
  if (!standardMatches.length) throw new ShippingConfigurationError("The configured standard delivery service is not available for this address. Please contact Funkful.");
  const selected = [...standardMatches].sort((a, b) => (a.service_level_priority ?? 999) - (b.service_level_priority ?? 999) || a.total_price - b.total_price)[0];
  return { rate: selected, settings };
}
