import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type QuoteLine = { description: string; quantity: number; unitPriceCents: number; details?: string };
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const money = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : -1;
function quoteNumber() {
  const date = new Date();
  return `FNK-${date.getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function GET() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("custom_quotes").select("id,quote_number,customer_name,customer_email,customer_phone,total_cents,status,expires_at,created_at,public_token,order_id").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load quotations." }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const customerName = clean(body.customerName);
  const customerEmail = clean(body.customerEmail).toLowerCase();
  const customerPhone = clean(body.customerPhone);
  const notes = clean(body.notes);
  const shippingCents = money(body.shippingCents ?? 0);
  const lines = body.items;
  if (!customerName || !Array.isArray(lines) || lines.length < 1 || lines.length > 30 || shippingCents < 0) {
    return NextResponse.json({ error: "Add a customer name and at least one valid line item." }, { status: 400 });
  }
  if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) return NextResponse.json({ error: "Enter a valid customer email." }, { status: 400 });
  const items: QuoteLine[] = [];
  for (const raw of lines) {
    if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Invalid quotation item." }, { status: 400 });
    const row = raw as Record<string, unknown>;
    const description = clean(row.description);
    const quantity = row.quantity;
    const unitPriceCents = money(row.unitPriceCents);
    const details = clean(row.details);
    if (!description || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 100 || unitPriceCents < 0) {
      return NextResponse.json({ error: "Each item needs a description, quantity and non-negative price." }, { status: 400 });
    }
    items.push({ description, quantity, unitPriceCents, ...(details ? { details } : {}) });
  }
  const subtotalCents = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const totalCents = subtotalCents + shippingCents;
  if (!Number.isSafeInteger(totalCents) || totalCents < 200) return NextResponse.json({ error: "Quotation total must be at least R2.00." }, { status: 400 });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin.from("custom_quotes").insert({
    quote_number: quoteNumber(), public_token: token, customer_name: customerName,
    customer_email: customerEmail || null, customer_phone: customerPhone || null,
    line_items: items, subtotal_cents: subtotalCents, shipping_cents: shippingCents,
    total_cents: totalCents, notes: notes || null, status: "sent", expires_at: expiresAt,
    created_by: user.id,
  }).select("id,quote_number,public_token,total_cents,expires_at").single();
  if (error || !data) {
    console.error("Custom quote create failed:", error);
    return NextResponse.json({ error: "Could not create quotation. Confirm the custom_quotes migration has been applied." }, { status: 500 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://funkful.co.za";
  return NextResponse.json({ quote: { ...data, url: `${siteUrl}/quote/${data.public_token}` } }, { status: 201 });
}
