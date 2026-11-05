// Money is handled as a string of digits to avoid floating-point rounding.

/** Accepts "12345.6", "12,345.67", "S$12,345.67". Returns "12345.67" or null if not a valid amount. */
export function normaliseAmount(input: string | number | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().replace(/^S\$\s*/i, "").replace(/,/g, "");
  if (s === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return `${BigInt(whole).toString()}.${frac.padEnd(2, "0")}`;
}

/** "12345.67" -> "S$12,345.67" */
export function formatMoney(input: string | number | null | undefined): string {
  const n = normaliseAmount(input);
  if (n === null) return "";
  const [whole, frac] = n.split(".");
  return `S$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

function underHundred(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t}-${o}` : t;
}

/** British style: 345 -> "Three Hundred and Forty-Five". */
function underThousand(n: number, isLowestGroup: boolean, hasHigher: boolean): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) {
    // "and" after hundreds, and before a bare final group under 100
    // (e.g. "One Thousand and Five").
    if (h || (isLowestGroup && hasHigher)) parts.push("and");
    parts.push(underHundred(rest));
  }
  return parts.join(" ");
}

export function integerToWords(value: bigint): string {
  if (value === BigInt(0)) return "Zero";
  const groups: number[] = [];
  let v = value;
  const thousand = BigInt(1000);
  while (v > BigInt(0)) {
    groups.push(Number(v % thousand));
    v /= thousand;
  }
  if (groups.length > SCALES.length) throw new Error("Amount too large to write in words");
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (!g) continue;
    const hasHigher = groups.slice(i + 1).some(Boolean);
    const chunk = underThousand(g, i === 0, hasHigher);
    words.push(SCALES[i] ? `${chunk} ${SCALES[i]}` : chunk);
  }
  return words.join(" ");
}

/**
 * "12345.67" -> "Singapore Dollars Twelve Thousand Three Hundred and Forty-Five and Cents Sixty-Seven".
 * Whole dollars: "Singapore Dollars Five Hundred Only".
 */
export function amountInWords(input: string | number | null | undefined): string {
  const n = normaliseAmount(input);
  if (n === null) return "";
  const [whole, frac] = n.split(".");
  const dollars = `Singapore Dollars ${integerToWords(BigInt(whole))}`;
  const cents = Number(frac);
  return cents ? `${dollars} and Cents ${underHundred(cents)}` : `${dollars} Only`;
}
