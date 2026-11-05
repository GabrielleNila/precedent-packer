import { z } from "zod";
import { normaliseAmount } from "@/lib/format/money";

const optionalText = z.string().trim().max(2000).optional().or(z.literal(""));
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .optional()
  .or(z.literal(""));
const money = z
  .string()
  .optional()
  .refine((v) => !v || normaliseAmount(v) !== null, "Enter an amount like 12,345.67");
const email = z.string().trim().email("Enter a valid email").optional().or(z.literal(""));
const uuid = z.string().uuid();

export const partySchema = z
  .object({
    id: uuid,
    kind: z.enum(["individual", "company"]),
    name: z.string().trim().min(1, "Name is required").max(300),
    id_number: optionalText,
    address: optionalText,
    email,
    contact_person: optionalText,
    solicitor_id: z.string().optional().or(z.literal("")),
  });

export const solicitorSchema = z.object({
  id: uuid,
  firm_name: z.string().trim().min(1, "Firm name is required").max(300),
  address: optionalText,
  reference: optionalText,
  solicitor_name: optionalText,
  email,
});

export const chronologySchema = z.object({
  id: uuid,
  event_date: isoDate,
  description: z.string().trim().min(1, "Describe the event").max(4000),
  supporting_document: optionalText,
});

export const matterFormSchema = z
  .object({
    id: z.string().optional(),
    expected_updated_at: z.string().optional(),
    name: z.string().trim().min(1, "Matter name is required").max(300),
    our_ref: optionalText,
    their_ref: optionalText,
    solicitor_id: z.string().optional().or(z.literal("")),
    staff_id: z.string().optional().or(z.literal("")),
    date_opened: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
    status: z.enum(["active", "closed"]),
    claim_type: z
      .enum(["", "debt", "breach_of_contract", "defective_goods", "renovation_dispute", "tenancy", "defamation", "other"])
      .optional(),
    claim_type_other: optionalText,
    principal_sum: money,
    interest_rate: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d{1,3}(\.\d{1,3})?$/.test(v) && Number(v) <= 100), "Enter a rate like 5.33"),
    interest_start_date: isoDate,
    costs_claimed: money,
    notes: z.string().max(20000).optional().or(z.literal("")),
    clients: z.array(partySchema),
    opposing: z.array(partySchema),
    solicitors: z.array(solicitorSchema),
    chronology: z.array(chronologySchema),
  })
  .superRefine((v, ctx) => {
    if (v.claim_type === "other" && !v.claim_type_other?.trim()) {
      ctx.addIssue({ code: "custom", path: ["claim_type_other"], message: "Describe the claim type" });
    }
  });

export type MatterFormValues = z.infer<typeof matterFormSchema>;
export type PartyFormValues = z.infer<typeof partySchema>;

/** Shape sent to the save_matter database function. */
export function toSavePayload(v: MatterFormValues) {
  const party = (side: "client" | "opposing") => (p: PartyFormValues) => ({
    id: p.id,
    side,
    kind: p.kind,
    name: p.name.trim(),
    id_number: p.id_number ?? "",
    address: p.address ?? "",
    email: p.kind === "individual" ? (p.email ?? "") : "",
    contact_person: p.kind === "company" ? (p.contact_person ?? "") : "",
    solicitor_id: side === "opposing" ? (p.solicitor_id ?? "") : "",
  });
  return {
    id: v.id ?? "",
    expected_updated_at: v.expected_updated_at ?? "",
    name: v.name.trim(),
    our_ref: v.our_ref ?? "",
    their_ref: v.their_ref ?? "",
    solicitor_id: v.solicitor_id ?? "",
    staff_id: v.staff_id ?? "",
    date_opened: v.date_opened,
    status: v.status,
    claim_type: v.claim_type ?? "",
    claim_type_other: v.claim_type === "other" ? (v.claim_type_other ?? "") : "",
    principal_sum: normaliseAmount(v.principal_sum) ?? "",
    interest_rate: v.interest_rate ?? "",
    interest_start_date: v.interest_start_date ?? "",
    costs_claimed: normaliseAmount(v.costs_claimed) ?? "",
    notes: v.notes ?? "",
    solicitors: v.solicitors,
    parties: [...v.clients.map(party("client")), ...v.opposing.map(party("opposing"))],
    chronology: v.chronology,
  };
}
