# Architecture reference

## Routes
Public: `/` (Home: Hero tab, Canvas CV tab, gate button), `/museum`, `/connect`.
Private: `/<ADMIN_ROUTE_SLUG>/...` (login, dashboard, setup, content, messages, ai, developer, vault, security).
API public: `GET /api/museum`, `POST /api/connect`, `GET /api/health`.
API admin: `/api/admin/*` (all call `requireAdmin()`).

## Folder layout
```
/app                      public pages + api routes
/app/(office)/office      private pages (served at the secret slug via rewrite)
/components               ui/, home/, museum/, office/
/lib                      env.ts config.ts api.ts db.ts cloudinary.ts auth.ts sessions.ts
                          crypto-server.ts rateLimit.ts gemini.ts samples.ts audit.ts services/
/models                   MuseumItem Message Settings AdminUser Session AuditLog Service VaultEntry RateLimit
/hooks                    useMediaQuery useReducedMotion
/scripts                  check-no-localhost.mjs
/public/samples           bundled sample images
/proxy.ts
```

## museumItems document
```
type: "project" | "certificate" | "story" | "book" | "reference"
title: string (max 120)
description: string (max 4000)
mediaUrl: string (https, Cloudinary secure URL or /samples path)
parallaxSpeed: number (default 0.5, range 0.1 to 1.5)
date: "YYYY-MM"
status: "draft" | "published"
order: number
isSample: boolean (default false)
metadata: { gradeOrLink?: string (valid URL), skills: string[], howIEarnedIt?: string }
createdAt, updatedAt
```

## Other collections (fields)
- messages: name, email, body, createdAt, read, archived, ipHash
- settings (singleton): heroTitle, heroText, chapterTitles{}, profile{name,tagline,bio,photoUrl}, onboarding{completed,steps{}}, showSamples, theme{}
- adminUsers: email, passwordHash, totpSecretEnc, passkeys[], recoveryCodeHashes[]
- sessions: tokenHash, deviceLabel, ipHash, createdAt, lastSeen, expiresAt, revoked
- auditLogs: event, ok, ipHash, deviceLabel, createdAt
- services: name, type, baseUrl, healthPath, credentialEnc, enabled
- vaultEntries: label, project, version, kdf{iterations,salt}, iv, cipherText, createdAt
- rateLimits: key, count, expiresAt (TTL index)
