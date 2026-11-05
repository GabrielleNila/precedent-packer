"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { matterFormSchema, toSavePayload, type MatterFormValues } from "@/lib/validation/matter";

export type SaveResult =
  | { ok: true; id: string; updated_at: string }
  | { ok: false; error: string; conflict?: boolean };

// Postgres error codes raised by our database functions.
function friendly(code: string | undefined, message: string) {
  switch (code) {
    case "40001": return message; // edited by someone else
    case "42501": return "You don't have permission to do that.";
    case "P0002": return "That matter no longer exists.";
    case "22023": return message;
    default: return "Something went wrong while saving. Please try again.";
  }
}

export async function saveMatter(values: MatterFormValues): Promise<SaveResult> {
  await getCurrentMember(); // re-checks the session on every call
  const parsed = matterFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Some fields need attention before saving." };
  }

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("save_matter", { p: toSavePayload(parsed.data) });
  if (error || !id) {
    return { ok: false, error: friendly(error?.code, error?.message ?? ""), conflict: error?.code === "40001" };
  }

  const { data: row } = await supabase.from("matters").select("updated_at").eq("id", id).single();
  revalidatePath("/matters");
  return { ok: true, id: id as string, updated_at: row?.updated_at ?? new Date().toISOString() };
}

export async function duplicateMatter(sourceId: string, includeOpposing: boolean) {
  await getCurrentMember();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_matter", {
    source_id: sourceId,
    include_opposing: includeOpposing,
  });
  if (error || !data) return { ok: false as const, error: friendly(error?.code, error?.message ?? "") };
  revalidatePath("/matters");
  redirect(`/matters/${data}?duplicated=1`);
}

export async function deleteMatter(targetId: string, confirmName: string) {
  const member = await getCurrentMember();
  if (member.role !== "admin") return { ok: false as const, error: "Only an admin can delete a matter." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_matter", { target_id: targetId, confirm_name: confirmName });
  if (error) return { ok: false as const, error: friendly(error.code, error.message) };
  revalidatePath("/matters");
  redirect("/matters?deleted=1");
}
