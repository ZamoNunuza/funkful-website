"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminSignOut() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/account/login");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-black transition hover:bg-black hover:text-white"
    >
      Sign out
    </button>
  );
}