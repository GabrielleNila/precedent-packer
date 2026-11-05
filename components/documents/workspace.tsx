"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { DocumentPreview } from "./preview";
import type { DocContext } from "@/lib/documents/context";
import { applyOverrides, hasMissing, type DocModel } from "@/lib/documents/model";
import { buildLod, lodDeadline, lodDefaults, type LodOptions } from "@/lib/documents/templates/lod";
import { buildHoldingLetter, holdingDefaults, type HoldingOptions } from "@/lib/documents/templates/holding-letter";
import { resolveAddressee, type DeliveryMode, type LetterOptions } from "@/lib/documents/templates/letter-common";
import { TEMPLATES, type TemplateKey } from "@/lib/documents/registry";
import { deadlineWarning } from "@/lib/format/holidays";
import { formatLetterDate } from "@/lib/format/dates";
import { recordGeneration } from "@/app/(app)/matters/[id]/documents/actions";

type AnyOptions = LodOptions | HoldingOptions;

function defaultsFor(key: TemplateKey, ctx: DocContext, today: string): AnyOptions {
  return key === "lod" ? lodDefaults(ctx, today) : holdingDefaults(ctx, today);
}

function build(key: TemplateKey, ctx: DocContext, opts: AnyOptions): DocModel {
  return key === "lod" ? buildLod(ctx, opts as LodOptions) : buildHoldingLetter(ctx, opts as HoldingOptions);
}

// Options and wording edits are kept only in this browser tab, for this
// matter and document, so a refresh doesn't lose them. Nothing is sent to
// the server.
function storageKey(matterId: string, key: TemplateKey) {
  return `pp:draft:${matterId}:${key}`;
}
function loadDraft(matterId: string, key: TemplateKey): { opts?: AnyOptions; overrides?: Record<string, string> } {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey(matterId, key)) ?? "{}");
  } catch {
    return {};
  }
}

export function DocumentWorkspace({ templateKey, ctx, today }: { templateKey: TemplateKey; ctx: DocContext; today: string }) {
  const matterId = ctx.matter.id;
  const [opts, setOpts] = useState<AnyOptions>(() => defaultsFor(templateKey, ctx, today));
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [restored, setRestored] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();

  // Restore this tab's draft after mount (sessionStorage isn't available on the server).
  useEffect(() => {
    const d = loadDraft(matterId, templateKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage
    if (d.opts) setOpts({ ...defaultsFor(templateKey, ctx, today), ...d.opts });
    if (d.overrides) setOverrides(d.overrides);
    setRestored(true);
  }, [matterId, templateKey, ctx, today]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(storageKey(matterId, templateKey), JSON.stringify({ opts, overrides }));
    } catch {
      /* storage full or blocked: drafts just won't survive a refresh */
    }
  }, [opts, overrides, restored, matterId, templateKey]);

  const model = useMemo(() => {
    const m = build(templateKey, ctx, opts);
    return { ...m, blocks: applyOverrides(m.blocks, overrides) };
  }, [templateKey, ctx, opts, overrides]);
  const missing = useMemo(() => hasMissing(model.blocks), [model]);

  const set = <K extends keyof AnyOptions>(k: K, v: AnyOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));
  const setAny = (patch: Partial<LodOptions & HoldingOptions>) => setOpts((o) => ({ ...o, ...patch }) as AnyOptions);

  function onOverride(id: string, text: string | undefined) {
    setOverrides((o) => {
      const next = { ...o };
      if (text === undefined) delete next[id];
      else next[id] = text;
      return next;
    });
  }

  function resetAll() {
    setOpts(defaultsFor(templateKey, ctx, today));
    setOverrides({});
    setStatus(null);
  }

  function download() {
    start(async () => {
      setStatus(null);
      try {
        const { docxBlob } = await import("@/lib/documents/docx-writer");
        const logo = model.letterhead ? await fetch(model.letterhead.logoUrl).then((r) => (r.ok ? r.arrayBuffer() : undefined)) : undefined;
        const blob = await docxBlob(model, { logo });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName(TEMPLATES[templateKey].name, ctx.matter.our_ref, opts.date);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        const r = await recordGeneration(matterId, templateKey);
        setStatus({ tone: "ok", text: r.ok ? "Downloaded ✿ Recorded in the document history." : "Downloaded, but the history entry couldn't be saved." });
      } catch {
        setStatus({ tone: "danger", text: "Couldn't create the Word file. Please try again." });
      }
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
        <Card tone="blush" className="p-4">
          <p className="text-[12px] font-bold uppercase tracking-wider text-accent">{model.kind === "letter" ? "Letter" : "Court document"}</p>
          <h1 className="text-[22px] leading-tight text-ink">{TEMPLATES[templateKey].name}</h1>
          <p className="mt-1 text-[13px] text-muted">
            Changes here affect this document only. To change names, amounts or the chronology,{" "}
            <Link href={`/matters/${matterId}`} className="font-semibold text-accent underline-offset-2 hover:underline">edit the Matter Profile</Link>.
          </p>
        </Card>

        <LetterOptionsPanel ctx={ctx} opts={opts} set={set} setAny={setAny} />
        {templateKey === "lod" && <LodPanel opts={opts as LodOptions} setAny={setAny} ctx={ctx} />}
        {templateKey === "holding-letter" && <HoldingPanel opts={opts as HoldingOptions} setAny={setAny} />}

        <div className="flex flex-wrap gap-2 pb-2">
          <Button variant="ghost" onClick={resetAll}>Reset to defaults</Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-full border border-line bg-surface/95 py-2 pl-5 pr-2 shadow-[0_10px_30px_-14px_rgba(59,50,71,0.35)] backdrop-blur">
          <p className="text-[13px] font-semibold">
            {missing.length ? (
              <span className="text-warn">
                {missing.length} missing {missing.length === 1 ? "detail" : "details"}: {missing.slice(0, 3).join(", ")}
                {missing.length > 3 ? "…" : ""}
              </span>
            ) : (
              <span className="text-mint">✓ All details filled in</span>
            )}
            {Object.keys(overrides).length > 0 && (
              <span className="ml-2 text-lavender">· {Object.keys(overrides).length} paragraph{Object.keys(overrides).length === 1 ? "" : "s"} edited</span>
            )}
          </p>
          <Button variant="primary" onClick={download} disabled={pending}>
            {pending ? "Preparing…" : "Download .docx"}
          </Button>
        </div>
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        <p className="px-1 text-[12.5px] text-muted">
          Hover over a paragraph and click <b className="text-lavender">✎ Edit</b> to change its wording for this document.
          Highlighted <span className="rounded-sm bg-[#fff1a8] px-1 text-[#7a5b00]">[PLACEHOLDERS]</span> are details the profile doesn&apos;t have yet.
        </p>
        <DocumentPreview model={model} overrides={overrides} onOverride={onOverride} />
      </div>
    </div>
  );
}

function fileName(name: string, ref: string | null, date: string) {
  const safeRef = (ref ?? "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  return `${name}${safeRef ? ` ${safeRef}` : ""} ${date}.docx`;
}

// ---------------------------------------------------------------------------
// Option panels
// ---------------------------------------------------------------------------

function PanelCard({ title, tone, children }: { title: string; tone: "blush" | "lavender" | "mint"; children: React.ReactNode }) {
  return (
    <Card tone={tone} className="flex flex-col gap-3 p-4">
      <h2 className="text-[15px] text-ink">{title}</h2>
      {children}
    </Card>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-soft">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
      {children}
    </label>
  );
}

function LetterOptionsPanel({
  ctx,
  opts,
  set,
  setAny,
}: {
  ctx: DocContext;
  opts: LetterOptions;
  set: <K extends keyof AnyOptions>(k: K, v: AnyOptions[K]) => void;
  setAny: (patch: Partial<LodOptions & HoldingOptions>) => void;
}) {
  const addressee = resolveAddressee(ctx, opts);
  const toggleDelivery = (m: DeliveryMode, on: boolean) =>
    set("delivery", on ? [...new Set([...opts.delivery, m])] : opts.delivery.filter((x) => x !== m));

  function chooseParty(partyId: string) {
    const party = ctx.opposing.find((p) => p.id === partyId);
    const sol = party?.solicitor_id ? ctx.solicitors.find((s) => s.id === party.solicitor_id) : undefined;
    setAny({
      addresseePartyId: partyId,
      deliveryEmail: (sol ? sol.email : party?.email) ?? "",
      yourRef: (sol ? sol.reference : ctx.matter.their_ref) ?? "",
    });
  }

  return (
    <PanelCard title="Letter details" tone="lavender">
      <Field label="Date of letter" htmlFor="opt-date">
        <Input id="opt-date" type="date" value={opts.date} onChange={(e) => set("date", e.target.value)} />
      </Field>
      {ctx.opposing.length > 1 && (
        <Field label="Addressed to (party)" htmlFor="opt-party" hint="One letter per opposing party">
          <Select id="opt-party" value={opts.addresseePartyId} onChange={(e) => chooseParty(e.target.value)}>
            {ctx.opposing.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Send to" htmlFor="opt-to" hint={addressee.toSolicitors ? "Addressed to their solicitors" : "Addressed to the party directly"}>
        <Select id="opt-to" value={opts.addressTo} onChange={(e) => set("addressTo", e.target.value as LetterOptions["addressTo"])}>
          <option value="auto">Automatic (solicitors if represented)</option>
          <option value="party">The party directly</option>
          <option value="solicitors" disabled={!ctx.solicitors.length}>Their solicitors</option>
        </Select>
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-[13px] font-bold text-ink-soft">Delivery</legend>
        <Check checked={opts.delivery.includes("email")} onChange={(v) => toggleDelivery("email", v)}>By Email</Check>
        <Check checked={opts.delivery.includes("hand")} onChange={(v) => toggleDelivery("hand", v)}>By Hand</Check>
        <Check checked={opts.delivery.includes("post")} onChange={(v) => toggleDelivery("post", v)}>By Registered Post</Check>
      </fieldset>
      {opts.delivery.includes("email") && (
        <Field label="Email address" htmlFor="opt-email">
          <Input id="opt-email" type="email" value={opts.deliveryEmail} onChange={(e) => set("deliveryEmail", e.target.value)} />
        </Field>
      )}
      <Field label="Your ref" htmlFor="opt-yourref" hint="Left out of the letter when blank">
        <Input id="opt-yourref" value={opts.yourRef} onChange={(e) => set("yourRef", e.target.value)} className="font-mono" />
      </Field>
      <Field label="Salutation" htmlFor="opt-sal">
        <Select id="opt-sal" value={opts.salutation} onChange={(e) => set("salutation", e.target.value as LetterOptions["salutation"])}>
          <option value="auto">Automatic ({addressee.salutation.replace(",", "")})</option>
          <option>Dear Sirs,</option>
          <option>Dear Sir/Madam,</option>
          <option>Dear Sir,</option>
          <option>Dear Madam,</option>
        </Select>
      </Field>
      <Field label="Heading (RE:)" htmlFor="opt-re" hint="Leave blank for the automatic heading">
        <Textarea id="opt-re" rows={2} value={opts.reSubject} onChange={(e) => set("reSubject", e.target.value)} className="min-h-14 uppercase" />
      </Field>
      <Check checked={opts.withoutPrejudice} onChange={(v) => set("withoutPrejudice", v)}>Without Prejudice</Check>
      {opts.withoutPrejudice && (
        <Select aria-label="Without prejudice wording" value={opts.withoutPrejudiceLabel} onChange={(e) => set("withoutPrejudiceLabel", e.target.value)}>
          <option>WITHOUT PREJUDICE</option>
          <option>WITHOUT PREJUDICE SAVE AS TO COSTS</option>
        </Select>
      )}
      <Check checked={opts.enclosure} onChange={(v) => set("enclosure", v)}>Encl.</Check>
      <Check checked={opts.ccClient} onChange={(v) => set("ccClient", v)}>Cc Client</Check>
    </PanelCard>
  );
}

function LodPanel({ opts, setAny, ctx }: { opts: LodOptions; setAny: (p: Partial<LodOptions>) => void; ctx: DocContext }) {
  const deadline = lodDeadline(opts);
  const warning = deadline ? deadlineWarning(deadline) : null;
  return (
    <PanelCard title="Demand" tone="mint">
      <Field
        label="Days to pay"
        htmlFor="opt-days"
        hint={deadline ? `Deadline: ${formatLetterDate(deadline)}` : undefined}
        warning={warning ? `${warning} Consider adjusting the days.` : undefined}
      >
        <Input
          id="opt-days"
          type="number"
          min={1}
          max={90}
          value={opts.days}
          onChange={(e) => setAny({ days: Math.max(1, Math.min(90, Number(e.target.value) || 1)) })}
        />
      </Field>
      <Check checked={opts.amountInWords} onChange={(v) => setAny({ amountInWords: v })}>Show amount in words</Check>
      <Check checked={opts.includeBackground} onChange={(v) => setAny({ includeBackground: v })}>
        Background from chronology ({ctx.chronology.length} {ctx.chronology.length === 1 ? "event" : "events"})
      </Check>
      {Number(ctx.matter.costs_claimed) > 0 && (
        <Check checked={opts.includeCostsClaimed} onChange={(v) => setAny({ includeCostsClaimed: v })}>Include costs claimed in the demand</Check>
      )}
      <Field label="Our client's position (optional)" htmlFor="opt-position" hint="Leave a blank line between paragraphs.">
        <Textarea id="opt-position" rows={4} value={opts.position} onChange={(e) => setAny({ position: e.target.value })} />
      </Field>
      <Field label="Other demands (optional)" htmlFor="opt-demands" hint="One per line, e.g. 'return the vehicle'. Payment is listed first.">
        <Textarea id="opt-demands" rows={3} value={opts.demands} onChange={(e) => setAny({ demands: e.target.value })} />
      </Field>
    </PanelCard>
  );
}

function HoldingPanel({ opts, setAny }: { opts: HoldingOptions; setAny: (p: Partial<HoldingOptions>) => void }) {
  return (
    <PanelCard title="Their letter" tone="mint">
      <Field label="Date of their letter" htmlFor="opt-their-date">
        <Input id="opt-their-date" type="date" value={opts.theirLetterDate} onChange={(e) => setAny({ theirLetterDate: e.target.value })} />
      </Field>
      <Field label="Their reference" htmlFor="opt-their-ref">
        <Input
          id="opt-their-ref"
          value={opts.theirLetterRef}
          onChange={(e) => setAny({ theirLetterRef: e.target.value, yourRef: e.target.value })}
          className="font-mono"
        />
      </Field>
      <Check checked={opts.nonAdmission} onChange={(v) => setAny({ nonAdmission: v })}>Add a non-admission line</Check>
    </PanelCard>
  );
}

