"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { maskNric } from "@/lib/format/nric";

/**
 * NRIC/FIN field that shows S****123A until the user chooses to reveal it.
 * Masking is a screen-privacy measure (someone looking over a shoulder); the
 * number itself is protected by row level security.
 */
export function IdNumberInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const editing = revealed || !value;

  return (
    <div className="flex gap-1.5">
      {editing ? (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onBlur={onBlur}
          invalid={invalid}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="font-mono tracking-wide"
        />
      ) : (
        <Input
          id={id}
          value={maskNric(value)}
          readOnly
          aria-label="NRIC/FIN (hidden)"
          className="cursor-default bg-paper font-mono tracking-wide text-ink-soft"
          onFocus={(e) => e.currentTarget.blur()}
        />
      )}
      {value && (
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="h-10 shrink-0 rounded-full border border-line-strong bg-surface px-3.5 text-[13px] font-semibold text-lavender hover:bg-lavender-soft"
          aria-pressed={revealed}
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
      )}
    </div>
  );
}
