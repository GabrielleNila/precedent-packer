import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listMatters } from "@/lib/matters";
import { formatLetterDate } from "@/lib/format/dates";
import { CLAIM_TYPE_LABELS, type MatterStatus } from "@/lib/types";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Matters" };

type Search = { q?: string; status?: string };

export default function MattersPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] text-ink">Matters <span aria-hidden className="text-blush">✿</span></h1>
          <p className="text-sm text-muted">Every document draws from the matter&apos;s profile.</p>
        </div>
        <Link
          href="/matters/new"
          className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[0_2px_8px_-2px_rgba(192,88,122,0.45)] hover:bg-accent-hover"
        >
          New matter
        </Link>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <MatterTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function parseStatus(s?: string): MatterStatus | "all" {
  return s === "closed" || s === "all" ? s : "active";
}

async function MatterTable({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = parseStatus(params.status);
  const matters = await listMatters({ q, status });

  return (
    <>
      <form className="flex flex-wrap items-center gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by matter, reference or party"
          aria-label="Search matters"
          className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-sm focus:border-lavender focus:outline-none focus:ring-4 focus:ring-lavender-mid/50 sm:max-w-md"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Status"
          className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm"
        >
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
        <button type="submit" className="h-10 rounded-full border border-line-strong bg-surface px-5 text-sm font-semibold hover:bg-lavender-soft">
          Search
        </button>
      </form>

      {matters.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-blush bg-surface/80 px-6 py-14 text-center">
          <p className="text-lg font-extrabold text-ink">{q ? "No matters match that search" : "No matters yet"}</p>
          <p className="mt-1 text-sm text-muted">
            {q ? "Try a client name, our reference or their reference." : "Create the first matter to start drafting."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface/90 shadow-[0_4px_20px_-12px_rgba(59,50,71,0.18)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gradient-to-r from-accent-soft via-lavender-soft to-mint-soft text-[12px] font-bold uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 font-medium">Matter</th>
                <th className="px-4 py-2.5 font-medium">Our ref</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Opposing</th>
                <th className="px-4 py-2.5 font-medium">Opened</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {matters.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-accent-soft/40">
                  <td className="px-4 py-2.5">
                    <Link href={`/matters/${m.id}`} className="font-bold text-ink hover:text-accent">
                      {m.name}
                    </Link>
                    {m.claim_type && (
                      <span className="block text-[12.5px] text-muted">{CLAIM_TYPE_LABELS[m.claim_type]}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12.5px] text-ink-soft">{m.our_ref ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{m.client_names || "—"}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{m.opposing_names || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">{formatLetterDate(m.date_opened)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={m.status === "active" ? "ok" : "neutral"}>
                      {m.status === "active" ? "Active" : "Closed"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="h-10 w-full max-w-md animate-pulse rounded-full bg-accent-soft" />
      <div className="h-48 animate-pulse rounded-3xl bg-lavender-soft" />
    </div>
  );
}
