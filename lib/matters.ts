import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import type {
  ChronologyRow,
  MatterListRow,
  MatterRow,
  MatterStatus,
  Member,
  PartyRow,
  SolicitorRow,
} from "@/lib/types";

// Data access for matters. Every function resolves the signed-in member
// first, and every query runs as that user under row level security.

export async function listMatters(opts: { q?: string; status?: MatterStatus | "all" }) {
  await getCurrentMember();
  const supabase = await createClient();
  let query = supabase
    .from("matter_list")
    .select("id, name, our_ref, their_ref, status, claim_type, date_opened, updated_at, solicitor_id, client_names, opposing_names")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);
  const q = (opts.q ?? "").trim().toLowerCase();
  if (q) {
    // Escape LIKE wildcards so a search for "50%" means literally that.
    const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    query = query.like("search_text", `%${escaped}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MatterListRow[];
}

export type MatterBundle = {
  matter: MatterRow;
  parties: PartyRow[];
  solicitors: SolicitorRow[];
  chronology: ChronologyRow[];
};

export async function getMatter(id: string): Promise<MatterBundle | null> {
  await getCurrentMember();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [m, p, s, c] = await Promise.all([
    supabase.from("matters").select("*").eq("id", id).maybeSingle(),
    supabase.from("matter_parties").select("*").eq("matter_id", id).order("position"),
    supabase.from("opposing_solicitors").select("*").eq("matter_id", id).order("position"),
    supabase.from("chronology_events").select("*").eq("matter_id", id).order("position"),
  ]);
  if (m.error) throw new Error(m.error.message);
  if (!m.data) return null;
  return {
    matter: m.data as MatterRow,
    parties: (p.data ?? []) as PartyRow[],
    solicitors: (s.data ?? []) as SolicitorRow[],
    chronology: (c.data ?? []) as ChronologyRow[],
  };
}

export type TeamMember = Pick<Member, "user_id" | "full_name" | "initials" | "is_solicitor" | "active" | "role" | "email">;

export async function listTeam(): Promise<TeamMember[]> {
  await getCurrentMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("user_id, full_name, initials, is_solicitor, active, role, email")
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMember[];
}

export async function getRefPattern(): Promise<string> {
  const member = await getCurrentMember();
  const supabase = await createClient();
  const { data } = await supabase
    .from("firm_settings")
    .select("ref_pattern")
    .eq("firm_id", member.firm_id)
    .maybeSingle();
  return data?.ref_pattern ?? "AW/[solicitor]/[staff]/[number]/[year]";
}
