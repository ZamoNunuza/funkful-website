// src/app/account/(portal)/layout.tsx
//
// Wraps every signed-in account page (/account, /account/orders, …) with the
// greeting and navigation. The login, confirmed and reset-password pages sit
// outside this route group on purpose so they don't get the sidebar.

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { palette } from "@/lib/brands";
import { signOut } from "@/app/account/actions";
import { getProfile, getSessionUser } from "@/lib/account-server";
import AccountNav from "@/components/account/AccountNav";

export default async function AccountPortalLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  // middleware.ts already redirects signed-out visitors, this keeps the
  // layout safe if the route is ever reached another way.
  if (!user) redirect("/account/login?next=/account");

  const profile = await getProfile(user.id);

  return (
    <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <span style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-wide">
          Your account
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase mt-2 mb-1">
          {profile?.first_name ? `Hey, ${profile.first_name}` : "Welcome back"}
        </h1>
        <p className="text-sm text-neutral-600 mb-8 break-all">{user.email}</p>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8 lg:gap-12 items-start">
          <aside className="lg:sticky lg:top-28">
            <AccountNav />
            <form action={signOut} className="hidden lg:block mt-6">
              <button type="submit" className="ghost text-xs font-bold uppercase tracking-wide underline">
                Sign out
              </button>
            </form>
          </aside>

          <section className="min-w-0">{children}</section>
        </div>

        <form action={signOut} className="lg:hidden mt-10">
          <button type="submit" className="ghost text-xs font-bold uppercase tracking-wide underline">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
