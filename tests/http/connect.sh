#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4039; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqp6 SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
rm -rf .next && cp -a .next-pristine .next
(setsid nohup npx next start -p $PORT > /tmp/p6-app.log 2>&1 &) ; sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) $(head -c 150 /tmp/body)"; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
post(){ code -X POST $B/api/connect -H "$J" -H "$O" -d "$1"; }
count(){ dbq "console.log(await d.collection('messages').countDocuments())"; }

echo "== the page"
expect "connect page is public" 200 $(code $B/connect)
grep -q 'name="website"' /tmp/body && pass "bot trap field is in the form" || fail "no trap field"
grep -q 'tabindex="-1"' /tmp/body && pass "trap is skipped by keyboard" || fail "trap reachable"
for w in '$ name' '$ email' '$ message' "Send message" "Pull up a chair"; do grep -q -- "$w" /tmp/body && pass "page has: $w" || fail "page missing: $w"; done
grep -qiE "github\.com|twitter\.com|linkedin\.com|facebook\.com|instagram\.com" /tmp/body && fail "page contains social links" || pass "no social links on the page"
grep -q "<title>Connect" /tmp/body && pass "page title set" || fail "title"
grep -q "$S" /tmp/body && fail "connect page mentions the office address" || pass "page never mentions the office address"

echo "== abuse attempts"
N0=$(count); [ "$N0" = "0" ] && pass "inbox starts empty" || fail "inbox not empty ($N0)"
expect "empty fields" 400 $(post '{"name":"","email":"","message":""}')
expect "only spaces" 400 $(post '{"name":"   ","email":"a@b.co","message":"   "}')
expect "missing fields" 400 $(post '{}')
expect "not JSON" 400 $(post 'hello')
expect "array instead of object" 400 $(post '[1,2,3]')
expect "bad email" 400 $(post '{"name":"A","email":"not-an-email","message":"hi"}')
expect "huge message (2001 chars)" 400 $(post "{\"name\":\"A\",\"email\":\"a@b.co\",\"message\":\"$(python3 -c "print('x'*2001)")\"}")
expect "huge name (81 chars)" 400 $(post "{\"name\":\"$(python3 -c "print('n'*81)")\",\"email\":\"a@b.co\",\"message\":\"hi\"}")
python3 -c "print('{\"name\":\"A\",\"email\":\"a@b.co\",\"message\":\"' + 'y'*200000 + '\"}')" > /tmp/huge.json
expect "huge body (200 KB) is refused as too large" 413 $(code -X POST $B/api/connect -H "$J" -H "$O" --data-binary @/tmp/huge.json)
expect "huge login body is refused" 413 $(code -X POST $B/api/admin/login -H "$J" -H "$O" --data-binary @/tmp/huge.json)
expect "wrong types (numbers)" 400 $(post '{"name":1,"email":2,"message":3}')
expect "foreign Origin refused" 403 $(code -X POST $B/api/connect -H "$J" -H "Origin: https://evil.example" -d '{"name":"A","email":"a@b.co","message":"hi"}')
[ "$(count)" = "0" ] && pass "nothing was saved by any of the bad requests" || fail "bad requests saved something: $(count)"
expect "bot filling the trap is told OK" 200 $(post '{"name":"Bot","email":"bot@b.co","message":"buy now","website":"http://spam.example"}')
[ "$(count)" = "0" ] && pass "trap submission saved nothing" || fail "trap saved something"
expect "script tag + control characters accepted as plain text" 200 $(post "{\"name\":\"<img src=x onerror=alert(1)>\",\"email\":\"Mixed@Case.CO\",\"message\":\"<script>alert(1)</script> hi\\u0000\\u0007 there\"}")
dbq "const m=await d.collection('messages').findOne({});console.log(JSON.stringify({name:m.name,email:m.email,body:m.body,hasIpHash:m.ipHash.length===32,rawIp:JSON.stringify(m).includes('127.0.0.1')}))" > /tmp/saved.json; cat /tmp/saved.json
python3 -c "
import json;m=json.load(open('/tmp/saved.json'))
ok=m['name']=='<img src=x onerror=alert(1)>' and m['body']=='<script>alert(1)</script> hi there' and m['email']=='mixed@case.co' and m['hasIpHash'] and not m['rawIp']
print('PASS: stored as plain text, control characters stripped, email lower-cased, only a hash of the IP kept' if ok else 'FAIL: stored data wrong')"

echo "== rapid submissions"
for i in 2 3 4 5; do expect "valid message #$i" 200 $(post "{\"name\":\"R$i\",\"email\":\"r$i@b.co\",\"message\":\"msg $i\"}"); done
expect "6th message in the hour is refused" 429 $(post '{"name":"R6","email":"r6@b.co","message":"msg 6"}')
curl -s -i -X POST $B/api/connect -H "$J" -H "$O" -d '{"name":"R7","email":"r7@b.co","message":"msg 7"}' | grep -qi "^retry-after:" && pass "429 carries a Retry-After header" || fail "no Retry-After"
[ "$(count)" = "5" ] && pass "exactly 5 messages saved (1 hostile + 4 normal)" || fail "saved count $(count)"
grep -q "pwSECRET" /tmp/p6-app.log && fail "secret in log" || pass "log clean"

echo "== the owner sees them safely"
rm -f /tmp/j6; code -c /tmp/j6 -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/j6 -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null; SEC=$(jq_ "d['secret']")
code -b /tmp/j6 -c /tmp/j6 -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node $ROOT/tests/http/gen-code.mjs $SEC 0)\"}" >/dev/null
expect "inbox API" 200 $(code -b /tmp/j6 $B/api/admin/messages); echo "  unread: $(jq_ "d['unread']") total: $(jq_ "len(d['messages'])")"
[ "$(jq_ "d['unread']")" = "5" ] && pass "dashboard unread count is 5" || fail "unread"
python3 -c "
import json;d=json.load(open('/tmp/body'))['messages']
print('PASS: hostile text arrives as a plain JSON string' if any(m['body']=='<script>alert(1)</script> hi there' for m in d) else 'FAIL: hostile message missing')"
code -b /tmp/j6 $B/$S/messages -o /tmp/office.html >/dev/null; grep -q "<script>alert(1)</script>" /tmp/office.html && fail "raw script in office page" || pass "no raw hostile script in the Office messages page"
grep -iE "error" /tmp/p6-app.log | head -3 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
