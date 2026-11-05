import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildLod, lodDefaults, lodDeadline } from "@/lib/documents/templates/lod";
import { buildHoldingLetter, holdingDefaults } from "@/lib/documents/templates/holding-letter";
import { applyOverrides, hasMissing, numberLabels, textToRuns, type Block } from "@/lib/documents/model";
import { docxBuffer } from "@/lib/documents/docx-writer";
import { deadlineWarning } from "@/lib/format/holidays";
import { sampleContext } from "./fixtures/sample-context";

const text = (blocks: Block[]) =>
  blocks
    .map((b) => (b.type === "para" || b.type === "heading" ? b.runs.map((r) => r.text).join("") : ""))
    .join("\n");

describe("Letter of Demand", () => {
  it("builds the expected structure", () => {
    const ctx = sampleContext();
    const opts = lodDefaults(ctx, "2026-11-05");
    const m = buildLod(ctx, opts);
    const body = text(m.blocks);
    expect(body).toContain("SAMPLE CLIENT PTE. LTD. v TEST DEBTOR – DEMAND FOR PAYMENT OF S$12,345.67");
    expect(body).toContain("We act for Sample Client Pte. Ltd. in the above matter.");
    expect(body).toContain("On 5 January 2026, the parties entered into a sample services agreement;");
    expect(body).toContain("On 1 April 2026, payment fell due, but you did not pay any part of the invoice.");
    expect(body).toContain("Singapore Dollars Twelve Thousand Three Hundred and Forty-Five and Cents Sixty-Seven");
    expect(body).toContain("within 14 days from the date of this letter, that is, by 19 November 2026.");
    expect(body).toContain("contractual interest at the rate of 5.333% per annum from 1 April 2026 until full payment");
    expect(hasMissing(m.blocks)).toEqual([]);
  });

  it("addresses solicitors and switches to 'your client'", () => {
    const ctx = sampleContext({
      solicitors: [{ id: "s1", position: 0, firm_name: "Example Opposing LLP", address: "9 Sample Lane, Singapore 000009", reference: "EO/123", solicitor_name: "Mr Example", email: "eo@example.test" }],
    });
    ctx.opposing[0] = { ...ctx.opposing[0], solicitor_id: "s1" };
    const opts = lodDefaults(ctx, "2026-11-05");
    expect(opts.yourRef).toBe("EO/123");
    expect(opts.deliveryEmail).toBe("eo@example.test");
    const body = text(buildLod(ctx, opts).blocks);
    expect(body).toContain("We understand that you act for Test Debtor.");
    expect(body).toContain("that your client pay our client");
    expect(body).toContain("at your client’s own expense");
  });

  it("lists custom demands with the payment first", () => {
    const ctx = sampleContext();
    const opts = { ...lodDefaults(ctx, "2026-11-05"), demands: "Return the sample equipment\nConfirm in writing that you will comply." };
    const m = buildLod(ctx, opts);
    const labels = numberLabels(m.blocks, "dot");
    const subs = m.blocks.map((b, i) => [b, labels.get(i)] as const).filter(([b]) => b.type === "para" && b.id?.startsWith("demand-"));
    expect(subs.map(([, l]) => l)).toEqual(["a.", "b.", "c."]);
    const body = text(m.blocks);
    expect(body).toContain("return the sample equipment; and");
    expect(body).toContain("confirm in writing that you will comply.");
  });

  it("highlights what the profile is missing", () => {
    const ctx = sampleContext();
    ctx.matter = { ...ctx.matter, principal_sum: null, our_ref: null };
    const missing = hasMissing(buildLod(ctx, lodDefaults(ctx, "2026-11-05")).blocks);
    expect(missing).toEqual(expect.arrayContaining(["OUR REF", "PRINCIPAL SUM"]));
  });

  it("applies wording overrides without touching other paragraphs", () => {
    const ctx = sampleContext();
    const m = buildLod(ctx, lodDefaults(ctx, "2026-11-05"));
    const out = applyOverrides(m.blocks, { act: "We act for **the Sample Client** only." });
    const act = out.find((b) => b.type === "para" && b.id === "act");
    expect(act && act.type === "para" && act.runs).toEqual([
      { text: "We act for " }, { text: "the Sample Client", bold: true }, { text: " only." },
    ]);
    expect(text(out)).toContain("TAKE NOTICE");
  });
});

describe("Holding letter", () => {
  it("acknowledges their letter and reserves rights", () => {
    const ctx = sampleContext();
    const opts = { ...holdingDefaults(ctx, "2026-11-05"), theirLetterDate: "2026-11-03", theirLetterRef: "TD/01" };
    const body = text(buildHoldingLetter(ctx, opts).blocks);
    expect(body).toContain("acknowledge receipt of your letter dated 3 November 2026 (your reference: TD/01).");
    expect(body).toContain("We are presently taking our client’s instructions");
    expect(body).toContain("all our client’s rights are fully and expressly reserved.");
  });
});

describe("deadlines", () => {
  it("computes N days and warns on weekends and public holidays", () => {
    expect(lodDeadline({ date: "2026-11-05", days: 7 })).toBe("2026-11-12");
    expect(deadlineWarning("2026-11-07")).toMatch(/Saturday/);
    expect(deadlineWarning("2026-11-09")).toMatch(/Deepavali/);
    expect(deadlineWarning("2026-11-10")).toBeNull();
    expect(deadlineWarning("2030-01-02")).toMatch(/aren't loaded/);
  });
});

describe("textToRuns", () => {
  it("keeps placeholders highlighted", () => {
    expect(textToRuns("Pay by [DEADLINE].")).toEqual([{ text: "Pay by " }, { text: "[DEADLINE]", missing: true }, { text: "." }]);
  });
});

describe(".docx output", () => {
  it("writes valid Word files (set PP_DOCX_OUT to keep them)", async () => {
    const ctx = sampleContext();
    const logo = readFileSync(fileURLToPath(new URL("../public/letterhead/aw-logo.png", import.meta.url)));
    const lod = await docxBuffer(buildLod(ctx, { ...lodDefaults(ctx, "2026-11-05"), withoutPrejudice: false, position: "Our client has performed all of its obligations under the agreement.\n\nNo complaint about the services was ever raised." }), { logo });
    const hold = await docxBuffer(
      buildHoldingLetter(ctx, { ...holdingDefaults(ctx, "2026-11-05"), theirLetterDate: "2026-11-03" }),
      { logo },
    );
    expect(lod.subarray(0, 2).toString()).toBe("PK");
    expect(hold.length).toBeGreaterThan(5000);
    const out = process.env.PP_DOCX_OUT;
    if (out) {
      mkdirSync(out, { recursive: true });
      writeFileSync(`${out}/sample-lod.docx`, lod);
      writeFileSync(`${out}/sample-holding.docx`, hold);
    }
  });
});

import { sentenceFragment } from "@/lib/documents/templates/letter-common";
describe("sentenceFragment", () => {
  it("lower-cases ordinary first words but keeps names", () => {
    expect(sentenceFragment("Payment fell due.")).toBe("payment fell due");
    expect(sentenceFragment("Return the equipment;")).toBe("return the equipment");
    expect(sentenceFragment("Mr Tan delivered the goods")).toBe("Mr Tan delivered the goods");
    expect(sentenceFragment("Tan delivered the goods", ["Tan Ah Example"])).toBe("Tan delivered the goods");
    expect(sentenceFragment("Sample Client Pte. Ltd. paid")).toBe("Sample Client Pte. Ltd. paid");
    expect(sentenceFragment("HDB issued a notice")).toBe("HDB issued a notice");
  });
});
