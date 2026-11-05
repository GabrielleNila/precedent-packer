import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentMember } from "@/lib/auth";
import { getRefPattern, listTeam } from "@/lib/matters";
import { emptyMatter } from "@/lib/validation/matter-defaults";
import { MatterForm } from "@/components/matter/matter-form";
import { FormSkeleton } from "@/components/matter/form-skeleton";

export const metadata: Metadata = { title: "New matter" };

export default function NewMatterPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewMatter />
    </Suspense>
  );
}

async function NewMatter() {
  const [member, team, refPattern] = await Promise.all([getCurrentMember(), listTeam(), getRefPattern()]);
  const initial = emptyMatter();
  // Default the staff member to whoever is creating the matter.
  initial.staff_id = member.user_id;
  return <MatterForm initial={initial} team={team} refPattern={refPattern} isAdmin={member.role === "admin"} />;
}
