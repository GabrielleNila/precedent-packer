import { Suspense } from "react";
import { MatterTabs } from "./matter-tabs";

export default function MatterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="mb-5 h-10 w-80 rounded-full bg-surface/60" />}>
        <MatterTabs />
      </Suspense>
      {children}
    </>
  );
}
