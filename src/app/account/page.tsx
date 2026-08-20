import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brands, palette } from "@/lib/brands";
import { signOut } from "@/app/account/actions";
import { ProfileForm } from "@/app/account/profile-form";

export default async function AccountPage() {
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
            <h3 className="text-sm font-extrabold uppercase mb-3.5">Order history</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Nothing here yet — once orders are linked to accounts, they&apos;ll show up in this panel.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
