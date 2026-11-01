#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4030; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqauth
export SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=test-office-9x7k
export APP_URL=$B
export ADMIN_BOOTSTRAP_HASH=$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(console.log)")
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{await m.connection.dropDatabase();process.exit(0)})"
python3 $ROOT/tests/http/killport.py $PORT; (setsid nohup npx next start -p $PORT > /tmp/auth-app.log 2>&1 & echo $! > /tmp/auth-app.pid); sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ # name expected actual
  [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) body=$(cat /tmp/body | head -c 200)"; }

expect "no cookie: sessions list" 401 $(code $B/api/admin/sessions)
expect "login without Origin" 403 $(code -X POST $B/api/admin/login -H "$J" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}")
expect "login foreign Origin" 403 $(code -X POST $B/api/admin/login -H "$J" -H "Origin: https://evil.example" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}")
expect "wrong password" 401 $(code -X POST $B/api/admin/login -H "$J" -H "$O" -d '{"email":"me@x.co","password":"nope-nope-nope"}'); W1=$(cat /tmp/body)
expect "bad json" 401 $(code -X POST $B/api/admin/login -H "$J" -H "$O" -d 'xx')
rm -f /tmp/j1 /tmp/j2
expect "login ok (first time, bootstrap)" 200 $(code -c /tmp/j1 -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"ME@x.co\",\"password\":\"$PASS\"}"); echo "  body: $(cat /tmp/body)"
grep -q "HttpOnly" /tmp/j1 && pass "cookie is HttpOnly" || fail "cookie not HttpOnly"
echo "  cookie flags: $(grep vhq_session /tmp/j1 | awk '{print $1}')"
expect "partial session cannot list sessions" 401 $(code -b /tmp/j1 $B/api/admin/sessions)
expect "panel API needs full: ping" 401 $(code -b /tmp/j1 -X POST $B/api/admin/session/ping -H "$O")
expect "enroll start" 200 $(code -b /tmp/j1 -X POST $B/api/admin/2fa/enroll -H "$O")
SECRET=$(python3 -c "import json;print(json.load(open('/tmp/body'))['secret'])"); echo "  secret length ${#SECRET}"
expect "confirm wrong code" 401 $(code -b /tmp/j1 -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d '{"code":"000000"}')
CODE0=$(node $ROOT/tests/http/gen-code.mjs $SECRET 0)
expect "confirm right code" 200 $(code -b /tmp/j1 -c /tmp/j1 -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$CODE0\"}")
RC=$(python3 -c "import json;d=json.load(open('/tmp/body'));print(len(d['recoveryCodes']), d['recoveryCodes'][0], d['recoveryCodes'][1])"); echo "  recovery: $RC"
REC1=$(echo $RC | awk '{print $2}'); REC2=$(echo $RC | awk '{print $3}')
expect "full session lists sessions" 200 $(code -b /tmp/j1 $B/api/admin/sessions); python3 -c "import json;print('  sessions:',[ (s['deviceLabel'],s['current']) for s in json.load(open('/tmp/body'))['sessions']])"
expect "POST without Origin (CSRF)" 403 $(code -b /tmp/j1 -X POST $B/api/admin/session/ping)
expect "ping not due" 200 $(code -b /tmp/j1 -X POST $B/api/admin/session/ping -H "$O"); echo "  $(cat /tmp/body)"
# rotation
node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{await m.connection.db.collection('sessions').updateMany({},{\$set:{rotatedAt:new Date(Date.now()-20*60000)}});process.exit(0)})"
cp /tmp/j1 /tmp/j1-old
expect "ping rotates when due" 200 $(code -b /tmp/j1 -c /tmp/j1 -X POST $B/api/admin/session/ping -H "$O"); echo "  $(cat /tmp/body)"
expect "new token works" 200 $(code -b /tmp/j1 $B/api/admin/sessions)
expect "old token works during grace" 200 $(code -b /tmp/j1-old $B/api/admin/sessions)
# idle
cp /tmp/j1 /tmp/j-idle
node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{await m.connection.db.collection('sessions').updateMany({},{\$set:{lastSeen:new Date(Date.now()-11*60000)}});process.exit(0)})"
expect "idle 11 min -> logged out" 401 $(code -b /tmp/j-idle $B/api/admin/sessions)
# logout + login with 2fa
expect "login again" 200 $(code -c /tmp/j2 -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}"); echo "  body: $(cat /tmp/body)"
expect "2fa wrong code" 401 $(code -b /tmp/j2 -X POST $B/api/admin/2fa/verify -H "$J" -H "$O" -d '{"code":"123456"}')
expect "2fa REPLAY of enrol code blocked" 401 $(code -b /tmp/j2 -X POST $B/api/admin/2fa/verify -H "$J" -H "$O" -d "{\"code\":\"$CODE0\"}")
CODE1=$(node $ROOT/tests/http/gen-code.mjs $SECRET 30)
expect "2fa next-step code ok" 200 $(code -b /tmp/j2 -c /tmp/j2 -X POST $B/api/admin/2fa/verify -H "$J" -H "$O" -d "{\"code\":\"$CODE1\"}")
expect "after 2fa full access" 200 $(code -b /tmp/j2 $B/api/admin/sessions)
python3 -c "import json;print('  sessions:',[ (s['deviceLabel'],s['current']) for s in json.load(open('/tmp/body'))['sessions']])"
# recovery code login (third session)
rm -f /tmp/j3; code -c /tmp/j3 -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
expect "recovery code login" 200 $(code -b /tmp/j3 -c /tmp/j3 -X POST $B/api/admin/2fa/verify -H "$J" -H "$O" -d "{\"code\":\"$REC1\"}")
rm -f /tmp/j4; code -c /tmp/j4 -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
expect "recovery code is one-time" 401 $(code -b /tmp/j4 -X POST $B/api/admin/2fa/verify -H "$J" -H "$O" -d "{\"code\":\"$REC1\"}")
# revoke another device
expect "list shows several devices" 200 $(code -b /tmp/j2 $B/api/admin/sessions)
OTHER=$(python3 -c "import json;d=json.load(open('/tmp/body'))['sessions'];print([s['id'] for s in d if not s['current']][0])")
expect "revoke other device" 200 $(code -b /tmp/j2 -X DELETE $B/api/admin/sessions/$OTHER -H "$O")
expect "revoked device is out" 401 $(code -b /tmp/j3 $B/api/admin/sessions)
expect "bad id" 404 $(code -b /tmp/j2 -X DELETE $B/api/admin/sessions/zzz -H "$O")
# sign out everywhere
rm -f /tmp/j5; code -c /tmp/j5 -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
sleep 31
CODE2=$(node $ROOT/tests/http/gen-code.mjs $SECRET 30)
expect "2fa (later step) for 5th session" 200 $(code -b /tmp/j5 -c /tmp/j5 -X POST $B/api/admin/2fa/verify -H "$J" -H "$O" -d "{\"code\":\"$CODE2\"}")
expect "revoke-all keeps current" 200 $(code -b /tmp/j5 -X POST $B/api/admin/sessions/revoke-all -H "$O"); echo "  $(cat /tmp/body)"
expect "other session now out" 401 $(code -b /tmp/j2 $B/api/admin/sessions)
expect "current still in" 200 $(code -b /tmp/j5 $B/api/admin/sessions)
# audit
expect "audit list" 200 $(code -b /tmp/j5 $B/api/admin/audit); python3 -c "import json;d=json.load(open('/tmp/body'))['events'];print('  events:',len(d),[e['event'] for e in d][:8])"
# panic
expect "panic" 200 $(code -b /tmp/j5 -c /tmp/j5 -X POST $B/api/admin/panic -H "$O"); echo "  $(cat /tmp/body)"
expect "after panic session dead" 401 $(code -b /tmp/j5 $B/api/admin/sessions)
expect "after panic login blocked (locked)" 401 $(code -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}")
# identical error bodies
node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{await m.connection.db.collection('adminusers').updateMany({},{\$set:{lockedUntil:null}});process.exit(0)})"
code -X POST $B/api/admin/login -H "$J" -H "$O" -d '{"email":"other@x.co","password":"nope-nope-nope"}' >/dev/null; W2=$(cat /tmp/body)
[ "$W1" = "$W2" ] && pass "wrong-email and wrong-password answers identical: $W1" || fail "answers differ: $W1 vs $W2"
# rate limit login
for i in $(seq 1 12); do R=$(code -X POST $B/api/admin/login -H "$J" -H "$O" -d '{"email":"me@x.co","password":"bad-bad-bad-bad"}'); done; echo "  last attempt status after many: $R"
[ "$R" = "429" ] && pass "login rate limit -> 429" || fail "no rate limit ($R)"
# DB inspection
node -e "
const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{
const d=m.connection.db;
const a=await d.collection('adminusers').findOne({});
console.log('totpSecretEnc starts:',a.totpSecretEnc.slice(0,3),'| plaintext secret present?',JSON.stringify(a).includes('$SECRET'));
console.log('recovery hashes stored:',a.recoveryCodeHashes.length,'| any plain recovery code present?',JSON.stringify(a).includes('$REC2'));
const s=await d.collection('sessions').findOne({});
console.log('session keys:',Object.keys(s).join(','));
process.exit(0)})"
grep -iE "error" /tmp/auth-app.log | head -5 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT
