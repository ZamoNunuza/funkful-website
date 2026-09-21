// src/lib/admin.ts
//
// Minimal admin gate: a signed-in, email-verified user whose address is listed
// in the ADMIN_EMAILS env var (comma-separated). No roles table needed.
//
// Server-only. Call requireAdmin() at the top of every admin page AND inside
// every admin server action — server actions are public POST endpoints, so the
// page-level check alone is not enough.

import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/account-server";

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(nextPath = "/admin/orders") {
  const user = await getSessionUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(nextPath)}`);

  const email = user.email?.toLowerCase();
  // 404 (not 403) for everyone else so /admin doesn't advertise itself.
  if (!email || !user.email_confirmed_at || !adminEmails().includes(email)) notFound();

  return user;
}
