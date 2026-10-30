# P07 — AI Twin

**Goal:** A floating avatar that opens a chat with Gemini, aware of safe live site stats.

Tick each task `[x]` when done. Do them in order.

### [ ] P07-T01 — [HUMAN] Create Gemini API key
**Do:**
- Frank creates a free Gemini API key in Google AI Studio and sets GEMINI_API_KEY. Note: free tiers may use prompts for training, so never send private data.
**Files:** .env
**Done when:** Frank confirms the key is set.

### [ ] P07-T02 — Gemini server module
**Do:**
- `npm i @google/generative-ai`. `lib/gemini.ts` (server-only): `askTwin(history, userMessage)` with a system prompt that defines the twin's role and refuses to reveal secrets.
**Files:** lib/gemini.ts
**Done when:** A script gets a reply.
**Don't:** Never import this in client code.

### [ ] P07-T03 — Safe context builder
**Do:**
- `lib/twin-context.ts` collects: count of items per type/status, sample count, unread messages, Cloudinary storage used (if available), DB size, last login time.
- Only numbers and statuses. Never env values, vault data, message bodies or emails.
**Files:** lib/twin-context.ts
**Done when:** Unit check proves no secret-like fields appear in output.

### [ ] P07-T04 — Admin chat API
**Do:**
- `POST /api/admin/ai`: requireAdmin, rate limit, trim history to last 10 turns, inject context invisibly into the payload, cap input length.
**Files:** app/api/admin/ai/route.ts
**Done when:** Unauthenticated calls are refused; asking "how many items are published?" returns the right number.

### [ ] P07-T05 — Floating avatar and chat panel
**Do:**
- Avatar bubble fixed in a corner of every Office page. Click opens a responsive chat panel (full-screen on phones). Message list, input, loading state, error state. Avatar image can be changed from Settings.
**Files:** components/office/TwinAvatar.tsx, components/office/TwinChat.tsx
**Done when:** Works on phone and desktop; closes with Escape.

## Phase finish check
Twin answers with live counts and never exposes secrets. Mark done.
