"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Field, Input, Section, Select, Textarea, cx } from "@/components/ui";
import { PartyList } from "./party-list";
import { SolicitorList } from "./solicitor-list";
import { ChronologyTable } from "./chronology-table";
import { DeleteMatterButton, DuplicateMatterButton } from "./matter-actions";
import { matterFormSchema, type MatterFormValues } from "@/lib/validation/matter";
import { saveMatter } from "@/app/(app)/matters/actions";
import { buildReference } from "@/lib/format/reference";
import { formatMoney } from "@/lib/format/money";
import { CLAIM_TYPE_LABELS, type ClaimType } from "@/lib/types";
import type { TeamMember } from "@/lib/matters";

const NAV = [
  { id: "details", label: "Matter details", dot: "bg-blush" },
  { id: "clients", label: "Our clients", dot: "bg-blush" },
  { id: "opposing", label: "Opposing parties", dot: "bg-lavender-mid" },
  { id: "solicitors", label: "Opposing solicitors", dot: "bg-lavender-mid" },
  { id: "claim", label: "Claim", dot: "bg-mint-mid" },
  { id: "chronology", label: "Chronology", dot: "bg-mint-mid" },
  { id: "notes", label: "Notes", dot: "bg-lavender-mid" },
];

export function MatterForm({
  initial,
  team,
  refPattern,
  isAdmin,
  notice,
}: {
  initial: MatterFormValues;
  team: TeamMember[];
  refPattern: string;
  isAdmin: boolean;
  notice?: string;
}) {
  const router = useRouter();
  const form = useForm<MatterFormValues>({
    resolver: zodResolver(matterFormSchema),
    defaultValues: initial,
    mode: "onBlur",
  });
  const { register, handleSubmit, formState, control, setValue, getValues, reset } = form;
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ tone: "ok" | "danger" | "warn"; text: string } | null>(
    notice ? { tone: "ok", text: notice } : null,
  );
  const isNew = !initial.id;
  const dirty = formState.isDirty;

  // Warn before leaving with unsaved changes (browser close/refresh, and
  // the matter tabs, which read this flag).
  useEffect(() => {
    (window as unknown as { __ppDirty?: boolean }).__ppDirty = dirty;
    return () => {
      (window as unknown as { __ppDirty?: boolean }).__ppDirty = false;
    };
  }, [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const claimType = useWatch({ control, name: "claim_type" });
  const principal = useWatch({ control, name: "principal_sum" });
  const name = useWatch({ control, name: "name" });

  const activeTeam = team.filter((m) => m.active);
  const solicitors = [...activeTeam].sort((a, b) => Number(b.is_solicitor) - Number(a.is_solicitor));

  function fillReference() {
    const sol = team.find((m) => m.user_id === getValues("solicitor_id"));
    const staff = team.find((m) => m.user_id === getValues("staff_id"));
    const year = (getValues("date_opened") || "").slice(0, 4) || String(new Date().getFullYear());
    setValue(
      "our_ref",
      buildReference(refPattern, { solicitor: sol?.initials, staff: staff?.initials?.toLowerCase(), year }),
      { shouldDirty: true },
    );
  }

  const onSubmit = handleSubmit(
    (values) =>
      start(async () => {
        setResult(null);
        const r = await saveMatter(values);
        if (!r.ok) {
          setResult({ tone: r.conflict ? "warn" : "danger", text: r.error });
          return;
        }
        if (isNew) {
          reset({ ...values, id: r.id, expected_updated_at: r.updated_at });
          router.replace(`/matters/${r.id}?saved=1`);
        } else {
          reset({ ...values, expected_updated_at: r.updated_at });
          setResult({ tone: "ok", text: "Saved ✿" });
        }
      }),
    () => setResult({ tone: "danger", text: "A few fields need attention. They're marked below." }),
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 flex flex-col gap-1 rounded-3xl border border-line bg-surface/80 p-3 text-[13.5px] shadow-[0_4px_20px_-12px_rgba(59,50,71,0.18)]">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="flex items-center gap-2.5 rounded-full px-3 py-1.5 font-semibold text-ink-soft hover:bg-accent-soft hover:text-ink"
              >
                <span className={cx("h-2.5 w-2.5 rounded-full", n.dot)} aria-hidden />
                {n.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold uppercase tracking-wider text-accent">
                {isNew ? "New matter" : "Matter profile"}
              </p>
              <h1 className="truncate text-[26px] text-ink">{name || "Untitled matter"}</h1>
            </div>
            {!isNew && (
              <div className="flex flex-wrap gap-2">
                <DuplicateMatterButton matterId={initial.id!} disabled={dirty} />
                {isAdmin && <DeleteMatterButton matterId={initial.id!} matterName={initial.name} />}
              </div>
            )}
          </div>

          {result && <Alert tone={result.tone}>{result.text}</Alert>}

          <Section id="details" title="Matter details" tone="blush">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Matter name" htmlFor="name" required error={formState.errors.name?.message} className="sm:col-span-2"
                hint="How the team refers to it, e.g. Sample Client v Sample Debtor">
                <Input id="name" {...register("name")} invalid={!!formState.errors.name} />
              </Field>
              <Field label="Solicitor in charge" htmlFor="solicitor_id">
                <Select id="solicitor_id" {...register("solicitor_id")}>
                  <option value="">Choose…</option>
                  {solicitors.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name} ({m.initials})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Staff handling" htmlFor="staff_id">
                <Select id="staff_id" {...register("staff_id")}>
                  <option value="">Choose…</option>
                  {activeTeam.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name} ({m.initials})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Our reference" htmlFor="our_ref" hint={`Pattern: ${refPattern}`}>
                <div className="flex gap-1.5">
                  <Input id="our_ref" {...register("our_ref")} className="font-mono" />
                  <Button size="md" onClick={fillReference} className="shrink-0" title="Fill from the firm's pattern">
                    Fill
                  </Button>
                </div>
              </Field>
              <Field label="Their reference" htmlFor="their_ref">
                <Input id="their_ref" {...register("their_ref")} className="font-mono" />
              </Field>
              <Field label="Date opened" htmlFor="date_opened" error={formState.errors.date_opened?.message}>
                <Input id="date_opened" type="date" {...register("date_opened")} />
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" {...register("status")}>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </Select>
              </Field>
            </div>
          </Section>

          <Section id="clients" title="Our clients" tone="blush" description="Everyone we act for in this matter.">
            <PartyList name="clients" />
          </Section>

          <Section id="opposing" title="Opposing parties" tone="lavender">
            <PartyList name="opposing" />
          </Section>

          <Section
            id="solicitors"
            title="Opposing solicitors"
            tone="lavender"
            description="Optional. When a party is represented, letters are addressed to their solicitors."
          >
            <SolicitorList />
          </Section>

          <Section id="claim" title="Claim" tone="mint">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Claim type" htmlFor="claim_type">
                <Select id="claim_type" {...register("claim_type")}>
                  <option value="">Not set</option>
                  {(Object.keys(CLAIM_TYPE_LABELS) as ClaimType[]).map((k) => (
                    <option key={k} value={k}>{CLAIM_TYPE_LABELS[k]}</option>
                  ))}
                </Select>
              </Field>
              {claimType === "other" ? (
                <Field label="Describe the claim type" htmlFor="claim_type_other" error={formState.errors.claim_type_other?.message}>
                  <Input id="claim_type_other" {...register("claim_type_other")} invalid={!!formState.errors.claim_type_other} />
                </Field>
              ) : (
                <div className="hidden sm:block" />
              )}
              <Field label="Principal sum (S$)" htmlFor="principal_sum" error={formState.errors.principal_sum?.message}
                hint={principal && !formState.errors.principal_sum ? formatMoney(principal) : "e.g. 12,345.67"}>
                <Input id="principal_sum" inputMode="decimal" {...register("principal_sum")} invalid={!!formState.errors.principal_sum} />
              </Field>
              <Field label="Costs claimed (S$)" htmlFor="costs_claimed" error={formState.errors.costs_claimed?.message}>
                <Input id="costs_claimed" inputMode="decimal" {...register("costs_claimed")} invalid={!!formState.errors.costs_claimed} />
              </Field>
              <Field label="Contractual interest rate (% per annum)" htmlFor="interest_rate" error={formState.errors.interest_rate?.message}>
                <Input id="interest_rate" inputMode="decimal" {...register("interest_rate")} invalid={!!formState.errors.interest_rate} />
              </Field>
              <Field label="Interest runs from" htmlFor="interest_start_date">
                <Input id="interest_start_date" type="date" {...register("interest_start_date")} />
              </Field>
            </div>
          </Section>

          <Section
            id="chronology"
            title="Chronology"
            tone="mint"
            description="Drag the handle (or use the arrows) to reorder. This order is used in letters and pleadings."
          >
            <ChronologyTable />
          </Section>

          <Section id="notes" title="Notes" tone="lavender" description="Internal only. Never printed on documents.">
            <Textarea id="notes" rows={5} aria-label="Notes" {...register("notes")} />
          </Section>

          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-full border border-line bg-surface/95 py-2 pl-5 pr-2 shadow-[0_10px_30px_-12px_rgba(59,50,71,0.35)] backdrop-blur">
            <p className="text-[13px] font-semibold text-muted">
              {pending ? "Saving…" : dirty ? (
                <span className="text-accent">● Unsaved changes</span>
              ) : isNew ? "Not saved yet" : "All changes saved"}
            </p>
            <div className="flex gap-2">
              {dirty && !isNew && (
                <Button variant="ghost" onClick={() => { reset(); setResult(null); }} disabled={pending}>
                  Discard
                </Button>
              )}
              <Button type="submit" variant="primary" disabled={pending || (!dirty && !isNew)}>
                {isNew ? "Create matter" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
