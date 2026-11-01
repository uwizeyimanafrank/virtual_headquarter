#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4036; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqp4 SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
# Next saves regenerated pages back into .next, so start every run from the pristine build output.
rm -rf .next && cp -a .next-pristine .next
(setsid nohup npx next start -p $PORT > /tmp/p4-app.log 2>&1 &) ; sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3)"; }
has(){ grep -q -- "$2" /tmp/home.html && pass "$1" || fail "$1 (missing: $2)"; }
hasnt(){ grep -q -- "$2" /tmp/home.html && fail "$1 (found: $2)" || pass "$1"; }
home(){ curl -s -m 20 $B/ -o /tmp/home.html; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
rm -f /tmp/jh; code -c /tmp/jh -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jh -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null; SECRET=$(jq_ "d['secret']")
code -b /tmp/jh -c /tmp/jh -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node $ROOT/tests/http/gen-code.mjs $SECRET 0)\"}" >/dev/null
REC0=$(jq_ "d['recoveryCodes'][0]")
CB="-b /tmp/jh -c /tmp/jh"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }

echo "== empty site"
expect "home is public (no login needed)" 200 $(code $B/)
home; has "default headline shown" "Discipline over luck."
has "welcome tab" ">Welcome<"; has "Canvas CV tab" ">Canvas CV<"; has "gate invitation" "The foundation is laid"; has "gate button text" "Continue to the Museum"
[ "$(grep -o "<h1" /tmp/home.html | wc -l)" = "1" ] && pass "exactly one h1" || fail "h1 count $(grep -o '<h1' /tmp/home.html | wc -l)"
has "nav has Museum link" 'href="/museum"'; has "nav has Connect link" 'href="/connect"'
hasnt "no github/social links" "github.com"
has "empty CV shows friendly hints" "Nothing here yet"
curl -s -D /tmp/hdr -o /dev/null $B/; grep -qi "^content-security-policy:" /tmp/hdr && pass "CSP on home" || fail "no CSP on home"
grep -qi "^x-frame-options: DENY" /tmp/hdr && pass "X-Frame-Options on home" || fail "no XFO"

echo "== samples appear on Home right after first Office visit"
code $CB $B/api/admin/samples >/dev/null; echo "  seeded: $(cat /tmp/body)"
home
has "sample project in Canvas CV" "Sample project: Task Tracker"
has "sample certificate in Canvas CV" "Sample certificate: Web Development"
has "sample profile name" "Your Name"
has "sample profile tagline" "Developer in progress"
has "sample photo (bundled svg)" "/samples/profile.svg"
has "skills aggregated from items" "Next.js"

echo "== cache refresh after edits"
expect "change headline" 200 $(P PATCH /api/admin/settings '{"heroTitle":"Brand new headline","chapterTitles":{"projects":"My Work"}}')
home; has "new headline visible immediately" "Brand new headline"; hasnt "old headline gone" "Discipline over luck."; has "chapter title used in CV card" "My Work"
expect "create real project" 201 $(P POST /api/admin/items '{"type":"project","title":"Real Project Z","description":"zzz","date":"2026-08","status":"published","metadata":{"skills":["Rust"]}}'); ID=$(jq_ "d['item']['id']")
home; has "real project shown" "Real Project Z"; has "its skill shown" "Rust"; hasnt "sample projects hidden once a real project exists" "Sample project: Task Tracker"; has "sample certificates still shown" "Sample certificate: Web Development"
expect "unpublish it" 200 $(P PATCH /api/admin/items/$ID '{"status":"draft"}')
home; hasnt "draft hidden from home" "Real Project Z"; has "samples return" "Sample project: Task Tracker"
echo "== safety"
expect "story with script tag" 201 $(P POST /api/admin/items '{"type":"story","title":"<script>alert(1)</script>","date":"2026-02","status":"published"}'); SID=$(jq_ "d['item']['id']")
home; has "script text is escaped" "&lt;script&gt;alert(1)&lt;/script&gt;"; hasnt "no raw script injection" "<script>alert(1)</script>"
expect "hide samples" 200 $(P POST /api/admin/samples '{"action":"hide"}')
home; hasnt "samples gone when hidden" "Sample project"; has "real story still shown" "alert(1)"
expect "show samples again" 200 $(P POST /api/admin/samples '{"action":"show"}')
expect "real photo" 200 $(P PATCH /api/admin/settings '{"profile":{"photoUrl":"https://res.cloudinary.com/democloud/image/upload/v1/me.jpg"}}')
home; has "cloudinary photo is resized and optimised" "f_auto,q_auto,w_160"
dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"
P POST /api/admin/stepup "{\"code\":\"$REC0\"}" >/dev/null
expect "delete the script story" 200 $(P DELETE /api/admin/items/$SID)
home; hasnt "deleted item gone from home" "alert(1)"
echo "== other public pages"
expect "museum page" 200 $(code $B/museum); grep -q "The Museum" /tmp/body && pass "museum page renders" || fail "museum text"
expect "connect placeholder" 200 $(code $B/connect)
expect "office slug not linked from home" 200 $(code $B/)
home; hasnt "home never mentions the office address" "$S"; hasnt "home never mentions /office" 'href="/office'
echo "== size of the page"
python3 - << 'PY'
import re, subprocess, gzip, urllib.request
html=open('/tmp/home.html').read()
srcs=sorted(set(re.findall(r'/_next/static/[^"\']+?\.js', html)))
tot=0; raw=0
for s in srcs:
    data=urllib.request.urlopen("http://127.0.0.1:4036"+s).read()
    raw+=len(data); tot+=len(gzip.compress(data))
print(f"  scripts referenced: {len(srcs)} | raw {raw/1024:.0f} KB | gzipped {tot/1024:.0f} KB | HTML {len(html)/1024:.0f} KB")
print("PASS: first-load JavaScript within a 200 KB gzipped budget (React + Next themselves are about 150 KB of it)" if tot/1024<200 else "FAIL: first-load JS is "+str(round(tot/1024))+" KB gzipped")
PY
grep -iE "error" /tmp/p4-app.log | head -3 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
