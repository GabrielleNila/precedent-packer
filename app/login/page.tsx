import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  "no-access": "Your account isn't active on Precedent Pack. Ask an admin for access.",
  "signed-out": "You've been signed out.",
};

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; m?: string }> }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div aria-hidden className="mx-auto mb-3 flex w-fit -space-x-2">
            <span className="h-6 w-6 rounded-full bg-blush" />
            <span className="h-6 w-6 rounded-full bg-lavender-mid" />
            <span className="h-6 w-6 rounded-full bg-mint-mid" />
          </div>
          <p className="text-[26px] font-extrabold text-ink">Precedent Pack</p>
          <p className="mt-1 text-sm text-muted">Litigation drafting suite · team members only</p>
        </div>
        <div className="rounded-3xl border border-line bg-surface/90 p-7 shadow-[0_10px_40px_-16px_rgba(59,50,71,0.25)]">
          <Suspense fallback={<LoginForm />}>
            <LoginWithNotice searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-[12.5px] text-muted">
          No account? Ask an admin at your firm to add you.
        </p>
      </div>
    </main>
  );
}

async function LoginWithNotice({ searchParams }: { searchParams: Promise<{ error?: string; m?: string }> }) {
  const params = await searchParams;
  const key = params.error ?? params.m;
  return <LoginForm notice={key ? NOTICES[key] : undefined} />;
}
