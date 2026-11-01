#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4031; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqpages SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=test-office-9x7k APP_URL=$B
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{await m.connection.dropDatabase();process.exit(0)})"
python3 $ROOT/tests/http/killport.py $PORT; (setsid nohup npx next start -p $PORT > /tmp/pages-app.log 2>&1 & echo $! > /tmp/pages-app.pid); sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3)"; }
S=test-office-9x7k
expect "direct /office hidden" 404 $(code $B/office)
expect "direct /office/login hidden" 404 $(code $B/office/login)
expect "direct /office/security hidden" 404 $(code $B/office/security)
expect "wrong slug is a normal 404" 404 $(code $B/other-slug-1234/login)
expect "login page at secret slug" 200 $(code $B/$S/login); grep -q "The Office" /tmp/body && pass "login page renders form text" || fail "login text missing"
expect "dashboard without cookie -> redirect" 307 $(code $B/$S); echo "  location: $(curl -s -o /dev/null -D - $B/$S | grep -i '^location' | tr -d '\r')"
expect "security without cookie -> redirect" 307 $(code $B/$S/security)
# bogus cookie: proxy lets it through, page must refuse
R=$(code -b "vhq_session=bogus" $B/$S); echo "  bogus cookie status: $R"
grep -q "Welcome to the Office" /tmp/body && fail "PROTECTED CONTENT LEAKED to bogus cookie" || pass "bogus cookie sees no dashboard content"
for pg in security content vault setup messages ai developer; do code -b "vhq_session=bogus" $B/$S/$pg >/dev/null; if grep -qE "coming in P|Signed-in devices|Panic: lock|Security is live" /tmp/body; then fail "page /$pg leaks content to bogus cookie"; else pass "page /$pg leaks nothing to bogus cookie"; fi; done
grep -qE "NEXT_REDIRECT|/login" /tmp/body && pass "bogus cookie is redirected to login" || fail "no redirect for bogus cookie"
# real login
rm -f /tmp/jp; code -c /tmp/jp -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jp -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null
SECRET=$(python3 -c "import json;print(json.load(open('/tmp/body'))['secret'])")
CODE0=$(node $ROOT/tests/http/gen-code.mjs $SECRET 0)
expect "enrol confirm" 200 $(code -b /tmp/jp -c /tmp/jp -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$CODE0\"}")
expect "dashboard with real session" 200 $(code -b /tmp/jp -D /tmp/hdr $B/$S); grep -q "Welcome to the Office" /tmp/body && pass "dashboard content shown" || fail "dashboard content missing"
grep -qi "^cache-control: no-store" /tmp/hdr && pass "office responses are no-store" || fail "office not no-store"
grep -qi "^x-robots-tag: noindex" /tmp/hdr && pass "office has noindex header" || fail "no noindex header"
grep -qi "^content-security-policy:" /tmp/hdr && pass "CSP header present" || fail "CSP missing"
grep -qi "^x-frame-options: DENY" /tmp/hdr && pass "X-Frame-Options DENY" || fail "no XFO"
grep -qi "^strict-transport-security" /tmp/hdr && pass "HSTS present (production)" || fail "no HSTS"
expect "security page with session" 200 $(code -b /tmp/jp $B/$S/security); grep -q "Signed-in devices\|Security" /tmp/body && pass "security page content" || fail "security content missing"
expect "content placeholder page" 200 $(code -b /tmp/jp $B/$S/content)
expect "public home still works + CSP" 200 $(code -D /tmp/hdr2 $B/); grep -qi "^content-security-policy:" /tmp/hdr2 && pass "home has CSP" || fail "home missing CSP"
grep -q "Welcome to the Office" /tmp/body && fail "home leaks office" || pass "home has no office content"
expect "public museum api untouched" 200 $(code $B/api/museum)
# step-up
CODEX=$(node $ROOT/tests/http/gen-code.mjs $SECRET 30)
expect "stepup wrong code" 401 $(code -b /tmp/jp -X POST $B/api/admin/stepup -H "$J" -H "$O" -d '{"code":"111111"}')
expect "stepup replay of enrol code blocked" 401 $(code -b /tmp/jp -X POST $B/api/admin/stepup -H "$J" -H "$O" -d "{\"code\":\"$CODE0\"}")
expect "stepup next-step code ok" 200 $(code -b /tmp/jp -X POST $B/api/admin/stepup -H "$J" -H "$O" -d "{\"code\":\"$CODEX\"}")
# logout then dashboard
expect "logout" 200 $(code -b /tmp/jp -c /tmp/jp -X POST $B/api/admin/logout -H "$O")
R=$(code -b /tmp/jp $B/$S); grep -q "Welcome to the Office" /tmp/body && fail "dashboard still visible after logout" || pass "after logout no dashboard content (status $R)"
grep -iE "error" /tmp/pages-app.log | head -5 | cut -c1-220
python3 $ROOT/tests/http/killport.py $PORT
