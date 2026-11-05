export type ReferenceParts = {
  solicitor?: string | null;
  staff?: string | null;
  number?: string | null;
  year?: string | number | null;
};

/**
 * Fills a pattern such as "AW/[solicitor]/[staff]/[number]/[year]".
 * Unfilled tokens are left in place so the gap is visible.
 * Tokens are case-insensitive. Initials keep the case the firm uses.
 */
export function buildReference(pattern: string, parts: ReferenceParts): string {
  const values: Record<string, string> = {
    solicitor: (parts.solicitor ?? "").trim(),
    staff: (parts.staff ?? "").trim(),
    number: (parts.number ?? "").trim(),
    year: parts.year === null || parts.year === undefined ? "" : String(parts.year).trim(),
  };
  return pattern.replace(/\[(solicitor|staff|number|year)\]/gi, (token, name: string) => {
    const v = values[name.toLowerCase()];
    return v ? v : token;
  });
}
