# HTTP integration tests (run the real server)

These shell scripts start the production server (`next start`) against a throw-away database and talk to it with `curl`, exactly like a browser or an attacker would. They are how the server side of every phase was checked: login and 2FA, sessions, CSRF, the content manager, caching, samples, the Museum, and abuse of the contact form.

| Script | Checks |
|---|---|
| `auth.sh` | login, 2FA, recovery codes, replay blocking, rotation, idle logout, revoke, panic, rate limits (about 40 checks, takes ~70s) |
| `pages.sh` | secret Office address, redirects, no content for fake cookies, headers (CSP, no-store, noindex) |
| `onboarding.sh` | sample content, onboarding checklist, Config Doctor |
| `content.sh` | items CRUD, uploads signature, messages, settings |
| `home.sh` | Home page content, cache refresh after edits, escaping, JS size |
| `museum.sh` | Museum chapters, edits visible immediately, escaping |
| `connect.sh` | the contact form under abuse: empty, huge, script tags, bots, rapid submissions |
| `ai.sh` | the AI Twin API against `fake-gemini.py` (a fake Google service): exactly what is sent, no secrets, limits, failures |

## How to run
1. Use **Node 22**, run `npm install`.
2. Have a MongoDB-compatible server on `127.0.0.1:27017`. Any local MongoDB works. The scripts **drop their own test database** (names like `vhqp3`), never use a database you care about. A single-file FerretDB works too: set `FERRET_BIN` (path to the binary) and optionally `FERRET_DATA`, and the scripts start it if nothing is listening.
3. Build once **without** your real `.env` values, and keep a copy: 
   ```bash
   env -u MONGODB_URI -u ADMIN_ROUTE_SLUG -u SESSION_SECRET -u SERVICE_CRED_KEY -u APP_URL npm run build
   rm -rf .next-pristine && cp -a .next .next-pristine
   ```
   (`home.sh`, `museum.sh` and `connect.sh` restore that copy before each run, because Next saves regenerated pages back into `.next`.)
4. Run any script: `bash tests/http/connect.sh`. Every line starts with `PASS:` or `FAIL:`. Count them: `bash tests/http/connect.sh | grep -c FAIL` should print `0`.

Each script uses its own port (4030-4041) and kills anything left on it. Do not run two at once.

## Good to know
- They set fake secrets in the environment for the test server only. Nothing real is read or written.
- `gen-code.mjs` makes authenticator codes; `killport.py` frees a port without killing your shell.
- If you add a feature that changes server behaviour, add checks here or write a new script in the same style.

- If the test database stops between runs, the scripts restart it using `FERRET_BIN`; if you use a normal MongoDB, just keep it running.
- When you write a check that saves a page to a file, first check that the file is non-empty: a check on a file that was never written passes without testing anything.
