"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AutoLock } from "@/components/office/AutoLock";
import { TwinAvatar } from "@/components/office/TwinAvatar";

const NAV = [
  { path: "", label: "Dashboard" },
  { path: "/setup", label: "Setup" },
  { path: "/content", label: "Content" },
  { path: "/messages", label: "Messages" },
  { path: "/ai", label: "AI Twin" },
  { path: "/developer", label: "Developer" },
  { path: "/vault", label: "Vault" },
  { path: "/security", label: "Security" },
  { path: "/settings", label: "Settings" },
];

/** Office frame: sidebar on desktop, scrolling tab bar on phones. `base` is the secret Office address. */
export function Shell({ base, email, twinAvatarUrl, children }: { base: string; email: string; twinAvatarUrl?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (p: string) => (p === "" ? pathname === base : pathname.startsWith(`${base}${p}`));
  const link = (p: string, label: string, extra = "") => (
    <Link key={p} href={`${base}${p}`} data-tour={`nav-${p.replace("/", "") || "home"}`} aria-current={active(p) ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${active(p) ? "bg-surface-strong text-accent" : "text-muted hover:text-fg"} ${extra}`}>
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <AutoLock base={base} />
      <TwinAvatar avatarUrl={twinAvatarUrl} />
      <aside className="border-b border-line bg-surface/40 backdrop-blur md:w-56 md:border-b-0 md:border-r">
        <div className="hidden px-4 py-5 md:block">
          <p className="font-semibold">VHQ Office</p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
        <nav aria-label="Office" className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-col md:px-3">
          {NAV.map((n) => link(n.path, n.label, "md:block"))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
