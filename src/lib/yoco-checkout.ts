// src/lib/yoco-checkout.ts
//
// Server-only helpers for talking to the Yoco Checkout API safely.
//
// Double-charge protection comes from three layers working together:
//   1. One open order per identical cart (checkout_key + unique partial index).
//   2. One Yoco checkout per order, created with an Idempotency-Key so a retried
//      request (timeout, dropped connection) returns the SAME checkout.
//   3. The verified payment.succeeded webhook is the only thing that marks an
//      order paid, and finalize_paid_order() is idempotent.

import { createHash } from "crypto";

const YOCO_API = "https://payments.yoco.com/api";

function minutesFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * How long an unpaid order's Yoco checkout is reused before we start fresh.
 * Yoco's checkout expiry is not documented in the pages this was built from, so
 * this is deliberately conservative and configurable.
 */
export const CHECKOUT_REUSE_WINDOW_MS =
  minutesFromEnv("YOCO_CHECKOUT_REUSE_MINUTES", 30) * 60 * 1000;

/**
 * If the same basket was PAID within this window, a new checkout attempt is
 * treated as a duplicate and sent to the existing order instead of charging again.
 */
export const RECENTLY_PAID_WINDOW_MS =
  minutesFromEnv("YOCO_RECENTLY_PAID_MINUTES", 10) * 60 * 1000;

export function isFresh(createdAt: string | null | undefined, windowMs = CHECKOUT_REUSE_WINDOW_MS) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && Date.now() - created < windowMs;
}

// ---------------------------------------------------------------------------
// Checkout key
// ---------------------------------------------------------------------------

export interface CheckoutKeyInput {
  userId: string | null;
  email: string;
  items: Array<{
    product_id: string;
    variant?: string | null;
    personalization_text?: string | null;
    unit_price_cents: number;
    quantity: number;
  }>;
  shipping: Record<string, string>;
  promoCode: string | null;
  totalCents: number;
}

/** Same basket + same customer + same delivery details => same key. */
export function buildCheckoutKey(input: CheckoutKeyInput): string {
  const items = input.items
    .map((item) => [
      item.product_id,
      item.variant ?? "",
      item.personalization_text ?? "",
      item.unit_price_cents,
      item.quantity,
    ])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  const shipping = Object.keys(input.shipping)
    .sort()
    .map((key) => [key, input.shipping[key]]);

  const canonical = JSON.stringify({
    u: input.userId ?? "",
    e: input.email.toLowerCase(),
    i: items,
    s: shipping,
    p: input.promoCode ?? "",
    t: input.totalCents,
  });

  return createHash("sha256").update(canonical).digest("hex");
}

// ---------------------------------------------------------------------------
// Create checkout (idempotent)
// ---------------------------------------------------------------------------

export interface YocoLineItem {
  displayName: string;
  quantity: number;
  pricingDetails: { price: number };
}

/**
 * Yoco rejects a re-used Idempotency-Key whose body differs from the original
 * (HTTP 422), so line items must serialise identically on every attempt. Always
 * run them through this before building the request body.
 */
export function sortYocoLineItems(items: YocoLineItem[]): YocoLineItem[] {
  return [...items].sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName) ||
      a.pricingDetails.price - b.pricingDetails.price ||
      a.quantity - b.quantity,
  );
}

export type YocoCheckoutResult =
  | { ok: true; id: string; redirectUrl: string }
  | {
      ok: false;
      /**
       * true  = outcome unknown (timeout, network, 5xx). Yoco MAY have created a
       *         checkout, so the caller must keep the order open and retry later
       *         with the same idempotency key. Never cancel on this.
       * false = Yoco definitively refused (4xx) or replayed a stored failure, so
       *         no payable checkout exists and the order can be released.
       */
      retryable: boolean;
      status?: number;
      message: string;
    };

const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 7000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createYocoCheckout(
  secretKey: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<YocoCheckoutResult> {
  const payload = JSON.stringify(body);
  let last: YocoCheckoutResult = { ok: false, retryable: true, message: "Yoco did not respond." };

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(400 * attempt);

    try {
      const res = await fetch(`${YOCO_API}/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secretKey}`,
          // Same key on every attempt: if an earlier attempt actually reached
          // Yoco, we get that checkout back instead of creating a second one.
          "Idempotency-Key": idempotencyKey,
        },
        body: payload,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });

      const text = await res.text();
      const replayed = res.headers.get("Idempotent-Replayed") === "true";

      if (res.ok) {
        let data: { id?: unknown; redirectUrl?: unknown } = {};
        try { data = JSON.parse(text); } catch { /* handled below */ }
        if (typeof data.id === "string" && typeof data.redirectUrl === "string") {
          return { ok: true, id: data.id, redirectUrl: data.redirectUrl };
        }
        // 2xx with an unusable body: outcome unknown, retry with the same key.
        last = { ok: false, retryable: true, status: res.status, message: "Yoco returned an unreadable response." };
        continue;
      }

      console.error("Yoco checkout creation failed:", { status: res.status, replayed, attempt, body: text.slice(0, 500) });

      // Yoco replays the stored result of a key, failures included, for 24h.
      // Retrying a replayed failure can never succeed, so stop and let the
      // caller release the order (the next attempt gets a fresh order and key).
      if (replayed) return { ok: false, retryable: false, status: res.status, message: "Yoco replayed an earlier failure." };

      // 409: the same key is still being processed. 429/5xx: transient.
      if (res.status === 409 || res.status === 429 || res.status >= 500) {
        last = { ok: false, retryable: true, status: res.status, message: `Yoco responded ${res.status}.` };
        continue;
      }

      // Other 4xx (bad key, 422 body mismatch, validation): definitive.
      return { ok: false, retryable: false, status: res.status, message: `Yoco rejected the checkout (${res.status}).` };
    } catch (error) {
      // Timeout / dropped connection: we cannot know whether Yoco created it.
      console.error("Yoco checkout request error:", { attempt, error });
      last = { ok: false, retryable: true, message: "Could not reach Yoco." };
    }
  }

  return last;
}

// ---------------------------------------------------------------------------
// Refund (used only for duplicate-payment recovery)
// ---------------------------------------------------------------------------

export async function refundYocoCheckout(secretKey: string, checkoutId: string) {
  try {
    const res = await fetch(`${YOCO_API}/checkouts/${encodeURIComponent(checkoutId)}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
        "Idempotency-Key": `funkful-refund-${checkoutId}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
  } catch (error) {
    return { ok: false, status: 0, body: error instanceof Error ? error.message : "Refund request failed." };
  }
}
