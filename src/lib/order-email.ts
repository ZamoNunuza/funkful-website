import { Resend } from "resend";
import { palette } from "@/lib/brands";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://funkful.co.za";
const FROM = process.env.ORDER_EMAIL_FROM || process.env.AUTH_EMAIL_FROM || "Funkful <orders@funkful.co.za>";
const ADMIN_TO = process.env.ORDER_NOTIFICATION_EMAIL || "";

export interface OrderEmailItem {
  product_name: string;
  variant?: string | null;
  quantity: number;
  unit_price_cents: number;
}

export interface OrderEmailOrder {
  id: string;
  order_number: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_province?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  promo_code?: string | null;
  // Set once the order has shipped (see sendOrderShipped).
  courier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
}

function money(cents: number) { return `R${(cents / 100).toFixed(2)}`; }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]!)); }

function shell(title: string, preview: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#171717"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:24px;overflow:hidden"><tr><td style="background:${palette.black};padding:28px 32px;text-align:center"><img src="${SITE_URL}/assets/funkful-logo.png" width="110" alt="Funkful" style="display:inline-block;max-width:110px;height:auto"><p style="margin:14px 0 0;color:${palette.gold};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${escapeHtml(title)}</p></td></tr><tr><td style="padding:32px">${body}</td></tr><tr><td style="padding:20px 32px;background:#faf8f4;text-align:center;color:#777;font-size:11px;line-height:1.6">Funkful · Personalized gifts, mystery scoops, and everything in between.<br><a href="${SITE_URL}" style="color:#171717">funkful.co.za</a></td></tr></table></td></tr></table></body></html>`;
}

function itemRows(items: OrderEmailItem[]) {
  return items.map((item) => `<tr><td style="padding:12px 0;border-bottom:1px solid #eee"><strong>${escapeHtml(item.product_name)}</strong>${item.variant ? `<div style="color:#777;font-size:12px;margin-top:3px">${escapeHtml(item.variant)}</div>` : ""}</td><td align="center" style="padding:12px 8px;border-bottom:1px solid #eee;font-size:13px">${item.quantity}</td><td align="right" style="padding:12px 0;border-bottom:1px solid #eee;font-weight:700">${money(item.unit_price_cents * item.quantity)}</td></tr>`).join("");
}

function address(order: OrderEmailOrder) {
  return [order.shipping_address, order.shipping_city, order.shipping_province, order.shipping_postal_code, order.shipping_country].filter(Boolean).map((v) => escapeHtml(String(v))).join("<br>");
}

export async function sendOrderConfirmation(order: OrderEmailOrder, items: OrderEmailItem[]) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set.");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const greeting = order.first_name ? `Hey ${escapeHtml(order.first_name)},` : "Hey there,";
  const html = shell("Order confirmed", `Thanks for your Funkful order ${order.order_number}.`, `<p style="font-size:16px;margin:0 0 10px">${greeting}</p><h1 style="font-size:28px;margin:0 0 12px;text-transform:uppercase">We got your order.</h1><p style="color:#666;line-height:1.6;margin:0 0 24px">Your payment has been confirmed and we're getting your order ready. Your order number is <strong>${escapeHtml(order.order_number)}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px"><thead><tr><th align="left" style="padding:10px 0;color:#777">Item</th><th style="color:#777">Qty</th><th align="right" style="color:#777">Total</th></tr></thead><tbody>${itemRows(items)}</tbody></table><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;font-size:14px"><tr><td style="padding:5px 0">Subtotal</td><td align="right">${money(order.subtotal_cents)}</td></tr>${order.discount_cents ? `<tr><td style="padding:5px 0">Discount${order.promo_code ? ` (${escapeHtml(order.promo_code)})` : ""}</td><td align="right">-${money(order.discount_cents)}</td></tr>` : ""}<tr><td style="padding:5px 0">Shipping</td><td align="right">${order.shipping_cents ? money(order.shipping_cents) : "Free"}</td></tr><tr><td style="border-top:2px solid #111;padding:12px 0;font-weight:800;font-size:17px">Total</td><td align="right" style="border-top:2px solid #111;padding:12px 0;font-weight:800;font-size:17px">${money(order.total_cents)}</td></tr></table><div style="margin-top:26px;background:#f4f1ea;border-radius:14px;padding:16px"><strong style="font-size:12px;text-transform:uppercase">Delivering to</strong><div style="font-size:13px;line-height:1.6;margin-top:6px">${address(order)}</div></div>`);
  return resend.emails.send({ from: FROM, to: order.email, subject: `Order ${order.order_number} confirmed 🎉`, html }, { idempotencyKey: `order-confirmation/${order.id}` });
}

export async function sendOrderNotification(order: OrderEmailOrder, items: OrderEmailItem[]) {
  if (!process.env.RESEND_API_KEY || !ADMIN_TO) return { skipped: true };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = shell("New paid order", `${order.order_number} · ${money(order.total_cents)}`, `<h1 style="font-size:26px;margin:0 0 10px;text-transform:uppercase">New paid order</h1><p style="color:#666;line-height:1.6">${escapeHtml(order.order_number)} has been paid. Customer: <strong>${escapeHtml([order.first_name, order.last_name].filter(Boolean).join(" ") || order.email)}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px"><tbody>${itemRows(items)}</tbody></table><p style="margin-top:20px;font-size:17px;font-weight:800">Total: ${money(order.total_cents)}</p><div style="margin-top:20px;background:#f4f1ea;border-radius:14px;padding:16px;font-size:13px;line-height:1.6">${address(order)}<br>${escapeHtml(order.email)}</div><p style="margin-top:24px"><a href="${SITE_URL}/admin/orders/${order.id}" style="display:inline-block;background:${palette.black};color:${palette.cream};padding:13px 20px;border-radius:999px;text-decoration:none;font-size:12px;font-weight:800;text-transform:uppercase">Open order</a></p>`);
  return resend.emails.send({ from: FROM, to: ADMIN_TO, subject: `New paid order · ${order.order_number}`, html }, { idempotencyKey: `order-admin/${order.id}` });
}

export async function sendPaymentFailedEmail(order: OrderEmailOrder) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set.");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = shell("Payment not completed", `Your payment for ${order.order_number} was not completed.`, `<h1 style="font-size:28px;margin:0 0 12px;text-transform:uppercase">Payment not completed</h1><p style="color:#666;line-height:1.6">We couldn't confirm payment for order <strong>${escapeHtml(order.order_number)}</strong>. Your bag is still available, so you can return to checkout and try again.</p><p style="margin-top:26px"><a href="${SITE_URL}/cart" style="display:inline-block;background:${palette.black};color:${palette.cream};padding:14px 22px;border-radius:999px;text-decoration:none;font-size:12px;font-weight:800;text-transform:uppercase">Return to bag</a></p>`);
  return resend.emails.send({ from: FROM, to: order.email, subject: `Payment not completed · ${order.order_number}`, html }, { idempotencyKey: `payment-failed/${order.id}` });
}

// ---------------------------------------------------------------------------
// Fulfilment emails: shipped + delivered
// ---------------------------------------------------------------------------

interface FulfilmentEmailOptions {
  /**
   * Manual "resend" from the admin page. Normally the Resend idempotency key
   * makes a repeat send a no-op; force gives it a fresh key so it really sends.
   */
  force?: boolean;
}

function itemSummary(items: OrderEmailItem[]) {
  return items.map((item) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px"><strong>${escapeHtml(item.product_name)}</strong>${item.variant ? `<div style="color:#777;font-size:12px;margin-top:3px">${escapeHtml(item.variant)}</div>` : ""}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;white-space:nowrap">× ${item.quantity}</td></tr>`).join("");
}

/** Only ever link to http(s) URLs, so a bad value can't become a javascript: link. */
function safeHttpUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function fulfilmentKey(prefix: string, order: OrderEmailOrder, options: FulfilmentEmailOptions) {
  return options.force ? `${prefix}/${order.id}/resend-${Date.now()}` : `${prefix}/${order.id}`;
}

function greetingFor(order: OrderEmailOrder) {
  return order.first_name ? `Hey ${escapeHtml(order.first_name)},` : "Hey there,";
}

export async function sendOrderShipped(order: OrderEmailOrder, items: OrderEmailItem[], options: FulfilmentEmailOptions = {}) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set.");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const courier = order.courier?.trim() || "";
  const trackUrl = safeHttpUrl(order.tracking_url);
  const hasTracking = Boolean(order.tracking_number || trackUrl);

  const trackingBlock = hasTracking
    ? `<div style="margin:0 0 24px;background:#f4f1ea;border-radius:14px;padding:16px"><strong style="font-size:12px;text-transform:uppercase">Tracking</strong><div style="font-size:14px;line-height:1.7;margin-top:6px">${courier ? `${escapeHtml(courier)}<br>` : ""}${order.tracking_number ? `Tracking number: <strong>${escapeHtml(order.tracking_number)}</strong>` : ""}</div>${trackUrl ? `<p style="margin:14px 0 0"><a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:${palette.black};color:${palette.cream};padding:13px 20px;border-radius:999px;text-decoration:none;font-size:12px;font-weight:800;text-transform:uppercase">Track your parcel</a></p>` : ""}</div>`
    : "";

  const html = shell(
    "Order shipped",
    `Order ${order.order_number} is on its way.`,
    `<p style="font-size:16px;margin:0 0 10px">${greetingFor(order)}</p><h1 style="font-size:28px;margin:0 0 12px;text-transform:uppercase">It&#39;s on its way.</h1><p style="color:#666;line-height:1.6;margin:0 0 24px">Good news — order <strong>${escapeHtml(order.order_number)}</strong> has been handed to ${courier ? escapeHtml(courier) : "our courier"} and is heading to you. Keep your phone handy in case the courier needs to reach you.</p>${trackingBlock}<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>${itemSummary(items)}</tbody></table><div style="margin-top:26px;background:#f4f1ea;border-radius:14px;padding:16px"><strong style="font-size:12px;text-transform:uppercase">Delivering to</strong><div style="font-size:13px;line-height:1.6;margin-top:6px">${address(order)}</div></div><p style="color:#777;font-size:12px;line-height:1.6;margin:22px 0 0">You can also follow this order any time from <a href="${SITE_URL}/account/orders/${escapeHtml(order.id)}" style="color:#171717">your Funkful account</a>.</p>`,
  );

  return resend.emails.send(
    { from: FROM, to: order.email, subject: `Order ${order.order_number} is on its way 🚚`, html },
    { idempotencyKey: fulfilmentKey("order-shipped", order, options) },
  );
}

export async function sendOrderDelivered(order: OrderEmailOrder, items: OrderEmailItem[], options: FulfilmentEmailOptions = {}) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set.");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = shell(
    "Order delivered",
    `Order ${order.order_number} has been delivered.`,
    `<p style="font-size:16px;margin:0 0 10px">${greetingFor(order)}</p><h1 style="font-size:28px;margin:0 0 12px;text-transform:uppercase">Delivered!</h1><p style="color:#666;line-height:1.6;margin:0 0 24px">Order <strong>${escapeHtml(order.order_number)}</strong> has been delivered. We hope you love it.</p><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>${itemSummary(items)}</tbody></table><p style="color:#666;font-size:13px;line-height:1.6;margin:24px 0 0">Something not right? Quote your order number and <a href="${SITE_URL}/contact" style="color:#171717">get in touch</a> — you can also read our <a href="${SITE_URL}/returns" style="color:#171717">returns information</a>.</p><p style="margin-top:26px"><a href="${SITE_URL}/originals" style="display:inline-block;background:${palette.black};color:${palette.cream};padding:14px 22px;border-radius:999px;text-decoration:none;font-size:12px;font-weight:800;text-transform:uppercase">Shop again</a></p>`,
  );

  return resend.emails.send(
    { from: FROM, to: order.email, subject: `Order ${order.order_number} has been delivered 🎁`, html },
    { idempotencyKey: fulfilmentKey("order-delivered", order, options) },
  );
}
