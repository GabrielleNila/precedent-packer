import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/types";

export type CurrentMember = Pick<
  Member,
  "user_id" | "firm_id" | "full_name" | "initials" | "email" | "role" | "must_change_password"
> & { firm_name: string };

// Reads the signed-in user's membership once per request.
const loadMember = cache(async (): Promise<CurrentMember> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("members")
    .select("user_id, firm_id, full_name, initials, email, role, must_change_password, active, firms(name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || !data.active) redirect("/login?error=no-access");

  const firm = data.firms as unknown as { name: string } | null;
  return {
    user_id: data.user_id,
    firm_id: data.firm_id,
    full_name: data.full_name,
    initials: data.initials,
    email: data.email,
    role: data.role,
    must_change_password: data.must_change_password,
    firm_name: firm?.name ?? "",
  };
});

// For every normal page and action. Users still on an admin-issued
// temporary password are sent to change it first.
export async function getCurrentMember() {
  const member = await loadMember();
  if (member.must_change_password) redirect("/account/password");
  return member;
}

// Only for the change-password page itself.
export async function getMemberAllowingPasswordChange() {
  return loadMember();
}

export async function requireAdmin() {
  const member = await getCurrentMember();
  if (member.role !== "admin") redirect("/matters");
  return member;
}
