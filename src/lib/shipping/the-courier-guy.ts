import type { SupabaseClient } from "@supabase/supabase-js";

export type ShippingAddressInput = {
  streetAddress?: string; suburb?: string; city?: string; province?: string; postalCode?: string;
  firstName?: string; lastName?: string; phone?: string; email?: string;
};
export type Locker = {
  code: string; name: string; latitude: string; longitude: string; address: string;
  type?: { id: number; name: string }; place?: { town?: string; postalCode?: string };
  openinghours?: Array<{ day: string; open_time: string; close_time: string }>;
  lstTypesBoxes?: Array<{ name: string; width: number; height: number; length: number; weight: number }>;
};
export type CourierGuyRate = {
  rate: string | number; rate_revision_id?: number;
  service_level: { id: number; code: string; name: string; description?: string; delivery_date_from?: string; delivery_date_to?: string; dimensions?: { width: number; height: number; length: number; weight: number } };
};
export class ShippingConfigurationError extends Error {}

const shipLogicBase = () => (process.env.TCG_SHIPLOGIC_BASE_URL || "https://api.portal.thecourierguy.co.za").replace(/\/$/, "");
const pudoBase = () => (process.env.TCG_PUDO_BASE_URL || "https://wqvdmjybt6.execute-api.af-south-1.amazonaws.com").replace(/\/$/, "");
const pudoWaybillBase = () => (process.env.TCG_PUDO_WAYBILL_BASE_URL || "https://wqvdmjybt6.execute-api.af-south-1.amazonaws.com").replace(/\/$/, "");
function pudoUrl(path: string) {
  const url = new URL(`${pudoBase()}${path}`);
  const key = process.env.TCG_PUDO_API_KEY;
  if (key) url.searchParams.set("api_key", key);
  return url;
}
async function pudoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!process.env.TCG_PUDO_API_KEY) throw new ShippingConfigurationError("The Courier Guy Locker API is not configured yet.");
  const response = await fetch(pudoUrl(path), { ...init, cache: "no-store", signal: AbortSignal.timeout(25000), headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("The Courier Guy Locker API request failed", { path, status: response.status });
    throw new ShippingConfigurationError("Locker delivery is temporarily unavailable. Please try again or choose door-to-door delivery.");
  }
  return payload as T;
}

export async function getParcelPayload(admin: SupabaseClient, items: Array<{ id: string; quantity: number; unitPriceCents: number }>) {
  const [{ data: products, error: productError }] = await Promise.all([
    admin.from("products").select("id,name,brand,shipping_profile_code").in("id", [...new Set(items.map((item) => item.id))]),
  ]);
  if (productError) throw new ShippingConfigurationError("Could not load product packaging settings.");
  const productById = new Map((products ?? []).map((p) => [p.id, p] as const));
  const profileCodes = [...new Set((products ?? []).map((p) => p.shipping_profile_code).filter((v): v is string => Boolean(v)))];
  if (!profileCodes.length || (products ?? []).some((p) => !p.shipping_profile_code)) throw new ShippingConfigurationError("Some products still need packaging measurements. Please contact Funkful.");
  const { data: profiles, error } = await admin.from("shipping_parcel_profiles").select("code,name,length_cm,width_cm,height_cm,weight_kg,is_active").in("code", [...profileCodes, ...(profileCodes.length > 1 ? ["mixed_order_box"] : [])]).eq("is_active", true);
  if (error) throw new ShippingConfigurationError("Could not load parcel measurements.");
  const byCode = new Map((profiles ?? []).map((p) => [p.code, p] as const));
  const rows = items.map((item) => {
    const product = productById.get(item.id); const profile = product?.shipping_profile_code ? byCode.get(product.shipping_profile_code) : null;
    if (!product || !profile?.length_cm || !profile.width_cm || !profile.height_cm || !profile.weight_kg) throw new ShippingConfigurationError(`Packaging measurements are incomplete for ${product?.name ?? "a product"}.`);
    return { item, product, profile };
  });
  const distinct = new Set(rows.map((r) => r.profile.code));
  if (distinct.size > 1) {
    const p = byCode.get("mixed_order_box");
    if (!p?.length_cm || !p.width_cm || !p.height_cm || !p.weight_kg) throw new ShippingConfigurationError("The mixed-order parcel profile needs complete measurements.");
    return [{ parcel_description: "Funkful mixed-order parcel", submitted_length_cm: Number(p.length_cm), submitted_width_cm: Number(p.width_cm), submitted_height_cm: Number(p.height_cm), submitted_weight_kg: Number(p.weight_kg), packaging: p.name }];
  }
  return rows.map(({ item, product, profile }) => ({ parcel_description: `${product.name} (${item.quantity})`, submitted_length_cm: Number(profile.length_cm), submitted_width_cm: Number(profile.width_cm), submitted_height_cm: Number(profile.height_cm), submitted_weight_kg: Number(profile.weight_kg) * item.quantity, packaging: profile.name }));
}

export async function getCollectionAddress(admin: SupabaseClient) {
  const { data, error } = await admin.from("shipping_settings").select("collection_company,collection_street_address,collection_local_area,collection_city,collection_province,collection_postal_code,collection_contact_name,collection_contact_phone,collection_contact_email").eq("id", 1).single();
  if (error || !data) throw new ShippingConfigurationError("Funkful collection address is not configured.");
  return {
    type: "business", company: data.collection_company || "Funkful", street_address: data.collection_street_address,
    local_area: data.collection_local_area, suburb: data.collection_local_area, city: data.collection_city,
    zone: data.collection_province, country: "South Africa", code: data.collection_postal_code || "",
    entered_address: [data.collection_street_address, data.collection_local_area, data.collection_city, data.collection_postal_code].filter(Boolean).join(", "),
  };
}

export async function getStandardRates(admin: SupabaseClient, delivery: ShippingAddressInput, items: Array<{ id: string; quantity: number; unitPriceCents: number }>, orderTotalCents: number) {
  const token = process.env.TCG_SHIPLOGIC_API_KEY;
  if (!token) throw new ShippingConfigurationError("The Courier Guy Standard API is not configured.");
  const [collection, parcels] = await Promise.all([getCollectionAddress(admin), getParcelPayload(admin, items)]);
  const payload = { collection_address: collection, delivery_address: { type: "residential", street_address: delivery.streetAddress || "", local_area: delivery.suburb || "", suburb: delivery.suburb || "", city: delivery.city || "", zone: delivery.province || "", country: "ZA", code: delivery.postalCode || "", entered_address: [delivery.streetAddress, delivery.suburb, delivery.city, delivery.province, delivery.postalCode, "South Africa"].filter(Boolean).join(", ") }, parcels, declared_value: orderTotalCents / 100, opt_in_rates: [], opt_in_time_based_rates: [] };
  const response = await fetch(`${shipLogicBase()}/rates`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(25000) });
  const result = await response.json().catch(() => null) as { rates?: CourierGuyRate[]; message?: string } | null;
  if (!response.ok) { console.error("The Courier Guy Standard rate request failed", response.status); throw new ShippingConfigurationError("We couldn't retrieve a door-to-door quote. Please try again."); }
  const rates = (result?.rates ?? []).filter((r) => Number.isFinite(Number(r.rate)) && r.service_level?.code);
  if (!rates.length) throw new ShippingConfigurationError("No door-to-door services are available for this address.");
  const preferred = String((await admin.from("shipping_settings").select("standard_service_name").eq("id", 1).single()).data?.standard_service_name ?? "").trim().toLowerCase();
  const matches = preferred ? rates.filter((r) => r.service_level.name.toLowerCase() === preferred || r.service_level.code.toLowerCase() === preferred) : rates;
  if (!matches.length) throw new ShippingConfigurationError("The configured standard delivery service is not available for this address. Update the preferred service in shipping settings.");
  return { rate: [...matches].sort((a, b) => Number(a.rate) - Number(b.rate))[0] };
}

const PUBLIC_PUDO_LOCKERS_URL = "https://api-pudo.co.za/api/v1/guest/lockers-data";

async function fetchPublicLockerDirectory(): Promise<Locker[]> {
  // The public directory is a separate guest endpoint. It does not use the
  // authenticated shipment/rates API host or require an API key.
  const response = await fetch(PUBLIC_PUDO_LOCKERS_URL, {
    headers: { Accept: "application/json" },
    cache: "force-cache",
    next: { revalidate: 43200 },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Public PUDO locker directory returned HTTP ${response.status}`);
  }
  const payload = await response.json() as Locker[] | { data?: Locker[]; lockers?: Locker[] };
  const lockers = Array.isArray(payload) ? payload : (payload.data ?? payload.lockers ?? []);
  if (!Array.isArray(lockers) || lockers.length === 0) {
    throw new Error("Public PUDO locker directory returned no locker records");
  }
  return lockers;
}

export async function searchLockers(search: string) {
  let data: Locker[];
  try {
    data = await fetchPublicLockerDirectory();
  } catch (publicError) {
    // Backwards-compatible fallback for accounts/environments where the
    // authenticated production directory endpoint is enabled.
    console.warn("Public PUDO locker directory unavailable; trying authenticated directory endpoint", {
      message: publicError instanceof Error ? publicError.message : "Unknown error",
    });
    data = await pudoRequest<Locker[]>("/lockers-data");
  }
  const term = search.trim().toLowerCase();
  return data.filter((locker) => locker.code && locker.name && (!term || [locker.code, locker.name, locker.address, locker.place?.town, locker.place?.postalCode].some((v) => String(v ?? "").toLowerCase().includes(term)))).slice(0, 40);
}

export async function getLockerRates(admin: SupabaseClient, lockerCode: string, items: Array<{ id: string; quantity: number; unitPriceCents: number }>) {
  const [collection, parcels] = await Promise.all([getCollectionAddress(admin), getParcelPayload(admin, items)]);
  const requiredDimensions = [
    Math.max(...parcels.map((p) => Number(p.submitted_length_cm))),
    Math.max(...parcels.map((p) => Number(p.submitted_width_cm))),
    Math.max(...parcels.map((p) => Number(p.submitted_height_cm))),
  ].sort((a, b) => b - a);
  const requiredWeight = parcels.reduce((sum, p) => sum + Number(p.submitted_weight_kg), 0);
  const result = await pudoRequest<{ rates?: CourierGuyRate[] }>("/rates", { method: "POST", body: JSON.stringify({ collection_address: { ...collection, type: "residential" }, delivery_address: { terminal_id: lockerCode }, opt_in_rates: [], opt_in_time_based_rates: [] }) });
  const rates = (result.rates ?? []).filter((r) => {
    const d = r.service_level?.dimensions;
    if (!Number.isFinite(Number(r.rate)) || !r.service_level?.code || !d) return false;
    const available = [Number(d.length), Number(d.width), Number(d.height)].sort((a, b) => b - a);
    return requiredDimensions.every((value, index) => value <= available[index]) && requiredWeight <= Number(d.weight);
  });
  if (!rates.length) throw new ShippingConfigurationError("The selected locker does not have a compartment large enough for this parcel. Choose another locker or use door-to-door delivery.");
  return { rate: [...rates].sort((a, b) => Number(a.rate) - Number(b.rate))[0] };
}

export async function createLockerShipment(input: { shipmentId: string; lockerCode: string; serviceLevelCode: string; rateRevisionId?: number | null; collectionAddress: Record<string, unknown>; collectionContact: { name: string; email: string; phone: string }; customer: { name: string; email: string; phone: string } }) {
  return pudoRequest<Record<string, unknown>>("/shipments", { method: "POST", body: JSON.stringify({
    collection_address: { ...input.collectionAddress, type: "residential" },
    delivery_address: { terminal_id: input.lockerCode },
    collection_contact: { name: input.collectionContact.name, email: input.collectionContact.email, mobile_number: input.collectionContact.phone },
    delivery_contact: { name: input.customer.name, email: input.customer.email, mobile_number: input.customer.phone },
    opt_in_rates: [], opt_in_time_based_rates: [], service_level_code: input.serviceLevelCode,
    ...(input.rateRevisionId ? { rate_revision_id: input.rateRevisionId } : {}),
  }) });
}
export async function getLockerWaybill(shipmentId: string) {
  const key = process.env.TCG_PUDO_API_KEY;
  if (!key) throw new ShippingConfigurationError("The Courier Guy Locker API is not configured yet.");
  const url = new URL(`${pudoWaybillBase()}/generate/waybill/${encodeURIComponent(shipmentId)}`);
  url.searchParams.set("api_key", key);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(25000), headers: { Accept: "application/json" } });
  const result = await response.json().catch(() => null) as { url?: string; filename?: string } | null;
  if (!response.ok || !result?.url) throw new ShippingConfigurationError("The shipment was created, but the waybill is not available yet.");
  return result;
}
