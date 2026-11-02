# P07 — AI Twin

**Goal:** A floating avatar that opens a chat with Gemini, aware of safe live site stats.

Tick each task `[x]` when done. Do them in order.

### [ ] P07-T01 — [HUMAN] Create Gemini API key
**Do:**
- Frank creates a free Gemini API key in Google AI Studio and sets GEMINI_API_KEY. Note: free tiers may use prompts for training, so never send private data.
**Files:** .env
**Done when:** Frank confirms the key is set.

### [x] P07-T02 — Gemini server module
**Do:**
- `npm i @google/generative-ai`. `lib/gemini.ts` (server-only): `askTwin(history, userMessage)` with a system prompt that defines the twin's role and refuses to reveal secrets.
**Files:** lib/gemini.ts
**Done when:** A script gets a reply.
**Don't:** Never import this in client code.

### [x] P07-T03 — Safe context builder
**Do:**
- `lib/twin-context.ts` collects: count of items per type/status, sample count, unread messages, Cloudinary storage used (if available), DB size, last login time.
- Only numbers and statuses. Never env values, vault data, message bodies or emails.
**Files:** lib/twin-context.ts
**Done when:** Unit check proves no secret-like fields appear in output.

### [x] P07-T04 — Admin chat API
**Do:**
- `POST /api/admin/ai`: requireAdmin, rate limit, trim history to last 10 turns, inject context invisibly into the payload, cap input length.
**Files:** app/api/admin/ai/route.ts
**Done when:** Unauthenticated calls are refused; asking "how many items are published?" returns the right number.

### [x] P07-T05 — Floating avatar and chat panel
**Do:**
- Avatar bubble fixed in a corner of every Office page. Click opens a responsive chat panel (full-screen on phones). Message list, input, loading state, error state. Avatar image can be changed from Settings.
**Files:** components/office/TwinAvatar.tsx, components/office/TwinChat.tsx
**Done when:** Works on phone and desktop; closes with Escape.

## Status (Claude, 2026-10-31)
T01 is a **[HUMAN]** step and is still open: Frank must create a free Gemini API key in Google AI Studio and put it in `.env` as `GEMINI_API_KEY`.
T02..T05 are built: `lib/gemini.ts` (SDK adapter behind a small `TwinModel` interface, prompt builder, history cleaning), `lib/twin-context-core.ts` + `lib/twin-context.ts` (the only facts the AI may see: counts and statuses), `POST /api/admin/ai`, `TwinAvatar` + `TwinChat` in every Office page, avatar picture editable in Settings. Verified by 27 unit/component tests and `tests/http/ai.sh` (61 checks) which runs the real server against `tests/http/fake-gemini.py` and inspects exactly what is sent to the AI service. NOT verified: a real call to Google (the sandbox has no access) and the look of the chat window in a real browser. If the real service rejects the default model alias `gemini-flash-latest`, set `GEMINI_MODEL` to a model name from Google AI Studio.

## Phase finish check
Twin answers with live counts and never exposes secrets. Mark done.
