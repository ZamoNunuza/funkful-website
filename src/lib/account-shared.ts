// src/lib/account-shared.ts
//
// Pure helpers for the account area — no React, no Supabase, no `next/*`
// imports — so they can be used from server components, client components
// and server actions alike.

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatRands(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

/** e.g. "20 Sep 2026" — pinned to SAST so late-evening orders don't slip a day. */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}

// ---------------------------------------------------------------------------
// Order status
// ---------------------------------------------------------------------------

export type StatusTone = "success" | "info" | "warning" | "danger" | "neutral";

export interface OrderStatusMeta {
  label: string;
  tone: StatusTone;
  /** One friendly sentence for the order detail page. */
  description: string;
}

const SHIPPED = new Set(["shipped", "dispatched", "out_for_delivery", "in_transit"]);
const DELIVERED = new Set(["delivered", "completed", "fulfilled"]);

function norm(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Maps the raw `orders.status` / `orders.payment_status` pair to something a
 * customer understands. Unknown statuses fall back to a readable label rather
 * than breaking, so adding new fulfilment states later is safe.
 */
export function orderStatusMeta(status: string | null | undefined, paymentStatus: string | null | undefined): OrderStatusMeta {
  const s = norm(status);
  const p = norm(paymentStatus);

  if (p === "refunded" || s === "refunded") {
    return { label: "Refunded", tone: "neutral", description: "This order has been refunded." };
  }
  if (p === "failed") {
    return { label: "Payment failed", tone: "danger", description: "We couldn't confirm payment for this order." };
  }
  if (s === "cancelled" && p !== "paid") {
    return { label: "Cancelled", tone: "neutral", description: "This order was cancelled and you weren't charged." };
  }
  if (p !== "paid") {
    return {
      label: "Awaiting payment",
      tone: "warning",
      description: "We haven't received payment for this order yet. If you closed the payment window, your bag is still saved — you can check out again.",
    };
  }

  if (DELIVERED.has(s)) {
    return { label: "Delivered", tone: "success", description: "Your order has been delivered." };
  }
  if (SHIPPED.has(s)) {
    return { label: "Shipped", tone: "info", description: "Your order is on its way." };
  }
  if (s === "cancelled") {
    return { label: "Cancelled", tone: "neutral", description: "This order was cancelled." };
  }
  return { label: "Paid · preparing", tone: "success", description: "Payment received — we're getting your order ready." };
}

export const ORDER_STEPS = ["Placed", "Paid", "Shipped", "Delivered"] as const;

/**
 * Index into ORDER_STEPS for the progress tracker, or null when the order is
 * cancelled / failed / refunded and a tracker would be misleading.
 */
export function orderStage(status: string | null | undefined, paymentStatus: string | null | undefined): number | null {
  const s = norm(status);
  const p = norm(paymentStatus);
  if (p === "refunded" || p === "failed" || s === "refunded") return null;
  if (s === "cancelled") return null;
  if (p !== "paid") return 0;
  if (DELIVERED.has(s)) return 3;
  if (SHIPPED.has(s)) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;
export const MAX_ADDRESSES = 10;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt limit used by Supabase Auth

const PHONE_RE = /^(?:\+27|0)\d{9}$/;
const POSTAL_RE = /^\d{4}$/;

export function isValidSaPhone(phone: string) {
  return PHONE_RE.test(phone.replace(/[\s()-]/g, ""));
}

export function isValidPostalCode(code: string) {
  return POSTAL_RE.test(code);
}

/** Returns an error message, or null when the password is acceptable. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Include at least one letter and one number.";
  }
  return null;
}

export interface AddressInput {
  label: (typeof ADDRESS_LABELS)[number];
  firstName: string;
  lastName: string;
  phone: string;
  streetAddress: string;
  complexUnit: string;
  suburb: string;
  city: string;
  province: (typeof SA_PROVINCES)[number];
  postalCode: string;
  makeDefault: boolean;
}

function field(form: FormData, name: string, max = 120) {
  return String(form.get(name) ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

/** Validates the address form. Returns either `{ value }` or `{ error }`. */
export function parseAddressForm(form: FormData): { value: AddressInput } | { error: string } {
  const label = field(form, "label", 20);
  const firstName = field(form, "firstName", 60);
  const lastName = field(form, "lastName", 60);
  const phone = field(form, "phone", 20);
  const streetAddress = field(form, "streetAddress");
  const complexUnit = field(form, "complexUnit");
  const suburb = field(form, "suburb", 80);
  const city = field(form, "city", 80);
  const province = field(form, "province", 40);
  const postalCode = field(form, "postalCode", 10);

  if (!(ADDRESS_LABELS as readonly string[]).includes(label)) return { error: "Choose Home, Work or Other." };
  if (!firstName) return { error: "First name is required." };
  if (!lastName) return { error: "Last name is required." };
  if (!phone) return { error: "A phone number is required so the courier can reach you." };
  if (!isValidSaPhone(phone)) return { error: "Enter a valid South African phone number, e.g. 082 123 4567." };
  if (!streetAddress) return { error: "Street address is required." };
  if (!city) return { error: "City is required." };
  if (!(SA_PROVINCES as readonly string[]).includes(province)) return { error: "Choose a province." };
  if (!isValidPostalCode(postalCode)) return { error: "Postal code must be 4 digits." };

  return {
    value: {
      label: label as AddressInput["label"],
      firstName,
      lastName,
      phone,
      streetAddress,
      complexUnit,
      suburb,
      city,
      province: province as AddressInput["province"],
      postalCode,
      makeDefault: form.get("makeDefault") === "on",
    },
  };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// ---------------------------------------------------------------------------
// Shared row types (what the account pages read from Supabase)
// ---------------------------------------------------------------------------

export interface AddressRow {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  street_address: string;
  complex_unit: string | null;
  suburb: string | null;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

export const ADDRESS_COLUMNS =
  "id,label,first_name,last_name,phone,street_address,complex_unit,suburb,city,province,postal_code,is_default";

/** Single-line street string used to pre-fill checkout: "12 Vilakazi St, Unit 4, Orlando West". */
export function addressStreetLine(a: Pick<AddressRow, "street_address" | "complex_unit" | "suburb">) {
  return [a.street_address, a.complex_unit, a.suburb].filter(Boolean).join(", ");
}

export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  created_at: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  promo_code: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  // Optional — only present if you add these columns for fulfilment.
  tracking_number?: string | null;
  tracking_url?: string | null;
  courier?: string | null;
}

export interface OrderItemRow {
  order_id: string;
  product_id: string;
  product_name: string;
  brand: string | null;
  variant: string | null;
  personalization_text: string | null;
  unit_price_cents: number;
  quantity: number;
}
