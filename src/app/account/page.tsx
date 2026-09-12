import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brands, palette } from "@/lib/brands";
import { signOut } from "@/app/account/actions";
import { ProfileForm } from "@/app/account/profile-form";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { confirmed } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-braces — middleware.ts already redirects signed-out visitors
  // away from /account, but this keeps the page safe even if that ever
  // changes or the route is reached some other way.
  if (!user) {
    redirect("/account/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, address, city, postal_code")
    .eq("id", user.id)
    .maybeSingle();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total_cents, status, payment_status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const funkful = brands.funkful;

  return (
    <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen">
      <header style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
        <div className="max-w-[900px] mx-auto px-8 flex items-center justify-between py-4">
          <Link href="/">
            <Image src={funkful.logo} alt="Funkful" width={110} height={26} className="w-auto" />
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-sm font-semibold underline">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-[900px] mx-auto px-8 py-12">
        <p className="text-center text-xs text-neutral-500 mt-6">
          <Link href="/" className="underline">
            Back to shopping
          </Link>
        </p>
        {confirmed === "1" && (
          <div
            style={{ background: palette.sage, color: "#1c2617" }}
            className="rounded-xl p-4 mb-7 text-sm font-semibold"
          >
            ✓ Email confirmed — welcome to Funkful! Your account is ready.
          </div>
        )}

        <span style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-wide">
          Your account
        </span>
        <h1 className="text-3xl font-extrabold uppercase mt-2 mb-1">
          {profile?.first_name ? `Hey, ${profile.first_name}` : "Your account"}
        </h1>
        <p className="text-sm text-neutral-600 mb-10">{user.email}</p>

        <div className="grid md:grid-cols-2 gap-8">
          <ProfileForm
            initial={{
              firstName: profile?.first_name ?? "",
              lastName: profile?.last_name ?? "",
              phone: profile?.phone ?? "",
              address: profile?.address ?? "",
              city: profile?.city ?? "",
              postalCode: profile?.postal_code ?? "",
            }}
          />

          <div style={{ background: palette.beige }} className="rounded-[22px] p-7 h-fit">
            <h3 className="text-sm font-extrabold uppercase mb-4">Order history</h3>
            {!orders?.length ? (
              <p className="text-sm text-neutral-600 leading-relaxed">Your completed orders will appear here.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-xl bg-white/60 p-4 flex justify-between gap-4 text-sm">
                    <div>
                      <p className="font-bold">{order.order_number}</p>
                      <p className="text-xs text-neutral-500">{new Date(order.created_at).toLocaleDateString("en-ZA")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">R{(order.total_cents / 100).toFixed(2)}</p>
                      <p className="text-[10px] uppercase font-bold text-neutral-500">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
