import { describe, expect, it } from "vitest";
import { checkNricFin, maskNric } from "@/lib/format/nric";
import { formatCourtDate, formatLetterDate, ordinal, todayInSingapore } from "@/lib/format/dates";
import { amountInWords, formatMoney, integerToWords, normaliseAmount } from "@/lib/format/money";
import { buildReference } from "@/lib/format/reference";

// All identifiers below are made up.

describe("maskNric", () => {
  it("masks the middle four characters", () => {
    expect(maskNric("S1234123A")).toBe("S****123A");
    expect(maskNric(" s1234123a ")).toBe("S****123A");
  });
  it("handles empty and odd lengths", () => {
    expect(maskNric("")).toBe("");
    expect(maskNric(null)).toBe("");
    expect(maskNric("AB12")).toBe("****");
    expect(maskNric("ABCDEFG123")).toBe("******G123");
  });
});

describe("checkNricFin", () => {
  it("accepts valid check letters", () => {
    expect(checkNricFin("S1234567D").ok).toBe(true);
    expect(checkNricFin("T1234567J").ok).toBe(true);
    expect(checkNricFin("F1234567N").ok).toBe(true);
    expect(checkNricFin("G1234567X").ok).toBe(true);
  });
  it("flags a wrong check letter or bad shape", () => {
    expect(checkNricFin("S1234567A").ok).toBe(false);
    expect(checkNricFin("12345").ok).toBe(false);
  });
  it("treats blank as fine", () => {
    expect(checkNricFin("").ok).toBe(true);
  });
});

describe("dates", () => {
  it("formats letter dates", () => {
    expect(formatLetterDate("2026-11-05")).toBe("5 November 2026");
    expect(formatLetterDate("")).toBe("");
  });
  it("formats court dates with ordinals", () => {
    expect(formatCourtDate("2026-11-05")).toBe("5th day of November 2026");
    expect(formatCourtDate("2026-11-01")).toBe("1st day of November 2026");
    expect(formatCourtDate("2026-11-22")).toBe("22nd day of November 2026");
    expect(formatCourtDate("2026-11-23")).toBe("23rd day of November 2026");
  });
  it("handles 11th-13th", () => {
    expect([11, 12, 13, 21, 111].map(ordinal)).toEqual(["11th", "12th", "13th", "21st", "111th"]);
  });
  it("uses Singapore time for today", () => {
    // 2026-11-04 17:00 UTC is already 5 November in Singapore.
    expect(todayInSingapore(new Date("2026-11-04T17:00:00Z"))).toBe("2026-11-05");
  });
});

describe("money", () => {
  it("normalises input", () => {
    expect(normaliseAmount("12,345.6")).toBe("12345.60");
    expect(normaliseAmount("S$ 1,000")).toBe("1000.00");
    expect(normaliseAmount("12.345")).toBeNull();
    expect(normaliseAmount("abc")).toBeNull();
  });
  it("formats with S$ and commas", () => {
    expect(formatMoney("12345.67")).toBe("S$12,345.67");
    expect(formatMoney("0")).toBe("S$0.00");
    expect(formatMoney("1234567.8")).toBe("S$1,234,567.80");
  });
  it("writes amounts in words", () => {
    expect(amountInWords("12345.67")).toBe(
      "Singapore Dollars Twelve Thousand Three Hundred and Forty-Five and Cents Sixty-Seven",
    );
    expect(amountInWords("500")).toBe("Singapore Dollars Five Hundred Only");
    expect(amountInWords("1005")).toBe("Singapore Dollars One Thousand and Five Only");
    expect(amountInWords("266753.50")).toBe(
      "Singapore Dollars Two Hundred and Sixty-Six Thousand Seven Hundred and Fifty-Three and Cents Fifty",
    );
    expect(amountInWords("1000000")).toBe("Singapore Dollars One Million Only");
  });
  it("handles zero", () => {
    expect(integerToWords(BigInt(0))).toBe("Zero");
  });
});

describe("buildReference", () => {
  it("fills the pattern", () => {
    expect(
      buildReference("AW/[solicitor]/[staff]/[number]/[year]", {
        solicitor: "XX", staff: "yy", number: "0001", year: 2026,
      }),
    ).toBe("AW/XX/yy/0001/2026");
  });
  it("leaves missing tokens visible", () => {
    expect(buildReference("AW/[solicitor]/[number]", { solicitor: "XX" })).toBe("AW/XX/[number]");
  });
});
