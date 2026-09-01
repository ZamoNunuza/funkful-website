import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Call this from your checkout flow when a customer applies their welcome code.
// Keeps discount_used / discount_used_at as the single source of truth for
// whether a code can still be redeemed.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { discount_code } = await req.json();

    if (!discount_code || typeof discount_code !== "string") {
      return NextResponse.json({ error: "A discount code is required." }, { status: 400 });
    }

    const { data: subscriber, error: fetchError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("discount_used, discount_expires_at")
      .eq("discount_code", discount_code)
      .single();

    if (fetchError || !subscriber) {
      return NextResponse.json({ error: "Invalid discount code." }, { status: 404 });
    }

    if (subscriber.discount_used) {
      return NextResponse.json({ error: "This code has already been used." }, { status: 409 });
    }

    if (subscriber.discount_expires_at && new Date(subscriber.discount_expires_at) < new Date()) {
      return NextResponse.json({ error: "This code has expired." }, { status: 410 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({ discount_used: true, discount_used_at: new Date().toISOString() })
      .eq("discount_code", discount_code);

    if (updateError) {
      console.error("Redeem update error:", updateError);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ message: "Code redeemed." }, { status: 200 });
  } catch (err) {
    console.error("Redeem route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
