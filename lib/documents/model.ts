// A small document model shared by the on-screen preview and the .docx
// writer, so what you see is what you download.

export type Run = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** A value the Matter Profile doesn't have yet. Highlighted in both outputs. */
  missing?: boolean;
};

export type NumberLevel = 0 | 1 | 2; // 1.  (a)  (i)

export type ParaBlock = {
  type: "para";
  /** Stable id so the user can override this paragraph's wording. */
  id?: string;
  runs: Run[];
  numbered?: NumberLevel;
  align?: "left" | "justify" | "center" | "right";
  keepNext?: boolean;
  spaceAfter?: "none" | "small" | "normal";
  /** Shown in the editor as the paragraph's label. */
  label?: string;
};

export type HeadingBlock = {
  type: "heading";
  id?: string;
  runs: Run[];
  /** Full-width rule under the heading (the RE: line in firm letters). */
  rule?: boolean;
  label?: string;
};

/** "Our ref : AW/..." style label/value rows. */
export type RefBlock = {
  type: "refs";
  rows: { label: string; value: Run[] }[];
};

/** Addressee on the left, delivery mode on the right. */
export type AddressBlock = {
  type: "address";
  lines: Run[][];
  right: Run[][];
};

export type SignatureBlock = {
  type: "signature";
  closing: string;
  firmScript: string;
  signatoryName: Run[];
  firmName: string;
};

export type SpacerBlock = { type: "spacer"; size?: "small" | "large" };

export type Block = ParaBlock | HeadingBlock | RefBlock | AddressBlock | SignatureBlock | SpacerBlock;

export type LetterheadData = {
  logoUrl: string;
  /** Right-hand block of the letterhead: label, value, optional italic note. */
  rows: { label: string; value: Run[]; note?: string }[];
  addressLine: string;
  extraLine?: string;
  footerText: string;
};

export type DocFormat = {
  font: string;
  fontSizePt: number;
  lineSpacing: number;
  justified: boolean;
  /** "dot" = a. / i. (firm letters); "paren" = (a) / (i) (pleadings). */
  subNumbering: "dot" | "paren";
  /** Page margin on all four sides, in inches. */
  marginInches: number;
};

export type DocModel = {
  kind: "letter" | "court";
  title: string;
  letterhead?: LetterheadData;
  format: DocFormat;
  blocks: Block[];
};

// ---------------------------------------------------------------------------
// Helpers for template authors
// ---------------------------------------------------------------------------

export const t = (text: string, extra: Omit<Run, "text"> = {}): Run => ({ text, ...extra });
export const b = (text: string, extra: Omit<Run, "text"> = {}): Run => ({ text, bold: true, ...extra });

/** The value, or a highlighted [LABEL] placeholder when it's blank. */
export function val(value: string | null | undefined, label: string, extra: Omit<Run, "text"> = {}): Run {
  const v = (value ?? "").trim();
  return v ? { text: v, ...extra } : { text: `[${label}]`, missing: true, ...extra };
}

export function hasMissing(blocks: Block[]): string[] {
  const found = new Set<string>();
  const scan = (runs: Run[]) => runs.forEach((r) => r.missing && found.add(r.text.replace(/^\[|\]$/g, "")));
  for (const blk of blocks) {
    if (blk.type === "para" || blk.type === "heading") scan(blk.runs);
    else if (blk.type === "refs") blk.rows.forEach((r) => scan(r.value));
    else if (blk.type === "address") [...blk.lines, ...blk.right].forEach(scan);
    else if (blk.type === "signature") scan(blk.signatoryName);
  }
  return [...found];
}

/** Plain text of some runs, used to seed the wording editor. */
export function runsToText(runs: Run[]): string {
  return runs.map((r) => (r.bold && !r.missing ? `**${r.text}**` : r.text)).join("");
}

/** Parses edited wording back into runs: **bold** and [PLACEHOLDER] are kept. */
export function textToRuns(text: string): Run[] {
  const out: Run[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\])/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ text: tok.slice(2, -2), bold: true });
    else if (/^\[[A-Z0-9 '’()/&.,-]+\]$/.test(tok)) out.push({ text: tok, missing: true });
    else out.push({ text: tok });
    last = m.index! + tok.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out.length ? out : [{ text: "" }];
}

/** Applies the user's per-document wording overrides. */
export function applyOverrides(blocks: Block[], overrides: Record<string, string>): Block[] {
  return blocks.map((blk) => {
    if ((blk.type === "para" || blk.type === "heading") && blk.id && overrides[blk.id] !== undefined) {
      return { ...blk, runs: textToRuns(overrides[blk.id]) };
    }
    return blk;
  });
}

/** Paragraph numbers as they will appear in Word: 1. then a./i. or (a)/(i). */
export function numberLabels(blocks: Block[], style: DocFormat["subNumbering"] = "paren"): Map<number, string> {
  const labels = new Map<number, string>();
  const counters = [0, 0, 0];
  blocks.forEach((blk, i) => {
    if (blk.type !== "para" || blk.numbered === undefined) return;
    const lvl = blk.numbered;
    counters[lvl] += 1;
    for (let l = lvl + 1; l < counters.length; l++) counters[l] = 0;
    const n = counters[lvl];
    const sub = lvl === 1 ? alpha(n) : roman(n);
    labels.set(i, lvl === 0 ? `${n}.` : style === "dot" ? `${sub}.` : `(${sub})`);
  });
  return labels;
}

export function alpha(n: number): string {
  let s = "";
  while (n > 0) {
    n -= 1;
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

export function roman(n: number): string {
  const map: [number, string][] = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let s = "";
  for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}
