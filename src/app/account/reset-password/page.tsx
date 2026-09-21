// /account/reset-password
//
// Reached from the emailed reset link via /auth/callback, which has already
// exchanged the one-time code for a session (that's why middleware lets the
// visitor through). If there's no session the link was invalid or expired.

import Image from "next/image";
import Link from "next/link";
import { brands, palette } from "@/lib/brands";
import { getSessionUser } from "@/lib/account-server";
import ResetPasswordForm from "./reset-form";

export const metadata = { title: "Set a new password | Funkful" };

export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  return (
    <main
      style={{ background: palette.cream, color: palette.black }}
      className="min-h-screen flex items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <Image src={brands.funkful.logo} alt="Funkful" width={130} height={30} className="w-auto" />
        </Link>

        <div style={{ background: "white", borderColor: "rgba(17,17,17,0.08)" }} className="border rounded-[22px] p-8">
          {user ? (
            <ResetPasswordForm />
          ) : (
            <div className="text-center">
              <h1 className="text-xl font-black uppercase mb-3">This link isn&apos;t valid</h1>
              <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                It may have expired or already been used. Request a new password reset email and try again.
              </p>
              <Link
                href="/account/login?mode=forgot"
                style={{ background: palette.black, color: palette.cream }}
                className="inline-block font-extrabold text-xs uppercase tracking-wide px-6 py-3.5 rounded-full"
              >
                Request a new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
