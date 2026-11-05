import type { DocFormat } from "./model";

// Firm-level letterhead details. Taken from the firm's own letters; editable
// per firm in firm_settings.letterhead (Settings page in Phase 5).
export type FirmLetterhead = {
  firmName: string;          // "A.W. Law LLC" (script signature line)
  firmNameCaps: string;      // "A.W. LAW LLC"
  logoUrl: string;
  tel: string;
  fax: string;
  faxNote: string;
  addressLine: string;
  extraLine: string;         // e.g. GST registration; blank to hide
  footerText: string;
};

export const DEFAULT_LETTERHEAD: FirmLetterhead = {
  firmName: "A.W. Law LLC",
  firmNameCaps: "A.W. LAW LLC",
  logoUrl: "/letterhead/aw-logo.png",
  tel: "6733 0021",
  fax: "6733 2377",
  faxNote: "(We do not accept service of Court Documents by Fax)",
  addressLine: "133 New Bridge Road #20-03 Chinatown Point Singapore 059413",
  extraLine: "",
  footerText:
    "A.W. LAW LLC (UEN Number: 201919619Z) is a law corporation with limited liability. The contents of this " +
    "letter are strictly confidential and may contain privileged information. This letter is intended for the " +
    "sole use of the addressee. If you have received this in error, please contact us IMMEDIATELY.",
};

export const DEFAULT_LETTER_FORMAT: DocFormat = {
  font: "Times New Roman",
  fontSizePt: 12,
  lineSpacing: 1.5,
  justified: true,
  subNumbering: "dot",
};

export const DEFAULT_COURT_FORMAT: DocFormat = {
  font: "Times New Roman",
  fontSizePt: 12,
  lineSpacing: 1.5,
  justified: true,
  subNumbering: "paren",
};

type Json = Record<string, unknown> | null | undefined;

export function mergeLetterhead(stored: Json): FirmLetterhead {
  return { ...DEFAULT_LETTERHEAD, ...(stored ?? {}) } as FirmLetterhead;
}

export function mergeFormat(stored: Json, fallback: DocFormat): DocFormat {
  const s = (stored ?? {}) as Partial<DocFormat> & { fontSizePt?: number };
  return {
    font: typeof s.font === "string" && s.font ? s.font : fallback.font,
    fontSizePt: typeof s.fontSizePt === "number" ? s.fontSizePt : fallback.fontSizePt,
    lineSpacing: typeof s.lineSpacing === "number" ? s.lineSpacing : fallback.lineSpacing,
    justified: typeof s.justified === "boolean" ? s.justified : fallback.justified,
    subNumbering: s.subNumbering === "dot" || s.subNumbering === "paren" ? s.subNumbering : fallback.subNumbering,
  };
}
