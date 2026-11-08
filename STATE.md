# STATE — the single source of truth for "where are we?"
Update this after EVERY task. Keep it short.

## Repository
- GitHub: `uwizeyimanafrank/virtual_headquarter`. Branches: `main` (what Frank has reviewed) and `dev` (where AI tools push). Read README.md first.

## Pointer
- **Current phase:** P11 — Art and Home v2 (P10 rest comes after P14)
- **Current task:** P11-T03 (Office > Images manager; art kit is P11-T06)
- **Status:** not started. P09 done in code (P08 done in code; P05-P09 not visually checked; Gemini key waiting on Frank; passkeys T07 of P02 deferred; P00-T07 Atlas check waiting on Frank)
- **Last worker:** Claude (chat), 2026-11-06
- **Next action (one sentence):** P11-T03: Office > Images manager (app/office/(panel)/images, components/office/ImageSlots.tsx, app/api/admin/slots/*): list slots grouped by page with thumbnail, where-text, size and default/custom status; replace by upload or library, focus point, alt/credit/license, reset to default, audit every change, revalidateSlots() after each. Use groupSlots() and getSlots(); follow the services/vault admin API pattern (adminApi, readJsonLimited, audit). Frank is also testing the dev build locally; fix what he reports first.

## Phase board
| Phase | Name | Status |
|---|---|---|
| P00 | Foundation and config layer | done (waiting on Frank for T07) |
| P01 | Data models and public API | done |
| P02 | Hardened auth and Office shell | done (passkeys T07 deferred) |
| P02b | Newcomer guide and samples | done |
| P03 | Content manager and inbox | done |
| P04 | Home page | done |
| P05 | Museum | done in code (needs a visual check by Frank) |
| P06 | Connect page | done (needs a visual check) |
| P07 | AI Twin | done in code (needs a Gemini key and a visual check) |
| P08 | Developer tab | done in code (needs a visual check) |
| P09 | Secrets vault | done in code |
| P11 | Art and Home v2 | in progress (T01-T02 done) |
| P12 | Museum halls (glass cases) | not started |
| P13 | Dispatches and Gallery | not started |
| P14 | Hire me | not started |
| P15 | Public avatar and AI control room | not started (after first release) |
| P10 (rest) | Security review, speed, previews, deploy, merge to main | after P14 |

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

- Open `/museum` on a desktop and scroll: it should walk sideways through the chapters with the progress buttons at the bottom. Resize the window narrower than 768px and back. On a phone it should be the vertical timeline. Report anything that looks or feels off (speed, overlap with the header, flash on first load).

- Open `/connect` on your phone and PC, send yourself a message, then open Office > Messages and check it arrived (and the unread number on the dashboard). Try sending 6 messages in a row: the 6th should be refused politely.
- P07-T01: create a free Gemini API key in Google AI Studio and put it in `.env` as `GEMINI_API_KEY` (never paste it into a chat or commit it). Then open the Office, click the round AI Twin button (bottom right), ask "How is my site doing?" and report what happens. If it says the model is not found, set `GEMINI_MODEL` to a model name shown in Google AI Studio.

## Questions for Frank
(empty)

## Known bugs / debts
- Typecheck needs Next generated types: run `npx next typegen` before `npx tsc --noEmit`.
- Flaky unit test: once, 1 of 197 unit tests failed on a busy machine and passed on the immediate rerun (not identified; probably a timing-based one such as the probe time-limit test in lib/services/net.test.ts). If `npm test` fails once, rerun it before assuming a real break; if it keeps happening, find it with `npx vitest run --reporter=verbose` and make it less timing-sensitive.
- P08: tested against fakes only. The Render adapter (`lib/services/render.ts`) and the Cloudinary usage field names (`lib/services/cloudinary.ts`) follow those services' documented answers from memory and have never talked to the real services. If a card shows odd numbers or "Could not read", adjust those two files.
- P08: a stored MongoDB address (monitoring someone else's database) is connected to as given; only the website-address checks have the private-network protection. Credentials are owner-only and need a fresh 2FA to save.
- P08: Developer pages and the down banner are not visually checked.
- P07: no real call to Google has ever been made (no internet in the build sandbox). The request format is verified against the official SDK and a fake service (`tests/http/fake-gemini.py`). The default model alias `gemini-flash-latest` is unverified; `GEMINI_MODEL` overrides it.
- P07: the SDK is `@google/genai` (the maintained one), not `@google/generative-ai` as first planned; see DECISIONS.md.
- P07: the AI Twin can only talk. It cannot change anything, and its chat history is not saved (gone when the tab closes). That is on purpose for now.
- Test-quality note: two older HTTP checks (in connect.sh) passed vacuously because a page was saved to the wrong file; fixed, and each now first proves the page was fetched. If you write new checks, make sure they would fail when the thing is broken.
- P06 `/connect` is tested (unit + HTTP) but not looked at in a real browser.
- The contact form has only a hidden-field bot trap and a per-address rate limit (5 per hour). A determined spammer using many addresses can still send some messages; add a captcha or a time-to-fill check later if that happens.
- The HTTP test scripts now live in the repo (`tests/http/`, see its README). They need a MongoDB-compatible server on 127.0.0.1:27017 and drop their own test databases.
- P05-T04..T07 (sideways Museum) are tested for wiring, switching and cleanup (17 tests, 2 of them with the real GSAP), but NOT looked at in a real browser. Expect small visual tuning (sizes, drift amount `140 * parallaxSpeed`, top padding under the sticky header, scroll length).
- On wide screens the server sends the vertical layout and the browser switches to the sideways one after loading, so there may be a brief flash/jump. If it looks bad, hide the Museum until the layout is chosen (client-only rendering of the choice).
- SKIPPED TEST in components/museum/MuseumClient.test.tsx ("only ONE track is built" when props change before GSAP loaded): with the fake GSAP it ends with 0 contexts instead of 1. Not understood yet (test setup or a real bug). Also note `MuseumClient` creates a new `chapters` array on every render (`filter`), which re-runs the track's effect; wrap it in `useMemo` and then re-enable the test.
- `overflow-clip` (used so focus cannot scroll the pinned section sideways) needs Safari 16+ / current Chrome and Firefox.
- `npm test`: on Node 20 only the lib test files run — the 7 jsdom component test files fail to start workers because the lockfile's jsdom + undici use Node 22 APIs (zstd zlib, Iterator global). They were green in Claude's Node 22 environment. Use Node 22 locally to run the full suite. Not an app bug.
- P04 verified over HTTP (49 checks) and with 41 unit/component tests in a simulated browser (jsdom). Not verified in a real browser: visual look, animation smoothness, real touch behaviour. Lighthouse could not run in the sandbox.
- Home page JavaScript is 176 KB gzipped (React + Next about 150 KB; our own code about 20 KB).
- Home is cached for 5 minutes and refreshed immediately when you save anything in the Office. If the server restarts on the same build it serves the last saved copy until the next refresh. If the database is unreachable while BUILDING, the build bakes in default wording that is replaced within about 5 minutes of the first visit once the database is reachable.
- `/connect` is a temporary placeholder page (replaced in P06). `/museum` now works with the vertical layout on every screen size; the sideways desktop track is still to do (P05-T04..T07).
- P05-T01 (Kimi) and T02..T03 (Claude) merged. Verified with 15 new component tests and 33 HTTP checks (chapters in order, edits appear immediately, drafts hidden, text escaped). Not verified in a real browser: how the timeline and pop-up look and feel.
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

## Waiting on Frank (added 2026-11-07)
- Hero photo: use my original silhouette, or give me your own moody photo (upload it later in the Office) for the hero.
- Pick the avatar's name (or keep "Avatar").
- Confirm the suggested order: P11, P12, P13, P14, then P10 rest and go live; P15 (avatar) after.
- Say yes or no to video (it uses free Cloudinary bandwidth).
- Local test feedback (screenshots or error text) from running `npm run dev` on Windows (Node 24).
