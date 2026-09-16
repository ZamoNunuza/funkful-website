"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AuthState = { error?: string } | null;
type ProfileState = { error?: string; success?: boolean } | null;

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

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(_prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be signed in to update your profile." };
  }

  const firstName = clean(formData.get("firstName")); 
  const lastName = clean(formData.get("lastName")); 
  const phone = clean(formData.get("phone")); 
  const address = clean(formData.get("address")); 
  const city = clean(formData.get("city")); 
  const postalCode = clean(formData.get("postalCode"));

  if (!firstName) { 
    return { error: "First name is required." }; 
  } 
  if (!lastName) { 
    return { error: "Last name is required." }; 
  } 
  if (!phone) { 
    return { error: "Phone number is required." }; 
  } 
  if (!address) { 
    return { error: "Address is required." }; 
  } 
  if (!city) { 
    return { error: "City is required." }; 
  } 
  if (!postalCode) { 
    return { error: "Postal code is required." }; 
  }

  const phoneRegex = /^(?:\+27|0)\d{9}$/; 
  const cleanPhone = phone.replace(/\s/g, ""); 
  if (!phoneRegex.test(cleanPhone)) { 
    return { 
      error: "Please enter a valid South African phone number.", 
    }; 
  } 

  const postalCodeRegex = /^\d{4}$/; 
  if (!postalCodeRegex.test(postalCode)) { 
    return { 
      error: "Postal code must be 4 digits.", 
    }; 
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    address: address,
    city: city,
    postal_code: postalCode,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: true };
}

export type ForgotPasswordState = { error?: string; success?: string } | null;

export async function forgotPassword(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Please enter your email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/account/reset-password`,
  });

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  // Always show a generic success message — don't reveal whether the
  // email exists in your system, to avoid leaking account information.
  return {
    success:
      "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePassword(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Couldn't update your password. Try requesting a new reset link." };
  }

  redirect("/account?passwordReset=1");
}