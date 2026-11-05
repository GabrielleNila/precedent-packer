import { Suspense } from "react";
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { signOut } from "@/app/account/actions";
import { NavLinks } from "./nav-links";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/matters" className="flex items-center gap-2 text-[18px] font-extrabold text-ink">
            <Logo />
            Precedent Pack
          </Link>
          <Suspense fallback={<nav className="flex-1" />}>
            <MemberNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

async function MemberNav() {
  const member = await getCurrentMember();
  return (
    <>
      <NavLinks isAdmin={member.role === "admin"} />
      <div className="ml-auto flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blush to-lavender-mid text-[12px] font-extrabold text-ink" aria-hidden>
          {member.initials.slice(0, 2).toUpperCase()}
        </span>
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-[13px] font-bold text-ink">{member.full_name}</p>
          <p className="text-[12px] text-muted">{member.firm_name}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:bg-lavender-soft hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

function Logo() {
  return (
    <span aria-hidden className="relative inline-flex h-7 w-7 items-center justify-center">
      <span className="absolute left-0 top-0 h-4 w-4 rounded-full bg-blush" />
      <span className="absolute right-0 top-1 h-4 w-4 rounded-full bg-lavender-mid" />
      <span className="absolute bottom-0 left-1.5 h-4 w-4 rounded-full bg-mint-mid" />
    </span>
  );
}
