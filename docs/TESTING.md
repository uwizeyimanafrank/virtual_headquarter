# Testing the public API by hand
Set `APP_URL` in your terminal to the address your app prints when it starts (do not hardcode it in code):

```
export APP_URL=<address printed by npm run dev>
```

Production mode (`npm run build && npm start`) needs `SESSION_SECRET` set. Locally with `npm run dev` it is optional.

## Health (booleans only)
```
curl -s $APP_URL/api/health
```

## Museum list (published items only)
```
curl -s $APP_URL/api/museum
curl -s "$APP_URL/api/museum?type=project"
curl -s -o /dev/null -w "%{http_code}\n" "$APP_URL/api/museum?type=nonsense"   # expect 400
```

## Contact form
```
curl -s -X POST $APP_URL/api/connect -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"hello"}'
```
Expected results:
- bad email, empty fields, message over 2000 characters -> 400 with a generic message
- field `website` filled (honeypot) -> 200 but nothing saved
- 6th valid message from the same address within one hour -> 429 with a Retry-After header
- request with a foreign `Origin` header -> 403
- text like `<script>` is stored as plain text and must always be shown as plain text

## Verified on 2026-10-28 (Claude, against a Mongo-compatible test database)
All of the above passed. Not verified there: automatic expiry of rate-limit counters (MongoDB TTL). Atlas supports it; confirm once on your real database.

## Automated tests
- `npm test` runs the unit and component tests (Vitest, simulated browser, needs Node 22).
- `tests/http/*.sh` start the real server and test it with curl (login, sessions, content manager, Home, Museum, contact form). See `tests/http/README.md`.
