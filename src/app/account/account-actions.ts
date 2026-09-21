"use server";

// Server actions for the signed-in account area: profile details, password
// change and the address book. Sign-in / sign-up / password *reset* live in
// ./actions.ts.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createStatelessClient } from "@/lib/supabase/stateless";
import { getSessionUser } from "@/lib/account-server";
import {
  MAX_ADDRESSES,
  isUuid,
  isValidSaPhone,
  parseAddressForm,
  validatePassword,
} from "@/lib/account-shared";

export type FormState = {
  error?: string;
  success?: string;
  /**
   * The submitted (non-secret) field values, echoed back so forms can keep
   * what the customer typed. React 19 resets uncontrolled forms after every
   * action, so without this a validation error would wipe the form.
   */
  values?: Record<string, string>;
} | null;

const SIGN_IN_AGAIN = "Your session has expired. Please sign in again.";

function echo(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function text(value: FormDataEntryValue | null, max = 80) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

// ---------------------------------------------------------------------------
// Account details
// ---------------------------------------------------------------------------

export async function updateDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await saveDetails(formData);
  return { ...result, values: echo(formData) };
}

async function saveDetails(formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: SIGN_IN_AGAIN };

  const firstName = text(formData.get("firstName"), 60);
  const lastName = text(formData.get("lastName"), 60);
  const phone = text(formData.get("phone"), 20);

  if (!firstName) return { error: "First name is required." };
  if (!lastName) return { error: "Last name is required." };
  if (phone && !isValidSaPhone(phone)) {
    return { error: "Enter a valid South African phone number, e.g. 082 123 4567." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      phone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("updateDetails failed:", error);
    return { error: "We couldn't save your details. Please try again." };
  }

  // The greeting in the account layout reads the profile, so refresh it too.
  revalidatePath("/account", "layout");
  return { success: "Details saved." };
}

// ---------------------------------------------------------------------------
// Change password (signed-in)
// ---------------------------------------------------------------------------

async function currentPasswordIsCorrect(email: string, password: string) {
  // Sign in on a throwaway, cookie-less client so the real session is untouched.
  const stateless = createStatelessClient();
  const { error } = await stateless.auth.signInWithPassword({ email, password });
  return !error;
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user?.email) return { error: SIGN_IN_AGAIN };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) return { error: "Please fill in all three password fields." };
  if (next !== confirm) return { error: "Your new passwords don't match." };

  const weak = validatePassword(next);
  if (weak) return { error: weak };
  if (next === current) return { error: "Your new password must be different from your current one." };

  let correct = false;
  try {
    correct = await currentPasswordIsCorrect(user.email, current);
  } catch (err) {
    console.error("changePassword: could not verify current password:", err);
    return { error: "We couldn't verify your password right now. Please try again." };
  }
  if (!correct) return { error: "Your current password isn't correct." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "reauthentication_needed") {
      return { error: "For your security, please sign out and back in, then try changing your password again." };
    }
    if (code === "same_password") {
      return { error: "Your new password must be different from your current one." };
    }
    console.error("changePassword failed:", error);
    return { error: error.message || "We couldn't update your password. Please try again." };
  }

  // Anyone else signed in with the old password gets signed out; this device stays signed in.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) console.error("changePassword: could not end other sessions:", signOutError);

  return { success: "Password updated. Any other devices signed in to your account have been signed out." };
}

// ---------------------------------------------------------------------------
// Address book
// ---------------------------------------------------------------------------

export async function saveAddress(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await persistAddress(formData);
  return result?.success ? result : { ...result, values: echo(formData) };
}

async function persistAddress(formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: SIGN_IN_AGAIN };

  const parsed = parseAddressForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const a = parsed.value;

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const fields = {
    label: a.label,
    first_name: a.firstName,
    last_name: a.lastName,
    phone: a.phone,
    street_address: a.streetAddress,
    complex_unit: a.complexUnit || null,
    suburb: a.suburb || null,
    city: a.city,
    province: a.province,
    postal_code: a.postalCode,
    updated_at: new Date().toISOString(),
  };

  let addressId = id;
  let makeDefault = a.makeDefault;

  if (id) {
    if (!isUuid(id)) return { error: "We couldn't find that address." };
    const { data, error } = await supabase
      .from("addresses")
      .update(fields)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("saveAddress (update) failed:", error);
      return { error: "We couldn't save your address. Please try again." };
    }
    if (!data) return { error: "We couldn't find that address." };
  } else {
    const { count } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= MAX_ADDRESSES) {
      return { error: `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.` };
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...fields, user_id: user.id, is_default: false })
      .select("id")
      .single();

    if (error || !data) {
      console.error("saveAddress (insert) failed:", error);
      return { error: "We couldn't save your address. Please try again." };
    }
    addressId = data.id;
    // The first address a customer saves is always their default.
    if ((count ?? 0) === 0) makeDefault = true;
  }

  if (makeDefault) {
    const { error } = await supabase.rpc("set_default_address", { p_address_id: addressId });
    if (error) console.error("saveAddress: set_default_address failed:", error);
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { success: "Address saved." };
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  const id = String(formData.get("id") ?? "");
  if (!user || !isUuid(id)) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("addresses")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return;

  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("deleteAddress failed:", error);
    return;
  }

  // Don't leave the customer without a default: promote the newest remaining address.
  if (existing.is_default) {
    const { data: next } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next) await supabase.rpc("set_default_address", { p_address_id: next.id });
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
}

export async function setDefaultAddress(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  const id = String(formData.get("id") ?? "");
  if (!user || !isUuid(id)) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_default_address", { p_address_id: id });
  if (error) {
    console.error("setDefaultAddress failed:", error);
    return;
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
}
