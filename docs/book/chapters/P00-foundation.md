# P00 — Foundation and config layer

**Goal:** A running Next.js app with a single config layer so the same code runs on any server by changing only env values.

Tick each task `[x]` when done. Do them in order.

### [x] P00-T01 — Scaffold the app
**Do:**
- Run create-next-app: TypeScript, Tailwind, ESLint, App Router, NO src directory, import alias `@/*`.
- If it complains about existing files, scaffold in a temp folder and copy results in, keeping our AGENTS.md, STATE.md, LOG.md, DECISIONS.md and docs/.
- Turn on `strict` in tsconfig.
**Files:** package.json, tsconfig.json, app/
**Done when:** `npm run dev` shows the default page and `npm run build` passes.
**Don't:** Do not add extra libraries yet.

### [x] P00-T02 — Create folder skeleton
**Do:**
- Create empty folders from `docs/book/01-architecture.md`: components/{ui,home,museum,office}, lib, models, hooks, scripts, public/samples.
- Add a `.gitkeep` in empty folders.
**Files:** folders only
**Done when:** Folders exist in git.

### [x] P00-T03 — Server env loader (lib/env.ts)
**Do:**
- `npm i zod server-only`.
- Define a zod schema for every variable in `docs/book/ENV.md`. Make most optional at this stage.
- Export `getEnv()` (parsed, cached) and `requireEnv(key)` which throws a readable error naming the missing variable and pointing to docs/book/ENV.md.
- First line of file: `import "server-only"`.
**Files:** lib/env.ts
**Done when:** A tiny test route or script shows `requireEnv("MONGODB_URI")` gives a clear message when it is empty.
**Don't:** Never include values in any error message.

### [x] P00-T04 — Client config and api() helper
**Do:**
- `lib/config.ts`: `export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""`.
- `lib/api.ts`: `api<T>(path, init?)` joins API_BASE + path, sets JSON headers, sends cookies (`credentials: "include"`), parses JSON, throws an `ApiError(status, message)` on non-2xx.
- All future browser fetches must use this helper.
**Files:** lib/config.ts, lib/api.ts
**Done when:** Calling `api("/api/health")` from a client component works with API_BASE empty.
**Don't:** No other file may build URLs by hand.

### [x] P00-T05 — No-localhost guard
**Do:**
- Write `scripts/check-no-localhost.mjs`: scan app/, components/, lib/, models/, hooks/, proxy.ts for `localhost`, `127.0.0.1`, and hardcoded `http://` or `https://` origins. Allow-list standard namespace URLs (like w3.org) and the script itself.
- Add npm scripts: `check:urls` and `prebuild` (runs check:urls).
**Files:** scripts/check-no-localhost.mjs, package.json
**Done when:** Adding the word localhost to a source file makes `npm run build` fail with the file name and line.

### [x] P00-T06 — Env example and gitignore
**Do:**
- Create `.env.example` with every variable name from ENV.md, empty values, one-line comment each.
- Confirm `.gitignore` ignores `.env*` except `.env.example`.
- Write a short README: install, copy env, run dev.
**Files:** .env.example, .gitignore, README.md
**Done when:** A fresh clone can run after copying .env.example to .env.

### [ ] P00-T07 — [HUMAN] Create Atlas cluster and set MONGODB_URI
**Do:**
- Frank creates a free Atlas cluster, a database user, allows his IP (and later the host IPs), and puts the connection string in `.env`.
- Add this to STATE.md under Waiting on Frank if not done, and continue with T08 and T10 in the meantime.
**Files:** .env (local only)
**Done when:** Frank confirms MONGODB_URI is set.

### [x] P00-T08 — Cached Mongoose connection (lib/db.ts)
**Do:**
- `npm i mongoose`.
- Export `connectDb()` that reuses one connection stored on `globalThis` (important for dev hot reload and serverless).
- Set a modest `maxPoolSize` and `serverSelectionTimeoutMS`. Throw a readable error if MONGODB_URI is missing.
**Files:** lib/db.ts
**Done when:** Calling connectDb() twice opens one connection only. No pool leak after 20 hot reloads.
**Don't:** Do not connect at import time; connect on demand.

### [x] P00-T09 — Cloudinary server config (lib/cloudinary.ts)
**Do:**
- `npm i cloudinary`.
- Configure from env on first use. Export `getUploadSignature(folder)` that returns timestamp + signature for signed browser uploads (never expose the secret).
**Files:** lib/cloudinary.ts
**Done when:** A script prints a signature object without printing the secret.
**Don't:** Do not log env values.

### [x] P00-T10 — Health endpoint
**Do:**
- `GET /api/health` returns JSON of booleans only: envPresent (per key), dbReachable (ping), cloudinaryReachable (a light api call).
- Set `Cache-Control: no-store`. Never return values, URIs or error stack traces.
**Files:** app/api/health/route.ts
**Done when:** Endpoint returns booleans; with a wrong MONGODB_URI it returns `dbReachable:false` instead of crashing.

### [x] P00-T11 — Design tokens and base layout
**Do:**
- Add colour tokens (CSS variables) for the dark glass theme and one accent; map them into Tailwind config.
- Load a display font and a body font with next/font. Create a root layout with dark background.
- Add `useMediaQuery` and `useReducedMotion` hooks.
**Files:** app/globals.css, tailwind config, app/layout.tsx, hooks/
**Done when:** Home page shows a dark page with the chosen fonts; hooks compile.
**Don't:** Keep globals.css tiny.

## Phase finish check
Run `npm run lint && npm run check:urls && npm run build`. Then on a host (Render or Vercel) only set env values and confirm `/api/health` works. Mark P00 done in STATE.md.
