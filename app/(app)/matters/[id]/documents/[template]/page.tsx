import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadDocContext } from "@/lib/documents/load";
import { isTemplateKey } from "@/lib/documents/registry";
import { todayInSingapore } from "@/lib/format/dates";
import { DocumentWorkspace } from "@/components/documents/workspace";

export const metadata: Metadata = { title: "Draft document" };

type Params = Promise<{ id: string; template: string }>;

export default function TemplatePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-3xl bg-accent-soft/60" />}>
      <Workspace params={params} />
    </Suspense>
  );
}

async function Workspace({ params }: { params: Params }) {
  const { id, template } = await params;
  if (!isTemplateKey(template)) notFound();
  await connection();
  const ctx = await loadDocContext(id);
  if (!ctx) notFound();
  return <DocumentWorkspace templateKey={template} ctx={ctx} today={todayInSingapore()} />;
}
