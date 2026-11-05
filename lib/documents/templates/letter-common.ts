import { formatLetterDate } from "@/lib/format/dates";
import { addressLines, joinNames, type DocContext } from "../context";
import { b, t, val, type Block, type LetterheadData, type Run } from "../model";

export type DeliveryMode = "email" | "hand" | "post";

/** Options every letter shares. */
export type LetterOptions = {
  date: string;
  addresseePartyId: string;
  /** "auto": their solicitors if the party is represented, otherwise the party. */
  addressTo: "auto" | "party" | "solicitors";
  delivery: DeliveryMode[];
  deliveryEmail: string;
  yourRef: string;
  withoutPrejudice: boolean;
  withoutPrejudiceLabel: string;
  salutation: "auto" | "Dear Sirs," | "Dear Sir/Madam," | "Dear Sir," | "Dear Madam,";
  reSubject: string;
  enclosure: boolean;
  ccClient: boolean;
};

export type Addressee = {
  toSolicitors: boolean;
  lines: Run[][];
  email: string;
  reference: string;
  salutation: string;
  partyName: string;
};

export function resolveAddressee(ctx: DocContext, opts: Pick<LetterOptions, "addresseePartyId" | "addressTo">): Addressee {
  const party = ctx.opposing.find((p) => p.id === opts.addresseePartyId) ?? ctx.opposing[0];
  const sol = party?.solicitor_id ? ctx.solicitors.find((s) => s.id === party.solicitor_id) : undefined;
  const toSolicitors = opts.addressTo === "solicitors" || (opts.addressTo === "auto" && Boolean(sol));

  if (toSolicitors) {
    const s = sol ?? ctx.solicitors[0];
    const lines: Run[][] = [[val(s?.firm_name, "OPPOSING SOLICITORS", { bold: true })]];
    const addr = addressLines(s?.address);
    lines.push(...(addr.length ? addr.map((l) => [t(l)]) : [[val("", "SOLICITORS' ADDRESS")]]));
    if (s?.solicitor_name) lines.push([t(`Attn: ${s.solicitor_name}`)]);
    return {
      toSolicitors: true,
      lines,
      email: s?.email ?? "",
      reference: s?.reference ?? "",
      salutation: "Dear Sirs,",
      partyName: party?.name ?? "",
    };
  }

  const lines: Run[][] = [[val(party?.name, "OPPOSING PARTY", { bold: true })]];
  const addr = addressLines(party?.address);
  lines.push(...(addr.length ? addr.map((l) => [t(l)]) : [[val("", "ADDRESS")]]));
  if (party?.kind === "company" && party.contact_person) lines.push([t(`Attn: ${party.contact_person}`)]);
  return {
    toSolicitors: false,
    lines,
    email: party?.email ?? "",
    reference: ctx.matter.their_ref ?? "",
    salutation: party?.kind === "company" ? "Dear Sirs," : "Dear Sir/Madam,",
    partyName: party?.name ?? "",
  };
}

export function letterheadFor(ctx: DocContext): LetterheadData {
  const lh = ctx.letterhead;
  const rows: LetterheadData["rows"] = [
    { label: "Writer", value: [val(ctx.solicitor?.full_name, "SOLICITOR IN CHARGE")] },
    { label: "Email", value: [val(ctx.solicitor?.email, "SOLICITOR'S EMAIL")] },
  ];
  if (ctx.staff && ctx.staff.user_id !== ctx.solicitor?.user_id) {
    rows.push(
      { label: ctx.staff.job_title || "Staff", value: [t(ctx.staff.full_name)] },
      { label: "Email", value: [t(ctx.staff.email)] },
    );
  }
  rows.push({ label: "Tel", value: [t(lh.tel)] }, { label: "Fax", value: [t(lh.fax)], note: lh.faxNote || undefined });
  return {
    logoUrl: lh.logoUrl,
    rows,
    addressLine: lh.addressLine,
    extraLine: lh.extraLine || undefined,
    footerText: lh.footerText,
  };
}

export function deliveryRuns(modes: DeliveryMode[], email: string): Run[][] {
  const names: Record<DeliveryMode, string> = { email: "Email", hand: "Hand", post: "Registered Post" };
  const ordered = (["post", "hand", "email"] as DeliveryMode[]).filter((m) => modes.includes(m));
  if (!ordered.length) return [[val("", "DELIVERY MODE")]];
  const first: Run[] = [t("By ")];
  ordered.forEach((m, i) => {
    if (i > 0) first.push(t(i === ordered.length - 1 ? " and " : ", "));
    first.push(b(names[m]));
  });
  if (!ordered.includes("email")) return [[...first, t(" only")]];
  return [first, [t("("), val(email, "EMAIL ADDRESS"), t(") only")]];
}

export function defaultRe(ctx: DocContext, subject: string): string {
  const clients = joinNames(ctx.clients.map((c) => c.name)) || "[CLIENT]";
  const opposing = joinNames(ctx.opposing.map((c) => c.name)) || "[OPPOSING PARTY]";
  const parties = `${clients.toUpperCase()} v ${opposing.toUpperCase()}`;
  return subject ? `${parties} – ${subject.toUpperCase()}` : parties;
}

/** Ref block, WP marking, addressee and salutation, and RE: heading. */
export function letterOpening(ctx: DocContext, opts: LetterOptions, addressee: Addressee, reDefault: string): Block[] {
  const blocks: Block[] = [];
  const yourRef = opts.yourRef.trim();
  blocks.push({
    type: "refs",
    rows: [
      { label: "Our ref", value: [val(ctx.matter.our_ref, "OUR REF")] },
      ...(yourRef ? [{ label: "Your ref", value: [t(yourRef)] }] : []),
      { label: "Date", value: [val(formatLetterDate(opts.date), "DATE")] },
    ],
  });
  if (opts.withoutPrejudice) {
    blocks.push({
      type: "para",
      id: "wp",
      label: "Without prejudice marking",
      runs: [b(opts.withoutPrejudiceLabel || "WITHOUT PREJUDICE", { underline: true })],
      align: "left",
    });
  }
  blocks.push({ type: "address", lines: addressee.lines, right: deliveryRuns(opts.delivery, opts.deliveryEmail) });
  const salutation = opts.salutation === "auto" ? addressee.salutation : opts.salutation;
  blocks.push({ type: "para", id: "salutation", label: "Salutation", runs: [t(salutation)], align: "left" });
  blocks.push({
    type: "heading",
    id: "re",
    label: "Heading",
    rule: true,
    runs: [b(opts.reSubject.trim() || reDefault)],
  });
  return blocks;
}

export function letterClosing(ctx: DocContext, opts: LetterOptions, reserveId = "reserve"): Block[] {
  const blocks: Block[] = [];
  if (reserveId) {
    blocks.push({
      type: "para",
      id: reserveId,
      label: "Reservation of rights",
      numbered: 0,
      runs: [t(`In the interim, all ${ctx.clients.length > 1 ? "our clients’" : "our client’s"} rights are fully and expressly reserved.`)],
    });
  }
  blocks.push({
    type: "signature",
    closing: "Yours faithfully,",
    firmScript: ctx.letterhead.firmName,
    signatoryName: [val(ctx.solicitor?.full_name?.toUpperCase(), "SOLICITOR IN CHARGE")],
    firmName: ctx.letterhead.firmNameCaps,
  });
  if (opts.enclosure) blocks.push({ type: "para", id: "encl", label: "Enclosure", runs: [t("Encl.")], align: "left", spaceAfter: "none" });
  if (opts.ccClient) blocks.push({ type: "para", id: "cc", label: "Copy", runs: [t("Cc Client")], align: "left", spaceAfter: "none" });
  return blocks;
}

/** "We act for X (“our client”) in the above matter." with defined term. */
export function weActFor(ctx: DocContext, addressee: Addressee): Run[] {
  const names = ctx.clients.map((c) => c.name).filter(Boolean);
  const out: Run[] = [t("We act for ")];
  if (!names.length) out.push(val("", "CLIENT"));
  names.forEach((n, i) => {
    if (i > 0) out.push(t(i === names.length - 1 ? " and " : ", "));
    out.push(t(n));
  });
  out.push(t(" in the above matter."));
  if (addressee.toSolicitors) {
    out.push(t(" We understand that you act for "), val(addressee.partyName, "OPPOSING PARTY"), t("."));
  }
  return out;
}

/**
 * Fits a sentence typed in the profile into the middle of a letter sentence
 * ("On 5 January 2026, payment fell due"). Lower-cases the first word unless
 * it looks like a name: a title (Mr, Dr...), an acronym, or a word that
 * appears in one of the parties' names.
 */
export function sentenceFragment(text: string, names: string[] = []): string {
  const s = text.trim().replace(/[.;]\s*$/, "");
  const [first = "", second = ""] = s.split(/\s+/);
  const protectedWords = new Set(
    names.flatMap((n) => n.split(/[\s,.()]+/)).filter((w) => /^[A-Z]/.test(w)).map((w) => w.toLowerCase()),
  );
  const isTitle = /^(Mr|Mrs|Ms|Mdm|Madam|Dr|Prof|Mr\.|Mrs\.|Ms\.|Dr\.)$/.test(first);
  const isAcronym = /^[A-Z0-9]{2,}/.test(first);
  const looksLikeName = protectedWords.has(first.toLowerCase().replace(/[’']s$/, "")) || (/^[A-Z]/.test(second) && !/^(I)$/.test(second));
  if (!/^[A-Z][a-z]/.test(first) || isTitle || isAcronym || looksLikeName) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function partyNames(ctx: DocContext): string[] {
  return [...ctx.clients, ...ctx.opposing].map((p) => p.name).concat(ctx.solicitors.map((x) => x.firm_name));
}
