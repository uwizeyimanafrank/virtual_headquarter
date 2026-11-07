import Link from "next/link";
import { setupEnabled } from "@/lib/setup-guard";

/**
 * A slim note shown on your own computer while the site is running on demo content because
 * the database is not connected yet. Visitors of a real (production) site never see it.
 */
export function DemoBanner({ show }: { show: boolean | undefined }) {
  if (!show || !setupEnabled()) return null;
  return (
    <div role="status" className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-accent/30 bg-accent/10 px-5 py-2 text-center text-sm">
      <span className="font-medium">Demo mode</span>
      <span className="text-muted">Your database is not connected yet, so you are seeing sample content.</span>
      <Link href="/setup" className="font-medium text-accent underline underline-offset-4">Connect it now</Link>
    </div>
  );
}
