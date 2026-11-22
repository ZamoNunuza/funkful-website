import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShipmentLabelUrl, ShippingConfigurationError } from "@/lib/shipping/the-courier-guy";
export const runtime = "nodejs";
export const maxDuration = 30;

// Redirects to a freshly signed waybill PDF (links from The Courier Guy expire after 24h).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin("/admin/orders");
    const { id } = await params;
    const { data: order } = await createAdminClient().from("orders").select("courier_shipment_id").eq("id", id).single();
    if (!order?.courier_shipment_id) return NextResponse.json({ error: "This order has no courier booking yet." }, { status: 404 });
    return NextResponse.redirect(await getShipmentLabelUrl(String(order.courier_shipment_id)));
  } catch (error) {
    const message = error instanceof ShippingConfigurationError ? error.message : "Could not get the waybill.";
    if (!(error instanceof ShippingConfigurationError)) console.error("Courier label failed", error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
