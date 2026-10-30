# P03 — Content manager and inbox

**Goal:** Frank can add, edit, reorder, hide and delete every Museum item from the Office, with direct uploads to Cloudinary.

Tick each task `[x]` when done. Do them in order.

### [x] P03-T01 — Admin items API
**Do:**
- `GET/POST /api/admin/items`, `GET/PATCH/DELETE /api/admin/items/[id]`. All call `requireAdmin()` and zod validation.
- DELETE calls `requireFreshAuth(300)` and writes an audit entry.
**Files:** app/api/admin/items/*
**Done when:** Create, edit, delete work; unauthenticated calls return 401.

### [x] P03-T02 — Signed upload endpoint
**Do:**
- `POST /api/admin/upload-sign` returns Cloudinary signature for folder `vhq/<type>`. Limit allowed file types and size on the client and via upload preset settings.
**Files:** app/api/admin/upload-sign/route.ts
**Done when:** Browser can upload directly to Cloudinary using the signature; secret never reaches the browser.

### [x] P03-T03 — Drop-zone uploader component
**Do:**
- Drag-and-drop + click. Progress bar, image preview, error states. On success returns the secure URL into the form.
**Files:** components/office/Uploader.tsx
**Done when:** Uploading an image fills `mediaUrl`.

### [x] P03-T04 — Content grid page
**Do:**
- Table/grid with filters by type and status, search by title, quick toggle draft/published. Show `<SampleBadge />` (components/office/SampleBadge.tsx) on every row/card where `isSample` is true.
- Mobile layout as cards.
**Files:** app/(office)/office/content/page.tsx
**Done when:** Filters work; toggling status changes the public API result.

### [x] P03-T05 — Item form
**Do:**
- One form with fields per type: certificate shows grade and how-I-earned-it, project shows link and skills, book/reference show link.
- Live preview panel showing how the card looks in the Museum.
- Completing the form marks onboarding steps firstProject/firstCertificate.
**Files:** components/office/ItemForm.tsx
**Done when:** Create and edit all five types.

### [x] P03-T06 — Reorder
**Do:**
- Drag to reorder (or up/down buttons on mobile); saves `order` in one batch request.
**Files:** components/office/Reorder.tsx, app/api/admin/items/reorder/route.ts
**Done when:** Order persists and shows on the public API.

### [x] P03-T07 — Messages inbox
**Do:**
- List newest first with unread marker, open, archive, delete (delete with step-up).
- Dashboard shows unread count.
**Files:** app/(office)/office/messages/page.tsx, app/api/admin/messages/*
**Done when:** A message posted to /api/connect appears and can be archived.

### [x] P03-T08 — Settings editor
**Do:**
- Edit hero text, chapter titles, profile data (name, tagline, bio, photo) from the Office without code. A placeholder page already exists at app/office/(panel)/settings/page.tsx. When the owner saves any profile field, also set `onboarding.profileIsSample` to false so sample profile text is no longer treated as sample (see lib/samples.ts).
**Files:** app/(office)/office/settings/page.tsx
**Done when:** Changing hero text updates Home after refresh.

## Phase finish check
Add a certificate with an uploaded image in the Office and see it publicly with no code change. Mark done.
