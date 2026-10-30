import Link from "next/link";

export default function Page() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold">Connect</h1>
      <p className="max-w-md text-muted">The office where you can sit down and talk to me. It opens soon.</p>
      <p className="font-mono text-xs text-muted">coming in P06</p>
      <Link href="/" className="rounded-full border border-line px-5 py-2 text-sm hover:bg-surface-strong">Back to Home</Link>
    </main>
  );
}
