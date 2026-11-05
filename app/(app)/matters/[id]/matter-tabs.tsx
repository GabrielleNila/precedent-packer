"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export function MatterTabs() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const base = `/matters/${id}`;
  const tabs = [
    { href: base, label: "Profile", active: pathname === base },
    { href: `${base}/documents`, label: "Documents", active: pathname.startsWith(`${base}/documents`) },
    { href: `${base}/history`, label: "History", active: pathname.startsWith(`${base}/history`) },
  ];

  function guard(e: React.MouseEvent) {
    // The profile form flags unsaved edits; warn before leaving it.
    if ((window as unknown as { __ppDirty?: boolean }).__ppDirty && !window.confirm("You have unsaved changes on the profile. Leave without saving?")) {
      e.preventDefault();
    }
  }

  return (
    <nav aria-label="Matter sections" className="mb-5 flex items-center gap-3">
      <Link href="/matters" className="text-[13px] font-semibold text-muted hover:text-ink">← Matters</Link>
      <div className="flex gap-1 rounded-full border border-line bg-surface/80 p-1 shadow-[0_4px_16px_-12px_rgba(59,50,71,0.3)]">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            onClick={t.active ? undefined : guard}
            aria-current={t.active ? "page" : undefined}
            className={cx(
              "rounded-full px-4 py-1.5 text-[13.5px] font-semibold transition-colors",
              t.active ? "bg-accent text-white" : "text-ink-soft hover:bg-accent-soft hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
