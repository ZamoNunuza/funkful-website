import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/account-server";
import { createAdminClient } from "@/lib/supabase/admin";

const DELIVERED_STATUSES = new Set(["delivered", "completed", "fulfilled"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to submit feedback." }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid review." }, { status: 400 });

  const payload = body as { rating?: unknown; feedback?: unknown };
  const rating = Number(payload.rating);
  const feedback = typeof payload.feedback === "string" ? payload.feedback.trim() : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
  }
  if (feedback.length > 2000) return NextResponse.json({ error: "Feedback must be 2,000 characters or fewer." }, { status: 400 });

  // Use the server-only admin client for this lookup so an orders-table RLS
  // policy cannot make an order visible on the account page but invisible here.
  // Ownership is still enforced explicitly before any review is written.
  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Order review admin client unavailable:", error);
    return NextResponse.json({ error: "Feedback is temporarily unavailable. Please try again later." }, { status: 500 });
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,order_number,status,payment_status,user_id")
    .eq("id", id)
    .maybeSingle();

  if (orderError) {
    console.error("Order review lookup failed:", orderError.message);
    return NextResponse.json({ error: "We couldn't verify this order right now. Please try again later." }, { status: 500 });
  }
  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "We couldn't find that order in your account. Please make sure you're signed in to the account that placed it." }, { status: 404 });
  }
  if (order.payment_status !== "paid" || !DELIVERED_STATUSES.has(String(order.status).toLowerCase())) {
    return NextResponse.json({ error: "You can leave feedback once your order is marked as delivered." }, { status: 409 });
  }

  try {
    const { error } = await admin.from("order_reviews").insert({
      order_id: order.id,
      order_number: order.order_number,
      user_id: user.id,
      customer_email: user.email ?? null,
      rating,
      feedback: feedback || null,
    });
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "You've already submitted feedback for this order. Thank you!" }, { status: 409 });
      console.error("Order review insert failed:", error.message);
      return NextResponse.json({ error: "We couldn't save your feedback right now. Please try again later." }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Order review service unavailable:", error);
    return NextResponse.json({ error: "Feedback is temporarily unavailable. Please try again later." }, { status: 500 });
  }
}
