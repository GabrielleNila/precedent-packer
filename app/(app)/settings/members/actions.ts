"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AddMemberState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "created"; email: string; tempPassword: string };

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter their full name").max(200),
  initials: z.string().trim().min(1, "Enter their initials").max(6).regex(/^[A-Za-z]+$/, "Letters only"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["admin", "member"]),
  is_solicitor: z.boolean(),
  job_title: z.string().trim().max(60).optional(),
});

// Readable temporary password, e.g. "plum-6481-meadow-2093".
function tempPassword() {
  const words = ["blush", "plum", "mint", "lilac", "meadow", "petal", "cloud", "maple", "pearl", "willow", "honey", "clover"];
  const w = () => words[randomInt(words.length)];
  const n = () => String(randomInt(1000, 10000));
  return `${w()}-${n()}-${w()}-${n()}`;
}

export async function addMember(_prev: AddMemberState, formData: FormData): Promise<AddMemberState> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    initials: formData.get("initials"),
    email: formData.get("email"),
    role: formData.get("role"),
    is_solicitor: formData.get("is_solicitor") === "on",
    job_title: formData.get("job_title") ?? undefined,
  });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0]?.message ?? "Check the details" };
  const v = parsed.data;

  const service = createAdminClient();
  const password = tempPassword();
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: v.email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const exists = /already|registered|exists/i.test(createError?.message ?? "");
    return { status: "error", error: exists ? "That email already has an account." : "Couldn't create the account. Please try again." };
  }

  const { error: memberError } = await service.from("members").insert({
    user_id: created.user.id,
    firm_id: admin.firm_id, // always the admin's own firm
    full_name: v.full_name,
    initials: v.initials,
    email: v.email,
    role: v.role,
    is_solicitor: v.is_solicitor,
    job_title: v.job_title || null,
    must_change_password: true,
  });
  if (memberError) {
    await service.auth.admin.deleteUser(created.user.id); // don't leave a half-made account
    return { status: "error", error: "Couldn't add them to the firm. Please try again." };
  }

  await service.from("audit_log").insert({
    firm_id: admin.firm_id,
    user_id: admin.user_id,
    event: "member_invited",
    details: { new_user_id: created.user.id, role: v.role },
  });

  revalidatePath("/settings/members");
  return { status: "created", email: v.email, tempPassword: password };
}

export async function setMemberActive(userId: string, active: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.user_id) return { ok: false as const, error: "You can't deactivate yourself." };
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ active }).eq("user_id", userId);
  if (error) return { ok: false as const, error: "Couldn't update that member." };
  const service = createAdminClient();
  await service.from("audit_log").insert({
    firm_id: admin.firm_id,
    user_id: admin.user_id,
    event: "member_updated",
    details: { target_user_id: userId, active },
  });
  revalidatePath("/settings/members");
  return { ok: true as const };
}
