"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/account-shared";

type AuthState = { error?: string } | null;

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = clean(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = clean(formData.get("firstName"));
  const lastName = clean(formData.get("lastName"));

  if (!firstName || !lastName || !email || !password) {
    return { error: "Please complete all fields." };
  }

  const weakPassword = validatePassword(password);
  if (weakPassword) {
    return { error: `Choose a stronger password. ${weakPassword}` };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/account`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // IMPORTANT: create the public profile during SIGN-UP, not after email
  // confirmation. The service-role client is server-only and bypasses RLS.
  if (data.user) {
    try {
      const admin = createAdminClient();
      const { error: profileError } = await admin.from("profiles").upsert(
        {
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        console.error("Funkful sign-up profile insert failed:", profileError);
        return { error: "Your account was created, but we could not create your customer profile. Please contact Funkful support." };
      }
    } catch (profileException) {
      console.error("Funkful sign-up profile insert exception:", profileException);
      return { error: "Your account was created, but we could not create your customer profile. Please check the server configuration." };
    }
  }

  // With email confirmation enabled, Supabase normally returns no session.
  // The customer must confirm the email before signing in.
  redirect("/account/login?checkEmail=1");
}

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = clean(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/account");

  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Admin routing is role-based, not email-based. The role lives in the
  // server-side profiles table and is checked with the service-role client so
  // a customer cannot influence where an admin account is redirected.
  let destination = "/account";
  try {
    if (signInData.user) {
      const admin = createAdminClient();
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("role")
        .eq("id", signInData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Sign-in profile role lookup failed:", profileError);
      } else if (profile?.role === "admin") {
        destination = "/admin/orders";
      } else {
        const requestedNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
        // Never allow a non-admin to use the login `next` parameter to enter
        // an admin route. The admin pages still perform their own server-side
        // authorization check.
        destination = requestedNext.startsWith("/admin") ? "/account" : requestedNext;
      }
    }
  } catch (roleLookupError) {
    console.error("Sign-in role lookup exception:", roleLookupError);
    // If the role cannot be read, fail closed to the normal customer portal.
    destination = "/account";
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export type ForgotPasswordState = { error?: string; success?: string } | null;

export async function forgotPassword(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = clean(formData.get("email")).toLowerCase();

  if (!email) {
    return { error: "Please enter your email address." };
  }

  const supabase = await createClient();

  // The link goes through /auth/callback, which exchanges the code for a
  // session on the server and then forwards to the reset page. (Pointing the
  // link straight at /account/reset-password doesn't work: middleware bounces
  // signed-out visitors to the login page before the page can read the code.)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/account/reset-password`,
  });

  if (error) {
    console.error("forgotPassword failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  // Always show a generic success message — don't reveal whether the
  // email exists in your system, to avoid leaking account information.
  return {
    success:
      "If an account exists for that email, a reset link is on its way.",
  };
}

export type ResetPasswordState = { error?: string } | null;

/**
 * Sets a new password after the customer followed the emailed reset link.
 * By this point /auth/callback has already turned the link into a session, so
 * this is an ordinary authenticated password update.
 */
export async function updatePassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const weak = validatePassword(password);
  if (weak) return { error: weak };
  if (password !== confirmPassword) return { error: "Your passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link has expired. Request a new one from the sign-in page." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "same_password") {
      return { error: "Choose a password you haven't used before on this account." };
    }
    console.error("updatePassword failed:", error);
    return { error: error.message || "Couldn't update your password. Try requesting a new reset link." };
  }

  // A reset means the old password may be compromised: end every other session.
  await supabase.auth.signOut({ scope: "others" });

  revalidatePath("/", "layout");
  redirect("/account/details?passwordUpdated=1");
}
