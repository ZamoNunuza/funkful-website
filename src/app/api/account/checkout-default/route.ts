import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADDRESS_COLUMNS, addressStreetLine, type AddressRow } from "@/lib/account-shared";

export const runtime = "nodejs";

/**
 * Pre-fill data for the checkout form: the signed-in customer's email, name,
 * phone and saved addresses. Guests get a 401, which the checkout page simply
 * ignores. Everything returned is the customer's own data (RLS-scoped).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, phone").eq("id", user.id).maybeSingle(),
    supabase
      .from("addresses")
      .select(ADDRESS_COLUMNS)
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json(
    {
      email: user.email ?? "",
      profile: {
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        phone: profile?.phone ?? "",
      },
      addresses: ((addresses ?? []) as AddressRow[]).map((a) => ({
        id: a.id,
        label: a.label,
        firstName: a.first_name,
        lastName: a.last_name,
        phone: a.phone,
        street: addressStreetLine(a),
        city: a.city,
        province: a.province,
        postalCode: a.postal_code,
        isDefault: a.is_default,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
