import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShipment, getCollectionAddress, getParcelPayload, ShippingConfigurationError, trackingUrlFor } from "@/lib/shipping/the-courier-guy";
export const runtime = "nodejs";
export const maxDuration = 30;

// Books a paid order with The Courier Guy (unified API) — door-to-door or pickup point.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin("/admin/orders");
    const { id } = await params;
    const admin = createAdminClient();
    const { data: order, error } = await admin.from("orders").select("id,order_number,email,first_name,last_name,phone,delivery_method,locker_code,shipping_address,shipping_suburb,shipping_city,shipping_province,shipping_postal_code,subtotal_cents,discount_cents,courier_service_code,courier_shipment_id,courier_tracking_reference,payment_status,status").eq("id", id).single();
    if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.payment_status !== "paid" || !["paid", "processing", "packed"].includes(order.status)) return NextResponse.json({ error: "Only paid orders can be booked with the courier." }, { status: 409 });
    if (order.courier_shipment_id) return NextResponse.json({ error: "A courier shipment has already been created for this order.", trackingReference: order.courier_tracking_reference }, { status: 409 });
    if (!order.courier_service_code) return NextResponse.json({ error: "This order has no courier service selected." }, { status: 400 });

    const isPickup = order.delivery_method === "locker";
    if (isPickup && (!order.locker_code || !order.phone)) return NextResponse.json({ error: "Pickup point orders need a pickup point and the customer's phone number before booking." }, { status: 400 });
    if (!isPickup && ![order.shipping_address, order.shipping_suburb, order.shipping_city, order.shipping_province, order.shipping_postal_code].every(Boolean)) return NextResponse.json({ error: "This order's delivery address is incomplete." }, { status: 400 });

    const { data: settings } = await admin.from("shipping_settings").select("collection_contact_name,collection_contact_email,collection_contact_phone").eq("id", 1).single();
    if (!settings?.collection_contact_name || !settings.collection_contact_email || !settings.collection_contact_phone) return NextResponse.json({ error: "Add Funkful's collection contact name, email and phone in Shipping settings before booking." }, { status: 400 });

    const { data: orderItems, error: itemsError } = await admin.from("order_items").select("product_id,quantity,unit_price_cents").eq("order_id", id);
    if (itemsError || !orderItems?.length) return NextResponse.json({ error: "Could not load this order's items." }, { status: 500 });
    const parcels = await getParcelPayload(admin, orderItems.map((item) => ({ id: item.product_id, quantity: item.quantity, unitPriceCents: item.unit_price_cents })));

    const created = await createShipment({
      orderNumber: order.order_number,
      serviceLevelCode: order.courier_service_code,
      collection: { address: await getCollectionAddress(admin), contact: { name: settings.collection_contact_name, email: settings.collection_contact_email, phone: settings.collection_contact_phone } },
      recipient: { name: [order.first_name, order.last_name].filter(Boolean).join(" ") || order.email, email: order.email, phone: order.phone },
      parcels,
      delivery: isPickup
        ? { kind: "pickup_point", pickupPointId: order.locker_code }
        : { kind: "door", address: { streetAddress: order.shipping_address, suburb: order.shipping_suburb, city: order.shipping_city, province: order.shipping_province, postalCode: order.shipping_postal_code }, declaredValueCents: Number(order.subtotal_cents) - Number(order.discount_cents ?? 0) },
    });

    const trackingReference = created.trackingReference;
    const trackingUrl = trackingUrlFor(trackingReference);
    // The waybill link is deliberately not stored: it expires after 24h. Use /courier-label for a fresh one.
    const { error: updateError } = await admin.from("orders").update({ courier_shipment_id: created.shipmentId, courier_tracking_reference: trackingReference || null, courier_waybill_url: null, courier_shipment_status: created.status, courier_provider: "the_courier_guy", courier: "The Courier Guy", tracking_number: trackingReference || null, tracking_url: trackingUrl, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) { console.error("Could not persist courier booking", { shipmentId: created.shipmentId, updateError }); return NextResponse.json({ error: "The courier booking was created, but Funkful could not save its details. Contact support before creating another booking.", shipmentId: created.shipmentId, trackingReference }, { status: 500 }); }
    return NextResponse.json({ ok: true, shipmentId: created.shipmentId, trackingReference, status: created.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create courier booking.";
    if (!(error instanceof ShippingConfigurationError)) console.error("Courier booking failed", error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
