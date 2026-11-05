import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { listTeam } from "@/lib/matters";
import { Badge, Section } from "@/components/ui";
import { AddMemberForm } from "./add-member-form";
import { MemberActiveToggle } from "./member-row-actions";

export const metadata: Metadata = { title: "Team" };

export default function MembersPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-[28px] text-ink">Team</h1>
        <p className="text-sm text-muted">Only people added here can sign in. There is no public sign-up.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-lavender-soft" />}>
        <Members />
      </Suspense>
    </div>
  );
}

async function Members() {
  const [admin, team] = await Promise.all([requireAdmin(), listTeam()]);
  return (
    <>
      <Section title="Members" tone="lavender">
        <ul className="divide-y divide-line">
          {team.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blush to-lavender-mid text-[12px] font-extrabold"
                >
                  {m.initials.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="font-bold text-ink">
                    {m.full_name} <span className="font-normal text-muted">· {m.initials}</span>
                  </p>
                  <p className="text-[13px] text-muted">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === "admin" && <Badge tone="accent">Admin</Badge>}
                {m.is_solicitor && <Badge tone="lavender">Solicitor</Badge>}
                {!m.active && <Badge>Inactive</Badge>}
                <MemberActiveToggle userId={m.user_id} active={m.active} isSelf={m.user_id === admin.user_id} />
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <Section
        title="Add a team member"
        tone="blush"
        description="Creates their account with a temporary password that they replace on first sign-in."
      >
        <AddMemberForm />
      </Section>
    </>
  );
}
