import { formatLetterDate } from "@/lib/format/dates";
import { addDays } from "@/lib/format/holidays";
import { amountInWords, formatMoney, normaliseAmount } from "@/lib/format/money";
import { voice, type DocContext } from "../context";
import { b, t, val, type Block, type DocModel, type Run } from "../model";
import {
  defaultRe,
  letterClosing,
  letterheadFor,
  letterOpening,
  partyNames,
  resolveAddressee,
  sentenceFragment,
  weActFor,
  type LetterOptions,
} from "./letter-common";

export type LodOptions = LetterOptions & {
  days: number;
  amountInWords: boolean;
  includeBackground: boolean;
  /** Free text, one paragraph per blank-line-separated block. */
  position: string;
  /** Extra non-monetary demands, one per line. */
  demands: string;
  includeCostsClaimed: boolean;
};

export function lodDefaults(ctx: DocContext, today: string): LodOptions {
  const first = ctx.opposing[0];
  const sol = first?.solicitor_id ? ctx.solicitors.find((s) => s.id === first.solicitor_id) : undefined;
  return {
    date: today,
    addresseePartyId: first?.id ?? "",
    addressTo: "auto",
    delivery: ["email"],
    deliveryEmail: (sol ? sol.email : first?.email) ?? "",
    yourRef: (sol ? sol.reference : ctx.matter.their_ref) ?? "",
    withoutPrejudice: false,
    withoutPrejudiceLabel: "WITHOUT PREJUDICE",
    salutation: "auto",
    reSubject: "",
    enclosure: false,
    ccClient: true,
    days: 14,
    amountInWords: ctx.moneyInWords,
    includeBackground: true,
    position: "",
    demands: "",
    includeCostsClaimed: false,
  };
}

export function lodDeadline(opts: Pick<LodOptions, "date" | "days">): string {
  return opts.date ? addDays(opts.date, Math.max(1, Math.floor(opts.days || 0))) : "";
}

export function buildLod(ctx: DocContext, opts: LodOptions): DocModel {
  const addressee = resolveAddressee(ctx, opts);
  const v = voice(ctx, addressee.toSolicitors);
  const principal = normaliseAmount(ctx.matter.principal_sum);
  const costs = normaliseAmount(ctx.matter.costs_claimed);
  const deadline = lodDeadline(opts);
  const reDefault = defaultRe(ctx, principal ? `DEMAND FOR PAYMENT OF ${formatMoney(principal)}` : "LETTER OF DEMAND");

  const blocks: Block[] = letterOpening(ctx, opts, addressee, reDefault);
  blocks.push({ type: "para", id: "act", label: "We act for", numbered: 0, runs: weActFor(ctx, addressee) });

  // Background, from the chronology.
  const events = ctx.chronology.filter((e) => e.description.trim());
  if (opts.includeBackground && events.length) {
    blocks.push({ type: "para", id: "instructed", label: "Background intro", numbered: 0, keepNext: true, runs: [t("We are instructed as follows:")] });
    events.forEach((e, i) => {
      const end = i === events.length - 1 ? "." : i === events.length - 2 ? "; and" : ";";
      const date = formatLetterDate(e.event_date);
      const body = sentenceFragment(e.description, partyNames(ctx));
      blocks.push({
        type: "para",
        id: `fact-${e.id}`,
        label: `Background ${i + 1}`,
        numbered: 1,
        runs: [t(date ? `On ${date}, ${body}${end}` : `${body.charAt(0).toUpperCase()}${body.slice(1)}${end}`)],
      });
    });
  }

  // Optional "Our client's position".
  const position = opts.position.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (position.length) {
    blocks.push({ type: "heading", id: "position-heading", label: "Position heading", runs: [b(`${v.ourClientCap.toUpperCase()}’S POSITION`.replace("CLIENTS’S", "CLIENTS’"))] });
    position.forEach((p, i) => blocks.push({ type: "para", id: `position-${i}`, label: `Position ${i + 1}`, numbered: 0, runs: [t(p)] }));
  }

  // The demand.
  const sumRuns: Run[] = principal
    ? [b(formatMoney(principal)), ...(opts.amountInWords ? [t(` (${amountInWords(principal)})`)] : [])]
    : [val("", "PRINCIPAL SUM")];
  const deadlineRuns: Run[] = [val(formatLetterDate(deadline), "DEADLINE", { bold: true })];
  const costsRuns: Run[] =
    opts.includeCostsClaimed && costs ? [t(`, together with ${v.ourClientPossessive} costs of `), b(formatMoney(costs))] : [];
  const extraDemands = opts.demands.split(/\r?\n/).map((d) => d.trim().replace(/[.;]$/, "")).filter(Boolean);

  blocks.push({ type: "heading", id: "demand-heading", label: "Demand heading", runs: [b(`${v.ourClientCap.toUpperCase()}’S DEMAND`.replace("CLIENTS’S", "CLIENTS’"))] });

  if (!extraDemands.length) {
    blocks.push({
      type: "para",
      id: "demand",
      label: "Demand",
      numbered: 0,
      runs: [
        t(`We are instructed to demand, which we hereby do, that ${v.you} pay ${v.ourClient} the sum of `),
        ...sumRuns,
        t(" (the “"),
        b("Outstanding Sum"),
        t("”)"),
        ...costsRuns,
        t(`, within ${opts.days} days from the date of this letter, that is, by `),
        ...deadlineRuns,
        t("."),
      ],
    });
  } else {
    blocks.push({
      type: "para",
      id: "demand",
      label: "Demand intro",
      numbered: 0,
      keepNext: true,
      runs: [t(`We are instructed to demand that, within ${opts.days} days from the date of this letter, that is, by `), ...deadlineRuns, t(`, ${v.you}:`)],
    });
    const items: Run[][] = [
      [t(`pay ${v.ourClient} the sum of `), ...sumRuns, t(" (the “"), b("Outstanding Sum"), t("”)"), ...costsRuns],
      ...extraDemands.map((d) => [t(sentenceFragment(d, partyNames(ctx)))]),
    ];
    items.forEach((runs, i) => {
      const end = i === items.length - 1 ? "." : i === items.length - 2 ? "; and" : ";";
      blocks.push({ type: "para", id: `demand-${i}`, label: `Demand ${i + 1}`, numbered: 1, runs: [...runs, t(end)] });
    });
  }

  // Interest and the warning.
  const rate = ctx.matter.interest_rate === null || ctx.matter.interest_rate === "" ? null : Number(ctx.matter.interest_rate);
  const interestRuns: Run[] =
    rate !== null && !Number.isNaN(rate)
      ? [
          t(`contractual interest at the rate of ${rate}% per annum`),
          ...(ctx.matter.interest_start_date ? [t(` from ${formatLetterDate(ctx.matter.interest_start_date)}`)] : []),
          t(" until full payment"),
        ]
      : [t("interest")];

  blocks.push({
    type: "para",
    id: "warning",
    label: "Warning",
    numbered: 0,
    runs: [
      b("TAKE NOTICE"),
      t(` that should ${v.you} fail, refuse or neglect to pay the Outstanding Sum by `),
      ...deadlineRuns,
      t(`, ${v.ourClient} will, without further reference to ${v.you}, commence legal proceedings against ${v.you} for the recovery of the Outstanding Sum, together with `),
      ...interestRuns,
      t(` and costs, at ${v.yourOwn} own expense.`),
    ],
  });

  blocks.push(...letterClosing(ctx, opts));

  return {
    kind: "letter",
    title: "Letter of Demand",
    letterhead: letterheadFor(ctx),
    format: ctx.letterFormat,
    blocks,
  };
}
