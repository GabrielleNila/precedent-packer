import type { ChronologyRow, MatterRow, PartyKind, PartyRow, SolicitorRow } from "@/lib/types";
import type { MatterFormValues, PartyFormValues } from "./matter";
import { todayInSingapore } from "@/lib/format/dates";

const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function newId() {
  return crypto.randomUUID();
}

export function emptyParty(kind: PartyKind = "individual"): PartyFormValues {
  return { id: newId(), kind, name: "", id_number: "", address: "", email: "", contact_person: "", solicitor_id: "" };
}

export function emptyMatter(): MatterFormValues {
  return {
    name: "",
    our_ref: "",
    their_ref: "",
    solicitor_id: "",
    staff_id: "",
    date_opened: todayInSingapore(),
    status: "active",
    claim_type: "",
    claim_type_other: "",
    principal_sum: "",
    interest_rate: "",
    interest_start_date: "",
    costs_claimed: "",
    notes: "",
    clients: [emptyParty("individual")],
    opposing: [emptyParty("individual")],
    solicitors: [],
    chronology: [],
  };
}

function partyToForm(p: PartyRow): PartyFormValues {
  return {
    id: p.id,
    kind: p.kind,
    name: p.name,
    id_number: s(p.id_number),
    address: s(p.address),
    email: s(p.email),
    contact_person: s(p.contact_person),
    solicitor_id: s(p.solicitor_id),
  };
}

export function toFormValues(b: {
  matter: MatterRow;
  parties: PartyRow[];
  solicitors: SolicitorRow[];
  chronology: ChronologyRow[];
}): MatterFormValues {
  const m = b.matter;
  return {
    id: m.id,
    expected_updated_at: m.updated_at,
    name: m.name,
    our_ref: s(m.our_ref),
    their_ref: s(m.their_ref),
    solicitor_id: s(m.solicitor_id),
    staff_id: s(m.staff_id),
    date_opened: m.date_opened,
    status: m.status,
    claim_type: m.claim_type ?? "",
    claim_type_other: s(m.claim_type_other),
    principal_sum: s(m.principal_sum),
    interest_rate: m.interest_rate === null ? "" : String(Number(m.interest_rate)),
    interest_start_date: s(m.interest_start_date),
    costs_claimed: s(m.costs_claimed),
    notes: s(m.notes),
    clients: b.parties.filter((p) => p.side === "client").map(partyToForm),
    opposing: b.parties.filter((p) => p.side === "opposing").map(partyToForm),
    solicitors: b.solicitors.map((x) => ({
      id: x.id,
      firm_name: x.firm_name,
      address: s(x.address),
      reference: s(x.reference),
      solicitor_name: s(x.solicitor_name),
      email: s(x.email),
    })),
    chronology: b.chronology.map((c) => ({
      id: c.id,
      event_date: s(c.event_date),
      description: c.description,
      supporting_document: s(c.supporting_document),
    })),
  };
}
