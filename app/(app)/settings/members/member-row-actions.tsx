"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { setMemberActive } from "./actions";

export function MemberActiveToggle({ userId, active, isSelf }: { userId: string; active: boolean; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  if (isSelf) return <span className="text-[12.5px] text-muted">You</span>;
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[12.5px] text-danger">{error}</span>}
      <Button
        size="sm"
        variant={active ? "ghost" : "secondary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setMemberActive(userId, !active);
            setError(r.ok ? undefined : r.error);
          })
        }
      >
        {active ? "Deactivate" : "Reactivate"}
      </Button>
    </div>
  );
}
