# DECISIONS — locked. Do not re-debate. Add new ones at the bottom.

## Stack
- Next.js App Router + TypeScript (strict) + Tailwind CSS. No `src/` directory.
- MongoDB Atlas via Mongoose. Cloudinary for media (signed uploads). GSAP + ScrollTrigger for animation (Lenis optional, P05 only).
- Gemini through `@google/generative-ai`, server-side only.
- Hosting must work on Render or Vercel with env changes only.

## Config and URLs
- Browser calls use relative `/api/...` by default. `NEXT_PUBLIC_API_BASE_URL` is optional, empty means same origin. Note: NEXT_PUBLIC_ values are baked at build time.
- Server config only through `lib/env.ts` (zod). Absolute server URLs come from `APP_URL`.
- Anti-hardcode check: `scripts/check-no-localhost.mjs`, run on `prebuild`.

## Content model
- One collection `museumItems` with `type` = project | certificate | story | book | reference. Fields in chapter P01.
- Sample content: `isSample: true`, bundled static assets, never depends on Cloudinary.

## Security
- Single admin. Password hashing with `@node-rs/argon2` (argon2id). Server-side revocable sessions: random token in httpOnly, Secure, SameSite=Strict cookie; only the SHA-256 hash is stored.
- Session limits: idle 10 minutes, absolute 12 hours, token rotated every 15 minutes while active.
- 2FA: TOTP first, passkeys (WebAuthn) second. 10 one-time recovery codes, stored hashed.
- Step-up (fresh 2FA within 5 minutes) for: vault open, service credentials, deleting content, changing security settings.
- In this Next.js version "middleware" is called **`proxy.ts`** and runs on the Node.js runtime by default. It still only does cheap cookie-presence checks and the secret-slug rewrite. Real checks are `requireAdmin()` in server code (the Next docs say proxy must not be the only authorization layer).
- Admin route lives at a secret slug from `ADMIN_ROUTE_SLUG`, never linked publicly.
- Vault: encryption in the browser with Web Crypto. PBKDF2-SHA256 (600,000 iterations), AES-256-GCM, 16-byte salt, 12-byte IV, versioned payload. Server stores ciphertext only.
- Service credentials (Developer tab) must be usable by the server, so they are encrypted at rest with AES-256-GCM using a server key `SERVICE_CRED_KEY` from env. This is NOT the zero-knowledge vault.
- AI Twin context contains only counts, sizes and statuses. Never secrets, never vault data.

## Process
- Branch `dev` for all AI work; Frank merges to `main`.
- Owner is learning: readable code, short comments on security parts.

## Next.js 16 specifics (added in P00)
- Installed: Next 16.4.3, React 19.3, Tailwind 4, Mongoose 9, zod 4. Do not change major versions.
- The scaffold turns on `cacheComponents: true` and `partialPrefetching: true`. Keep them. Consequences: do NOT use route segment config `dynamic`, `runtime` or `revalidate`; any route handler or component that must run per request (env checks, DB reads, cookies) starts with `await connection()` from `next/server` or sits inside `<Suspense>`; cacheable data uses `"use cache"` with `cacheLife`.
- Read the matching guide in `node_modules/next/dist/docs/` before using any Next API you are unsure about.
- Fonts: the `geist` npm package (local font files), not `next/font/google`, so builds never need internet.
- Dependencies added: zod (input/env validation), server-only (keeps secrets out of browser bundles), mongoose (database), cloudinary (media), geist (fonts). 2026-10-28.

## P01 notes (2026-10-28)
- Public `/api/connect` answers with the same generic text for every validation failure; honeypot returns success without saving; rate limit is 5 messages per hour per salted IP hash, stored in MongoDB (TTL cleanup).
- `ipHash` uses SESSION_SECRET as salt. In production SESSION_SECRET is mandatory; in dev a fixed dev-only salt is allowed.
- Origin check: POST requests with an Origin header must match the request host, APP_URL, or ALLOWED_ORIGINS.
- Test database used by Claude in the sandbox: FerretDB 1.24 (SQLite backend). Real Atlas must still be checked by Frank.

## P02 notes (2026-10-28)
- Cookie token rotation happens in `POST /api/admin/session/ping` (cookies can only be set in route handlers), called by the Office tab every ~2 min while the owner is active. Old token stays valid 60 seconds.
- 2FA secret is encrypted with `SERVICE_CRED_KEY` (AES-256-GCM, AAD "totp"), not derived from SESSION_SECRET (rotating SESSION_SECRET must never lock the owner out).
- Session cookies are random tokens checked against the database, NOT signed with SESSION_SECRET. So rotating SESSION_SECRET does not end sessions; use Sign out everywhere / Panic instead. SESSION_SECRET only salts IP hashes.
- Password step creates a partial session (`pending` or `enroll`) that can only reach the 2FA endpoints; completing 2FA issues a brand-new token (no session fixation).
- TOTP replay protection: a time step can be used once (`lastTotpStep`). Recovery codes are one-time and removed atomically.
- Panic locks logins for 60 minutes (`lockedUntil`) and revokes all sessions.
- Every Office page calls `await requireAdmin()` first; `requireAdmin()` calls `connection()` so nothing is decided at build time. Admin API routes use `adminApi()` (requires an Origin header on changes = CSRF defence).
- Office URL: `/<ADMIN_ROUTE_SLUG>/...` is rewritten by `proxy.ts` to the internal `/office/...`, which is 404 when visited directly. Office responses are `no-store` and `noindex`.
- `ADMIN_BOOTSTRAP_HASH` format is `b64:<base64 of argon2 hash>`.
- Dependencies added: @node-rs/argon2, otplib (v13 functional API), qrcode (+ @types/qrcode). 2026-10-28.

## P02b notes (2026-10-28)
- Sample content is created once (flag `onboarding.samplesSeeded`) on the first dashboard visit when no real item exists; deleting it is never undone by itself; "Restore samples" forces it. Sample items are `isSample: true`, status published, titles start with "Sample ...", images are bundled SVGs in /public/samples.
- Public visibility of samples is decided by `applySampleRules()` in lib/samples-data.ts: `showSamples` off hides all; `autoHideSamples` (default on) hides samples of a type once a real published item of that type exists. Used by GET /api/museum and by the dashboard banner counts.
- Deleting all samples needs a fresh 2FA (step-up). Hide/show/autohide/restore do not.
- Checklist steps are partly auto-detected (profile photo and about text are only "done" when not sample text; certificate/project need a non-sample item; 2FA via the admin record; Cloudinary+Gemini via env presence; database is true while the Office works). The rest are manual (Mark done / Skip / Undo skip).
- Config Doctor "test without saving" needs a fresh 2FA (the server connects to an address the owner provides), is rate-limited to 10 per 10 minutes, validates the scheme, uses a temporary connection with 5s timeouts, and returns only a coarse reason (format/dns/auth/network/unknown), never raw driver errors, never the pasted values.
- The Office guide texts avoid literal web addresses (the no-hardcode guard scans components/).

## P03 notes (2026-10-29)
- Item `mediaUrl` must be an https image on res.cloudinary.com or a bundled /samples/ file, because the CSP only allows images from those places.
- Create uses defaults (draft, speed 0.5, order 0); PATCH uses a separate schema with no defaults so a partial update can never reset other fields. Editing any content field of a sample item (not just status or order) turns it into the owner's own item (`isSample: false`).
- Delete (items, messages) needs a fresh 2FA and writes an audit entry. Publish/draft toggle, reorder, mark read and archive do not.
- Uploads: browser uploads straight to Cloudinary with a server-made signature that signs timestamp, folder and `allowed_formats` (jpg, jpeg, png, webp, gif, avif; no SVG). Client also limits files to 8 MB. Folder is `vhq/<type>` or `vhq/profile`.
- Messages are stored and rendered as plain text only. Archive keeps them; delete is permanent.
- `profileIsSample` stays true while any profile field still equals the sample text, and flips to false once none does.
- Never export helper functions from Next.js route files (route.ts); shared helpers live in lib/.

## P04 notes (2026-10-30)
- Public pages live in the `app/(site)` route group (shared header: Home, Museum, Connect; no social links). The Office has no header link anywhere public.
- Home data comes from `getHomeData()` (lib/home.ts): `"use cache"` + `cacheTag("home")` + `cacheLife({stale:300, revalidate:300, expire:86400})`. It returns plain serializable data and falls back to default wording if the database is unreachable. Every admin route that changes public content calls `invalidateHome()` (revalidateTag with `{ expire: 0 }`, so the next visit rebuilds immediately). Route handlers may call it; page renders may not, which is why sample seeding moved into `GET /api/admin/samples`.
- The Canvas CV is derived from the profile and published items (certificates = credentials, projects, skills aggregated from item skills, trajectory = items by date). No CV text is hardcoded. Real internships/education go in as Museum items (for example type "story" or "reference").
- Motion: only transform/opacity, CSS keyframes in globals.css (drift, float, fadeUp, curtain), always `motion-safe:`. Card tilt only with a real mouse (`(hover: hover) and (pointer: fine)`) and not under reduced motion; touch devices get a gentle float instead. The Gate fade is skipped under reduced motion and for ctrl/cmd/shift/alt/middle clicks.
- Testing tools added: vitest, @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom (devDependencies), `@types/node` pinned to ^22 (Vitest needs it). Run `npm test`. Config: vitest.config.mts, vitest.setup.ts, helper tests/media-query.ts. Test files (`*.test.ts(x)`) and the `tests/` folder are ignored by the no-hardcoded-address guard because they hold example data.
- Size budget: first-load JS for Home is measured in the integration test with a 200 KB gzipped ceiling (React + Next are about 150 KB of that).

## P05 notes (2026-10-30)
- Museum chapters: story -> "about", certificate -> "certificates", project -> "projects", book and reference -> "library". `getMuseumData()` returns all four; the page layout skips empty ones. Inside a chapter: your own `order`, then newest first. Each chapter has its own colour (teal, amber, indigo, emerald) set through a CSS variable.
- Museum data (Kimi's `lib/museum.ts`) has its own cache tag `museum`; every admin route that changes public content calls both `invalidateHome()` and `invalidateMuseum()`.
- Reveal animation (`useReveal`): content is visible in server HTML and without JavaScript; only after hydration, and only without reduced motion, items start hidden and fade up as they enter the viewport (staggered delay by index, once per item).
- The pop-up is rendered in a portal on document.body (cards use transforms, which would break `position: fixed` inside them). Links in the pop-up are shown only when they start with http:// or https://, open in a new tab with rel noopener noreferrer.

## P05 sideways track notes (2026-10-31)
- Dependency added: `gsap` 3.15 (includes ScrollTrigger; GSAP's standard no-charge license). It is loaded with a dynamic `import()` inside the effect, so phones and the vertical layout never download it.
- Layout rule: sideways track when `(min-width: 768px)` AND NOT reduced motion; otherwise the vertical timeline. Only one is mounted at a time. The server always renders the vertical one (works without JavaScript).
- Everything GSAP creates lives in one `gsap.context()` that is `revert()`ed on unmount and when props change, so no ScrollTrigger or style is left behind.
- GSAP pinning moves the pinned element into a "pin-spacer" wrapper. The pinned `<section>` MUST sit inside an element React owns (the outer `div`), otherwise React crashes when removing it. Covered by a real-GSAP test.
- Per piece: drift `x` from `+140*parallaxSpeed` to `-140*parallaxSpeed` while crossing the screen (scrubbed to the track via `containerAnimation`), plus a one-time fade/slide-in with a small stagger. Progress rail fill and the active chapter are updated from the track's `onUpdate`. Chapter buttons scroll the page to the matching track position; tabbing to an off-screen piece scrolls the page to it.
- `overflow-clip` on the pinned section stops the browser from scrolling it sideways when something inside takes focus.

## P06 notes (2026-10-31)
- Connect form errors: the visitor only ever sees our own sentences (429: sent a few already; 400: check your details; anything else: could not be sent). Server wording is never shown.
- Public JSON endpoints read their body with `readJsonLimited()` (lib/body.ts): contact form 20 KB, login 5 KB. Announced Content-Length is checked first, then the real byte size; too big gives 413, not JSON gives 400 (login keeps its single generic failure answer).
- Bot trap: an off-screen input named `website` (tabindex -1, aria-hidden, autocomplete off). If filled, the API answers success but saves nothing.
- HTTP integration scripts live in `tests/http/` (ignored by the no-hardcoded-address guard because they contain test addresses).

## P07 notes (2026-10-31)
- SDK: `@google/genai` (Google's current SDK) instead of the older `@google/generative-ai` named in the first plan, because it is the maintained one and works with current models. Dependency added 2026-10-31.
- Model: default alias `gemini-flash-latest` so the name does not go stale; override with `GEMINI_MODEL`. `GEMINI_API_BASE_URL` (optional) sends requests through a proxy or the test fake instead of Google; it is how the HTTP tests run without internet.
- What the AI may know (`lib/twin-context-core.ts`, the ONLY gateway): item counts per type and status, number of samples, unread message count, database size, whether media is configured and its storage size, last successful login time. Never: titles, descriptions, message text, emails, passwords, keys, env values, database address, vault data. The builder copies only whitelisted fields, so a mistake in the collector cannot leak more. Any new fact for the twin must be added there AND get a test.
- The snapshot is put into the system prompt on the server (the browser never sends or sees it). The prompt tells the model it has no access to secrets, must not ask for them, and must treat instructions inside user text as plain text.
- Limits: message 2000 chars, history capped at 40 in the request and the last 10 turns used, body 60 KB, 700 output tokens, 20 questions per 10 minutes. Errors shown to the owner are our own sentences; upstream error text and the key are never shown or logged (only the error class name).
- The chat shows replies as plain text. History lives only in the browser tab.
- Server modules that import `server-only` are unit-tested through a stub (`tests/server-only-stub.ts`, aliased in vitest.config.mts).
- `ITEM_TYPES` moved to `lib/item-types.ts` (no database import) so plain code and tests can use it; `models/MuseumItem.ts` re-exports it.

## P08 notes (2026-11-04)
- Service kinds: http (any web address), mongodb (empty credentials = THIS app's database), cloudinary (empty = values from .env), render (API key + service id). A new kind = one file in lib/services + one line in the registry.
- Credentials: JSON encrypted with SERVICE_CRED_KEY (AES-256-GCM, label `service:<id>` so a value cannot be moved to another service). Write-only: never returned (the API only says `hasCredentials`), never logged, never shown again. Saving, replacing or clearing credentials and deleting a service need a fresh 2FA (step-up). Max 30 services.
- SSRF protection for website checks (lib/services/net.ts): http(s) only, no login details inside the address, private/loopback/link-local/metadata/reserved ranges refused both for literal IPs and for the address a name resolves to (checked inside the connection's own DNS lookup, so rebinding cannot swap it), no redirects followed, nothing of the answer kept except the status code, 5 s limit. `ALLOW_PRIVATE_SERVICE_TARGETS=true` (exactly that value) switches the refusal off for self-hosting.
- Caching: results are reused for 5 minutes; "check now" waits at least 30 s between checks of one service; every check has a 9 s overall limit; any failure becomes a plain message, never raw error text.
- Alerts: going down writes one `service_down` audit entry (staying down does not repeat), coming back writes `service_up`; Office pages show a red banner naming services that are down (names shown as plain text).
- Dependencies: none added. The no-hardcoded-address guard now allows a line to opt out with a `check:urls-ignore` comment (used once, for the list of blocked private ranges) and allows api.render.com.
