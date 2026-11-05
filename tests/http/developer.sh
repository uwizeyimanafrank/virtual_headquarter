#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4042; FAKE=4043; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k; LOG=/tmp/fake-render.log; T="http://127.0.0.1:$FAKE"
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqdev SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B RENDER_API_BASE_URL=$T
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;const OID=m.Types.ObjectId;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
for p in $PORT $FAKE; do python3 "$ROOT/tests/http/killport.py" $p >/dev/null; done
rm -f $LOG; : > $LOG
(setsid nohup python3 "$ROOT/tests/http/fake-render.py" $FAKE $LOG > /tmp/fake-render.out 2>&1 &)
rm -rf .next && cp -a .next-pristine .next
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) $(head -c 160 /tmp/body)"; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
eqv(){ [ "$2" = "$3" ] && pass "$1" || fail "$1 (expected '$2' got '$3')"; }
start(){ (setsid nohup npx next start -p $PORT > /tmp/dev-app.log 2>&1 &); sleep 6; }
stop(){ python3 "$ROOT/tests/http/killport.py" $PORT >/dev/null; sleep 1; }
CB="-b /tmp/jdv -c /tmp/jdv"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }
stale(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"; }
fresh(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date()}})"; }
backdate(){ dbq "await d.collection('services').updateOne({_id:new OID('$1')},{\$set:{'lastCheck.at':new Date(Date.now()-$2)}})"; }
hits(){ grep -c "\"path\": \"$1\"" $LOG; }
mk(){ P POST /api/admin/services "$1" >/dev/null; jq_ "d['service']['id']" 2>/dev/null; }
CHECK(){ P POST /api/admin/services/check "$1"; }
status_of(){ python3 -c "import json;d=json.load(open('/tmp/body'));s=[x for x in d['services'] if x['id']=='$1'][0];print(s['lastCheck']['status']+'|'+s['lastCheck']['message'])"; }
dbdoc(){ dbq "const x=await d.collection('services').findOne({_id:new OID('$1')});console.log(JSON.stringify({enc:x.credentialEnc,type:x.type,enabled:x.enabled}))"; }
audits(){ dbq "console.log(await d.collection('auditlogs').countDocuments({event:'$1'}))"; }

echo "== phase 1: private addresses refused (default)"
start
rm -f /tmp/jdv; code -c /tmp/jdv -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jdv -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null; SECRET=$(jq_ "d['secret']")
code -b /tmp/jdv -c /tmp/jdv -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node "$ROOT/tests/http/gen-code.mjs" $SECRET 0)\"}" >/dev/null
for i in 0 1 2 3 4 5 6 7; do eval "REC$i=$(jq_ "d['recoveryCodes'][$i]")"; done
expect "no login: list" 401 $(code $B/api/admin/services)
expect "no login: check" 401 $(code -X POST $B/api/admin/services/check -H "$J" -H "$O" -d '{}')
expect "no Origin (CSRF): create" 403 $(code $CB -X POST $B/api/admin/services -H "$J" -d '{"name":"x","type":"mongodb"}')
expect "no login: delete" 401 $(code -X DELETE $B/api/admin/services/aaaaaaaaaaaaaaaaaaaaaaaa -H "$O")
echo "== validation"
expect "javascript: address" 400 $(P POST /api/admin/services '{"name":"x","type":"http","baseUrl":"javascript:alert(1)"}')
expect "file: address" 400 $(P POST /api/admin/services '{"name":"x","type":"http","baseUrl":"file:///etc/passwd"}')
expect "login details inside the address" 400 $(P POST /api/admin/services '{"name":"x","type":"http","baseUrl":"https://u:p@example.org"}')
expect "website check without an address" 400 $(P POST /api/admin/services '{"name":"x","type":"http"}')
expect "unknown kind" 400 $(P POST /api/admin/services '{"name":"x","type":"ssh","baseUrl":"https://example.org"}')
expect "empty name" 400 $(P POST /api/admin/services '{"name":"  ","type":"mongodb"}')
expect "bad health path" 400 $(P POST /api/admin/services '{"name":"x","type":"http","baseUrl":"https://example.org","healthPath":"nope"}')
expect "negative limit" 400 $(P POST /api/admin/services '{"name":"x","type":"mongodb","limitMb":-1}')
stale
expect "bad credentials shape (Render id)" 400 $(P POST /api/admin/services '{"name":"x","type":"render","credentials":{"apiKey":"render-key-1234","serviceId":"nope"}}')
expect "extra credential fields refused" 400 $(P POST /api/admin/services '{"name":"x","type":"render","credentials":{"apiKey":"render-key-1234","serviceId":"srv-okok1234","admin":"yes"}}')
expect "wrong kind of credentials" 400 $(P POST /api/admin/services '{"name":"x","type":"render","credentials":{"token":"abc"}}')
python3 -c "print('{\"name\":\"x\",\"type\":\"mongodb\",\"pad\":\"' + 'z'*20000 + '\"}')" > /tmp/bigsvc.json
expect "20 KB body refused" 413 $(code $CB -X POST $B/api/admin/services -H "$J" -H "$O" --data-binary @/tmp/bigsvc.json)
expect "check with bad ids" 400 $(CHECK '{"ids":["zzz"]}')
expect "nothing was created by bad requests" 200 $(code $CB $B/api/admin/services); eqv "service list is still empty" "0" "$(jq_ "len(d['services'])")"
echo "== create and check (private targets refused)"
expect "create a website check pointing at this machine" 201 $(P POST /api/admin/services "{\"name\":\"Local target\",\"type\":\"http\",\"baseUrl\":\"$T\",\"healthPath\":\"/health\"}"); HID=$(jq_ "d['service']['id']")
eqv "starts as 'unknown' and never checked" "unknown" "$(jq_ "d['service']['lastCheck']['status']")"
expect "check it" 200 $(CHECK '{}'); eqv "private address is refused, says why" "down|That address is on a private network, which is not allowed here." "$(status_of $HID)"
eqv "the target was never contacted" "0" "$(hits /health)"
expect "create the database check (this app's database)" 201 $(P POST /api/admin/services '{"name":"My database","type":"mongodb"}'); DBID=$(jq_ "d['service']['id']")
expect "create a Cloudinary check (no keys in this environment)" 201 $(P POST /api/admin/services '{"name":"Media","type":"cloudinary"}'); CLID=$(jq_ "d['service']['id']")
expect "check all" 200 $(CHECK '{"force":true}')
eqv "database check is up" "up" "$(status_of $DBID | cut -d'|' -f1)"
eqv "Cloudinary without keys is down and says so plainly" "down|Could not read Cloudinary usage. Check the values." "$(status_of $CLID)"
python3 - << 'PY'
import json
d=json.load(open('/tmp/body'))['services']
db=[s for s in d if s['name']=='My database'][0]
print("PASS: database metrics are numbers (or none) with the free-tier limit" if all(isinstance(m['value'],(int,float)) for m in db['lastCheck']['metrics']) and all(m.get('limit')==536870912 for m in db['lastCheck']['metrics'] if m['key']=='storage') else "FAIL: database metrics wrong "+json.dumps(db['lastCheck']))
PY
stop

echo "== phase 2: private targets allowed on purpose"
export ALLOW_PRIVATE_SERVICE_TARGETS=true
start
rm -f /tmp/jdv; code -c /tmp/jdv -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
expect "sign in again with a recovery code" 200 $(code -b /tmp/jdv -c /tmp/jdv -X POST $B/api/admin/2fa/verify -H "$J" -H "$O" -d "{\"code\":\"$REC0\"}")
echo "== caching and throttling"
expect "force right after the last check is throttled" 200 $(CHECK "{\"ids\":[\"$HID\"],\"force\":true}"); eqv "nothing was checked" "0" "$(jq_ "d['checked']")"
eqv "still no contact" "0" "$(hits /health)"
backdate $HID 600000
expect "a stale result (10 min old) is refreshed without force" 200 $(CHECK '{}'); eqv "now up" "up" "$(status_of $HID | cut -d'|' -f1)"
eqv "exactly one request went out" "1" "$(hits /health)"
python3 -c "
import json;d=json.load(open('/tmp/body'))['services'];s=[x for x in d if x['name']=='Local target'][0]
print('PASS: response time is reported' if any(m['key']=='latency' and m['unit']=='ms' for m in s['lastCheck']['metrics']) else 'FAIL: no latency metric')"
expect "a fresh result is reused" 200 $(CHECK '{}'); eqv "not re-checked" "0" "$(jq_ "d['checked']")"; eqv "still one request" "1" "$(hits /health)"
backdate $HID 60000
expect "force after 60 seconds works" 200 $(CHECK "{\"ids\":[\"$HID\"],\"force\":true}"); eqv "one service checked" "1" "$(jq_ "d['checked']")"; eqv "two requests now" "2" "$(hits /health)"
echo "== website results"
RID=$(mk "{\"name\":\"Redirecting\",\"type\":\"http\",\"baseUrl\":\"$T\",\"healthPath\":\"/redirect\"}"); BID=$(mk "{\"name\":\"Broken\",\"type\":\"http\",\"baseUrl\":\"$T\",\"healthPath\":\"/broken\"}")
H0=$(hits /health); expect "check them" 200 $(CHECK '{}')
eqv "redirect is not followed (counts as answering)" "up" "$(status_of $RID | cut -d'|' -f1)"; eqv "the redirect target was never requested" "$H0" "$(hits /health)"
eqv "a 500 means down" "down|Answered with error 500." "$(status_of $BID)"
fresh
expect "create a check that needs a token" 201 $(P POST /api/admin/services "{\"name\":\"Protected\",\"type\":\"http\",\"baseUrl\":\"$T\",\"healthPath\":\"/auth\",\"credentials\":{\"token\":\"target-token-xyz\"}}"); AID=$(jq_ "d['service']['id']")
expect "and one without the token" 201 $(P POST /api/admin/services "{\"name\":\"Unprotected\",\"type\":\"http\",\"baseUrl\":\"$T\",\"healthPath\":\"/auth\"}"); UID_=$(jq_ "d['service']['id']")
expect "check" 200 $(CHECK '{}')
eqv "with the token it is up" "up" "$(status_of $AID | cut -d'|' -f1)"; eqv "without it, down" "down" "$(status_of $UID_ | cut -d'|' -f1)"
grep -q '"auth": "Bearer target-token-xyz"' $LOG && pass "the stored token reached the target as a Bearer header" || fail "token not sent"
echo "== Render"
fresh
mkr(){ mk "{\"name\":\"$1\",\"type\":\"render\",\"credentials\":{\"apiKey\":\"$3\",\"serviceId\":\"$2\"}}"; }
R1=$(mkr "R live" srv-okok1234 render-key-1234); R2=$(mkr "R suspended" srv-susp1234 render-key-1234); R3=$(mkr "R failed deploy" srv-failed12 render-key-1234); R4=$(mkr "R deploying" srv-busy1234 render-key-1234); R5=$(mkr "R wrong key" srv-okok1234 wrong-key-5678); R6=$(mkr "R unknown id" srv-nope1234 render-key-1234)
expect "check Render services" 200 $(CHECK '{}')
eqv "live service is up" "up" "$(status_of $R1 | cut -d'|' -f1)"
eqv "suspended is down" "down|The service is suspended." "$(status_of $R2)"
eqv "failed deploy needs attention" "degraded|Latest deploy: build failed." "$(status_of $R3)"
eqv "deploy in progress needs attention" "degraded|A deploy is in progress." "$(status_of $R4)"
eqv "wrong key is explained" "down|Render refused the API key." "$(status_of $R5)"
eqv "unknown service id is explained" "down|Render does not know that service ID." "$(status_of $R6)"
grep -q '"auth": "Bearer render-key-1234"' $LOG && pass "Render API key was sent as a Bearer header" || fail "render key not sent"
echo "== secrets stay secret"
code $CB $B/api/admin/services >/dev/null
for bad in render-key-1234 wrong-key-5678 target-token-xyz "v1."; do grep -q -- "$bad" /tmp/body && fail "service list leaks: $bad" || pass "service list does not contain: $bad"; done
eqv "list says credentials exist" "True" "$(jq_ "[s for s in d['services'] if s['name']=='R live'][0]['hasCredentials']")"
D1=$(dbdoc $R1); echo "$D1" | grep -q '"enc":"v1\.' && pass "stored credential is encrypted (v1.…)" || fail "credential not encrypted: $D1"
echo "$D1" | grep -q "render-key-1234" && fail "plaintext key in the database" || pass "no plaintext key in the database"
dbq "console.log(JSON.stringify(await d.collection('auditlogs').find({}).toArray()))" > /tmp/audit.json; grep -q "render-key-1234\|target-token-xyz\|wrong-key" /tmp/audit.json && fail "secret in audit log" || pass "audit log has no secrets"
grep -q "render-key-1234\|target-token-xyz\|wrong-key-5678" /tmp/dev-app.log && fail "secret in server log" || pass "server log has no secrets"
echo "== step-up for credentials and deletes"
stale; N0=$(dbq "console.log(await d.collection('services').countDocuments({}))")
expect "adding credentials with stale 2FA" 401 $(P POST /api/admin/services '{"name":"Nope","type":"render","credentials":{"apiKey":"render-key-1234","serviceId":"srv-okok1234"}}'); eqv "asks for step-up" "STEP_UP_REQUIRED" "$(jq_ "d.get('code')")"
eqv "and creates nothing" "$N0" "$(dbq "console.log(await d.collection('services').countDocuments({}))")"
expect "adding WITHOUT credentials needs no step-up" 201 $(P POST /api/admin/services '{"name":"Plain","type":"mongodb"}'); PID=$(jq_ "d['service']['id']")
expect "changing credentials with stale 2FA" 401 $(P PATCH /api/admin/services/$R1 '{"credentials":{"apiKey":"render-key-1234","serviceId":"srv-okok1234"}}')
expect "clearing credentials with stale 2FA" 401 $(P PATCH /api/admin/services/$R1 '{"clearCredentials":true}')
expect "deleting with stale 2FA" 401 $(P DELETE /api/admin/services/$PID)
echo "== editing"
ENC0=$(dbdoc $R1 | python3 -c "import json,sys;print(json.load(sys.stdin)['enc'])")
expect "rename without touching credentials (no step-up needed)" 200 $(P PATCH /api/admin/services/$R1 '{"name":"R live renamed"}'); eqv "name changed" "R live renamed" "$(jq_ "d['service']['name']")"
eqv "ciphertext is untouched" "$ENC0" "$(dbdoc $R1 | python3 -c "import json,sys;print(json.load(sys.stdin)['enc'])")"
expect "step up with a recovery code" 200 $(P POST /api/admin/stepup "{\"code\":\"$REC1\"}")
expect "replace the credentials" 200 $(P PATCH /api/admin/services/$R1 '{"credentials":{"apiKey":"render-key-1234","serviceId":"srv-okok1234"}}')
ENC1=$(dbdoc $R1 | python3 -c "import json,sys;print(json.load(sys.stdin)['enc'])"); [ "$ENC1" != "$ENC0" ] && pass "ciphertext changed" || fail "ciphertext unchanged"
expect "bad new credentials are refused" 400 $(P PATCH /api/admin/services/$R1 '{"credentials":{"apiKey":"short","serviceId":"nope"}}')
expect "type cannot be changed" 200 $(P PATCH /api/admin/services/$R1 '{"type":"http","name":"still render"}'); eqv "type is still render" "render" "$(dbdoc $R1 | python3 -c "import json,sys;print(json.load(sys.stdin)['type'])")"
expect "clear the credentials" 200 $(P PATCH /api/admin/services/$R1 '{"clearCredentials":true}'); eqv "nothing stored any more" "" "$(dbdoc $R1 | python3 -c "import json,sys;print(json.load(sys.stdin)['enc'])")"
expect "empty change" 400 $(P PATCH /api/admin/services/$R1 '{}')
expect "unknown id" 404 $(P PATCH /api/admin/services/aaaaaaaaaaaaaaaaaaaaaaaa '{"name":"x"}')
expect "bad id" 404 $(P PATCH /api/admin/services/zzz '{"name":"x"}')
expect "pause a service" 200 $(P PATCH /api/admin/services/$R2 '{"enabled":false}')
backdate $R2 3600000; HB=$(hits /v1/services/srv-susp1234); CHECK '{}' >/dev/null; eqv "paused services are not contacted" "$HB" "$(hits /v1/services/srv-susp1234)"
echo "== down alerts"
eqv "so far one service_down audit exists for the first down results" "True" "$(python3 -c "print($(audits service_down) >= 1)")"
expect "a service named with HTML goes down" 201 $(P POST /api/admin/services "{\"name\":\"<b>Evil</b> api\",\"type\":\"http\",\"baseUrl\":\"$T\",\"healthPath\":\"/broken\"}"); XID=$(jq_ "d['service']['id']")
CHECK '{}' >/dev/null; D0=$(audits service_down)
curl -s -b /tmp/jdv -o /tmp/dash.html $B/$S; grep -q "is down\|are down" /tmp/dash.html && pass "banner appears on Office pages while something is down" || fail "no banner"
grep -q "&lt;b&gt;Evil&lt;/b&gt;" /tmp/dash.html && pass "the name in the banner is escaped" || fail "name not escaped"
grep -q "<b>Evil</b>" /tmp/dash.html && fail "raw HTML from a service name in the page" || pass "no raw HTML from the name"
backdate $XID 3600000; CHECK '{}' >/dev/null; eqv "staying down does not repeat the alert" "$D0" "$(audits service_down)"
expect "fix it (point at /health)" 200 $(P PATCH /api/admin/services/$XID '{"healthPath":"/health"}'); U0=$(audits service_up); backdate $XID 3600000; CHECK '{}' >/dev/null
eqv "recovered" "up" "$(status_of $XID | cut -d'|' -f1)"; eqv "one service_up audit written" "$((U0+1))" "$(audits service_up)"
echo "== delete"
fresh
expect "delete" 200 $(P DELETE /api/admin/services/$XID); expect "delete again" 404 $(P DELETE /api/admin/services/$XID)
dbq "console.log(await d.collection('auditlogs').countDocuments({event:'delete'}))" | grep -q "^[1-9]" && pass "delete is audited" || fail "delete not audited"
echo "== limit of 30"
dbq "const n=await d.collection('services').countDocuments({});const docs=[];for(let i=n;i<30;i++)docs.push({name:'filler '+i,type:'mongodb',enabled:false,baseUrl:'',healthPath:'/',credentialEnc:'',lastCheck:{status:'unknown',message:'',metrics:[]}});if(docs.length)await d.collection('services').insertMany(docs)"
expect "31st service refused" 400 $(P POST /api/admin/services '{"name":"one too many","type":"mongodb"}'); grep -q "up to 30" /tmp/body && pass "says the limit" || fail "limit message"
echo "== pages"
for pg in developer developer/library developer/reminder; do expect "page /$pg" 200 $(code $CB $B/$S/$pg); done
curl -s -b /tmp/jdv -o /tmp/rem.html $B/$S/developer/reminder
grep -q "System reminder" /tmp/rem.html && pass "reminder page was fetched" || fail "reminder not fetched"
grep -q "SERVICE_CRED_KEY" /tmp/rem.html && pass "reminder lists setting NAMES" || fail "no setting names"
grep -q "$SERVICE_CRED_KEY" /tmp/rem.html && fail "reminder shows a secret VALUE" || pass "reminder never shows a secret value"
for pg in developer developer/library developer/reminder; do curl -s -b "vhq_session=bogus" -o /tmp/bg.html $B/$S/$pg; [ -s /tmp/bg.html ] && pass "fake cookie on /$pg got a real answer" || fail "empty answer"; grep -q "System reminder\|Storage library\|Add a service\|Environment settings checklist" /tmp/bg.html && fail "/$pg leaks to a fake cookie" || pass "/$pg leaks nothing to a fake cookie"; done
echo "== slow target gives up"
dbq "await d.collection('services').deleteMany({name:/^filler/})"  # make room: the 30-service limit was filled on purpose above
SID=$(mk "{\"name\":\"Slow\",\"type\":\"http\",\"baseUrl\":\"$T\",\"healthPath\":\"/slow\"}")
T0=$(date +%s); CHECK "{\"ids\":[\"$SID\"],\"force\":true}" >/dev/null; T1=$(date +%s)
eqv "no answer within 5 seconds is reported" "down|No answer within 5 seconds." "$(status_of $SID)"
[ $((T1-T0)) -le 9 ] && pass "the check itself gave up in time ($((T1-T0))s)" || fail "check took $((T1-T0))s"
grep -iE "error" /tmp/dev-app.log | head -3 | cut -c1-160
stop; python3 "$ROOT/tests/http/killport.py" $FAKE >/dev/null
