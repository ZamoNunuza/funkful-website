import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  // Password-reset links come through here too (see forgotPassword in
  // account/actions.ts). They only need the session set up, not the
  // email-confirmation profile sync below.
  const isRecovery = next.startsWith("/account/reset-password");
  const failure = isRecovery ? "recovery_failed" : "confirmation_failed";

  if (!code) {
    const errorUrl = new URL("/account/login", requestUrl.origin);
    errorUrl.searchParams.set("error", isRecovery ? "recovery_failed" : "confirmation_missing");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/account/login", requestUrl.origin);
    errorUrl.searchParams.set("error", failure);
    return NextResponse.redirect(errorUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const errorUrl = new URL("/account/login", requestUrl.origin);
    errorUrl.searchParams.set("error", failure);
    return NextResponse.redirect(errorUrl);
  }

  if (isRecovery) {
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  // The database trigger normally creates this row when auth.users is inserted.
  // This upsert is intentionally idempotent and repairs a missing profile if the
  // trigger was not installed when the user originally signed up.
  const firstName = String(user.user_metadata?.first_name ?? "").trim();
  const lastName = String(user.user_metadata?.last_name ?? "").trim();

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("Supabase confirmation profile sync failed:", profileError);
    const errorUrl = new URL("/account/login", requestUrl.origin);
    errorUrl.searchParams.set("error", "profile_sync_failed");
    return NextResponse.redirect(errorUrl);
  }

  const destination = new URL(next, requestUrl.origin);
  destination.searchParams.set("confirmed", "1");
  return NextResponse.redirect(destination);
}
