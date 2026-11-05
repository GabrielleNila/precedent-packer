import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, assertSupabaseEnv } from "./env";

// Bypasses row level security. Only for creating user accounts on behalf of
// an admin, after the caller's admin role has been checked. Never import this
// from a Client Component. The key lives only in Vercel / .env.local.
export function createAdminClient() {
  assertSupabaseEnv();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY is not set (server-only environment variable).");
  }
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
