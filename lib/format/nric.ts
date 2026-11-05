// NRIC/FIN helpers. Masking is for display only; the full number is stored
// and is still subject to row level security.

const NRIC_FIN = /^[STFGM]\d{7}[A-Z]$/;

export function normaliseIdNumber(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toUpperCase();
}

/** "S1234123A" -> "S****123A". Anything not 9 characters is fully masked except the last 4. */
export function maskNric(value: string | null | undefined): string {
  const v = normaliseIdNumber(value);
  if (!v) return "";
  if (v.length === 9) return `${v[0]}****${v.slice(5)}`;
  if (v.length <= 4) return "*".repeat(v.length);
  return `${"*".repeat(v.length - 4)}${v.slice(-4)}`;
}

const WEIGHTS = [2, 7, 6, 5, 4, 3, 2];
const ST = "JZIHGFEDCBA";
const FG = "XWUTRQPNMLK";
const M = "KLJNPQRTUWX";

/**
 * Checks the shape and, for S/T/F/G/M numbers, the check letter.
 * Used only to warn; the user can always save what they typed.
 */
export function checkNricFin(value: string | null | undefined): { ok: boolean; reason?: string } {
  const v = normaliseIdNumber(value);
  if (!v) return { ok: true };
  if (!NRIC_FIN.test(v)) {
    return { ok: false, reason: "Expected a letter, 7 digits and a letter, e.g. S1234567D" };
  }
  const prefix = v[0];
  const digits = v.slice(1, 8).split("").map(Number);
  let sum = digits.reduce((acc, d, i) => acc + d * WEIGHTS[i], 0);
  if (prefix === "T" || prefix === "G") sum += 4;
  if (prefix === "M") sum += 3;
  const table = prefix === "S" || prefix === "T" ? ST : prefix === "M" ? M : FG;
  const expected = prefix === "M" ? table[10 - (sum % 11)] : table[sum % 11];
  if (expected !== v[8]) {
    return { ok: false, reason: `Check letter looks wrong (expected ${expected}). Please double-check.` };
  }
  return { ok: true };
}
