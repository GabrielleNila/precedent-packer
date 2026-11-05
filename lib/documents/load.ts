import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { getMatter } from "@/lib/matters";
import type { DocContext, PersonForDocs } from "./context";
import { DEFAULT_COURT_FORMAT, DEFAULT_LETTER_FORMAT, mergeFormat, mergeLetterhead } from "./firm";

/** Gathers everything the templates need for one matter, under RLS. */
export async function loadDocContext(matterId: string): Promise<DocContext | null> {
  const member = await getCurrentMember();
  const bundle = await getMatter(matterId);
  if (!bundle) return null;

  const supabase = await createClient();
  const ids = [bundle.matter.solicitor_id, bundle.matter.staff_id].filter((x): x is string => Boolean(x));
  const [people, settings] = await Promise.all([
    ids.length
      ? supabase.from("members").select("user_id, full_name, initials, email, job_title").in("user_id", ids)
      : Promise.resolve({ data: [] as PersonForDocs[] }),
    supabase
      .from("firm_settings")
      .select("letter_format, court_format, money_in_words, letterhead")
      .eq("firm_id", member.firm_id)
      .maybeSingle(),
  ]);
  const byId = new Map(((people.data ?? []) as PersonForDocs[]).map((p) => [p.user_id, p]));
  const s = settings.data;

  return {
    matter: bundle.matter,
    clients: bundle.parties.filter((p) => p.side === "client"),
    opposing: bundle.parties.filter((p) => p.side === "opposing"),
    solicitors: bundle.solicitors,
    chronology: bundle.chronology,
    solicitor: bundle.matter.solicitor_id ? byId.get(bundle.matter.solicitor_id) ?? null : null,
    staff: bundle.matter.staff_id ? byId.get(bundle.matter.staff_id) ?? null : null,
    letterhead: mergeLetterhead(s?.letterhead as Record<string, unknown> | null),
    letterFormat: mergeFormat(s?.letter_format as Record<string, unknown> | null, DEFAULT_LETTER_FORMAT),
    courtFormat: mergeFormat(s?.court_format as Record<string, unknown> | null, DEFAULT_COURT_FORMAT),
    moneyInWords: Boolean(s?.money_in_words),
  };
}

export type HistoryRow = { id: string; template_key: string; generated_at: string; generated_by_name: string };

export async function listDocumentHistory(matterId: string, limit = 50): Promise<HistoryRow[]> {
  await getCurrentMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_history")
    .select("id, template_key, generated_at, generated_by")
    .eq("matter_id", matterId)
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.generated_by).filter(Boolean))] as string[];
  const { data: names } = userIds.length
    ? await supabase.from("members").select("user_id, full_name").in("user_id", userIds)
    : { data: [] as { user_id: string; full_name: string }[] };
  const nameOf = new Map((names ?? []).map((n) => [n.user_id, n.full_name]));
  return rows.map((r) => ({
    id: r.id,
    template_key: r.template_key,
    generated_at: r.generated_at,
    generated_by_name: (r.generated_by && nameOf.get(r.generated_by)) || "Former member",
  }));
}
