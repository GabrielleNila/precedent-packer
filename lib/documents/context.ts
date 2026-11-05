import type { ChronologyRow, MatterRow, PartyRow, SolicitorRow } from "@/lib/types";
import type { DocFormat } from "./model";
import type { FirmLetterhead } from "./firm";

export type PersonForDocs = {
  user_id: string;
  full_name: string;
  initials: string;
  email: string;
  job_title: string | null;
};

/** Everything a template may read. Built on the server, passed to the browser. */
export type DocContext = {
  matter: MatterRow;
  clients: PartyRow[];
  opposing: PartyRow[];
  solicitors: SolicitorRow[];
  chronology: ChronologyRow[];
  solicitor: PersonForDocs | null; // solicitor in charge = the "Writer"
  staff: PersonForDocs | null;
  letterhead: FirmLetterhead;
  letterFormat: DocFormat;
  courtFormat: DocFormat;
  moneyInWords: boolean;
};

export function joinNames(names: string[]): string {
  const n = names.filter(Boolean);
  if (n.length <= 1) return n[0] ?? "";
  return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
}

/** Splits a stored address into letter lines, putting "Singapore 123456" on its own line. */
export function addressLines(address: string | null | undefined): string[] {
  const raw = (address ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const line of raw) {
    const m = /^(.*?)[,\s]+(Singapore\s+\d{6})\.?$/i.exec(line);
    if (m && m[1]) out.push(m[1].replace(/,$/, ""), m[2]);
    else out.push(line.replace(/,$/, ""));
  }
  return out;
}

/** How the letter refers to the two sides, depending on who it's addressed to. */
export function voice(ctx: DocContext, toSolicitors: boolean) {
  const plural = ctx.clients.length > 1;
  return {
    ourClient: plural ? "our clients" : "our client",
    ourClientCap: plural ? "Our clients" : "Our client",
    ourClientPossessive: plural ? "our clients’" : "our client’s",
    you: toSolicitors ? "your client" : "you",
    youCap: toSolicitors ? "Your client" : "You",
    yourOwn: toSolicitors ? "your client’s" : "your",
    // verb agreement for "you pay" vs "your client pays"
    youPay: toSolicitors ? "your client pays" : "you pay",
  };
}
