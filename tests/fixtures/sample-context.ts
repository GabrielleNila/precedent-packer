// Obviously fake sample data for tests. Never put real client details here.
import type { DocContext } from "@/lib/documents/context";
import { DEFAULT_COURT_FORMAT, DEFAULT_LETTER_FORMAT, DEFAULT_LETTERHEAD } from "@/lib/documents/firm";

export function sampleContext(overrides: Partial<DocContext> = {}): DocContext {
  return {
    matter: {
      id: "00000000-0000-0000-0000-000000000001",
      firm_id: "00000000-0000-0000-0000-00000000000a",
      name: "Sample Client v Test Debtor",
      our_ref: "AW/XX/yy/0001/2026",
      their_ref: "INV-0001",
      solicitor_id: "u-sol",
      staff_id: "u-staff",
      date_opened: "2026-11-01",
      status: "active",
      claim_type: "debt",
      claim_type_other: null,
      principal_sum: "12345.67",
      interest_rate: "5.333",
      interest_start_date: "2026-04-01",
      costs_claimed: "800",
      notes: null,
      updated_at: "2026-11-05T00:00:00Z",
    },
    clients: [
      {
        id: "p-client", side: "client", kind: "company", position: 0,
        name: "Sample Client Pte. Ltd.", id_number: "000000000X",
        address: "1 Example Road #01-01, Singapore 000001", email: null,
        contact_person: "Ms Example Tan", solicitor_id: null,
      },
    ],
    opposing: [
      {
        id: "p-opp", side: "opposing", kind: "individual", position: 0,
        name: "Test Debtor", id_number: "S1234567D",
        address: "Blk 2 Sample Street #02-02\nSingapore 000002", email: "debtor@example.test",
        contact_person: null, solicitor_id: null,
      },
    ],
    solicitors: [],
    chronology: [
      { id: "c1", position: 0, event_date: "2026-01-05", description: "The parties entered into a sample services agreement.", supporting_document: "Agreement" },
      { id: "c2", position: 1, event_date: "2026-03-01", description: "Our client rendered Invoice No. 0001 for S$12,345.67, payable within 30 days.", supporting_document: "Invoice No. 0001" },
      { id: "c3", position: 2, event_date: "2026-04-01", description: "Payment fell due, but you did not pay any part of the invoice.", supporting_document: null },
    ],
    solicitor: { user_id: "u-sol", full_name: "Sample Solicitor", initials: "SS", email: "solicitor@example.test", job_title: "Solicitor" },
    staff: { user_id: "u-staff", full_name: "Sample Paralegal", initials: "sp", email: "paralegal@example.test", job_title: "Paralegal" },
    letterhead: DEFAULT_LETTERHEAD,
    letterFormat: DEFAULT_LETTER_FORMAT,
    courtFormat: DEFAULT_COURT_FORMAT,
    moneyInWords: true,
    ...overrides,
  };
}
