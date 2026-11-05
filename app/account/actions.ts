"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMemberAllowingPasswordChange } from "@/lib/auth";

export type PasswordState = { error?: string };

const MIN_LENGTH = 12;

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const member = await getMemberAllowingPasswordChange();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_LENGTH) return { error: `Use at least ${MIN_LENGTH} characters.` };
  if (password !== confirm) return { error: "The two passwords don't match." };
  if (password.toLowerCase().includes(member.email.split("@")[0].toLowerCase())) {
    return { error: "Don't include your email name in the password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  const { error: flagError } = await supabase.rpc("mark_password_changed");
  if (flagError) return { error: "Password changed, but we couldn't update your account. Try signing in again." };

  redirect("/matters");
}

export async function signOut() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (userId) {
    const { data: member } = await supabase.from("members").select("firm_id").eq("user_id", userId).maybeSingle();
    if (member) {
      await supabase.from("audit_log").insert({ firm_id: member.firm_id, user_id: userId, event: "logout" });
    }
  }
  await supabase.auth.signOut();
  redirect("/login?m=signed-out");
}
