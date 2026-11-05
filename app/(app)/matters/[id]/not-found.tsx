import Link from "next/link";

export default function MatterNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface/90 px-8 py-12 text-center">
      <p className="text-xl font-extrabold text-ink">Matter not found</p>
      <p className="mt-2 text-sm text-muted">It may have been deleted, or it belongs to another firm.</p>
      <Link href="/matters" className="mt-6 inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
        Back to matters
      </Link>
    </div>
  );
}
