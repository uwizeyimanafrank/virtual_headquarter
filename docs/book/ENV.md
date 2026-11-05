# Environment variables (single reference)
Copy `.env.example` to `.env` and fill in. Never commit `.env`.

| Variable | Needed from | Meaning | Browser-visible |
|---|---|---|---|
| APP_URL | P00 | Public address of this app (set per environment) | no |
| NEXT_PUBLIC_API_BASE_URL | optional | Only if the API lives on another server. Empty = same origin | yes (build time) |
| ALLOWED_ORIGINS | P01 | Comma list of sites allowed to call the API | no |
| MONGODB_URI | P00-T07 | Atlas connection string | no |
| CLOUDINARY_CLOUD_NAME | P00-T08 | Cloudinary cloud name | no |
| CLOUDINARY_API_KEY | P00-T08 | | no |
| CLOUDINARY_API_SECRET | P00-T08 | | no |
| SESSION_SECRET | P01 (required in production) | 32+ random bytes, base64. Salts the stored IP hashes | no |
| ADMIN_ROUTE_SLUG | P02 | Secret first path segment of the Office: 8 to 64 chars of a-z, 0-9, hyphen (not office/api/admin/login...). If missing or invalid the Office is switched off (404) | no |
| ADMIN_BOOTSTRAP_HASH | P02 | `b64:` + base64 of the argon2id hash. Make it with `node scripts/hash-password.mjs`. Only needed for the very first login | no |
| COOKIE_DOMAIN | optional | Only if cookies must span subdomains | no |
| GEMINI_API_KEY | P07 | AI Twin | no |
| GEMINI_MODEL | optional | Which Gemini model to use (default `gemini-flash-latest`) | no |
| ALLOW_PRIVATE_SERVICE_TARGETS | optional | `true` lets the Developer tab monitor addresses on private networks (self-hosting). Default: refused, which blocks attacks that aim the server at internal addresses | no |
| RENDER_API_BASE_URL | optional | Only for proxies and tests: where Render API requests go | no |
| GEMINI_API_BASE_URL | optional | Only for proxies and tests: where AI requests go instead of Google | no |
| SERVICE_CRED_KEY | P02 (2FA secret), P08 | 32 random bytes base64, encrypts server-readable secrets at rest. Back it up | no |

Generate random secrets with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Step-by-step for the Office variables: `docs/OFFICE-SETUP.md`.
