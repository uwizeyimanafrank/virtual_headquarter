# AGENTS.md — READ THIS FIRST (every AI, every session)

Project: **VHQ (Personal Virtual Headquarters)** — a cinematic public portfolio ("the Museum") plus a private, secure control room ("the Office"). Owner: Frank, who is still learning. He builds this with free AI tools that run out of quota, so **many different AIs will work on this repo, one after another**. This book is how you pick up exactly where the last one stopped.

## 1. Read order (stop reading after step 4)
1. This file.
2. `STATE.md` — tells you the current phase, current task, and anything blocked.
3. `docs/book/chapters/<current chapter>.md` — only the chapter named in STATE.md.
4. `DECISIONS.md` — locked choices. Do not re-debate them.

Read other docs (`docs/book/*.md`) only when the task tells you to.

## 2. The relay protocol (the chef rule)
You may be cut off at any moment when quota ends. So:

1. Do **exactly one task at a time**, the next unchecked one in the current chapter. Tasks are small on purpose.
2. Finish the task fully: code runs, the "Done when" check passes. Only then tick `[x]`.
3. **After every task**, before starting the next:
   - tick the box in the chapter file,
   - update the pointer in `STATE.md`,
   - append one entry to `LOG.md`,
   - `git add -A && git commit -m "P02-T04: short title" && git push`.
4. If a task is half-done and you sense quota is ending: commit with the prefix `WIP:` on the working branch and write the exact leftover in `STATE.md` under **HANDOFF** (which files, what works, what is broken, the very next command).
5. Never leave the build broken on the main working branch. If you broke something and cannot fix it, `git revert` your change and note it in STATE.md.
6. Do not skip ahead to another phase. Do not "improve" finished tasks unless Frank asks.
7. If something is unclear or conflicts with `DECISIONS.md`, do **not** guess. Write the question under **Questions for Frank** in STATE.md and move to the next independent task.
8. Tasks marked `[HUMAN]` need Frank (creating an Atlas cluster, setting env vars on Render, etc.). Add them to STATE.md under **Waiting on Frank** and continue with a task that is not blocked.

## 3. How to talk to Frank
Short. At the end of your session reply with at most 5 lines: what you finished, what is next, what Frank must do. No long explanations of basics, no hype. Casual tone is fine. If you explain something, explain only the security-critical "why" in code comments.

## 4. Golden rules (never break)
- **No hardcoded URLs.** The strings `localhost`, `127.0.0.1` and fixed domains never appear in source code. All browser calls go through `api()` in `lib/api.ts`. All server settings come from `lib/env.ts`. `npm run check:urls` must pass.
- **Same code on any server.** Moving hosts changes only `.env` values.
- **Secrets never reach the browser.** Anything secret is imported only in server code (`import "server-only"`). Never log secrets, tokens, passphrases, or env values. Never print them in errors.
- **Validate every input** (public and admin) with zod. Cap string lengths.
- **Every admin route and admin page re-checks the session.** Pages: `await requireAdmin()` as the FIRST line (layouts and pages render side by side, so a layout check alone is not enough). API routes: `const auth = await adminApi(request); if (!auth.ok) return auth.response;`. Proxy alone is never enough.
- **Vault plaintext and passphrase never touch the server.** Encryption happens in the browser (Web Crypto).
- **TypeScript strict.** No `any` without a one-line reason.
- **Readable over clever.** Frank is learning. Small files (aim under 250 lines), clear names, comments for the *why* of security code.
- **No new dependency** without adding a line to `DECISIONS.md` (name, why, date). Do not upgrade major versions.
- **Tailwind utilities inside components.** Keep `globals.css` minimal (tokens and base only).
- **Animation uses transform and opacity only**, and always respects reduced motion. GSAP: create everything inside one `gsap.context()` and `revert()` it on cleanup; any element you `pin` must be inside a wrapper element that React owns (see DECISIONS.md, P05 sideways track notes).
- **Presentation must not change data logic.** Components read data; they never reshape schemas.
- **Never commit** `.env`, tokens, keys, or real personal documents. `.env.example` holds names with empty values only.

## 4b. This is Next.js 16 (not the one you remember)
- `middleware.ts` is now `proxy.ts`. `cacheComponents` is ON: no `dynamic`/`runtime`/`revalidate` exports; per-request code starts with `await connection()` (from `next/server`) or lives inside `<Suspense>`.
- Before using a Next API you are unsure about, read the guide in `node_modules/next/dist/docs/`. See `DECISIONS.md` section "Next.js 16 specifics".

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 5. Definition of done (every task)
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:urls` and `npm run build` pass. New client components and pure logic get a test file next to them (`*.test.tsx`).
- The task's **Done when** line is true and you tested it.
- STATE.md, chapter checkbox and LOG.md are updated and pushed.

## 6. Git rules
- Work on branch `dev` (never force-push). Frank merges `dev` into `main`.
- Commit message format: `P03-T05: short title`. WIP commits: `WIP: P03-T05 short title`.
- One task per commit when possible.
