"use client";

import { useRef, useState, useTransition } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { deleteMatter, duplicateMatter } from "@/app/(app)/matters/actions";

function Dialog({
  dialogRef,
  title,
  children,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(92vw,460px)] rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-lavender/25 backdrop:backdrop-blur-[2px]"
    >
      <div className="bg-gradient-to-r from-accent-soft/70 to-transparent px-6 py-4">
        <h2 className="text-[17px]">{title}</h2>
      </div>
      <div className="px-6 pb-6 pt-2">{children}</div>
    </dialog>
  );
}

export function DuplicateMatterButton({ matterId, disabled }: { matterId: string; disabled?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [includeOpposing, setIncludeOpposing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <>
      <Button size="sm" onClick={() => ref.current?.showModal()} disabled={disabled} title={disabled ? "Save your changes first" : undefined}>
        Duplicate
      </Button>
      <Dialog dialogRef={ref} title="Duplicate matter">
        <p className="text-sm text-ink-soft">
          Creates a new matter with the same client details, for a repeat client. Claim details, chronology and
          notes are not copied.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeOpposing}
            onChange={(e) => setIncludeOpposing(e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--color-accent)]"
          />
          Also copy the opposing parties and their solicitors
        </label>
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => ref.current?.close()}>Cancel</Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await duplicateMatter(matterId, includeOpposing);
                if (r && !r.ok) setError(r.error);
              })
            }
          >
            {pending ? "Copying…" : "Create copy"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function DeleteMatterButton({ matterId, matterName }: { matterId: string; matterName: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => { setTyped(""); setError(undefined); ref.current?.showModal(); }}>
        Delete matter
      </Button>
      <Dialog dialogRef={ref} title="Delete this matter permanently?">
        <p className="text-sm text-ink-soft">
          This removes the matter and everything recorded under it: parties, NRIC/UEN numbers, solicitors,
          chronology, notes and document history. It cannot be undone. The deletion is logged without any of the
          matter&apos;s details.
        </p>
        <Field label={`Type the matter name to confirm`} htmlFor="confirm-name" className="mt-4" hint={matterName}>
          <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Field>
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => ref.current?.close()}>Cancel</Button>
          <Button
            variant="danger"
            disabled={pending || typed !== matterName}
            onClick={() =>
              start(async () => {
                const r = await deleteMatter(matterId, typed);
                if (r && !r.ok) setError(r.error);
              })
            }
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
