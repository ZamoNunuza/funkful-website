import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing order id." }, { status: 400 });
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("orders").select("order_number,status,payment_status").eq("id", id).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ orderNumber: data.order_number, status: data.status, paymentStatus: data.payment_status });
  } catch { return NextResponse.json({ error: "Order lookup failed." }, { status: 500 }); }
}
