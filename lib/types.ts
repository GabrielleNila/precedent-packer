export type MemberRole = "admin" | "member";
export type MatterStatus = "active" | "closed";
export type PartySide = "client" | "opposing";
export type PartyKind = "individual" | "company";
export type ClaimType =
  | "debt"
  | "breach_of_contract"
  | "defective_goods"
  | "renovation_dispute"
  | "tenancy"
  | "defamation"
  | "other";

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  debt: "Debt",
  breach_of_contract: "Breach of contract",
  defective_goods: "Defective goods",
  renovation_dispute: "Renovation dispute",
  tenancy: "Tenancy",
  defamation: "Defamation",
  other: "Other",
};

export type Member = {
  user_id: string;
  firm_id: string;
  full_name: string;
  initials: string;
  email: string;
  phone: string | null;
  role: MemberRole;
  is_solicitor: boolean;
  active: boolean;
  must_change_password: boolean;
  job_title?: string | null;
};

export type MatterRow = {
  id: string;
  firm_id: string;
  name: string;
  our_ref: string | null;
  their_ref: string | null;
  solicitor_id: string | null;
  staff_id: string | null;
  date_opened: string;
  status: MatterStatus;
  claim_type: ClaimType | null;
  claim_type_other: string | null;
  principal_sum: string | number | null;
  interest_rate: string | number | null;
  interest_start_date: string | null;
  costs_claimed: string | number | null;
  notes: string | null;
  updated_at: string;
};

export type PartyRow = {
  id: string;
  side: PartySide;
  kind: PartyKind;
  position: number;
  name: string;
  id_number: string | null;
  address: string | null;
  email: string | null;
  contact_person: string | null;
  solicitor_id: string | null;
};

export type SolicitorRow = {
  id: string;
  position: number;
  firm_name: string;
  address: string | null;
  reference: string | null;
  solicitor_name: string | null;
  email: string | null;
};

export type ChronologyRow = {
  id: string;
  position: number;
  event_date: string | null;
  description: string;
  supporting_document: string | null;
};

export type MatterListRow = {
  id: string;
  name: string;
  our_ref: string | null;
  their_ref: string | null;
  status: MatterStatus;
  claim_type: ClaimType | null;
  date_opened: string;
  updated_at: string;
  solicitor_id: string | null;
  client_names: string;
  opposing_names: string;
};
