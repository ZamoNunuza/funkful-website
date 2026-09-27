import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/account-server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireAdmin(nextPath = "/admin") {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/account/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!user.email_confirmed_at) {
    notFound();
  }

  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Admin role lookup failed:", error);
    notFound();
  }

  if (profile?.role !== "admin") {
    notFound();
  }

  return user;
}