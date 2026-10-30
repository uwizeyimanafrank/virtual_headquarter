import Link from "next/link";

/** Frame for the public pages: a small header with the three public places. No social links, by design. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const link = "rounded-full px-3 py-1.5 text-sm text-muted transition hover:text-fg";
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/60 backdrop-blur-md">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">VHQ</Link>
          <div className="flex gap-1">
            <Link href="/" className={link}>Home</Link>
            <Link href="/museum" className={link}>Museum</Link>
            <Link href="/connect" className={link}>Connect</Link>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
