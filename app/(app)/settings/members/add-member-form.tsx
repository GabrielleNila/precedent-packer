"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { addMember, type AddMemberState } from "./actions";

export function AddMemberForm() {
  const [state, action, pending] = useActionState<AddMemberState, FormData>(addMember, { status: "idle" });
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {state.status === "created" && (
        <div className="rounded-2xl bg-mint-soft px-4 py-3 text-sm text-ink">
          <p className="font-bold text-mint">Account created for {state.email} ✿</p>
          <p className="mt-1 text-ink-soft">
            Give them this temporary password in person or by phone (not by email). They&apos;ll be asked to choose
            their own the first time they sign in. It won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-full bg-surface px-3 py-1 font-mono text-[13px]">{state.tempPassword}</code>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(state.tempPassword);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
      {state.status === "error" && <Alert>{state.error}</Alert>}

      <form action={action} className="grid gap-4 sm:grid-cols-2" onSubmit={() => setCopied(false)}>
        <Field label="Full name" htmlFor="full_name" required>
          <Input id="full_name" name="full_name" required autoComplete="off" />
        </Field>
        <Field label="Initials" htmlFor="initials" required hint="Used in file references, e.g. RM">
          <Input id="initials" name="initials" required maxLength={6} autoComplete="off" className="uppercase" />
        </Field>
        <Field label="Work email" htmlFor="email" required>
          <Input id="email" name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Role" htmlFor="role" hint="Admins manage the team and can delete matters">
          <Select id="role" name="role" defaultValue="member">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft sm:col-span-2">
          <input type="checkbox" name="is_solicitor" className="h-4 w-4 accent-[var(--color-accent)]" />
          Practising solicitor (can be the solicitor in charge of a matter)
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Adding…" : "Add team member"}
          </Button>
        </div>
      </form>
    </div>
  );
}
