#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4050; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqhire SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B CLOUDINARY_CLOUD_NAME=democloud CLOUDINARY_API_KEY=123456789012345 CLOUDINARY_API_SECRET=fake-secret-value-123
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
rm -rf .next && cp -a .next-pristine .next
(setsid nohup npx next start -p $PORT > /tmp/vhqhire-app.log 2>&1 &) ; sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) $(head -c 160 /tmp/body)"; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
count(){ dbq "console.log(await d.collection('hirerequests').countDocuments())" 2>/dev/null | tail -1; }
page(){ curl -s -m 20 "$B$1" -o /tmp/page-vhqhire.html; }
has(){ grep -qF -- "$2" /tmp/page-vhqhire.html && pass "$1" || fail "$1 (missing: $2)"; }
hasnt(){ grep -qF -- "$2" /tmp/page-vhqhire.html && fail "$1 (found: $2)" || pass "$1"; }
post(){ code -X POST $B/api/hire -H "$J" -H "$O" -d "$1"; }
GOOD='{"name":"Ada","email":"ada@example.com","kind":"project","message":"We need a booking site by March."}'

echo "== the page"
expect "hire page" 200 $(code $B/hire); page /hire
has "headline" "Let us build something that works."; has "availability badge" "Open to new work"
has "services" "What I can do for you"; has "steps" "How we work together"; has "FAQ" "Questions people ask"; has "form" "Send request"
has "request anchor" 'id="request"'; hasnt "no CV button without a CV" "Download my CV"
has "share preview title" 'og:title" content="Hire me'; has "share preview description" "og:description"
curl -s -D /tmp/hdr-vhqhire -o /dev/null $B/hire; grep -qi "^content-security-policy:" /tmp/hdr-vhqhire && pass "CSP on /hire" || fail "no CSP"
hasnt "never mentions the Office address" "$S"; has "points to Connect for hellos" 'href="/connect"'
expect "nothing stored yet" 0 "$(count)"

echo "== a good request"
expect "minimal request" 200 $(post "$GOOD"); [ "$(jq_ "d['ok']")" = "True" ] && pass "answer says ok" || fail "answer: $(cat /tmp/body)"
expect "one stored" 1 "$(count)"
dbq "const x=await d.collection('hirerequests').findOne({}); console.log(JSON.stringify({s:x.status,p:x.priority,r:x.read,n:x.notes,k:x.kind,e:x.email,l:x.links,ip:x.ipHash.length>10&&!x.ipHash.includes('127.0.0.1')}))" | tail -1 > /tmp/stored-vhqhire.json
python3 - << 'PY'
import json
x = json.load(open('/tmp/stored-vhqhire.json'))
print("PASS: stored as new, not starred, unread, no notes" if (x['s'], x['p'], x['r'], x['n']) == ('new', False, False, '') else f"FAIL: defaults {x}")
print("PASS: kind and email kept" if (x['k'], x['e']) == ('project', 'ada@example.com') else f"FAIL: {x}")
print("PASS: visitor stored only as a hash, never the address" if x['ip'] else "FAIL: raw address or no hash stored")
PY
expect "full request with links" 200 $(post '{"name":"Grace","email":"GRACE@Example.COM","company":"Acme","kind":"contract","budget":"500 to 1000 USD","timeline":"By March","message":"A dashboard for our shop, with logins.","links":["https://acme.example","http://github.com/acme/x"]}')
dbq "const x=await d.collection('hirerequests').findOne({company:'Acme'}); console.log(JSON.stringify({e:x.email,l:x.links,b:x.budget}))" | tail -1 > /tmp/stored-vhqhire.json
python3 - << 'PY'
import json
x = json.load(open('/tmp/stored-vhqhire.json'))
print("PASS: email lower-cased, links and budget saved" if x == {'e': 'grace@example.com', 'l': ['https://acme.example', 'http://github.com/acme/x'], 'b': '500 to 1000 USD'} else f"FAIL: {x}")
PY
expect "script tags are stored as plain text" 200 $(post '{"name":"<script>alert(1)</script>","email":"x@example.com","kind":"full-time","message":"<img src=x onerror=alert(2)> hello hello"}')
dbq "const x=await d.collection('hirerequests').findOne({kind:'full-time'}); console.log(x.name)" | tail -1 | grep -qF '<script>alert(1)</script>' && pass "kept as text, not run or removed" || fail "name changed"
expect "three stored" 3 "$(count)"

echo "== bad requests are refused and nothing is saved"
expect "no name" 400 $(post '{"email":"a@b.co","kind":"project","message":"long enough message"}')
expect "empty name" 400 $(post '{"name":"  ","email":"a@b.co","kind":"project","message":"long enough message"}')
expect "bad email" 400 $(post '{"name":"A","email":"nope","kind":"project","message":"long enough message"}')
expect "unknown kind" 400 $(post '{"name":"A","email":"a@b.co","kind":"slave","message":"long enough message"}')
expect "no kind" 400 $(post '{"name":"A","email":"a@b.co","message":"long enough message"}')
expect "message too short" 400 $(post '{"name":"A","email":"a@b.co","kind":"project","message":"hi"}')
expect "message over 3000" 400 $(post "{\"name\":\"A\",\"email\":\"a@b.co\",\"kind\":\"project\",\"message\":\"$(python3 -c "print('x'*3001)")\"}")
expect "name over 80" 400 $(post "{\"name\":\"$(python3 -c "print('x'*81)")\",\"email\":\"a@b.co\",\"kind\":\"project\",\"message\":\"long enough message\"}")
expect "company over 120" 400 $(post "{\"name\":\"A\",\"company\":\"$(python3 -c "print('x'*121)")\",\"email\":\"a@b.co\",\"kind\":\"project\",\"message\":\"long enough message\"}")
expect "javascript: link" 400 $(post '{"name":"A","email":"a@b.co","kind":"project","message":"long enough message","links":["javascript:alert(1)"]}')
expect "link that is not an address" 400 $(post '{"name":"A","email":"a@b.co","kind":"project","message":"long enough message","links":["not a link"]}')
expect "six links" 400 $(post '{"name":"A","email":"a@b.co","kind":"project","message":"long enough message","links":["https://a.co","https://a.co","https://a.co","https://a.co","https://a.co","https://a.co"]}')
expect "not json" 400 $(code -X POST $B/api/hire -H "$J" -H "$O" -d 'nope')
expect "a huge body is refused outright" 413 $(code -X POST $B/api/hire -H "$J" -H "$O" -d "{\"name\":\"A\",\"email\":\"a@b.co\",\"kind\":\"project\",\"message\":\"$(python3 -c "print('x'*20000)")\"}")
expect "a request from another website" 403 $(code -X POST $B/api/hire -H "$J" -H "Origin: http://evil.example" -d "$GOOD")
expect "GET is not allowed" 405 $(code $B/api/hire)
expect "still only three stored" 3 "$(count)"

echo "== bots"
expect "honeypot filled gets a friendly answer" 200 $(post '{"name":"Bot","email":"bot@example.com","kind":"project","message":"buy cheap watches now","website":"http://spam.example"}')
expect "but nothing is stored" 3 "$(count)"
echo "== rate limit: 3 saved requests per hour per visitor (the three good ones above used them up)"
st=$(post "$GOOD"); expect "the 4th request is refused" 429 $st
curl -s -D /tmp/hdr-vhqhire2 -o /tmp/body-vhqhire2 -X POST $B/api/hire -H "$J" -H "$O" -d "$GOOD"
grep -qi "^retry-after: [0-9]" /tmp/hdr-vhqhire2 && pass "Retry-After header sent" || fail "no Retry-After"
grep -qi "stack\|mongo\|error:" /tmp/body-vhqhire2 && fail "limit answer leaks details" || pass "limit answer is plain"
expect "refused requests were not saved" 3 "$(count)"
expect "bad requests are refused as bad (400), not counted against the limit first" 400 $(post '{"name":"A"}')
page /hire; has "page still works while limited" "Send request"

echo "== speed and server health"
python3 - << 'PY'
import re,gzip,urllib.request
html=urllib.request.urlopen("http://127.0.0.1:4050/hire").read().decode()
srcs=sorted(set(re.findall(r'/_next/static/[^"\']+?\.js', html)))
tot=sum(len(gzip.compress(urllib.request.urlopen("http://127.0.0.1:4050"+s).read())) for s in srcs)
print(f"  /hire scripts: {len(srcs)} | gzipped {tot/1024:.0f} KB | HTML {len(html)/1024:.0f} KB")
print("PASS: /hire first-load JS within 200 KB gzipped" if tot/1024<200 else "FAIL: /hire JS "+str(round(tot/1024))+" KB")
PY
grep -iE "error" /tmp/vhqhire-app.log | grep -v "hire route failed" | head -3 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
