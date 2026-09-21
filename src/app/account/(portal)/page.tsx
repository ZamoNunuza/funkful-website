import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/brands";
import { claimGuestOrders, getProfile, getSessionUser } from "@/lib/account-server";
import {
  ADDRESS_COLUMNS,
  formatDate,
  formatRands,
  orderStatusMeta,
  type AddressRow,
} from "@/lib/account-shared";
import { Card, CardTitle, StatusBadge, outlineButtonClass, primaryButtonClass, primaryButtonStyle } from "@/components/account/ui";

export default async function AccountOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { confirmed } = await searchParams;

  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account");

  // Pick up any orders placed as a guest with this (verified) email first, so
  // they appear in the list below.
  await claimGuestOrders(user);

  const supabase = await createClient();
  const [profile, ordersRes, addressesRes, wishlistRes] = await Promise.all([
    getProfile(user.id),
    supabase
      .from("orders")
      .select("id, order_number, total_cents, status, payment_status, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("addresses")
      .select(ADDRESS_COLUMNS)
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("wishlist_items").select("product_id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const recentOrders = ordersRes.data ?? [];
  const orderCount = ordersRes.count ?? recentOrders.length;
  const addresses = (addressesRes.data ?? []) as AddressRow[];
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const wishlistCount = wishlistRes.count ?? 0;
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      {confirmed === "1" && (
        <div style={{ background: palette.sage, color: "#1c2617" }} className="rounded-xl p-4 text-sm font-semibold">
          ✓ Email confirmed — welcome to Funkful! Your account is ready.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <StatTile href="/account/orders" label="Orders" value={orderCount} />
        <StatTile href="/account/wishlist" label="Saved items" value={wishlistCount} />
        <StatTile href="/account/addresses" label="Addresses" value={addresses.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card tint={palette.beige} className="md:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-sm font-extrabold uppercase">Recent orders</h3>
            {orderCount > 0 && (
              <Link href="/account/orders" className="text-xs font-bold uppercase underline">
                View all
              </Link>
            )}
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-2">
              <p className="text-sm text-neutral-700 leading-relaxed mb-5 max-w-md">
                No orders yet. When you place one, you&apos;ll be able to follow it and buy it again from here.
              </p>
              <Link href="/originals" style={primaryButtonStyle} className={primaryButtonClass}>
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentOrders.map((order) => {
                const meta = orderStatusMeta(order.status, order.payment_status);
                return (
                  <li key={order.id}>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="rounded-xl bg-white/70 p-4 flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">{order.order_number}</p>
                        <p className="text-xs text-neutral-500">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <StatusBadge label={meta.label} tone={meta.tone} />
                        <span className="font-bold hidden sm:inline">{formatRands(order.total_cents)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Default address</CardTitle>
          {defaultAddress ? (
            <address className="not-italic text-sm leading-relaxed text-neutral-700 mb-5">
              <span className="font-bold text-black">
                {defaultAddress.first_name} {defaultAddress.last_name}
              </span>
              <br />
              {defaultAddress.street_address}
              {defaultAddress.complex_unit && (
                <>
                  <br />
                  {defaultAddress.complex_unit}
                </>
              )}
              {defaultAddress.suburb && (
                <>
                  <br />
                  {defaultAddress.suburb}
                </>
              )}
              <br />
              {[defaultAddress.city, defaultAddress.province, defaultAddress.postal_code].filter(Boolean).join(", ")}
            </address>
          ) : (
            <p className="text-sm text-neutral-600 leading-relaxed mb-5">
              Save an address and we&apos;ll fill it in at checkout for you.
            </p>
          )}
          <Link href="/account/addresses" className={outlineButtonClass}>
            {defaultAddress ? "Manage addresses" : "Add an address"}
          </Link>
        </Card>

        <Card>
          <CardTitle>Account details</CardTitle>
          <dl className="text-sm space-y-2 mb-5">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Name</dt>
              <dd className="font-semibold text-right">{fullName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Phone</dt>
              <dd className="font-semibold text-right">{profile?.phone || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Password</dt>
              <dd className="font-semibold text-right">••••••••</dd>
            </div>
          </dl>
          <Link href="/account/details" className={outlineButtonClass}>
            Edit details
          </Link>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link
      href={href}
      style={{ background: "white", borderColor: "rgba(17,17,17,0.08)" }}
      className="border rounded-[22px] p-4 sm:p-6 block"
    >
      <p className="text-3xl sm:text-4xl font-black">{value}</p>
      <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-neutral-500 mt-1">{label}</p>
    </Link>
  );
}
