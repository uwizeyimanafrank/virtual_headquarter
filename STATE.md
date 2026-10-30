# STATE — the single source of truth for "where are we?"
Update this after EVERY task. Keep it short.

## Repository
- GitHub: `uwizeyimanafrank/virtual_headquarter`. Branches: `main` (what Frank has reviewed) and `dev` (where AI tools push). Read README.md first.

## Pointer
- **Current phase:** P05 — Museum
- **Current task:** P05-T02
- **Status:** P05-T01 done (museum data layer + chapter-grouped page); P04 done; passkeys T07 deferred; P00-T07 still waiting on Frank
- **Last worker:** Kimi, 2026-10-31
- **Next action (one sentence):** Build the mobile vertical timeline first (P05-T02, components/museum/VerticalTimeline.tsx) — it is the fallback under 768px and for reduced motion; data comes from getMuseumData() in lib/museum.ts.

## Phase board
| Phase | Name | Status |
|---|---|---|
| P00 | Foundation and config layer | done (waiting on Frank for T07) |
| P01 | Data models and public API | done |
| P02 | Hardened auth and Office shell | done (passkeys T07 deferred) |
| P02b | Newcomer guide and samples | done |
| P03 | Content manager and inbox | done |
| P04 | Home page | done |
| P05 | Museum | in progress (T01 done) |
| P06 | Connect page | not started |
| P07 | AI Twin | not started |
| P08 | Developer tab | not started |
| P09 | Secrets vault | not started |
| P10 | Polish, audit, deploy | not started |

Status words: not started / in progress / done.

## HANDOFF (only if a task was left half-done)
(empty)

## Waiting on Frank  ([HUMAN] tasks)
- P00-T07: create a free MongoDB Atlas cluster, make a database user, allow your IP, put the connection string in `.env` as MONGODB_URI. Then run `npm run dev`, open `/api/health` and confirm `dbReachable` is true.
- Create a Cloudinary account and fill the three CLOUDINARY_ values in `.env`. Then confirm `cloudinaryReachable` is true in `/api/health`.
- Run `npm install` once after unzipping (node_modules is not included).
- Before deploying (production mode), set `SESSION_SECRET` on the host: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. The contact route refuses to run in production without it (on purpose).

- Follow `docs/OFFICE-SETUP.md`: make SESSION_SECRET, SERVICE_CRED_KEY, ADMIN_ROUTE_SLUG, run `node scripts/hash-password.mjs`, set env, then do the first login and save your recovery codes. Tell the AI how the login screen looked on your phone and PC.

- Open the Office dashboard in a real browser: check the guided tour (spotlight and tooltip placement on phone and PC), the sample banner buttons, the setup checklist and the Config Doctor page, and report anything odd.

- Try the Content screens in a real browser: add an item, upload a real image (needs your Cloudinary values), publish it, reorder, delete; send yourself a message from the contact API and read it in Messages; edit your profile in Settings. Report anything odd.

- Open the public Home page on your phone and on a PC: check the tabs (Welcome / Canvas CV), the card tilt on desktop and gentle float on phone, the fade when pressing Continue to the Museum, and run Lighthouse (Chrome DevTools, Mobile) and tell the AI the Performance score. Run `npm test` once to see the unit tests pass.

## Questions for Frank
(empty)

## Known bugs / debts
- `npm test`: on Node 20 only the lib test files run — the 7 jsdom component test files fail to start workers because the lockfile's jsdom + undici use Node 22 APIs (zstd zlib, Iterator global). They were green in Claude's Node 22 environment. Use Node 22 locally to run the full suite. Not an app bug.
- P04 verified over HTTP (49 checks) and with 41 unit/component tests in a simulated browser (jsdom). Not verified in a real browser: visual look, animation smoothness, real touch behaviour. Lighthouse could not run in the sandbox.
- Home page JavaScript is 176 KB gzipped (React + Next about 150 KB; our own code about 20 KB).
- Home is cached for 5 minutes and refreshed immediately when you save anything in the Office. If the server restarts on the same build it serves the last saved copy until the next refresh. If the database is unreachable while BUILDING, the build bakes in default wording that is replaced within about 5 minutes of the first visit once the database is reachable.
- `/museum` now shows real chapter-grouped data in a simple grid (final vertical timeline and horizontal track arrive in P05-T02..T07). `/connect` is still a temporary placeholder page (replaced in P06).
- P03 server logic tested over HTTP (87 checks). The browser parts (Uploader drag and drop and its direct upload to Cloudinary, ContentManager, ItemForm preview, MessagesInbox, SettingsForm) are type-checked and server-rendered only. The Cloudinary upload itself could not be run in the sandbox: the signature was verified against an independent calculation, but a real upload is untested.
- Deleting an item does not delete its image from Cloudinary (the asset stays in your media library). Fine for now; a cleanup tool can come later in the Developer tab (P08).
- A "not found" edit page (unknown item id) shows the not-found screen but with HTTP status 200 because the response had already started streaming. No content leaks and it is noindex.
- Reordering uses Up/Down buttons (no drag and drop yet). It is disabled while a search or status filter is active.
- P02b server logic is tested over HTTP (about 60 checks). The browser parts (Tour spotlight positioning, SampleBanner, SetupChecklist, DoctorPanel) are type-checked and server-rendered but not clicked through in a real browser.
- Real Cloudinary and Gemini connections were not testable in the sandbox (no internet access to them). The Config Doctor reports them as "needs fixing" until real values are set; the test-without-saving for Cloudinary was only checked for the failure path.
- `ensureSamples()` runs (and may write) when the dashboard page is visited. It is idempotent and one-time, but it is a write during page render; revisit if it ever causes problems.
- P02 was tested over HTTP against a Mongo-compatible test DB: 40 API checks and 35 page/header/leak checks pass. The browser-side code (LoginFlow, AutoLock, SecurityPanel, Shell) was type-checked and server-rendered but NOT clicked through in a real browser. Frank: please try the login on phone and PC and report anything odd.
- P02-T07 passkeys deferred (needs a real device). TOTP + recovery codes are the 2FA for now.
- CSP still allows `'unsafe-inline'` scripts (Next.js bootstrapping). Move to nonces in P10.
- TTL cleanup of sessions/audit/rate-limit documents is untested on the test DB; Atlas supports it.
- P01 was tested against FerretDB (a Mongo-compatible test database), not real Atlas. Automatic expiry (TTL) of rate-limit counters is untested; confirm on Atlas.
- `/api/museum` returns the sample book when `showSamples` is true (default). Sample seeding itself arrives in P02b.
- `lib/db.ts` was only tested here against an unreachable database (returns false, no crash). It still needs one real test with a real Atlas URI (see P00-T07).
- `components/ui/HealthBadge.tsx` is a temporary diagnostic on the home page. Remove it in P04.
