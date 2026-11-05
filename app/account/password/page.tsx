import type { Metadata } from "next";
import { Suspense } from "react";
import { getMemberAllowingPasswordChange } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Set your password" };

export default function PasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-[26px] font-extrabold text-ink">Set your password</p>
          <Suspense fallback={<p className="mt-1 text-sm text-muted">&nbsp;</p>}>
            <Greeting />
          </Suspense>
        </div>
        <div className="rounded-3xl border border-line bg-surface/90 p-7 shadow-[0_10px_40px_-16px_rgba(59,50,71,0.25)]">
          <PasswordForm />
        </div>
      </div>
    </main>
  );
}

async function Greeting() {
  const member = await getMemberAllowingPasswordChange();
  return (
    <p className="mt-1 text-sm text-muted">
      {member.must_change_password
        ? `Welcome, ${member.full_name}. Replace the temporary password you were given.`
        : "Choose a new password for your account."}
    </p>
  );
}
