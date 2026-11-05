"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Deliberately vague: don't reveal whether the email exists.
    return { error: "That email and password don't match an account." };
  }

  const { data: member } = await supabase
    .from("members")
    .select("firm_id, active, must_change_password")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!member || !member.active) {
    await supabase.auth.signOut();
    return { error: "Your account isn't active on Precedent Pack. Ask an admin for access." };
  }

  // Audit trail of sign-ins (no client data).
  await supabase.from("audit_log").insert({
    firm_id: member.firm_id,
    user_id: data.user.id,
    event: "login",
  });

  redirect(member.must_change_password ? "/account/password" : "/matters");
}
