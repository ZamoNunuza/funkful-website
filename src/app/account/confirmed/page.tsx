import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brands, palette } from "@/lib/brands";

export default async function ConfirmedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login");
  }

  return (
    <main
      style={{ background: palette.cream, color: palette.black }}
      className="min-h-screen flex items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-md text-center">
        <Link href="/" className="flex justify-center mb-10">
          <Image src={brands.funkful.logo} alt="Funkful" width={130} height={30} className="w-auto" />
        </Link>

        <div className="bg-white border rounded-[22px] p-9">
          <div
            style={{ background: palette.sage, color: "#1c2617" }}
            className="mx-auto mb-6 h-14 w-14 rounded-full flex items-center justify-center text-2xl"
            aria-hidden="true"
          >
            ✓
          </div>

          <p style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-wide">
            Email confirmed
          </p>
          <h1 className="text-3xl font-extrabold uppercase mt-2 mb-3">
            Welcome to Funkful!
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed mb-7">
            Your email has been confirmed and your Funkful account is ready.
            You can now manage your profile, view orders and start shopping.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/account"
              style={{ background: palette.black, color: palette.cream }}
              className="font-extrabold text-xs uppercase tracking-wide py-3.5 rounded-full"
            >
              Go to my account
            </Link>
            <Link href="/shop" className="text-sm font-semibold underline py-2">
              Start shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
