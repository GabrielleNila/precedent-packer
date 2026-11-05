"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { TEMPLATES, isTemplateKey } from "@/lib/documents/registry";

/**
 * Records that a document was generated: which template, when and by whom.
 * Never the file, its name or any of its contents.
 */
export async function recordGeneration(matterId: string, templateKey: string) {
  const member = await getCurrentMember();
  if (!isTemplateKey(templateKey)) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("document_history").insert({
    matter_id: matterId,
    template_key: templateKey,
    template_version: TEMPLATES[templateKey].version,
    generated_by: member.user_id,
  });
  if (error) return { ok: false as const };
  revalidatePath(`/matters/${matterId}/history`);
  return { ok: true as const };
}
