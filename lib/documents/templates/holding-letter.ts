import { formatLetterDate } from "@/lib/format/dates";
import { joinNames, voice, type DocContext } from "../context";
import { t, val, type Block, type DocModel, type Run } from "../model";
import {
  defaultRe,
  letterClosing,
  letterheadFor,
  letterOpening,
  resolveAddressee,
  type LetterOptions,
} from "./letter-common";

export type HoldingOptions = LetterOptions & {
  theirLetterDate: string;
  theirLetterRef: string;
  nonAdmission: boolean;
};

export function holdingDefaults(ctx: DocContext, today: string): HoldingOptions {
  const first = ctx.opposing[0];
  const sol = first?.solicitor_id ? ctx.solicitors.find((s) => s.id === first.solicitor_id) : undefined;
  const ref = (sol ? sol.reference : ctx.matter.their_ref) ?? "";
  return {
    date: today,
    addresseePartyId: first?.id ?? "",
    addressTo: "auto",
    delivery: ["email"],
    deliveryEmail: (sol ? sol.email : first?.email) ?? "",
    yourRef: ref,
    withoutPrejudice: false,
    withoutPrejudiceLabel: "WITHOUT PREJUDICE",
    salutation: "auto",
    reSubject: "",
    enclosure: false,
    ccClient: true,
    theirLetterDate: "",
    theirLetterRef: ref,
    nonAdmission: false,
  };
}

export function buildHoldingLetter(ctx: DocContext, opts: HoldingOptions): DocModel {
  const addressee = resolveAddressee(ctx, opts);
  const v = voice(ctx, addressee.toSolicitors);
  const blocks: Block[] = letterOpening(ctx, opts, addressee, defaultRe(ctx, ""));

  const names = ctx.clients.map((c) => c.name).filter(Boolean);
  const clientRuns: Run[] = names.length ? [t(joinNames(names))] : [val("", "CLIENT")];
  const refRuns: Run[] = opts.theirLetterRef.trim() ? [t(` (your reference: ${opts.theirLetterRef.trim()})`)] : [];

  blocks.push({
    type: "para",
    id: "acknowledge",
    label: "Acknowledgement",
    numbered: 0,
    runs: [
      t("We act for "),
      ...clientRuns,
      t(" in the above matter, and acknowledge receipt of your letter dated "),
      val(formatLetterDate(opts.theirLetterDate), "DATE OF THEIR LETTER"),
      ...refRuns,
      t("."),
    ],
  });
  blocks.push({
    type: "para",
    id: "instructions",
    label: "Taking instructions",
    numbered: 0,
    runs: [t(`We are presently taking ${v.ourClientPossessive} instructions on the matters raised in your letter, and will revert in due course.`)],
  });
  if (opts.nonAdmission) {
    blocks.push({
      type: "para",
      id: "non-admission",
      label: "Non-admission",
      numbered: 0,
      runs: [t("Nothing in this letter is to be taken as an admission of any of the matters stated in your letter.")],
    });
  }
  blocks.push(...letterClosing(ctx, opts));

  return {
    kind: "letter",
    title: "Holding Letter",
    letterhead: letterheadFor(ctx),
    format: ctx.letterFormat,
    blocks,
  };
}
