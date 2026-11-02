import { Suspense } from "react";
import { adminBase } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guard";
import { getSettingsView } from "@/lib/admin-settings";
import { Shell } from "@/components/office/Shell";

// Reading the session cookie is per-request work, so it lives inside Suspense (Next.js cache components).
async function Gate({ children }: { children: React.ReactNode }) {
  const { admin } = await requireAdmin(); // redirects to login if not fully signed in
  const { twinAvatarUrl } = await getSettingsView();
  return <Shell base={adminBase()} email={admin.email} twinAvatarUrl={twinAvatarUrl}>{children}</Shell>;
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading...</p>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
