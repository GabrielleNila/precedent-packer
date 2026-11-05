"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { numberLabels, runsToText, type Block, type DocModel, type Run } from "@/lib/documents/model";

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <span
          key={i}
          className={cx(
            r.bold && "font-bold",
            r.italic && "italic",
            r.underline && "underline",
            r.missing && "rounded-sm bg-[#fff1a8] px-0.5 text-[#7a5b00] outline outline-1 outline-[#f0d25c]",
          )}
        >
          {r.text}
        </span>
      ))}
    </>
  );
}

type EditProps = {
  overrides: Record<string, string>;
  onOverride: (id: string, text: string | undefined) => void;
};

/** A4-proportioned preview of a letter or pleading. */
export function DocumentPreview({ model, overrides, onOverride }: { model: DocModel } & EditProps) {
  const labels = numberLabels(model.blocks, model.format.subNumbering);
  const f = model.format;
  return (
    <div className="overflow-x-auto rounded-3xl bg-gradient-to-br from-lavender-soft/60 via-paper to-mint-soft/50 p-4 sm:p-6">
      <article
        aria-label="Document preview"
        className="mx-auto w-[794px] max-w-none bg-white px-[72px] pb-12 pt-10 text-black shadow-[0_8px_30px_-12px_rgba(59,50,71,0.35)]"
        style={{ fontFamily: `"${f.font}", "Times New Roman", serif`, fontSize: `${f.fontSizePt * 1.333}px`, lineHeight: f.lineSpacing }}
      >
        {model.letterhead && <LetterheadPreview lh={model.letterhead} />}
        {model.blocks.map((blk, i) => (
          <BlockView key={i} blk={blk} label={labels.get(i)} justified={f.justified} overrides={overrides} onOverride={onOverride} />
        ))}
        {model.letterhead && (
          <footer className="mt-16 border-t border-neutral-300 pt-1 font-[Arial,sans-serif] text-[10px] leading-snug text-black">
            <p className="text-right text-neutral-500">
              P a g e | <b className="text-black">1 of N</b>
            </p>
            <p className="text-justify">{model.letterhead.footerText}</p>
          </footer>
        )}
      </article>
    </div>
  );
}

function LetterheadPreview({ lh }: { lh: NonNullable<DocModel["letterhead"]> }) {
  return (
    <header className="mb-6 flex items-center gap-6 font-[Arial,sans-serif] text-[11.5px] leading-[1.3]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lh.logoUrl} alt="Firm logo" className="h-[95px] w-[190px] shrink-0 object-contain" />
      <div>
        <table className="border-collapse">
          <tbody>
            {lh.rows.map((r, i) => (
              <tr key={i} className="align-top">
                <td className="pr-6">{r.label}</td>
                <td className="pr-2">:</td>
                <td>
                  <Runs runs={r.value} />
                  {r.note && <i className="text-[10.5px]"> {r.note}</i>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-0.5">{lh.addressLine}</p>
        {lh.extraLine && <p>{lh.extraLine}</p>}
      </div>
    </header>
  );
}

function BlockView({
  blk,
  label,
  justified,
  overrides,
  onOverride,
}: { blk: Block; label?: string; justified: boolean } & EditProps) {
  switch (blk.type) {
    case "spacer":
      return <div className={blk.size === "large" ? "h-10" : "h-3"} />;
    case "refs":
      return (
        <table className="mb-4 border-collapse">
          <tbody>
            {blk.rows.map((r, i) => (
              <tr key={i}>
                <td className="w-[86px] align-top">{r.label}</td>
                <td className="w-5 align-top">:</td>
                <td><Runs runs={r.value} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "address":
      return (
        <div className="mb-6 grid grid-cols-2 gap-4 leading-tight">
          <div>{blk.lines.map((l, i) => <p key={i}><Runs runs={l} /></p>)}</div>
          <div>{blk.right.map((l, i) => <p key={i}><Runs runs={l} /></p>)}</div>
        </div>
      );
    case "signature":
      return (
        <div className="mb-4 mt-2">
          <p>{blk.closing}</p>
          <p className="text-[1.4em] italic leading-tight" style={{ fontFamily: '"Monotype Corsiva", "Apple Chancery", cursive' }}>
            {blk.firmScript}
          </p>
          <p className="leading-none">__________________</p>
          <p className="font-bold"><Runs runs={blk.signatoryName} /></p>
          <p className="font-bold">{blk.firmName}</p>
        </div>
      );
    case "heading":
    case "para":
      return (
        <EditableParagraph blk={blk} label={label} justified={justified} overrides={overrides} onOverride={onOverride} />
      );
  }
}

function EditableParagraph({
  blk,
  label,
  justified,
  overrides,
  onOverride,
}: { blk: Extract<Block, { type: "para" | "heading" }>; label?: string; justified: boolean } & EditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const overridden = blk.id !== undefined && overrides[blk.id] !== undefined;
  const indent = blk.type === "para" && blk.numbered !== undefined ? blk.numbered : null;
  const isHeading = blk.type === "heading";
  const align =
    blk.type === "para" && blk.align ? blk.align : isHeading ? (justified ? "justify" : "left") : justified ? "justify" : "left";

  const body = (
    <div
      className={cx(
        "relative",
        isHeading ? "mb-4 font-bold" : "mb-4",
        isHeading && blk.rule && "border-b-2 border-black pb-0.5",
      )}
      style={{ paddingLeft: indent !== null ? `${(indent + 1) * 48}px` : undefined, textAlign: align }}
    >
      {label && indent !== null && (
        <span className="absolute" style={{ left: `${indent * 48}px` }}>{label}</span>
      )}
      <Runs runs={blk.runs} />
    </div>
  );

  if (!blk.id) return body;

  if (editing) {
    return (
      <div className="mb-4 rounded-xl border-2 border-lavender bg-lavender-soft/40 p-2 font-sans text-[13px] leading-normal" style={{ marginLeft: indent !== null ? `${(indent + 1) * 48}px` : undefined }}>
        <p className="mb-1 font-bold text-lavender">Edit wording · {blk.label ?? "Paragraph"} (this document only)</p>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(10, Math.max(2, Math.ceil(draft.length / 80)))}
          className="w-full rounded-lg border border-line-strong bg-white p-2 text-[14px] leading-relaxed text-ink focus:border-lavender focus:outline-none"
        />
        <p className="mt-1 text-[11.5px] text-muted">Wrap words in **double asterisks** for bold. Keep [PLACEHOLDERS] as they are to have them highlighted.</p>
        <div className="mt-2 flex gap-2">
          <button type="button" className="rounded-full bg-accent px-3 py-1 text-[12.5px] font-semibold text-white" onClick={() => { onOverride(blk.id!, draft); setEditing(false); }}>
            Apply
          </button>
          <button type="button" className="rounded-full border border-line-strong bg-white px-3 py-1 text-[12.5px] font-semibold" onClick={() => setEditing(false)}>
            Cancel
          </button>
          {overridden && (
            <button type="button" className="ml-auto rounded-full px-3 py-1 text-[12.5px] font-semibold text-danger hover:bg-danger-soft" onClick={() => { onOverride(blk.id!, undefined); setEditing(false); }}>
              Restore original wording
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cx("group relative -mx-2 rounded-lg px-2 transition-colors hover:bg-accent-soft/40", overridden && "bg-lavender-soft/40")}>
      {body}
      <button
        type="button"
        onClick={() => { setDraft(runsToText(blk.runs)); setEditing(true); }}
        className="absolute -top-3 right-1 z-10 hidden rounded-full border border-line-strong bg-white px-2.5 py-0.5 font-sans text-[11.5px] font-semibold text-lavender shadow-sm group-hover:block group-focus-within:block focus:block"
        aria-label={`Edit wording: ${blk.label ?? "paragraph"}`}
      >
        ✎ Edit
      </button>
      {overridden && (
        <span className="absolute -left-2 top-1 -translate-x-full rounded-full bg-lavender-soft px-1.5 font-sans text-[10.5px] font-bold text-lavender">
          edited
        </span>
      )}
    </div>
  );
}
