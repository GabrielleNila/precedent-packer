"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/matters", label: "Matters" },
    ...(isAdmin ? [{ href: "/settings/members", label: "Team" }] : []),
  ];
  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors",
              active ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-lavender-soft hover:text-ink",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
