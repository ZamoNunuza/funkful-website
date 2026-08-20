"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuthState = { error?: string } | null;
type ProfileState = { error?: string; success?: boolean } | null;

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "");
  const lastName = String(formData.get("lastName") ?? "");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Lands in auth.users.raw_user_meta_data — the profiles-table trigger
      // (see supabase/profiles.sql) reads this to seed the first profile row.
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/account`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Email confirmation is on by default in Supabase — there's no session
  // yet, so send them to sign in once they've confirmed, not straight to /account.
  redirect("/account/login?checkEmail=1");
}

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/account");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next || "/account");
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

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: String(formData.get("firstName") ?? ""),
    last_name: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    postal_code: String(formData.get("postalCode") ?? ""),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: true };
}
