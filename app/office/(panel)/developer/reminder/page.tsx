import { requireAdmin } from "@/lib/auth-guard";
import { ENV_DOCS } from "@/lib/env-docs";

const box = "rounded-xl border border-line bg-surface px-4 py-3 text-sm";
const arrow = <span aria-hidden className="text-muted">&darr;</span>;

/** A permanent manual: how the pieces connect, and where each secret lives. Names only, never values. */
export default async function ReminderPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">System reminder</h1>
        <p className="text-muted">The map of how everything fits together. Keep this in mind when something breaks.</p>
      </div>

      <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center" role="img" aria-label="Diagram: visitors reach your domain, which points to the host running the Next.js app, which talks to MongoDB Atlas, Cloudinary and Gemini">
        <div className={box}><strong>Visitors and you</strong><br /><span className="text-muted">phone or computer</span></div>{arrow}
        <div className={box}><strong>Your domain and DNS</strong><br /><span className="text-muted">points to the host</span></div>{arrow}
        <div className={`${box} w-full border-accent/60`}><strong>The host</strong> (Render or Vercel)<br /><span className="text-muted">runs this Next.js app. The same code everywhere; only the environment settings differ.</span></div>{arrow}
        <div className="grid w-full gap-2 sm:grid-cols-3">
          <div className={box}><strong>MongoDB Atlas</strong><br /><span className="text-muted">content, messages, logins. Free tier: 512 MB.</span></div>
          <div className={box}><strong>Cloudinary</strong><br /><span className="text-muted">your images and uploads</span></div>
          <div className={box}><strong>Gemini</strong><br /><span className="text-muted">the AI Twin (numbers only)</span></div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Environment settings checklist</h2>
        <p className="mb-3 text-sm text-muted">Set these on the host (Environment tab) and in your local <code>.env</code>. Only the names are shown here, never the values.</p>
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
          {ENV_DOCS.map((e) => (
            <li key={e.key} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr]">
              <code className="font-mono text-xs">{e.key}</code>
              <span className="text-muted"><span className="text-fg">{e.feature}.</span> {e.why}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">If something goes wrong</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>The site is up but data is missing: check the database card in the Developer tab, then Atlas Network Access (the host must be allowed).</li>
          <li>Images fail to upload: open Setup, Config Doctor, and test the Cloudinary values.</li>
          <li>You think someone got in: Security page, press Panic, then change your secrets on the host.</li>
          <li>You lost your authenticator: sign in with a recovery code, then set up 2FA again.</li>
          <li>Back up <code>SERVICE_CRED_KEY</code> and your recovery codes somewhere safe, away from this computer.</li>
        </ul>
      </div>
    </section>
  );
}
