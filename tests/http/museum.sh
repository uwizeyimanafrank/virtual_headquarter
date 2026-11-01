#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4038; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqp5 SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
rm -rf .next && cp -a .next-pristine .next
(setsid nohup npx next start -p $PORT > /tmp/p5-app.log 2>&1 &) ; sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3)"; }
mus(){ curl -s -m 20 $B/museum -o /tmp/mus.html; }
has(){ grep -q -- "$2" /tmp/mus.html && pass "$1" || fail "$1 (missing: $2)"; }
hasnt(){ grep -q -- "$2" /tmp/mus.html && fail "$1 (found: $2)" || pass "$1"; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
rm -f /tmp/jm; code -c /tmp/jm -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jm -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null; SECRET=$(jq_ "d['secret']")
code -b /tmp/jm -c /tmp/jm -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node $ROOT/tests/http/gen-code.mjs $SECRET 0)\"}" >/dev/null
CB="-b /tmp/jm -c /tmp/jm"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }

echo "== empty museum"
expect "museum is public" 200 $(code $B/museum); mus
has "friendly empty message" "The Museum is being prepared"; has "page heading" "The work, in order"
echo "== samples fill the museum"
code $CB $B/api/admin/samples >/dev/null; mus
for t in "Sample story: How it started" "Sample certificate: Web Development" "Sample project: Task Tracker" "Sample book: A book that shaped you"; do has "shows: $t" "$t"; done
python3 - << 'PY'
import re
h=open('/tmp/mus.html').read()
i=[h.find(k) for k in ["The Person Behind the Work",">Proof<",">The Execution<","Books and References"]]
print("PASS: chapters appear in story order" if all(x>0 for x in i) and i==sorted(i) else f"FAIL: chapter order {i}")
print("PASS: items are server-rendered visible (no hidden state in HTML)" if 'opacity-0' not in h else "FAIL: HTML ships hidden items")
print("PASS: images are lazy-loaded" if 'loading="lazy"' in h else "FAIL: no lazy images")
PY
has "bundled sample image used" "/samples/project.svg"
echo "== edits reach the museum immediately"
expect "change a chapter title" 200 $(P PATCH /api/admin/settings '{"chapterTitles":{"projects":"My Work"}}'); mus; has "new chapter title" "My Work"
expect "add real project with story + link" 201 $(P POST /api/admin/items '{"type":"project","title":"Real Project Z","description":"Does zzz","date":"2026-08","status":"published","metadata":{"skills":["Rust"],"howIEarnedIt":"Learned it the hard way","gradeOrLink":"https://example.org/z"}}'); ID=$(jq_ "d['item']['id']")
mus; has "real project in museum" "Real Project Z"; hasnt "sample projects hidden by auto-hide" "Sample project: Task Tracker"; has "other sample chapters stay" "Sample certificate: Web Development"
expect "make it a draft" 200 $(P PATCH /api/admin/items/$ID '{"status":"draft"}'); mus; hasnt "draft not public" "Real Project Z"
expect "script-tag story" 201 $(P POST /api/admin/items '{"type":"story","title":"<script>alert(1)</script>","description":"<img src=x onerror=alert(2)>","date":"2026-02","status":"published"}'); SID=$(jq_ "d['item']['id']")
mus; has "title escaped" "&lt;script&gt;alert(1)&lt;/script&gt;"; hasnt "no raw script tag" "<script>alert(1)</script>"; hasnt "no raw img tag" "<img src=x onerror"
dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"
expect "delete needs a fresh 2FA when it is stale" 401 $(P DELETE /api/admin/items/$SID)
dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date()}})"
expect "delete the script story" 200 $(P DELETE /api/admin/items/$SID); mus; hasnt "deleted item gone" "alert(1)"
expect "hide samples" 200 $(P POST /api/admin/samples '{"action":"hide"}'); mus; hasnt "samples gone" "Sample certificate"
has "only the museum is empty-message free or has real content" "The Museum is being prepared" || true
echo "== safety + headers"
curl -s -D /tmp/hdr -o /dev/null $B/museum; grep -qi "^content-security-policy:" /tmp/hdr && pass "CSP on museum" || fail "no CSP"
mus; hasnt "museum never mentions the office address" "$S"
python3 - << 'PY'
import re,gzip,urllib.request
html=open('/tmp/mus.html').read()
srcs=sorted(set(re.findall(r'/_next/static/[^"\']+?\.js', html)))
tot=sum(len(gzip.compress(urllib.request.urlopen("http://127.0.0.1:4038"+s).read())) for s in srcs)
print(f"  museum scripts: {len(srcs)} | gzipped {tot/1024:.0f} KB | HTML {len(html)/1024:.0f} KB")
print("PASS: museum first-load JS within 200 KB gzipped" if tot/1024<200 else "FAIL: museum JS "+str(round(tot/1024))+" KB")
PY
grep -iE "error" /tmp/p5-app.log | head -3 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
