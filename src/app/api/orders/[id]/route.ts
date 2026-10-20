import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400, headers: NO_STORE });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("orders").select("order_number,status,payment_status").eq("id", id).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Order not found." }, { status: 404, headers: NO_STORE });
    return NextResponse.json({ orderNumber: data.order_number, status: data.status, paymentStatus: data.payment_status }, { headers: NO_STORE });
  } catch { return NextResponse.json({ error: "Order lookup failed." }, { status: 500, headers: NO_STORE }); }
}
