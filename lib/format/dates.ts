const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parses "YYYY-MM-DD" as a calendar date (no time zone shifts). */
export function parseIsoDate(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** "2026-11-05" -> "5 November 2026" (letters). */
export function formatLetterDate(iso: string | null | undefined): string {
  const p = parseIsoDate(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : "";
}

/** "2026-11-05" -> "5th day of November 2026" (court documents). */
export function formatCourtDate(iso: string | null | undefined): string {
  const p = parseIsoDate(iso);
  return p ? `${ordinal(p.d)} day of ${MONTHS[p.m - 1]} ${p.y}` : "";
}

/** Today's date in Singapore as "YYYY-MM-DD". */
export function todayInSingapore(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}
