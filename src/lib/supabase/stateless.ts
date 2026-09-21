import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * A Supabase client that never reads or writes cookies or storage.
 *
 * Used to double-check a customer's current password before letting them
 * change it: we call signInWithPassword on this throwaway client so the real
 * (cookie-backed) session is left untouched.
 */
export function createStatelessClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase publishable/anon key");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
