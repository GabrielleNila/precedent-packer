export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-72 animate-pulse rounded-full bg-accent-soft" />
      {["bg-accent-soft/60", "bg-lavender-soft", "bg-mint-soft"].map((c) => (
        <div key={c} className={`h-44 animate-pulse rounded-3xl ${c}`} />
      ))}
    </div>
  );
}
