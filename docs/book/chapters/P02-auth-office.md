# P02 — Hardened auth and Office shell

**Goal:** Only Frank can enter the Office, sessions are revocable, and sensitive actions need fresh verification.

Tick each task `[x]` when done. Do them in order.

### [x] P02-T01 — Admin model and password hashing
**Do:**
- `npm i @node-rs/argon2`. Create `models/AdminUser.ts`.
- `lib/auth.ts`: `hashPassword`, `verifyPassword` (argon2id).
- Bootstrap rule: if no admin exists, the first successful login using ADMIN_BOOTSTRAP_HASH creates the admin record.
**Files:** models/AdminUser.ts, lib/auth.ts
**Done when:** Unit script: correct password verifies, wrong one fails.
**Don't:** Never log passwords or hashes.

### [x] P02-T02 — Session model and helpers
**Do:**
- `models/Session.ts` and `lib/sessions.ts`: create session (32 random bytes, store SHA-256 hash only), validate, rotate token every 15 min, touch lastSeen, enforce idle 10 min and absolute 12 h, revoke one, revoke all.
- Cookie: httpOnly, Secure (auto from APP_URL https), SameSite=Strict, path `/`.
**Files:** models/Session.ts, lib/sessions.ts
**Done when:** Expired or revoked session is rejected; token in DB is a hash.

### [x] P02-T03 — requireAdmin() helper
**Do:**
- `lib/auth-guard.ts`: `requireAdmin()` for server components and route handlers returns the admin or throws/redirects.
- Also `requireFreshAuth(maxAgeSec)` for step-up (checks last 2FA time on the session).
**Files:** lib/auth-guard.ts
**Done when:** Calling an admin route without cookie returns 401.

### [x] P02-T04 — Audit log
**Do:**
- `models/AuditLog.ts` and `lib/audit.ts`: `audit(event, ok, ctx)` with hashed IP and device label.
- Events: login, login_fail, logout, vault_open, delete, settings_change, session_revoke, panic.
**Files:** models/AuditLog.ts, lib/audit.ts
**Done when:** Events appear in the collection.

### [x] P02-T05 — Login route with lockout
**Do:**
- `POST /api/admin/login`: zod validation, rate limit by ipHash, progressive lockout after repeated failures, identical error text for any failure, audit every attempt.
- On success create session and require 2FA step (see next tasks).
**Files:** app/api/admin/login/route.ts
**Done when:** 10 wrong passwords lock out; errors never say which part was wrong.

### [x] P02-T06 — TOTP 2FA and recovery codes
**Do:**
- `npm i otplib qrcode`. Enrol flow shows a QR once. Store the TOTP secret encrypted with SERVICE_CRED_KEY-style server key (add `TOTP_ENC_KEY` or reuse SESSION_SECRET derivation; record choice in DECISIONS.md).
- Generate 10 recovery codes, show once, store only hashes, each works once.
**Files:** lib/totp.ts, app/api/admin/2fa/*
**Done when:** Login requires a valid code; a used recovery code fails the second time.

### [ ] P02-T07 — Passkeys (WebAuthn) — DEFERRED (needs a real device and browser to test; do it when Frank can test)
**Do:**
- `npm i @simplewebauthn/server @simplewebauthn/browser`. Register a passkey after TOTP works; allow login/step-up with passkey.
- Keep TOTP as backup.
**Files:** lib/webauthn.ts, app/api/admin/passkey/*
**Done when:** Passkey registration and login work on localhost and on the deployed domain (rpID from APP_URL host).
**Don't:** Do not hardcode the domain; derive from APP_URL.

### [x] P02-T08 — Proxy and secret slug
**Do:**
- `proxy.ts` (Next 16 name for middleware): rewrite `/<ADMIN_ROUTE_SLUG>/...` to the internal office routes; return 404 for the internal path when accessed directly; for office paths, if no session cookie, redirect to login.
- Proxy is not a full authorization layer. It only checks cookie presence and rewrites the slug. Real validation is `requireAdmin()` on every page and route. Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` first.
**Files:** proxy.ts
**Done when:** Visiting the office without slug gives 404; without cookie goes to login.

### [x] P02-T09 — Step-up and sensitive action guard
**Do:**
- Add a reusable `<StepUpDialog/>` and server check `requireFreshAuth(300)` to be used by vault, service credentials, delete and security settings.
**Files:** components/office/StepUpDialog.tsx
**Done when:** A guarded endpoint refuses when the last 2FA is older than 5 minutes.

### [x] P02-T10 — Devices, sign-out-everywhere, panic
**Do:**
- Security page lists sessions (device label, last seen, current marker).
- Buttons: revoke one, **Sign out everywhere**, **Panic** (revoke all + lock + audit).
- Panic should also tell Frank to rotate SESSION_SECRET on the host.
**Files:** app/(office)/office/security/*, app/api/admin/sessions/*
**Done when:** Revoking a session logs that device out on its next request.

### [x] P02-T11 — Office shell with auto-lock
**Do:**
- Layout with sidebar (mobile: bottom/drawer nav): Dashboard, Setup, Content, Messages, AI, Developer, Vault, Security. Pages can be empty placeholders.
- Client auto-lock: after 10 min idle or when the tab is hidden for 2 min, call logout and show the login screen.
- Every page and layout calls `requireAdmin()`.
**Files:** app/(office)/office/layout.tsx and placeholder pages, components/office/AutoLock.tsx
**Done when:** Idle tab locks; direct URL without session cannot show any office content.

### [x] P02-T12 — Security headers
**Do:**
- In next.config set CSP (allow self, Cloudinary images, Google fonts if used), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame blocking.
- Test that the app still works with CSP on.
**Files:** next.config.ts
**Done when:** Headers present; no CSP errors on public pages and Office.

## Phase finish check
Try to reach the Office without logging in (cookie removed, slug guessed, direct api calls). Everything must refuse. Mark done in STATE.md.
