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
