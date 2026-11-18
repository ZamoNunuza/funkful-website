import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

function fail(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET() {
  try {
    await requireAdmin("/admin/shipping");
    const admin = createAdminClient();
    const [settingsResult, profilesResult, productsResult] = await Promise.all([
      admin.from("shipping_settings").select("*").eq("id", 1).single(),
      admin.from("shipping_parcel_profiles").select("*").order("name"),
      admin.from("products").select("id,name,brand,category,product_type,shipping_profile_code,is_active").order("brand").order("name"),
    ]);
    if (settingsResult.error || profilesResult.error || productsResult.error) {
      console.error("Shipping admin load failed", { settings: settingsResult.error, profiles: profilesResult.error, products: productsResult.error });
      return fail("Could not load shipping configuration.", 500);
    }
    return NextResponse.json({ settings: settingsResult.data, profiles: profilesResult.data ?? [], products: productsResult.data ?? [] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not load shipping configuration.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin("/admin/shipping");
    const body = await request.json();
    const admin = createAdminClient();

    if (body.kind === "settings") {
      const threshold = Number(body.free_shipping_threshold_cents);
      const handling = Number(body.handling_time_days);
      if (!Number.isSafeInteger(threshold) || threshold < 0 || !Number.isInteger(handling) || handling < 0 || handling > 60) return fail("Enter a valid free-shipping threshold and handling time.");
      const patch = {
        free_shipping_threshold_cents: threshold,
        collection_company: String(body.collection_company ?? "Funkful").trim(),
        collection_street_address: String(body.collection_street_address ?? "").trim(),
        collection_local_area: String(body.collection_local_area ?? "").trim(),
        collection_city: String(body.collection_city ?? "").trim(),
        collection_province: String(body.collection_province ?? "").trim(),
        collection_postal_code: String(body.collection_postal_code ?? "").trim() || null,
        collection_contact_name: String(body.collection_contact_name ?? "").trim() || null,
        collection_contact_phone: String(body.collection_contact_phone ?? "").trim() || null,
        collection_contact_email: String(body.collection_contact_email ?? "").trim() || null,
        bobgo_environment: body.bobgo_environment === "production" ? "production" : "sandbox",
        standard_service_name: String(body.standard_service_name ?? "").trim() || null,
        handling_time_days: handling,
        updated_at: new Date().toISOString(),
      };
      if (!patch.collection_street_address || !patch.collection_local_area || !patch.collection_city || !patch.collection_province) return fail("Complete the collection address.");
      const { error } = await admin.from("shipping_settings").update(patch).eq("id", 1);
      if (error) { console.error(error); return fail("Could not save shipping settings.", 500); }
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "profile") {
      const code = String(body.code ?? "").trim();
      const name = String(body.name ?? "").trim();
      if (!code || !name) return fail("Profile code and name are required.");
      const dimension = (value: unknown) => value === "" || value == null ? null : Number(value);
      const values = [dimension(body.length_cm), dimension(body.width_cm), dimension(body.height_cm), dimension(body.weight_kg)];
      if (values.some((value) => value !== null && (!Number.isFinite(value) || value <= 0))) return fail("Measurements must be positive numbers, or left blank until measured.");
      const { error } = await admin.from("shipping_parcel_profiles").update({
        name, description: String(body.description ?? "").trim() || null,
        length_cm: values[0], width_cm: values[1], height_cm: values[2], weight_kg: values[3],
        is_fragile: Boolean(body.is_fragile), is_active: Boolean(body.is_active), updated_at: new Date().toISOString(),
      }).eq("code", code);
      if (error) { console.error(error); return fail("Could not save parcel profile.", 500); }
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "mapping") {
      const productId = String(body.product_id ?? "");
      const profileCode = body.shipping_profile_code ? String(body.shipping_profile_code) : null;
      if (!productId) return fail("Choose a product.");
      const { error } = await admin.from("products").update({ shipping_profile_code: profileCode }).eq("id", productId);
      if (error) { console.error(error); return fail("Could not update product packaging profile.", 500); }
      return NextResponse.json({ ok: true });
    }

    return fail("Unknown shipping update.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not update shipping configuration.", 500);
  }
}
