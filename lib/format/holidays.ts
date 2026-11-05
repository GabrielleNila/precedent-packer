// Singapore gazetted public holidays, from MOM's announcements, including
// the Mondays observed when a holiday falls on a Sunday. Add the next year
// when MOM publishes it (usually in June).
// 2026: MOM's June 2025 announcement (Hari Raya dates were then provisional,
//       so re-check against https://www.mom.gov.sg/employment-practices/public-holidays).
// 2027: https://www.mom.gov.sg/newsroom/press-releases/2026/0618-public-holidays-for-2027
export const SG_PUBLIC_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-02-17": "Chinese New Year",
  "2026-02-18": "Chinese New Year",
  "2026-03-21": "Hari Raya Puasa",
  "2026-04-03": "Good Friday",
  "2026-05-01": "Labour Day",
  "2026-05-27": "Hari Raya Haji",
  "2026-05-31": "Vesak Day",
  "2026-06-01": "Vesak Day (observed)",
  "2026-08-09": "National Day",
  "2026-08-10": "National Day (observed)",
  "2026-11-08": "Deepavali",
  "2026-11-09": "Deepavali (observed)",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year's Day",
  "2027-02-06": "Chinese New Year",
  "2027-02-07": "Chinese New Year",
  "2027-02-08": "Chinese New Year (observed)",
  "2027-03-10": "Hari Raya Puasa",
  "2027-03-26": "Good Friday",
  "2027-05-01": "Labour Day",
  "2027-05-17": "Hari Raya Haji",
  "2027-05-20": "Vesak Day",
  "2027-08-09": "National Day",
  "2027-10-28": "Deepavali",
  "2027-12-25": "Christmas Day",
};

const KNOWN_YEARS = new Set(Object.keys(SG_PUBLIC_HOLIDAYS).map((d) => d.slice(0, 4)));

function toUtc(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "2026-11-05" + 14 -> "2026-11-19" (calendar days). */
export function addDays(iso: string, days: number): string {
  const dt = toUtc(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** A warning if the deadline isn't a working day, or null. */
export function deadlineWarning(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const day = toUtc(iso).getUTCDay();
  const ph = SG_PUBLIC_HOLIDAYS[iso];
  if (ph) return `This falls on a public holiday (${ph}).`;
  if (day === 0 || day === 6) return `This falls on a ${day === 0 ? "Sunday" : "Saturday"}.`;
  if (!KNOWN_YEARS.has(iso.slice(0, 4))) return `Public holidays for ${iso.slice(0, 4)} aren't loaded yet, so check this date manually.`;
  return null;
}
