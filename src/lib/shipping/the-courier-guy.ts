// The Courier Guy — unified API client (https://api.portal.thecourierguy.co.za).
//
// One host, one Bearer token, for everything: door-to-door, lockers, kiosks/counters and
// pickup points. Pickup points are addressed by `delivery_pickup_point_id` on /rates and
// /shipments, and listed from GET /pickup-points. The old standalone PUDO API lives on
// untouched in ./the-courier-guy-pudo-legacy.ts and is no longer used.
//
// Environment (server-only):
//   TCG_API_KEY               Bearer token. Falls back to TCG_SHIPLOGIC_API_KEY (already set in Vercel).
//   TCG_API_BASE_URL          Default https://api.portal.thecourierguy.co.za. Falls back to
//                             TCG_SHIPLOGIC_BASE_URL. Use https://api.shiplogic.com for the sandbox.
//   TCG_TRACKING_URL_TEMPLATE Optional public tracking link, e.g. https://…/track?ref={ref}
//   TCG_MUTE_NOTIFICATIONS    "true" stops The Courier Guy sending its own SMS/email to the customer.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ShippingAddressInput = {
  streetAddress?: string; suburb?: string; city?: string; province?: string; postalCode?: string;
  firstName?: string; lastName?: string; phone?: string; email?: string;
};

/** Pickup point types accepted by GET /pickup-points?type= */
export type PickupPointType = "locker" | "counter" | "point";

/**
 * A pickup point as the checkout UI consumes it. The field names (code, latitude, openinghours…)
 * are unchanged from the PUDO era so the checkout page keeps working; `code` is now the
 * unified API's pickup point id (what /rates and /shipments call `delivery_pickup_point_id`).
 */
export type Locker = {
  code: string; name: string; latitude: string; longitude: string; address: string;
  type?: string; place?: { town?: string; postalCode?: string };
  openinghours?: Array<{ day: string; open_time: string; close_time: string }>;
};

export type CourierGuyRate = {
  rate: string | number; rate_revision_id?: number;
  service_level: { id: number; code: string; name: string; description?: string; delivery_date_from?: string; delivery_date_to?: string; dimensions?: { width: number; height: number; length: number; weight: number } };
};

export type OrderItemInput = { id: string; quantity: number; unitPriceCents: number };

export type Parcel = {
  parcel_description: string;
  submitted_length_cm: number; submitted_width_cm: number; submitted_height_cm: number; submitted_weight_kg: number;
  packaging?: string;
};

export class ShippingConfigurationError extends Error {}

/** Thrown for any non-2xx answer from the API. Never shown to customers directly. */
export class CourierGuyApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

// ───────────────────────────── HTTP ─────────────────────────────

function apiBase() {
  return (process.env.TCG_API_BASE_URL || process.env.TCG_SHIPLOGIC_BASE_URL || "https://api.portal.thecourierguy.co.za").replace(/\/$/, "");
}
function apiToken() {
  const token = process.env.TCG_API_KEY || process.env.TCG_SHIPLOGIC_API_KEY;
  if (!token) throw new ShippingConfigurationError("The Courier Guy API is not configured.");
  return token;
}

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  /** Seconds to cache the response in Next's data cache. Omit for no caching. */
  revalidate?: number;
};

async function courierGuyRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${apiBase()}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? 25000),
    ...(options.revalidate ? { next: { revalidate: options.revalidate } } : { cache: "no-store" as const }),
  });

  // Some errors come back as plain text rather than JSON, so read text first.
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { /* plain-text error body */ }

  if (!response.ok) {
    const fromJson = payload && typeof payload === "object"
      ? str((payload as Record<string, unknown>).message) || str((payload as Record<string, unknown>).error)
      : "";
    const message = fromJson || text.slice(0, 300) || `HTTP ${response.status}`;
    console.error("The Courier Guy API request failed", { method: options.method ?? "GET", path, status: response.status, message });
    throw new CourierGuyApiError(response.status, message);
  }
  return payload as T;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

// ───────────────────────────── Parcels & addresses ─────────────────────────────

export async function getParcelPayload(admin: SupabaseClient, items: OrderItemInput[]): Promise<Parcel[]> {
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

/**
 * Pickup point shipments may only contain ONE parcel ("Pickup point shipments can only have
 * one parcel"). Several parcels are merged conservatively: the largest length and width,
 * heights stacked, weights added.
 */
export function collapseToSingleParcel(parcels: Parcel[]): Parcel[] {
  if (parcels.length <= 1) return parcels;
  const round = (n: number) => Math.round(n * 10) / 10;
  return [{
    parcel_description: "Funkful order",
    submitted_length_cm: round(Math.max(...parcels.map((p) => p.submitted_length_cm))),
    submitted_width_cm: round(Math.max(...parcels.map((p) => p.submitted_width_cm))),
    submitted_height_cm: round(parcels.reduce((sum, p) => sum + p.submitted_height_cm, 0)),
    submitted_weight_kg: round(parcels.reduce((sum, p) => sum + p.submitted_weight_kg, 0)),
  }];
}

/** Strips internal-only fields before a parcel is sent to the API. */
function apiParcels(parcels: Parcel[]) {
  return parcels.map(({ parcel_description, submitted_length_cm, submitted_width_cm, submitted_height_cm, submitted_weight_kg }) => ({
    parcel_description,
    submitted_length_cm,
    submitted_width_cm,
    submitted_height_cm,
    submitted_weight_kg,
  }));
}

export async function getCollectionAddress(admin: SupabaseClient) {
  const { data, error } = await admin.from("shipping_settings").select("collection_company,collection_street_address,collection_local_area,collection_city,collection_province,collection_postal_code,collection_contact_name,collection_contact_phone,collection_contact_email").eq("id", 1).single();
  if (error || !data) throw new ShippingConfigurationError("Funkful collection address is not configured.");
  return {
    type: "business", company: data.collection_company || "Funkful", street_address: data.collection_street_address,
    local_area: data.collection_local_area, suburb: data.collection_local_area, city: data.collection_city,
    zone: data.collection_province, country: "ZA", code: data.collection_postal_code || "",
    entered_address: [data.collection_street_address, data.collection_local_area, data.collection_city, data.collection_postal_code].filter(Boolean).join(", "),
  };
}

function doorDeliveryAddress(delivery: ShippingAddressInput) {
  return {
    type: "residential", street_address: delivery.streetAddress || "", local_area: delivery.suburb || "", suburb: delivery.suburb || "",
    city: delivery.city || "", zone: delivery.province || "", country: "ZA", code: delivery.postalCode || "",
    entered_address: [delivery.streetAddress, delivery.suburb, delivery.city, delivery.province, delivery.postalCode, "South Africa"].filter(Boolean).join(", "),
  };
}

/** The API validates mobile numbers, so send E.164 for South African numbers and drop anything unusable. */
export function normalisePhone(value: string | null | undefined): string | undefined {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{9,15}$/.test(digits)) return digits;
  const plain = digits.replace(/\D/g, "");
  if (/^0\d{9}$/.test(plain)) return `+27${plain.slice(1)}`;
  if (/^27\d{9}$/.test(plain)) return `+${plain}`;
  return undefined;
}

// ───────────────────────────── Rates ─────────────────────────────

function cheapest(rates: CourierGuyRate[]) {
  return [...rates].sort((a, b) => Number(a.rate) - Number(b.rate))[0];
}
function usable(rates: CourierGuyRate[] | undefined) {
  return (rates ?? []).filter((r) => Number.isFinite(Number(r.rate)) && r.service_level?.code);
}

/** Door-to-door rates. Returns the preferred (or cheapest) service level. */
export async function getStandardRates(admin: SupabaseClient, delivery: ShippingAddressInput, items: OrderItemInput[], orderTotalCents: number) {
  const [collection, parcels] = await Promise.all([getCollectionAddress(admin), getParcelPayload(admin, items)]);
  let result: { rates?: CourierGuyRate[] } | null;
  try {
    result = await courierGuyRequest<{ rates?: CourierGuyRate[] }>("/rates", {
      method: "POST",
      body: { collection_address: collection, delivery_address: doorDeliveryAddress(delivery), parcels: apiParcels(parcels), declared_value: orderTotalCents / 100, opt_in_rates: [], opt_in_time_based_rates: [] },
    });
  } catch (error) {
    if (error instanceof ShippingConfigurationError) throw error;
    throw new ShippingConfigurationError("We couldn't retrieve a door-to-door quote. Please try again.");
  }
  const rates = usable(result?.rates);
  if (!rates.length) throw new ShippingConfigurationError("No door-to-door services are available for this address.");
  const preferred = String((await admin.from("shipping_settings").select("standard_service_name").eq("id", 1).single()).data?.standard_service_name ?? "").trim().toLowerCase();
  const matches = preferred ? rates.filter((r) => r.service_level.name.toLowerCase() === preferred || r.service_level.code.toLowerCase() === preferred) : rates;
  if (!matches.length) throw new ShippingConfigurationError("The configured standard delivery service is not available for this address. Update the preferred service in shipping settings.");
  return { rate: cheapest(matches) };
}

/**
 * Rates for delivery to a locker, kiosk/counter or pickup point.
 * Pickup point rates take a single parcel, no declared value and no opt-in rates.
 */
export async function getPickupPointRates(admin: SupabaseClient, pickupPointId: string, items: OrderItemInput[]) {
  const [collection, allParcels] = await Promise.all([getCollectionAddress(admin), getParcelPayload(admin, items)]);
  const parcels = collapseToSingleParcel(allParcels);
  let result: { rates?: CourierGuyRate[] } | null;
  try {
    result = await courierGuyRequest<{ rates?: CourierGuyRate[] }>("/rates", {
      method: "POST",
      body: { collection_address: collection, delivery_pickup_point_id: pickupPointId, parcels: apiParcels(parcels) },
    });
  } catch (error) {
    if (error instanceof ShippingConfigurationError) throw error;
    if (error instanceof CourierGuyApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 403 && error.status !== 429) {
      throw new ShippingConfigurationError("That pickup point can't take your parcel. Choose another pickup point or use door-to-door delivery.");
    }
    throw new ShippingConfigurationError("Pickup point delivery is temporarily unavailable. Please try again or choose door-to-door delivery.");
  }
  // The API already rates against the parcel we sent; if it also reports compartment
  // dimensions for a service level, double-check the parcel fits.
  const parcel = parcels[0];
  const need = [parcel.submitted_length_cm, parcel.submitted_width_cm, parcel.submitted_height_cm].sort((a, b) => b - a);
  const rates = usable(result?.rates).filter((r) => {
    const d = r.service_level.dimensions;
    if (!d || ![d.length, d.width, d.height, d.weight].every((v) => Number(v) > 0)) return true;
    const have = [Number(d.length), Number(d.width), Number(d.height)].sort((a, b) => b - a);
    return need.every((value, index) => value <= have[index]) && parcel.submitted_weight_kg <= Number(d.weight);
  });
  if (!rates.length) throw new ShippingConfigurationError("The selected pickup point does not have a compartment large enough for this parcel. Choose another pickup point or use door-to-door delivery.");
  return { rate: cheapest(rates) };
}
/** Same function under its pre-unification name, so existing callers keep working. */
export const getLockerRates = getPickupPointRates;

// ───────────────────────────── Pickup points ─────────────────────────────

const DIRECTORY_PAGE_SIZE = 500;
const DIRECTORY_MAX_PAGES = 30;
// A box around South Africa, so one paged query lists every pickup point.
const SOUTH_AFRICA_BOUNDS = { min_lat: -35.5, min_lng: 16, max_lat: -21.5, max_lng: 33.5 };

function normaliseHours(value: unknown): Locker["openinghours"] {
  if (!Array.isArray(value)) return undefined;
  const rows = value.flatMap((entry) => {
    const r = asRecord(entry);
    const day = str(r.day ?? r.weekday);
    const open = str(r.open_time ?? r.opens ?? r.open ?? r.from);
    const close = str(r.close_time ?? r.closes ?? r.close ?? r.to);
    return day && open && close ? [{ day, open_time: open, close_time: close }] : [];
  });
  return rows.length ? rows : undefined;
}

/** Maps one raw /pickup-points record onto the Locker shape. Tolerant of field-name variations. */
export function normalisePickupPoint(raw: unknown): Locker | null {
  const r = asRecord(raw);
  const address = asRecord(r.address);
  const code = str(r.id ?? r.code ?? r.pickup_point_id ?? r.terminal_id);
  const name = str(r.name ?? r.company ?? address.company);
  if (!code || !name) return null;

  const street = str(address.street_address ?? r.street_address);
  const area = str(address.local_area ?? r.local_area);
  const city = str(address.city ?? r.city);
  const postalCode = str(address.code ?? r.code_postal ?? r.postal_code);
  const fullAddress = typeof r.address === "string" && r.address.trim()
    ? r.address.trim()
    : str(address.entered_address) || [street, area, city, postalCode].filter(Boolean).join(", ");

  return {
    code, name, address: fullAddress,
    latitude: str(address.lat ?? r.lat ?? r.latitude),
    longitude: str(address.lng ?? r.lng ?? r.longitude),
    type: str(r.type ?? address.type) || undefined,
    place: { town: city || area || undefined, postalCode: postalCode || undefined },
    openinghours: normaliseHours(r.opening_hours ?? r.openinghours ?? r.operating_hours),
  };
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const r = asRecord(payload);
  for (const key of ["pickup_points", "data", "results", "items"]) if (Array.isArray(r[key])) return r[key] as unknown[];
  return [];
}

async function fetchPickupPointDirectory(type?: PickupPointType): Promise<Locker[]> {
  const byCode = new Map<string, Locker>();
  let previousFirst = "";
  for (let page = 0; page < DIRECTORY_MAX_PAGES; page += 1) {
    const payload = await courierGuyRequest<unknown>("/pickup-points", {
      query: { ...SOUTH_AFRICA_BOUNDS, type, limit: DIRECTORY_PAGE_SIZE, offset: page * DIRECTORY_PAGE_SIZE },
      revalidate: 43200, // the directory changes rarely; refresh twice a day
    });
    const rows = extractRows(payload);
    const first = str(asRecord(rows[0]).id ?? asRecord(rows[0]).code);
    if (page > 0 && first && first === previousFirst) break; // the API ignored `offset`; stop rather than loop
    previousFirst = first;
    for (const row of rows) { const point = normalisePickupPoint(row); if (point) byCode.set(point.code, point); }
    if (rows.length < DIRECTORY_PAGE_SIZE) break;
  }
  if (!byCode.size) throw new Error("The Courier Guy returned no pickup points");
  return [...byCode.values()];
}

/** Text search (name, code, address, town, postal code) across the cached pickup point directory. */
export async function searchLockers(search: string, type?: PickupPointType) {
  let directory: Locker[];
  try {
    directory = await fetchPickupPointDirectory(type);
  } catch (error) {
    if (error instanceof ShippingConfigurationError) throw error;
    throw new ShippingConfigurationError("Pickup points are temporarily unavailable. Please try again or choose door-to-door delivery.");
  }
  const term = search.trim().toLowerCase();
  return directory
    .filter((point) => !term || [point.code, point.name, point.address, point.place?.town, point.place?.postalCode].some((v) => String(v ?? "").toLowerCase().includes(term)))
    .slice(0, 40);
}

// ───────────────────────────── Shipments ─────────────────────────────

export type CreateShipmentInput = {
  /** Shown on the waybill and in The Courier Guy portal, e.g. the Funkful order number. */
  orderNumber: string;
  serviceLevelCode: string;
  collection: { address: Record<string, unknown>; contact: { name: string; email: string; phone: string } };
  recipient: { name: string; email: string; phone?: string | null };
  parcels: Parcel[];
  delivery:
    | { kind: "door"; address: ShippingAddressInput; declaredValueCents?: number }
    | { kind: "pickup_point"; pickupPointId: string };
  specialInstructionsDelivery?: string;
};

export type CreatedShipment = {
  shipmentId: string;
  trackingReference: string;
  status: string;
  raw: Record<string, unknown>;
};

function contact(c: { name: string; email: string; phone?: string | null }) {
  const mobile = normalisePhone(c.phone);
  return { name: c.name, email: c.email, ...(mobile ? { mobile_number: mobile } : {}) };
}

/**
 * Books a shipment. Uses service_level_code (not service_level_id) because ids belong to a
 * rate revision that expires after about 5 minutes, and bookings happen long after checkout.
 */
export async function createShipment(input: CreateShipmentInput): Promise<CreatedShipment> {
  const common = {
    collection_address: input.collection.address,
    collection_contact: contact(input.collection.contact),
    delivery_contact: contact(input.recipient),
    service_level_code: input.serviceLevelCode,
    customer_reference: input.orderNumber,
    customer_reference_name: "Order no.",
    mute_notifications: process.env.TCG_MUTE_NOTIFICATIONS === "true",
    ...(input.specialInstructionsDelivery ? { special_instructions_delivery: input.specialInstructionsDelivery } : {}),
  };

  const body = input.delivery.kind === "pickup_point"
    // Pickup point rules: one parcel, no declared value, no opt-in rates, no custom tracking reference.
    ? { ...common, delivery_pickup_point_id: input.delivery.pickupPointId, parcels: apiParcels(collapseToSingleParcel(input.parcels)) }
    : {
        ...common,
        delivery_address: doorDeliveryAddress(input.delivery.address),
        parcels: apiParcels(input.parcels),
        opt_in_rates: [], opt_in_time_based_rates: [],
        ...(input.delivery.declaredValueCents ? { declared_value: input.delivery.declaredValueCents / 100 } : {}),
      };

  let result: Record<string, unknown>;
  try {
    result = asRecord(await courierGuyRequest<unknown>("/shipments", { method: "POST", body }));
  } catch (error) {
    // The booking is a staff action, so surface the courier's own reason (e.g. "rate has expired",
    // "insufficient funds for the account") instead of a vague message.
    if (error instanceof CourierGuyApiError) throw new ShippingConfigurationError(`The Courier Guy rejected the booking: ${error.message}`);
    throw error;
  }

  const shipmentId = str(result.id);
  if (!shipmentId) throw new ShippingConfigurationError("The Courier Guy did not return a shipment ID. Check the courier portal before retrying, to avoid a duplicate booking.");
  return {
    shipmentId,
    trackingReference: str(result.custom_tracking_reference) || str(result.short_tracking_reference),
    status: str(result.status) || "submitted",
    raw: result,
  };
}

/** Signed URL of the waybill PDF. It expires after 24 hours, so fetch it fresh each time it's needed. */
export async function getShipmentLabelUrl(shipmentId: string): Promise<string> {
  let payload: unknown;
  try {
    payload = await courierGuyRequest<unknown>("/shipments/label", { query: { id: shipmentId } });
  } catch (error) {
    if (error instanceof ShippingConfigurationError) throw error;
    throw new ShippingConfigurationError("The waybill isn't available right now. Try again in a moment, or download it from the courier portal.");
  }
  const url = typeof payload === "string" ? payload.trim() : str(asRecord(payload).url ?? asRecord(payload).signed_url ?? asRecord(payload).label_url);
  if (!/^https?:\/\//.test(url)) throw new ShippingConfigurationError("The courier returned no waybill link. Download it from the courier portal instead.");
  return url;
}

/** Public tracking link for customers, from TCG_TRACKING_URL_TEMPLATE (use {ref}). Null when not configured. */
export function trackingUrlFor(trackingReference: string): string | null {
  const template = process.env.TCG_TRACKING_URL_TEMPLATE?.trim();
  if (!template || !trackingReference) return null;
  return template.replace("{ref}", encodeURIComponent(trackingReference));
}
