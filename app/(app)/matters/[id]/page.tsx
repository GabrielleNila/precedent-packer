import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getMatter, getRefPattern, listTeam } from "@/lib/matters";
import { toFormValues } from "@/lib/validation/matter-defaults";
import { MatterForm } from "@/components/matter/matter-form";
import { FormSkeleton } from "@/components/matter/form-skeleton";

// The matter name stays out of the browser tab title, so client names don't
// show up in tab bars, screen shares or browser history titles.
export const metadata: Metadata = { title: "Matter" };

type Params = Promise<{ id: string }>;
type Search = Promise<{ saved?: string; duplicated?: string }>;

export default function MatterPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Matter params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Matter({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [member, bundle, team, refPattern] = await Promise.all([
    getCurrentMember(),
    getMatter(id),
    listTeam(),
    getRefPattern(),
  ]);
  if (!bundle) notFound();

  const notice = sp.duplicated
    ? "Copied. Fill in this matter's details and save. ✿"
    : sp.saved
      ? "Matter created ✿"
      : undefined;

  return (
    <MatterForm
      key={bundle.matter.updated_at}
      initial={toFormValues(bundle)}
      team={team}
      refPattern={refPattern}
      isAdmin={member.role === "admin"}
      notice={notice}
    />
  );
}
