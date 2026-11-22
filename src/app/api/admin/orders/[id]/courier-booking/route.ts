import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLockerShipment, getCollectionAddress, getLockerWaybill, ShippingConfigurationError } from "@/lib/shipping/the-courier-guy";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin("/admin/orders");
    const { id } = await params;
    const admin = createAdminClient();
    const { data: order, error } = await admin.from("orders").select("id,order_number,email,first_name,last_name,phone,delivery_method,locker_code,courier_service_code,courier_quote_snapshot,courier_shipment_id,courier_tracking_reference,payment_status,status").eq("id", id).single();
    if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.payment_status !== "paid" || !["paid", "processing", "packed"].includes(order.status)) return NextResponse.json({ error: "Only paid orders can be booked with the courier." }, { status: 409 });
    if (order.delivery_method !== "locker" || !order.locker_code || !order.courier_service_code) return NextResponse.json({ error: "This order does not have a complete locker delivery selection." }, { status: 400 });
    if (order.courier_shipment_id) return NextResponse.json({ error: "A courier shipment has already been created for this order.", trackingReference: order.courier_tracking_reference }, { status: 409 });
    const quote = order.courier_quote_snapshot as { rate_revision_id?: number } | null;
    const collectionAddress = await getCollectionAddress(admin);
    const { data: settings } = await admin.from("shipping_settings").select("collection_contact_name,collection_contact_email,collection_contact_phone").eq("id", 1).single();
    if (!settings?.collection_contact_name || !settings.collection_contact_email || !settings.collection_contact_phone || !order.phone) return NextResponse.json({ error: "Add Funkful's collection contact details and the customer's phone number before booking." }, { status: 400 });
    const result = await createLockerShipment({
      shipmentId: order.id, lockerCode: order.locker_code, serviceLevelCode: order.courier_service_code,
      rateRevisionId: quote?.rate_revision_id ?? null, collectionAddress,
      collectionContact: { name: settings.collection_contact_name, email: settings.collection_contact_email, phone: settings.collection_contact_phone },
      customer: { name: [order.first_name, order.last_name].filter(Boolean).join(" "), email: order.email, phone: order.phone },
    });
    const shipmentId = String(result.id ?? "");
    const trackingReference = String(result.custom_tracking_reference ?? "");
    if (!shipmentId) throw new ShippingConfigurationError("The Locker API did not return a shipment ID. Check the courier account before retrying to avoid duplicate bookings.");
    let waybillUrl: string | null = null;
    try { const waybill = await getLockerWaybill(shipmentId); waybillUrl = waybill.url ?? null; } catch (waybillError) { console.error("Locker waybill retrieval failed", waybillError); }
    const { error: updateError } = await admin.from("orders").update({ courier_shipment_id: shipmentId, courier_tracking_reference: trackingReference || null, courier_waybill_url: waybillUrl, courier_shipment_status: String(result.status ?? "submitted"), courier_provider: "the_courier_guy_pudo", courier: "The Courier Guy PUDO", tracking_number: trackingReference || null, tracking_url: trackingReference ? `https://api-pudo.co.za/tracking/shipments/public?waybill=${encodeURIComponent(trackingReference)}` : null, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) { console.error("Could not persist courier booking", { shipmentId, updateError }); return NextResponse.json({ error: "The courier booking was created, but Funkful could not save its details. Contact support before creating another booking.", shipmentId, trackingReference }, { status: 500 }); }
    return NextResponse.json({ ok: true, shipmentId, trackingReference, waybillUrl, status: result.status ?? "submitted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create courier booking.";
    if (!(error instanceof ShippingConfigurationError)) console.error("Courier booking failed", error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
