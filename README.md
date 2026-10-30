# VHQ — Personal Virtual Headquarters

A personal portfolio with two faces:

- **The public site** — a cinematic **Home** page (done), a sideways-scrolling **Museum** (next), and a **Connect** page for messages (later).
- **The Office** — a private control room, hidden behind a secret address and protected by a password plus an authenticator app. From the Office you add and edit everything visitors see, without touching code.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, MongoDB (Mongoose) and Cloudinary.

> This repository is built in small phases, often by several different AI tools one after another. The "book" in `docs/book/` and the files `AGENTS.md`, `STATE.md`, `LOG.md` and `DECISIONS.md` are how every tool (and every human) knows exactly where the project stands.

---

## Where the project is now

| Phase | What | Status |
|---|---|---|
| P00 | Foundation: config layer, database, health check, no-hardcoded-address guard | done |
| P01 | Data models and the public API (`/api/museum`, `/api/connect`) | done |
| P02 | Secure Office login: password, 2FA, sessions, panic button, audit log | done (passkeys deferred) |
| P02b | First-run guide, sample content, Config Doctor | done |
| P03 | Content manager, image uploads, messages inbox, settings | done |
| P04 | Public Home page (hero, Canvas CV, tilt cards, gate) | done |
| P05 | The Museum: vertical timeline and pop-ups done; sideways desktop track **next** | in progress |
| P06 | Connect page | planned |
| P07 | AI Twin (Gemini) | planned |
| P08 | Developer tab (monitor Atlas, Cloudinary, Render...) | planned |
| P09 | Encrypted secrets vault | planned |
| P10 | Polish, audit, deploy | planned |

The live details (current task, what is waiting on you, known gaps) are always in **`STATE.md`**.

---

## Quick start (on your own computer)

You need **Node.js 20.9 or newer** and a free **MongoDB Atlas** database.

```bash
git clone <this repository's address>
cd virtual_headquarter
git checkout dev            # the branch the AI tools work on
npm install
cp .env.example .env        # then fill in the values (see below)
npm run dev                 # open the address it prints
```

Open `/api/health` on your running site. It shows only `true` / `false` and never any secret:
`dbReachable: true` means your database works, `cloudinaryReachable: true` means image hosting works.

### The values in `.env`
Every variable is explained in plain words in `docs/book/ENV.md`. The ones you need first:

| Variable | What it is |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `APP_URL` | The address of this site on this machine (what `npm run dev` prints) |
| `SESSION_SECRET`, `SERVICE_CRED_KEY` | Two different random secrets |
| `ADMIN_ROUTE_SLUG` | The secret address of your Office (8-64 chars: letters, digits, hyphens) |
| `ADMIN_BOOTSTRAP_HASH` | Your password, as a hash. Make it with `node scripts/hash-password.mjs` |
| `CLOUDINARY_*` | Three values from your Cloudinary dashboard (for image uploads) |

**Never commit `.env`.** It is already in `.gitignore`.

### Open the Office for the first time
Follow **`docs/OFFICE-SETUP.md`** (about 5 minutes): make the secrets, hash your password, set the values, open `<your-site>/<ADMIN_ROUTE_SLUG>/login`, scan the QR code with an authenticator app, and **save your recovery codes**. After login the Office guides you through the rest and fills the site with clearly-labelled sample content so you can see how it looks.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run the site while you work |
| `npm run build` / `npm start` | Production build / run it |
| `npm run lint` | Code style check |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit and component tests (Vitest, simulated browser) |
| `npm run check:urls` | Fails if code contains `localhost` or a hardcoded address (runs before every build) |
| `node scripts/hash-password.mjs` | Makes `ADMIN_BOOTSTRAP_HASH` from your password |

---

## How the project is organised

```
app/(site)/          public pages: Home, Museum, Connect
app/office/          the private Office pages (reached through your secret address)
app/api/             public API (museum, connect, health) and admin API (/api/admin/*)
components/home/     Home page pieces        components/office/   Office screens
lib/                 env, database, sessions, 2FA, validation, cache, samples, doctor...
models/              database models
hooks/               small React hooks (media query, reduced motion, card tilt)
proxy.ts             hides the Office behind the secret address
docs/book/           the plan: one chapter per phase, with small tasks
docs/                OFFICE-SETUP.md, PROMPTS.md, SETUP-GITHUB.md, TESTING.md
```

Golden rules (full list in `AGENTS.md`): no hardcoded addresses (the same code runs on any server, only `.env` changes), secrets never reach the browser, every input is validated, every Office page and admin route checks the session itself.

---

## Working with several AI tools (Claude, Kimi, Antigravity, Cursor...)

The free tiers of AI tools run out. This project is designed so the next tool can continue exactly where the last stopped:

1. Open the repo in the tool and switch to the **`dev`** branch.
2. Paste the **start prompt** from `docs/PROMPTS.md`. In short it says: *read `AGENTS.md`, then `STATE.md`, then the chapter named there; do the next unchecked task only; tick it, update `STATE.md`, add a line to `LOG.md`, commit and push to `dev`.*
3. When a tool is almost out of quota, paste the **quota prompt** from the same file. It writes a hand-off note into `STATE.md`.
4. You review on `dev`, test locally, and merge to `main` when you are happy.

Notes for every AI that works here:
- This is **Next.js 16**: middleware is called `proxy.ts`, and `cacheComponents` is on. Read the matching guide in `node_modules/next/dist/docs/` before using a Next.js API you are unsure about.
- Do one task at a time, keep the build green, and never push to `main`.
- Never paste real secrets into any AI tool or commit them. Use fake values.

---

## Deploying (Render or Vercel)

The code does not change between your computer and a server — only the environment variables do. The Office has a **Config Doctor** page (Setup, then Config Doctor) with step lists for Local, Render and Vercel, and it checks your settings in plain words. Remember to set `SESSION_SECRET`, `SERVICE_CRED_KEY`, `ADMIN_ROUTE_SLUG`, `APP_URL` (https) and `MONGODB_URI` on the host, and allow the host in MongoDB Atlas under Network Access.

---

## Security notes

- Login needs a password **and** an authenticator code. Sessions are stored on the server, expire after 10 minutes idle, and can be ended from the Security page (sign out everywhere, panic button).
- Visitors' messages are stored and shown as plain text only.
- Uploaded images go straight to Cloudinary using a short-lived signature; your Cloudinary secret never reaches the browser.
- If you ever paste a token or key somewhere by accident, revoke it right away and make a new one.

---

## Honest status

Everything above marked "done" was checked with automated tests against a test database (HTTP checks for the server, plus component tests in a simulated browser). What has **not** been checked yet is the visual look and feel in a real browser, a real image upload to Cloudinary, and the connection to a real Atlas cluster. `STATE.md` lists these as open items.
