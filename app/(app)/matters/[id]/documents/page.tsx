import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { loadDocContext } from "@/lib/documents/load";
import { TEMPLATES, type TemplateKey } from "@/lib/documents/registry";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Documents" };

type Params = Promise<{ id: string }>;

const TONES: Record<TemplateKey, string> = {
  lod: "from-accent-soft to-surface",
  "holding-letter": "from-lavender-soft to-surface",
};

const COMING = [
  { name: "Final Letter of Demand", phase: "Phase 3" },
  { name: "Warrant to Act", phase: "Phase 3" },
  { name: "Statement of Claim", phase: "Phase 4" },
];

export default function DocumentsPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-lavender-soft" />}>
      <Documents params={params} />
    </Suspense>
  );
}

async function Documents({ params }: { params: Params }) {
  const { id } = await params;
  const ctx = await loadDocContext(id);
  if (!ctx) notFound();

  const gaps: string[] = [];
  if (!ctx.clients.length) gaps.push("a client");
  if (!ctx.opposing.length) gaps.push("an opposing party");
  if (!ctx.solicitor) gaps.push("the solicitor in charge");
  if (!ctx.matter.our_ref) gaps.push("our reference");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[12.5px] font-bold uppercase tracking-wider text-accent">Documents</p>
        <h1 className="text-[26px] text-ink">{ctx.matter.name}</h1>
        {gaps.length > 0 && (
          <p className="mt-1 text-[13.5px] text-warn">
            Before drafting, add {gaps.join(", ")} to the{" "}
            <Link href={`/matters/${id}`} className="font-semibold underline underline-offset-2">profile</Link>. Missing details
            show as highlighted placeholders.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => (
          <Link
            key={key}
            href={`/matters/${id}/documents/${key}`}
            className={`group flex flex-col gap-2 rounded-3xl border border-line bg-gradient-to-br ${TONES[key]} p-5 shadow-[0_4px_20px_-12px_rgba(59,50,71,0.18)] transition-transform hover:-translate-y-0.5`}
          >
            <Badge tone="accent">{TEMPLATES[key].kind === "letter" ? "Letter" : "Court"}</Badge>
            <p className="text-[18px] font-extrabold text-ink group-hover:text-accent">{TEMPLATES[key].name}</p>
            <p className="text-[13.5px] text-ink-soft">{TEMPLATES[key].description}</p>
            <span className="mt-auto pt-2 text-[13px] font-bold text-accent">Open →</span>
          </Link>
        ))}
        {COMING.map((c) => (
          <div key={c.name} className="flex flex-col gap-2 rounded-3xl border-2 border-dashed border-line-strong/70 p-5 text-muted">
            <Badge>{c.phase}</Badge>
            <p className="text-[18px] font-extrabold">{c.name}</p>
            <p className="text-[13.5px]">Coming soon.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
